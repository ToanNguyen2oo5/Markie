package com.stewie.post.service;

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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

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

        return mapToCommentResponse(comment);
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

        return mapToCommentResponse(comment);
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

    private CommentResponse mapToCommentResponse(Comment comment) {
        CommentResponse response = commentMapper.toCommentResponse(comment);
        try {
            ProfileResponse profileResponse = profileClient.getProfileByUserId(comment.getUserId()).getResult();
            if (profileResponse != null) {
                response.setUsername(profileResponse.getUsername());
            }
        } catch (Exception e) {
            log.error("Error while getting user profile for userId: {}", comment.getUserId(), e);
        }
        return response;
    }

    private PageResponse<CommentResponse> buildPageResponse(Slice<Comment> commentSlice) {
        List<Comment> comments = commentSlice.getContent();
        String nextCursor = comments.isEmpty() ? null : comments.get(comments.size() - 1).getId();

        List<CommentResponse> commentResponses = comments.stream()
                .map(this::mapToCommentResponse)
                .toList();

        return PageResponse.<CommentResponse>builder()
                .data(commentResponses)
                .nextCursor(nextCursor)
                .hasNext(commentSlice.hasNext())
                .build();
    }
}
