package com.stewie.profile.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.stewie.profile.dto.ApiResponse;
import com.stewie.profile.dto.response.ProfileResponse;
import com.stewie.profile.service.UserProfileService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class InternalUserProfileController {
    UserProfileService userProfileService;

    @GetMapping("/internal/users/{userId}")
    ApiResponse<ProfileResponse> getProfile(@PathVariable String userId) {
        return ApiResponse.<ProfileResponse>builder()
                .result(userProfileService.getProfileByUserId(userId))
                .build();
    }

    @PostMapping("/internal/users/batch")
    ApiResponse<List<ProfileResponse>> getProfilesBatch(@RequestBody List<String> userIds) {
        return ApiResponse.<List<ProfileResponse>>builder()
                .result(userProfileService.getProfilesByUserIds(userIds))
                .build();
    }
}
