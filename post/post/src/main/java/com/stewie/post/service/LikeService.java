package com.stewie.post.service;

import com.stewie.post.dto.response.LikeStatusResponse;
import com.stewie.post.dto.response.LikerResponse;
import com.stewie.post.dto.response.PageResponse;
import com.stewie.post.dto.response.ProfileResponse;
import com.stewie.post.entity.*;
import com.stewie.post.exception.AppException;
import com.stewie.post.exception.ErrorCode;
import com.stewie.post.repository.CommentRepository;
import com.stewie.post.repository.LikeRepository;
import com.stewie.post.repository.PostRepository;
import com.stewie.post.repository.StatsUpdater;
import com.stewie.post.repository.httpclient.ProfileClient;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class LikeService {

    LikeRepository likeRepository;
    PostRepository postRepository;
    CommentRepository commentRepository;
    StatsUpdater statsUpdater;
    ProfileClient profileClient;

    public LikeStatusResponse likePost(String postId) {
        var userId = SecurityContextHolder.getContext().getAuthentication().getName();
        Post post = getPublishedPostOrThrow(postId);

        long currentCount = post.getStats() != null ? post.getStats().getLikeCount() : 0L;
        try {
            Like like = Like.builder()
                    .targetType(LikeTargetType.POST)
                    .targetId(postId)
                    .userId(userId)
                    .createdAt(Instant.now())
                    .build();
            likeRepository.save(like);
            statsUpdater.incPost(postId, "stats.likeCount", 1);
            currentCount = Math.max(0L, currentCount + 1);
        } catch (DuplicateKeyException e) {
            log.debug("User {} already liked post {}", userId, postId);
        }

        return LikeStatusResponse.builder()
                .liked(true)
                .likeCount(currentCount)
                .build();
    }

    public LikeStatusResponse unlikePost(String postId) {
        var userId = SecurityContextHolder.getContext().getAuthentication().getName();
        Post post = getPublishedPostOrThrow(postId);

        long currentCount = post.getStats() != null ? post.getStats().getLikeCount() : 0L;
        long deleted = likeRepository.deleteByTargetTypeAndTargetIdAndUserId(LikeTargetType.POST, postId, userId);
        if (deleted > 0) {
            statsUpdater.incPost(postId, "stats.likeCount", -1);
            currentCount = Math.max(0L, currentCount - 1);
        }

        return LikeStatusResponse.builder()
                .liked(false)
                .likeCount(currentCount)
                .build();
    }

    public LikeStatusResponse likeComment(String commentId) {
        var userId = SecurityContextHolder.getContext().getAuthentication().getName();
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_EXISTED));

        long currentCount = comment.getLikeCount();
        try {
            Like like = Like.builder()
                    .targetType(LikeTargetType.COMMENT)
                    .targetId(commentId)
                    .userId(userId)
                    .createdAt(Instant.now())
                    .build();
            likeRepository.save(like);
            statsUpdater.incComment(commentId, "likeCount", 1);
            currentCount = Math.max(0L, currentCount + 1);
        } catch (DuplicateKeyException e) {
            log.debug("User {} already liked comment {}", userId, commentId);
        }

        return LikeStatusResponse.builder()
                .liked(true)
                .likeCount(currentCount)
                .build();
    }

    public LikeStatusResponse unlikeComment(String commentId) {
        var userId = SecurityContextHolder.getContext().getAuthentication().getName();
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_EXISTED));

        long currentCount = comment.getLikeCount();
        long deleted = likeRepository.deleteByTargetTypeAndTargetIdAndUserId(LikeTargetType.COMMENT, commentId, userId);
        if (deleted > 0) {
            statsUpdater.incComment(commentId, "likeCount", -1);
            currentCount = Math.max(0L, currentCount - 1);
        }

        return LikeStatusResponse.builder()
                .liked(false)
                .likeCount(currentCount)
                .build();
    }

    public PageResponse<LikerResponse> getPostLikers(String postId, String cursor, int limit) {
        getPublishedPostOrThrow(postId);

        Slice<Like> likeSlice;
        if (cursor == null || cursor.isEmpty()) {
            likeSlice = likeRepository.findByTargetTypeAndTargetIdOrderByIdDesc(
                    LikeTargetType.POST, postId, PageRequest.of(0, limit));
        } else {
            likeSlice = likeRepository.findByTargetTypeAndTargetIdAndIdLessThanOrderByIdDesc(
                    LikeTargetType.POST, postId, cursor, PageRequest.of(0, limit));
        }

        List<Like> likes = likeSlice.getContent();
        String nextCursor = likes.isEmpty() ? null : likes.get(likes.size() - 1).getId();

        Set<String> userIds = likes.stream().map(Like::getUserId).collect(Collectors.toSet());
        Map<String, ProfileResponse> profileMap = fetchProfileMap(userIds);

        List<LikerResponse> data = likes.stream()
                .map(like -> {
                    ProfileResponse profile = profileMap.get(like.getUserId());
                    return LikerResponse.builder()
                            .userId(like.getUserId())
                            .username(profile != null ? profile.getUsername() : null)
                            .avatar(profile != null ? profile.getAvatar() : null)
                            .likedAt(like.getCreatedAt())
                            .build();
                })
                .toList();

        return PageResponse.<LikerResponse>builder()
                .data(data)
                .nextCursor(nextCursor)
                .hasNext(likeSlice.hasNext())
                .build();
    }

    public Set<String> getLikedTargetIds(String userId, LikeTargetType targetType, Collection<String> targetIds) {
        if (userId == null || targetIds == null || targetIds.isEmpty()) {
            return Collections.emptySet();
        }
        return likeRepository.findByUserIdAndTargetTypeAndTargetIdIn(userId, targetType, targetIds)
                .stream()
                .map(Like::getTargetId)
                .collect(Collectors.toSet());
    }

    private Post getPublishedPostOrThrow(String postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new AppException(ErrorCode.POST_NOT_EXISTED));
        if (post.getStatus() != null && post.getStatus() != PostStatus.PUBLISHED) {
            throw new AppException(ErrorCode.POST_NOT_EXISTED);
        }
        return post;
    }

    private Map<String, ProfileResponse> fetchProfileMap(Set<String> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        try {
            List<ProfileResponse> profiles = profileClient
                    .getProfilesByUserIds(List.copyOf(userIds))
                    .getResult();
            if (profiles == null) return Map.of();
            return profiles.stream()
                    .collect(Collectors.toMap(ProfileResponse::getUserId, Function.identity(), (a, b) -> a));
        } catch (Exception e) {
            log.error("Error fetching batch profiles for userIds: {}", userIds, e);
            return Map.of();
        }
    }
}

