package com.stewie.profile.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.stewie.profile.dto.request.UpdateProfileRequest;
import com.stewie.profile.dto.response.ProfileResponse;
import com.stewie.profile.entity.UserProfile;
import com.stewie.profile.exception.AppException;
import com.stewie.profile.exception.ErrorCode;
import com.stewie.profile.mapper.UserProfileMapper;
import com.stewie.profile.repository.UserProfileRepository;
import com.stewie.profile.repository.httpclient.FileClient;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class UserProfileService {

    UserProfileRepository userProfileRepository;
    UserProfileMapper userProfileMapper;
    FileClient fileClient;

    public ProfileResponse syncProfile() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof JwtAuthenticationToken jwtAuth)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        Jwt jwt = jwtAuth.getToken();
        String userId = jwt.getSubject();

        // Check if profile already exists
        var existing = userProfileRepository.findByUserId(userId);
        if (existing.isPresent()) {
            log.info("Profile already exists for userId: {}", userId);
            return userProfileMapper.toProfileResponse(existing.get());
        }

        // Extract standard claims
        String username = jwt.getClaimAsString("preferred_username");
        String email = jwt.getClaimAsString("email");
        String firstName = jwt.getClaimAsString("given_name");
        String lastName = jwt.getClaimAsString("family_name");

        // Extract custom Keycloak attributes (dob, address)
        LocalDate dob = null;
        String dobStr = jwt.getClaimAsString("dob");
        if (dobStr != null && !dobStr.isBlank()) {
            try {
                dob = LocalDate.parse(dobStr);
            } catch (Exception e) {
                log.warn("Failed to parse dob claim '{}': {}", dobStr, e.getMessage());
            }
        }

        String address = jwt.getClaimAsString("address");

        // Create new profile
        UserProfile profile = UserProfile.builder()
                .userId(userId)
                .username(username)
                .email(email)
                .firstName(firstName)
                .lastName(lastName)
                .dob(dob)
                .address(address)
                .build();

        profile = userProfileRepository.save(profile);
        log.info("New UserProfile created for userId: {}, profileId: {}", userId, profile.getProfileId());

        return userProfileMapper.toProfileResponse(profile);
    }

    public ProfileResponse getMyProfile() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        UserProfile userProfile = userProfileRepository
                .findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        return userProfileMapper.toProfileResponse(userProfile);
    }

    public ProfileResponse getProfileById(String profileId) {
        UserProfile userProfile = userProfileRepository
                .findById(profileId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        return userProfileMapper.toProfileResponse(userProfile);
    }

    // UserProfileService.java
    public ProfileResponse getProfileByUserId(String userId) {
        UserProfile userProfile = userProfileRepository
                .findByUserId(userId) // ← tìm theo userId Keycloak
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        return userProfileMapper.toProfileResponse(userProfile);
    }

    public List<ProfileResponse> getAllProfiles() {
        return userProfileRepository.findAll().stream()
                .map(userProfileMapper::toProfileResponse)
                .toList();
    }

    public ProfileResponse updateMyProfile(UpdateProfileRequest request) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        var profile = userProfileRepository
                .findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        userProfileMapper.update(profile, request);

        return userProfileMapper.toProfileResponse(userProfileRepository.save(profile));
    }

    public ProfileResponse updateAvatar(MultipartFile file) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        var profile = userProfileRepository
                .findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        var response = fileClient.uploadFile(file);
        profile.setAvatar(response.getResult().getUrl());

        return userProfileMapper.toProfileResponse(userProfileRepository.save(profile));
    }
}
