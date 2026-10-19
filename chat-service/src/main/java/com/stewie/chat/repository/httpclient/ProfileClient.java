package com.stewie.chat.repository.httpclient;

import java.util.List;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.stewie.chat.dto.ApiResponse;
import com.stewie.chat.dto.response.ProfileResponse;

@FeignClient(name = "profile-service", url = "${app.services.profile.url}")
public interface ProfileClient {
    @GetMapping("/internal/users/{userId}")
    ApiResponse<ProfileResponse> getProfileByUserId(@PathVariable("userId") String userId);

    @PostMapping("/internal/users/batch")
    ApiResponse<List<ProfileResponse>> getProfilesByUserIds(@RequestBody List<String> userIds);
}
