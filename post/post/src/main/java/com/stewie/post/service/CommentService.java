package com.stewie.post.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.stewie.post.dto.request.CommentRequest;
import com.stewie.post.dto.response.CommentResponse;
import com.stewie.post.dto.response.PageResponse;
import com.stewie.post.dto.response.ProfileResponse;
import com.stewie.post.entity.Comment;
import com.stewie.post.entity.LikeTargetType;
import com.stewie.post.entity.Post;
import com.stewie.post.entity.PostStatus;
import com.stewie.post.exception.AppException;
import com.stewie.post.exception.ErrorCode;
import com.stewie.post.mapper.CommentMapper;
import com.stewie.post.repository.CommentRepository;
import com.stewie.post.repository.LikeRepository;
import com.stewie.post.repository.PostRepository;
import com.stewie.post.repository.StatsUpdater;
import com.stewie.post.repository.httpclient.ProfileClient;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class CommentService {

    CommentRepository commentRepository;
    PostRepository postRepository;
    LikeRepository likeRepository;
    StatsUpdater statsUpdater;
    LikeService likeService;
    ProfileClient profileClient;
    CommentMapper commentMapper;

    public CommentResponse createComment(CommentRequest request, String postId) {
        var userId = SecurityContextHolder.getContext().getAuthentication().getName();

        String trimmed = validateContent(request != null ? request.getContent() : null);

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new AppException(ErrorCode.POST_NOT_EXISTED));
        if (post.getStatus() != null && post.getStatus() != PostStatus.PUBLISHED) {
            throw new AppException(ErrorCode.POST_NOT_EXISTED);
        }

        String resolvedParentId = null;
        if (request.getParentId() != null && !request.getParentId().isBlank()) {
            Comment parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new AppException(ErrorCode.INVALID_PARENT_COMMENT));
            if (!postId.equals(parent.getPostId())) {
                throw new AppException(ErrorCode.INVALID_PARENT_COMMENT);
            }
            // Flatten max 2 levels: if replying to a reply, attach to root parent
            resolvedParentId = (parent.getParentId() != null && !parent.getParentId().isBlank())
                    ? parent.getParentId()
                    : parent.getId();
        }

        Comment comment = commentMapper.toComment(request);
        comment.setContent(trimmed);
        comment.setParentId(resolvedParentId);
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setCreatedAt(Instant.now());
        comment.setUpdatedAt(Instant.now());
        comment = commentRepository.save(comment);

        if (resolvedParentId != null) {
            statsUpdater.incComment(resolvedParentId, "replyCount", 1);
        }
        statsUpdater.incPost(postId, "stats.commentCount", 1);

        return enrichSingle(comment, false);
    }

    public PageResponse<CommentResponse> getCommentsByPostId(String postId, String cursor, int limit) {
        Slice<Comment> commentSlice;
        if (cursor == null || cursor.isEmpty()) {
            commentSlice = commentRepository.findByPostIdAndParentIdIsNullOrderByIdDesc(postId, PageRequest.of(0, limit));
        } else {
            commentSlice = commentRepository.findByIdLessThanAndPostIdAndParentIdIsNullOrderByIdDesc(cursor, postId, PageRequest.of(0, limit));
        }
        return buildPageResponse(commentSlice);
    }

    public PageResponse<CommentResponse> getReplies(String parentId, String cursor, int limit) {
        Slice<Comment> commentSlice;
        if (cursor == null || cursor.isEmpty()) {
            commentSlice = commentRepository.findByParentIdOrderByIdDesc(parentId, PageRequest.of(0, limit));
        } else {
            commentSlice = commentRepository.findByIdLessThanAndParentIdOrderByIdDesc(cursor, parentId, PageRequest.of(0, limit));
        }
        return buildPageResponse(commentSlice);
    }

    public CommentResponse updateComment(String commentId, CommentRequest request) {
        var userId = SecurityContextHolder.getContext().getAuthentication().getName();
        String trimmed = validateContent(request != null ? request.getContent() : null);

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_EXISTED));

        if (!comment.getUserId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        commentMapper.updateComment(comment, request);
        comment.setContent(trimmed);
        comment.setEdited(true);
        comment.setUpdatedAt(Instant.now());
        comment = commentRepository.save(comment);

        boolean likedByMe = likeService
                .getLikedTargetIds(userId, LikeTargetType.COMMENT, List.of(comment.getId()))
                .contains(comment.getId());
        return enrichSingle(comment, likedByMe);
    }

    public void deleteComment(String commentId) {
        var userId = SecurityContextHolder.getContext().getAuthentication().getName();
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_EXISTED));

        boolean isCommentAuthor = comment.getUserId().equals(userId);
        boolean isPostOwner = false;
        if (!isCommentAuthor) {
            isPostOwner = postRepository.findById(comment.getPostId())
                    .map(p -> userId.equals(p.getUserId()))
                    .orElse(false);
        }

        if (!isCommentAuthor && !isPostOwner) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        List<String> commentIdsToCleanupLikes = new ArrayList<>();
        commentIdsToCleanupLikes.add(commentId);
        long totalRemoved = 1;

        if (comment.getParentId() == null || comment.getParentId().isBlank()) {
            // Root comment: cascade delete all replies
            List<Comment> replies = commentRepository.findByParentId(commentId);
            if (!replies.isEmpty()) {
                for (Comment r : replies) {
                    commentIdsToCleanupLikes.add(r.getId());
                }
                commentRepository.deleteByParentId(commentId);
                totalRemoved += replies.size();
            }
        } else {
            statsUpdater.incComment(comment.getParentId(), "replyCount", -1);
        }

        commentRepository.deleteById(commentId);
        likeRepository.deleteByTargetTypeAndTargetIdIn(LikeTargetType.COMMENT, commentIdsToCleanupLikes);
        statsUpdater.incPost(comment.getPostId(), "stats.commentCount", -totalRemoved);
    }

    private String validateContent(String content) {
        String trimmed = content != null ? content.trim() : "";
        if (trimmed.isEmpty() || trimmed.length() > 2000) {
            throw new AppException(ErrorCode.INVALID_COMMENT_CONTENT);
        }
        return trimmed;
    }

    // ── Single-comment enrich (used for create/update — only 1 comment, no N+1 risk) ──

    private CommentResponse enrichSingle(Comment comment, boolean likedByMe) {
        CommentResponse response = commentMapper.toCommentResponse(comment);
        response.setLikedByMe(likedByMe);
        try {
            ProfileResponse profile = profileClient.getProfileByUserId(comment.getUserId()).getResult();
            if (profile != null) {
                response.setUsername(profile.getUsername());
            }
        } catch (Exception e) {
            log.error("Error fetching profile for userId: {}", comment.getUserId(), e);
        }
        return response;
    }

    // ── Batch-page enrich: ONE HTTP call for all comments in the page ──

    private PageResponse<CommentResponse> buildPageResponse(Slice<Comment> commentSlice) {
        var currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();
        List<Comment> comments = commentSlice.getContent();
        String nextCursor = comments.isEmpty() ? null : comments.get(comments.size() - 1).getId();

        // 1. Collect unique userIds and commentIds from this page
        Set<String> userIds = comments.stream()
                .map(Comment::getUserId)
                .collect(Collectors.toSet());
        List<String> commentIds = comments.stream()
                .map(Comment::getId)
                .toList();

        // 2. One batch HTTP call → build Map<userId, ProfileResponse> for O(1) lookup
        Map<String, ProfileResponse> profileMap = fetchProfileMap(userIds);
        Set<String> likedCommentIds = likeService.getLikedTargetIds(currentUserId, LikeTargetType.COMMENT, commentIds);

        // 3. Map comments → responses using in-memory lookup (no further HTTP calls)
        List<CommentResponse> commentResponses = comments.stream()
                .map(comment -> {
                    CommentResponse response = commentMapper.toCommentResponse(comment);
                    response.setLikedByMe(likedCommentIds.contains(comment.getId()));
                    ProfileResponse profile = profileMap.get(comment.getUserId());
                    if (profile != null) {
                        response.setUsername(profile.getUsername());
                    }
                    return response;
                })
                .toList();

        return PageResponse.<CommentResponse>builder()
                .data(commentResponses)
                .nextCursor(nextCursor)
                .hasNext(commentSlice.hasNext())
                .build();
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
