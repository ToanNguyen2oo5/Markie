package com.stewie.post.controller;

import com.stewie.post.dto.ApiResponse;
import com.stewie.post.dto.response.LikeStatusResponse;
import com.stewie.post.dto.response.LikerResponse;
import com.stewie.post.dto.response.PageResponse;
import com.stewie.post.service.LikeService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/like")
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LikeController {

    LikeService likeService;

    @PostMapping("/post/{postId}")
    ApiResponse<LikeStatusResponse> likePost(@PathVariable String postId) {
        return ApiResponse.<LikeStatusResponse>builder()
                .result(likeService.likePost(postId))
                .build();
    }

    @DeleteMapping("/post/{postId}")
    ApiResponse<LikeStatusResponse> unlikePost(@PathVariable String postId) {
        return ApiResponse.<LikeStatusResponse>builder()
                .result(likeService.unlikePost(postId))
                .build();
    }

    @GetMapping("/post/{postId}/users")
    ApiResponse<PageResponse<LikerResponse>> getPostLikers(
            @PathVariable String postId,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int limit
    ) {
        return ApiResponse.<PageResponse<LikerResponse>>builder()
                .result(likeService.getPostLikers(postId, cursor, limit))
                .build();
    }

    @PostMapping("/comment/{commentId}")
    ApiResponse<LikeStatusResponse> likeComment(@PathVariable String commentId) {
        return ApiResponse.<LikeStatusResponse>builder()
                .result(likeService.likeComment(commentId))
                .build();
    }

    @DeleteMapping("/comment/{commentId}")
    ApiResponse<LikeStatusResponse> unlikeComment(@PathVariable String commentId) {
        return ApiResponse.<LikeStatusResponse>builder()
                .result(likeService.unlikeComment(commentId))
                .build();
    }
}

