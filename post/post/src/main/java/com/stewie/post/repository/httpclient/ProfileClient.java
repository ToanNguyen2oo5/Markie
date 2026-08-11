package com.stewie.post.repository.httpclient;

import java.util.List;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.stewie.post.dto.ApiResponse;
import com.stewie.post.dto.response.ProfileResponse;

@FeignClient(name = "profile-client", url = "${app.services.profile.url}")
public interface ProfileClient {
    @GetMapping("/internal/users/{userId}")
    ApiResponse<ProfileResponse> getProfileByUserId(@PathVariable String userId);

    @PostMapping("/internal/users/batch")
    ApiResponse<List<ProfileResponse>> getProfilesByUserIds(@RequestBody List<String> userIds);
}

