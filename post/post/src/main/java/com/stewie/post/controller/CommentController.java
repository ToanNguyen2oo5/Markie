package com.stewie.post.controller;

import com.stewie.post.dto.ApiResponse;
import com.stewie.post.dto.request.CommentRequest;
import com.stewie.post.dto.response.CommentResponse;
import com.stewie.post.dto.response.PageResponse;
import com.stewie.post.service.CommentService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/comment")
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CommentController {
    
    CommentService commentService;

    @PostMapping("/create/{postId}")
    ApiResponse<CommentResponse> create(@RequestBody CommentRequest request, @PathVariable String postId) {
        return ApiResponse.<CommentResponse>builder()
                .result(commentService.createComment(request, postId))
                .build();
    }

    @GetMapping("/post/{postId}")
    ApiResponse<PageResponse<CommentResponse>> getCommentsByPostId(
            @PathVariable String postId,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "5") int limit
    ) {
        return ApiResponse.<PageResponse<CommentResponse>>builder()
                .result(commentService.getCommentsByPostId(postId, cursor, limit))
                .build();
    }

    @GetMapping("/replies/{parentId}")
    ApiResponse<PageResponse<CommentResponse>> getReplies(
            @PathVariable String parentId,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "5") int limit
    ) {
        return ApiResponse.<PageResponse<CommentResponse>>builder()
                .result(commentService.getReplies(parentId, cursor, limit))
                .build();
    }

    @PutMapping("/update/{commentId}")
    ApiResponse<CommentResponse> updateComment(
            @PathVariable String commentId,
            @RequestBody CommentRequest request
    ) {
        return ApiResponse.<CommentResponse>builder()
                .result(commentService.updateComment(commentId, request))
                .build();
    }

    @DeleteMapping("/delete/{commentId}")
    ApiResponse<Void> deleteComment(@PathVariable String commentId) {
        commentService.deleteComment(commentId);
        return ApiResponse.<Void>builder()
                .message("Comment deleted successfully")
                .build();
    }
}
