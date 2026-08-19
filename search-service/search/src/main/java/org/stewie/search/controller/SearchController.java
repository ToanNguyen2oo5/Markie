package org.stewie.search.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;
import org.stewie.search.dto.ApiResponse;
import org.stewie.search.dto.PageResponse;
import org.stewie.search.service.SearchService;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SearchController {

    SearchService searchService;

    @GetMapping("/posts")
    public ApiResponse<PageResponse<?>> searchPosts(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdDate"));
        return ApiResponse.<PageResponse<?>>builder()
                .result(searchService.searchPosts(keyword, pageable))
                .build();
    }

    @GetMapping("/users")
    public ApiResponse<PageResponse<?>> searchUsers(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        var pageable = PageRequest.of(page, size);
        return ApiResponse.<PageResponse<?>>builder()
                .result(searchService.searchUsers(keyword, pageable))
                .build();
    }
}
