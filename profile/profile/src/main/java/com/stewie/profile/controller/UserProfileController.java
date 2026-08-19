package com.stewie.profile.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.stewie.profile.dto.ApiResponse;
import com.stewie.profile.dto.request.UpdateProfileRequest;
import com.stewie.profile.dto.response.ProfileResponse;
import com.stewie.profile.service.UserProfileService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserProfileController {

    UserProfileService userProfileService;

    @PostMapping("/users/sync-profile")
    ApiResponse<ProfileResponse> syncProfile() {
        return ApiResponse.<ProfileResponse>builder()
                .result(userProfileService.syncProfile())
                .build();
    }

    @GetMapping("/users/my-profile")
    ApiResponse<ProfileResponse> getMyProfile() {
        return ApiResponse.<ProfileResponse>builder()
                .result(userProfileService.getMyProfile())
                .build();
    }

    @PutMapping("/users/my-profile")
    ApiResponse<ProfileResponse> updateMyProfile(@RequestBody UpdateProfileRequest request) {
        return ApiResponse.<ProfileResponse>builder()
                .result(userProfileService.updateMyProfile(request))
                .build();
    }

    @GetMapping("/users/user/{userId}")
    ApiResponse<ProfileResponse> getProfileByUserId(@PathVariable String userId) {
        return ApiResponse.<ProfileResponse>builder()
                .result(userProfileService.getProfileByUserId(userId))
                .build();
    }

    @GetMapping("/users/{profileId}")
    ApiResponse<ProfileResponse> getProfile(@PathVariable String profileId) {
        return ApiResponse.<ProfileResponse>builder()
                .result(userProfileService.getProfileById(profileId))
                .build();
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    ApiResponse<List<ProfileResponse>> getAllProfiles() {
        return ApiResponse.<List<ProfileResponse>>builder()
                .result(userProfileService.getAllProfiles())
                .build();
    }

    @PutMapping("/users/avatar")
    ApiResponse<ProfileResponse> updateAvatar(@RequestParam("file") MultipartFile file) {
        return ApiResponse.<ProfileResponse>builder()
                .result(userProfileService.updateAvatar(file))
                .build();
    }
}
