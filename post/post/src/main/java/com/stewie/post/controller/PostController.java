package com.stewie.post.controller;

import com.stewie.post.dto.ApiResponse;
import com.stewie.post.dto.request.PostRequest;
import com.stewie.post.dto.response.PageResponse;
import com.stewie.post.dto.response.PostResponse;
import com.stewie.post.service.PostService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PostController {
    PostService postService;

    @PostMapping("/create")
    ApiResponse<PostResponse> create(@RequestBody PostRequest request){
        return ApiResponse.<PostResponse>builder()
                .result(postService.createPost(request))
                .build();
    }

    @GetMapping("/feed")
    ApiResponse<PageResponse<PostResponse>> getFeed(
            @RequestParam(defaultValue = "following") String tab,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "5") int limit
    ){
        return ApiResponse.<PageResponse<PostResponse>>builder()
                .result(postService.getFeed(tab, cursor, limit))
                .build();
    }

    @GetMapping("/my-posts")
    ApiResponse<PageResponse<PostResponse>> getMyPosts(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "5") int limit
    ){
        return ApiResponse.<PageResponse<PostResponse>>builder()
                .result(postService.getMyPosts(cursor, limit))
                .build();
    }

    @GetMapping("/post/{postId}")
    ApiResponse<PostResponse> getPostById(@PathVariable String postId){
        return ApiResponse.<PostResponse>builder()
                .result(postService.getPostById(postId))
                .build();
    }

    @PostMapping("/share/{postId}")
    ApiResponse<Map<String, Long>> sharePost(@PathVariable String postId) {
        long shareCount = postService.sharePost(postId);
        return ApiResponse.<Map<String, Long>>builder()
                .result(Map.of("shareCount", shareCount))
                .build();
    }

    @GetMapping("/create-status/{clientRequestId}")
    ApiResponse<com.stewie.post.dto.response.CreateStatusResponse> getCreateStatus(@PathVariable String clientRequestId) {
        return ApiResponse.<com.stewie.post.dto.response.CreateStatusResponse>builder()
                .result(postService.getCreateStatus(clientRequestId))
                .build();
    }
}
