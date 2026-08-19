package com.stewie.post.service;

import com.stewie.post.dto.event.PostSyncEvent;
import com.stewie.post.dto.event.enums.EventType;
import com.stewie.post.dto.request.PostRequest;
import com.stewie.post.dto.response.PageResponse;
import com.stewie.post.dto.response.PostResponse;
import com.stewie.post.dto.response.ProfileResponse;
import com.stewie.post.entity.Post;
import com.stewie.post.entity.PostStats;
import com.stewie.post.exception.AppException;
import com.stewie.post.exception.ErrorCode;
import com.stewie.post.mapper.PostMapper;
import com.stewie.post.repository.PostRepository;
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
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class PostService {
    PostRepository postRepository;
    ProfileClient profileClient;
    PostMapper postMapper;
    KafkaTemplate<String, Object> kafkaTemplate;


    public PostResponse createPost(PostRequest request) {

        var userId = SecurityContextHolder.getContext().getAuthentication().getName();

        Post post = Post.builder()
                .userId(userId)
                .content(request.getContent())
                .stats(new PostStats())
                .createdDate(Instant.now())
                .modifiedDate(Instant.now())
                .build();
        post = postRepository.save(post);

        // Lấy username từ profile service để gửi kèm event
        String username = null;
        try {
            ProfileResponse profile = profileClient.getProfileByUserId(userId).getResult();
            if (profile != null) {
                username = profile.getUsername();
            }
        } catch (Exception e) {
            log.warn("Could not fetch username for post sync event, userId: {}", userId, e);
        }

        // Gửi event SAU khi save DB thành công
        try {
            PostSyncEvent event = PostSyncEvent.builder()
                    .postId(post.getId())
                    .userId(post.getUserId())
                    .username(username)
                    .content(post.getContent())
                    .createdDate(post.getCreatedDate())
                    .eventType(EventType.CREATED)
                    .build();
            kafkaTemplate.send("post.sync.events", event);
            log.info("Sent post sync event for postId: {}", post.getId());
        } catch (Exception e) {
            log.error("Failed to send post sync event for postId: {}", post.getId(), e);
        }

        return postMapper.toPostResponse(post);
    }

    public PageResponse<PostResponse> getMyPosts(String cursor, int limit) {
        var userId = SecurityContextHolder.getContext().getAuthentication().getName();

        ProfileResponse profileResponse = null;
        try {
            profileResponse = profileClient.getProfileByUserId(userId).getResult();
        }
        catch(Exception e) {
            log.error("Error while getting user profile", e);
        }

        String username = profileResponse != null ? profileResponse.getUsername() : null;

        Slice<Post> postSlice;
        if (cursor == null || cursor.isEmpty()) {
            postSlice = postRepository.findByUserIdOrderByIdDesc(userId, PageRequest.of(0, limit));
        } else {
            postSlice = postRepository.
                    findByIdLessThanAndUserIdOrderByIdDesc(cursor, userId, PageRequest.of(0, limit));
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

    public PostResponse getPostById(String postId){
        Post post =
                postRepository.findById(postId)
                    .orElseThrow(() -> new AppException(ErrorCode.POST_NOT_EXISTED));

        return postMapper.toPostResponse(post);
    }
}

