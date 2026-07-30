package com.stewie.profile.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.stewie.profile.dto.ApiResponse;
import com.stewie.profile.dto.request.UpdateProfileRequest;
import com.stewie.profile.dto.response.ProfileResponse;
import com.stewie.profile.service.UserProfileService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

/**
 * REST controller for user profile operations.
 *
 * <p>Fine-grained RBAC is enforced at the method level via {@code @PreAuthorize},
 * building on top of the coarse-grained route protection already applied at the Gateway.
 *
 * <p>Role mapping (Keycloak Realm Roles → Spring Authorities):
 * <ul>
 *   <li>{@code ADMIN} → {@code ROLE_ADMIN} (full management access)</li>
 *   <li>{@code USER}  → {@code ROLE_USER}  (self-service access only)</li>
 * </ul>
 */
@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserProfileController {

    UserProfileService userProfileService;

    @PostMapping("/users/sync-profile")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    ApiResponse<ProfileResponse> syncProfile() {
        return ApiResponse.<ProfileResponse>builder()
                .result(userProfileService.syncProfile())
                .build();
    }

    /**
     * Get the currently authenticated user's own profile.
     * Both ADMIN and USER roles can view their own profile.
     */
    @GetMapping("/users/my-profile")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    ApiResponse<ProfileResponse> getMyProfile() {
        return ApiResponse.<ProfileResponse>builder()
                .result(userProfileService.getMyProfile())
                .build();
    }

    /**
     * Update the currently authenticated user's own profile.
     * Both ADMIN and USER roles can update their own profile.
     */
    @PutMapping("/users/my-profile")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    ApiResponse<ProfileResponse> updateMyProfile(@RequestBody UpdateProfileRequest request) {
        return ApiResponse.<ProfileResponse>builder()
                .result(userProfileService.updateProfile(request))
                .build();
    }

    /**
     * Get any user's profile by ID.
     * Only ADMIN can look up arbitrary profiles; a USER cannot access other users' profiles.
     */
    @GetMapping("/users/{profileId}")
    @PreAuthorize("hasRole('ADMIN')")
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
}
