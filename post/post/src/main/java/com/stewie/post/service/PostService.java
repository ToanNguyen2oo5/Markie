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
import com.stewie.post.entity.Post;
import com.stewie.post.entity.PostFile;
import com.stewie.post.entity.PostStats;
import com.stewie.post.entity.PostStatus;
import com.stewie.post.exception.AppException;
import com.stewie.post.exception.ErrorCode;
import com.stewie.post.mapper.PostMapper;
import com.stewie.post.repository.PostRepository;
import com.stewie.post.repository.httpclient.FileClient;
import com.stewie.post.repository.httpclient.ProfileClient;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class PostService {
    PostRepository postRepository;
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

        // Lấy username từ profile service để gửi kèm event
        String username = fetchUsername(userId);

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
        String username = fetchUsername(userId);

        Slice<Post> postSlice;
        if (cursor == null || cursor.isEmpty()) {
            postSlice = postRepository.findPublishedByUserIdOrderByIdDesc(userId, PageRequest.of(0, limit));
        } else {
            postSlice = postRepository.findPublishedByIdLessThanAndUserIdOrderByIdDesc(cursor, userId, PageRequest.of(0, limit));
        }

        List<Post> posts = postSlice.getContent();
        String nextCursor = posts.isEmpty() ? null : posts.get(posts.size() - 1).getId();

        List<PostResponse> postResponses = posts.stream()
                .map(post -> {
                    var postResponse = postMapper.toPostResponse(post);
                    postResponse.setUsername(username);
                    return postResponse;
                })
                .toList();

        return PageResponse.<PostResponse>builder()
                .data(postResponses)
                .nextCursor(nextCursor)
                .hasNext(postSlice.hasNext())
                .build();
    }

    public PostResponse getPostById(String postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new AppException(ErrorCode.POST_NOT_EXISTED));

        if (post.getStatus() != null && post.getStatus() != PostStatus.PUBLISHED) {
            throw new AppException(ErrorCode.POST_NOT_EXISTED);
        }

        String username = fetchUsername(post.getUserId());
        var postResponse = postMapper.toPostResponse(post);
        postResponse.setUsername(username);
        return postResponse;
    }

    private String fetchUsername(String userId) {
        try {
            ProfileResponse profile = profileClient.getProfileByUserId(userId).getResult();
            if (profile != null) {
                return profile.getUsername();
            }
        } catch (Exception e) {
            log.warn("Could not fetch username for userId: {}", userId, e);
        }
        return null;
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
