package com.stewie.post.service;

import java.time.Instant;
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
import com.stewie.post.exception.AppException;
import com.stewie.post.exception.ErrorCode;
import com.stewie.post.mapper.CommentMapper;
import com.stewie.post.repository.CommentRepository;
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
    ProfileClient profileClient;
    CommentMapper commentMapper;

    public CommentResponse createComment(CommentRequest request, String postId) {
        var userId = SecurityContextHolder.getContext().getAuthentication().getName();

        Comment comment = commentMapper.toComment(request);
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setCreatedAt(Instant.now());
        comment.setUpdatedAt(Instant.now());
        comment = commentRepository.save(comment);

        return enrichSingle(comment);
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
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_EXISTED));

        if (!comment.getUserId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        commentMapper.updateComment(comment, request);
        comment.setUpdatedAt(Instant.now());
        comment = commentRepository.save(comment);

        return enrichSingle(comment);
    }

    public void deleteComment(String commentId) {
        var userId = SecurityContextHolder.getContext().getAuthentication().getName();
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_EXISTED));

        if (!comment.getUserId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        commentRepository.deleteById(commentId);
    }

    // ── Single-comment enrich (used for create/update — only 1 comment, no N+1 risk) ──

    private CommentResponse enrichSingle(Comment comment) {
        CommentResponse response = commentMapper.toCommentResponse(comment);
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
        List<Comment> comments = commentSlice.getContent();
        String nextCursor = comments.isEmpty() ? null : comments.get(comments.size() - 1).getId();

        // 1. Collect unique userIds from this page
        Set<String> userIds = comments.stream()
                .map(Comment::getUserId)
                .collect(Collectors.toSet());

        // 2. One batch HTTP call → build Map<userId, ProfileResponse> for O(1) lookup
        Map<String, ProfileResponse> profileMap = fetchProfileMap(userIds);

        // 3. Map comments → responses using in-memory lookup (no further HTTP calls)
        List<CommentResponse> commentResponses = comments.stream()
                .map(comment -> {
                    CommentResponse response = commentMapper.toCommentResponse(comment);
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
                    .collect(Collectors.toMap(ProfileResponse::getUserId, Function.identity()));
        } catch (Exception e) {
            log.error("Error fetching batch profiles for userIds: {}", userIds, e);
            return Map.of();
        }
    }
}
