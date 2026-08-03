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

    @GetMapping("/my-posts")
    ApiResponse<PageResponse<PostResponse>> getMyPosts(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "10") int limit
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
}
