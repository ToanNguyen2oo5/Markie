package com.stewie.post.service;

import com.stewie.event.dto.PostSyncEvent;
import com.stewie.event.enums.EventType;
import com.stewie.post.dto.request.PostRequest;
import com.stewie.post.dto.request.internal.ClaimAttachmentRequest;
import com.stewie.post.dto.request.internal.CommitAttachmentRequest;
import com.stewie.post.dto.request.internal.ReleaseAttachmentRequest;
import com.stewie.post.dto.response.CreateStatusResponse;
import com.stewie.post.dto.response.PageResponse;
import com.stewie.post.dto.response.PostResponse;
import com.stewie.post.dto.response.ProfileResponse;
import com.stewie.post.entity.LikeTargetType;
import com.stewie.post.entity.Post;
import com.stewie.post.entity.PostFile;
import com.stewie.post.entity.PostStats;
import com.stewie.post.entity.PostStatus;
import com.stewie.post.exception.AppException;
import com.stewie.post.exception.ErrorCode;
import com.stewie.post.mapper.PostMapper;
import com.stewie.post.repository.PostRepository;
import com.stewie.post.repository.StatsUpdater;
import com.stewie.post.repository.httpclient.FileClient;
import com.stewie.post.repository.httpclient.ProfileClient;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.data.domain.Sort;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class PostService {
    PostRepository postRepository;
    StatsUpdater statsUpdater;
    LikeService likeService;
    ProfileClient profileClient;
    FileClient fileClient;
    PostMapper postMapper;
    KafkaTemplate<String, Object> kafkaTemplate;

    public PostResponse createPost(PostRequest request) {
        var userId = SecurityContextHolder.getContext().getAuthentication().getName();

        // 1. Normalize and validate content
        String trimmedContent = request.getContent() != null ? request.getContent().trim() : "";
        if (trimmedContent.length() > 500) {
            throw new AppException(ErrorCode.INVALID_POST_CONTENT);
        }

        // 2. Validate fileIds
        List<String> fileIds = request.getFileIds() != null ? request.getFileIds() : Collections.emptyList();
        if (fileIds.size() > 10) {
            throw new AppException(ErrorCode.TOO_MANY_FILES);
        }
        Set<String> uniqueIds = new HashSet<>(fileIds);
        if (uniqueIds.size() != fileIds.size()) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }

        // 3. Post must have text content OR at least one file
        boolean hasContent = !trimmedContent.isEmpty();
        boolean hasFiles = !fileIds.isEmpty();
        if (!hasContent && !hasFiles) {
            throw new AppException(ErrorCode.INVALID_POST_CONTENT);
        }

        // 4. Idempotency check with clientRequestId
        String clientRequestId = request.getClientRequestId();
        if (clientRequestId != null && !clientRequestId.isBlank()) {
            Optional<Post> existingOpt = postRepository.findByUserIdAndClientRequestId(userId, clientRequestId);
            if (existingOpt.isPresent()) {
                Post existing = existingOpt.get();
                log.info("Found existing post for clientRequestId: {}, status: {}", clientRequestId, existing.getStatus());
                if (existing.getStatus() == PostStatus.PUBLISHED || existing.getStatus() == null) {
                    return postMapper.toPostResponse(existing);
                } else if (existing.getStatus() == PostStatus.PENDING_ATTACHMENTS) {
                    return postMapper.toPostResponse(existing);
                }
            }
        }

        // Lấy profile từ profile service để gửi kèm event và trả về
        ProfileResponse authorProfile = fetchProfile(userId);
        String username = authorProfile != null ? authorProfile.getUsername() : null;
        String avatar = authorProfile != null ? authorProfile.getAvatar() : null;

        // Case A: Text-only post (no files to claim)
        if (!hasFiles) {
            Post post = Post.builder()
                    .userId(userId)
                    .content(trimmedContent)
                    .status(PostStatus.PUBLISHED)
                    .clientRequestId(clientRequestId)
                    .fileIds(Collections.emptyList())
                    .files(new ArrayList<>())
                    .stats(new PostStats())
                    .createdDate(Instant.now())
                    .modifiedDate(Instant.now())
                    .build();

            post = postRepository.save(post);
            sendPostSyncEvent(post, username);

            var response = postMapper.toPostResponse(post);
            response.setUsername(username);
            response.setAvatar(avatar);
            return response;
        }

        // Case B: Post with file attachments
        // Step 1: Save post in PENDING_ATTACHMENTS state
        Post post = Post.builder()
                .userId(userId)
                .content(trimmedContent)
                .status(PostStatus.PENDING_ATTACHMENTS)
                .clientRequestId(clientRequestId)
                .fileIds(fileIds)
                .files(new ArrayList<>())
                .stats(new PostStats())
                .createdDate(Instant.now())
                .modifiedDate(Instant.now())
                .build();

        post = postRepository.save(post);

        // Step 2: Claim files from file-service
        List<PostFile> postFiles = new ArrayList<>();
        try {
            var claimResponse = fileClient.claimPostAttachments(ClaimAttachmentRequest.builder()
                    .postId(post.getId())
                    .ownerId(userId)
                    .fileIds(fileIds)
                    .build());

            if (claimResponse == null || claimResponse.getResult() == null) {
                throw new AppException(ErrorCode.FILE_ATTACHMENT_FAILED);
            }

            for (var dto : claimResponse.getResult()) {
                postFiles.add(PostFile.builder()
                        .fileId(dto.getFileId())
                        .url(dto.getUrl())
                        .originalName(dto.getOriginalName())
                        .contentType(dto.getContentType())
                        .size(dto.getSize())
                        .build());
            }
        } catch (Exception e) {
            log.error("Failed to claim file attachments for post {}", post.getId(), e);
            post.setStatus(PostStatus.FAILED);
            postRepository.save(post);

            try {
                fileClient.releasePostAttachments(ReleaseAttachmentRequest.builder()
                        .postId(post.getId())
                        .ownerId(userId)
                        .fileIds(fileIds)
                        .build());
            } catch (Exception re) {
                log.error("Failed to release attachments after claim error for post {}", post.getId(), re);
            }

            throw new AppException(ErrorCode.FILE_ATTACHMENT_FAILED);
        }

        // Step 3: Save snapshot files & commit files in file-service
        post.setFiles(postFiles);
        try {
            fileClient.commitPostAttachments(CommitAttachmentRequest.builder()
                    .postId(post.getId())
                    .ownerId(userId)
                    .fileIds(fileIds)
                    .build());
        } catch (Exception e) {
            log.warn("Failed to commit attachments in file-service for post {}, proceeding to publish", post.getId(), e);
        }

        post.setStatus(PostStatus.PUBLISHED);
        post.setModifiedDate(Instant.now());
        post = postRepository.save(post);

        // Step 4: Publish search sync event
        sendPostSyncEvent(post, username);

        var response = postMapper.toPostResponse(post);
        response.setUsername(username);
        response.setAvatar(avatar);
        return response;
    }

    public CreateStatusResponse getCreateStatus(String clientRequestId) {
        var userId = SecurityContextHolder.getContext().getAuthentication().getName();
        Post post = postRepository.findByUserIdAndClientRequestId(userId, clientRequestId)
                .orElseThrow(() -> new AppException(ErrorCode.POST_NOT_EXISTED));

        return CreateStatusResponse.builder()
                .status(post.getStatus() != null ? post.getStatus().name() : "PUBLISHED")
                .postId(post.getId())
                .result(postMapper.toPostResponse(post))
                .build();
    }

    public PageResponse<PostResponse> getMyPosts(String cursor, int limit) {
        var userId = SecurityContextHolder.getContext().getAuthentication().getName();
        int safeLimit = Math.max(1, Math.min(20, limit));

        Slice<Post> postSlice;
        if (cursor == null || cursor.isEmpty()) {
            postSlice = postRepository.findPublishedByUserIdOrderByIdDesc(userId, PageRequest.of(0, safeLimit));
        } else {
            postSlice = postRepository.findPublishedByIdLessThanAndUserIdOrderByIdDesc(cursor, userId, PageRequest.of(0, safeLimit));
        }

        return enrichPage(postSlice, userId);
    }

    public PageResponse<PostResponse> getFeed(String tab, String cursor, int limit) {
        var userId = SecurityContextHolder.getContext().getAuthentication().getName();
        int safeLimit = Math.max(1, Math.min(20, limit));
        Pageable pageable = PageRequest.of(0, safeLimit, Sort.by(Sort.Direction.DESC, "id"));

        Slice<Post> postSlice;
        if ("discover".equalsIgnoreCase(tab)) {
            if (cursor == null || cursor.isEmpty()) {
                postSlice = postRepository.findPublishedDiscover(userId, pageable);
            } else {
                postSlice = postRepository.findPublishedDiscoverBefore(cursor, userId, pageable);
            }
        } else {
            Set<String> authorIds = new LinkedHashSet<>();
            authorIds.add(userId);
            authorIds.addAll(fetchFollowingIds(userId));

            if (cursor == null || cursor.isEmpty()) {
                postSlice = postRepository.findPublishedByUserIdIn(authorIds, pageable);
            } else {
                postSlice = postRepository.findPublishedByIdLessThanAndUserIdIn(cursor, authorIds, pageable);
            }
        }

        return enrichPage(postSlice, userId);
    }

    public PostResponse getPostById(String postId) {
        var currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new AppException(ErrorCode.POST_NOT_EXISTED));

        if (post.getStatus() != null && post.getStatus() != PostStatus.PUBLISHED) {
            throw new AppException(ErrorCode.POST_NOT_EXISTED);
        }

        ProfileResponse profile = fetchProfile(post.getUserId());
        var postResponse = postMapper.toPostResponse(post);
        if (profile != null) {
            postResponse.setUsername(profile.getUsername());
            postResponse.setAvatar(profile.getAvatar());
        }
        if (likeService != null) {
            boolean liked = likeService.getLikedTargetIds(currentUserId, LikeTargetType.POST, List.of(postId))
                    .contains(postId);
            postResponse.setLikedByMe(liked);
        }
        return postResponse;
    }

    public List<PostResponse> getPostsByIds(List<String> postIds) {
        if (postIds == null || postIds.size() > 20 ||
                postIds.stream().anyMatch(id -> id == null || id.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide at most 20 valid post IDs");
        }
        if (postIds.isEmpty()) return List.of();

        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();
        List<Post> posts = postRepository.findAllById(postIds).stream()
                .filter(post -> post.getStatus() == null || post.getStatus() == PostStatus.PUBLISHED)
                .toList();
        return enrichPage(new SliceImpl<>(posts), currentUserId).getData();
    }

    public long sharePost(String postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new AppException(ErrorCode.POST_NOT_EXISTED));

        if (post.getStatus() != null && post.getStatus() != PostStatus.PUBLISHED) {
            throw new AppException(ErrorCode.POST_NOT_EXISTED);
        }

        statsUpdater.incPost(postId, "stats.shareCount", 1);
        long currentShares = post.getStats() != null ? post.getStats().getShareCount() : 0L;
        return currentShares + 1;
    }

    private PageResponse<PostResponse> enrichPage(Slice<Post> postSlice, String currentUserId) {
        List<Post> posts = postSlice.getContent();
        String nextCursor = posts.isEmpty() ? null : posts.get(posts.size() - 1).getId();

        Set<String> authorIds = posts.stream()
                .map(Post::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<String, ProfileResponse> profileMap = fetchProfileMap(authorIds);

        List<String> postIds = posts.stream().map(Post::getId).toList();
        Set<String> likedPostIds = likeService != null
                ? likeService.getLikedTargetIds(currentUserId, LikeTargetType.POST, postIds)
                : Collections.emptySet();

        List<PostResponse> postResponses = posts.stream()
                .map(post -> {
                    var postResponse = postMapper.toPostResponse(post);
                    ProfileResponse profile = profileMap.get(post.getUserId());
                    if (profile != null) {
                        postResponse.setUsername(profile.getUsername());
                        postResponse.setAvatar(profile.getAvatar());
                    }
                    postResponse.setLikedByMe(likedPostIds.contains(post.getId()));
                    return postResponse;
                })
                .toList();

        return PageResponse.<PostResponse>builder()
                .data(postResponses)
                .nextCursor(nextCursor)
                .hasNext(postSlice.hasNext())
                .build();
    }

    private List<String> fetchFollowingIds(String userId) {
        try {
            var res = profileClient.getFollowingIds(userId);
            if (res != null && res.getResult() != null) {
                return res.getResult();
            }
        } catch (Exception e) {
            log.warn("Could not fetch followingIds for userId: {}, falling back to self posts only", userId, e);
        }
        return Collections.emptyList();
    }

    private Map<String, ProfileResponse> fetchProfileMap(Set<String> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        try {
            var res = profileClient.getProfilesByUserIds(List.copyOf(userIds));
            List<ProfileResponse> profiles = res != null ? res.getResult() : null;
            if (profiles == null) return Map.of();
            return profiles.stream()
                    .filter(p -> p.getUserId() != null)
                    .collect(Collectors.toMap(ProfileResponse::getUserId, Function.identity(), (a, b) -> a));
        } catch (Exception e) {
            log.warn("Could not batch fetch profiles for userIds: {}", userIds, e);
            return Map.of();
        }
    }

    private ProfileResponse fetchProfile(String userId) {
        try {
            var res = profileClient.getProfileByUserId(userId);
            return res != null ? res.getResult() : null;
        } catch (Exception e) {
            log.warn("Could not fetch profile for userId: {}", userId, e);
            return null;
        }
    }

    private void sendPostSyncEvent(Post post, String username) {
        try {
            // Ensure content is not null for Elasticsearch SearchPostCard
            String syncContent = post.getContent() != null ? post.getContent() : "";

            PostSyncEvent event = PostSyncEvent.builder()
                    .postId(post.getId())
                    .userId(post.getUserId())
                    .username(username)
                    .content(syncContent)
                    .createdDate(post.getCreatedDate())
                    .eventType(EventType.CREATED)
                    .build();
            kafkaTemplate.send("post.sync.events", event);
            log.info("Sent post sync event for postId: {}", post.getId());
        } catch (Exception e) {
            log.error("Failed to send post sync event for postId: {}", post.getId(), e);
        }
    }
}
