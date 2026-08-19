package com.stewie.profile.service;

import java.time.Duration;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.stewie.event.dto.AvatarUploadRequestedEvent;
import com.stewie.event.dto.ProfileSyncEvent;
import com.stewie.event.dto.enums.EventType;
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

    KafkaTemplate<String, Object> kafkaTemplate;
    StringRedisTemplate stringRedisTemplate;

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

        ProfileSyncEvent event = ProfileSyncEvent.builder()
                .avatar(profile.getAvatar())
                .userId(profile.getUserId())
                .profileId(profile.getProfileId())
                .username(profile.getUsername())
                .firstName(profile.getFirstName())
                .lastName(profile.getLastName())
                .email(profile.getEmail())
                .eventType(EventType.CREATED)
                .build();

        kafkaTemplate.send("profile.sync.events", event);

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

    public List<ProfileResponse> getProfilesByUserIds(List<String> userIds) {
        return userProfileRepository.findAllByUserIdIn(userIds).stream()
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

        profile = userProfileRepository.save(profile);

        ProfileSyncEvent event = ProfileSyncEvent.builder()
                .avatar(profile.getAvatar())
                .userId(profile.getUserId())
                .profileId(profile.getProfileId())
                .username(profile.getUsername())
                .firstName(profile.getFirstName())
                .lastName(profile.getLastName())
                .email(profile.getEmail())
                .eventType(EventType.UPDATED)
                .build();

        kafkaTemplate.send("profile.sync.events", event);

        return userProfileMapper.toProfileResponse(profile);
    }

    public ProfileResponse updateAvatar(MultipartFile file) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        var profile = userProfileRepository
                .findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        String sagaId = UUID.randomUUID().toString();

        try {
            // Encode file to Base64 and save to Redis with a 5-minute TTL
            String base64File = Base64.getEncoder().encodeToString(file.getBytes());
            stringRedisTemplate.opsForValue().set("avatar:" + sagaId, base64File, Duration.ofMinutes(5));

            AvatarUploadRequestedEvent event = AvatarUploadRequestedEvent.builder()
                    .sagaId(sagaId)
                    .userId(userId)
                    .contentType(file.getContentType())
                    // Passing the original filename via the 'url' field temporarily (as requested by existing event
                    // structure)
                    .url(file.getOriginalFilename())
                    .build();

            // Publish event to trigger file-service asynchronously
            kafkaTemplate.send("avatar.upload.requested", sagaId, event);

        } catch (Exception e) {
            log.error("Failed to process avatar update for user {}", userId, e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }

        return userProfileMapper.toProfileResponse(profile);
    }
}
