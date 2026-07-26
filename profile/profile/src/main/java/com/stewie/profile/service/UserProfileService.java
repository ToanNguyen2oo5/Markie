package com.stewie.profile.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.stewie.profile.dto.identity.Credential;
import com.stewie.profile.dto.identity.TokenExchangeParam;
import com.stewie.profile.dto.identity.TokenExchangeResponse;
import com.stewie.profile.dto.identity.UserCreationParam;
import com.stewie.profile.dto.request.LoginRequest;
import com.stewie.profile.dto.request.RegistrationRequest;
import com.stewie.profile.dto.response.ProfileResponse;
import com.stewie.profile.entity.UserProfile;
import com.stewie.profile.exception.AppException;
import com.stewie.profile.exception.ErrorCode;
import com.stewie.profile.mapper.UserProfileMapper;
import com.stewie.profile.repository.UserProfileRepository;
import com.stewie.profile.repository.httpclient.IdentityClient;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class UserProfileService {

    IdentityClient identityClient;
    UserProfileRepository userProfileRepository;
    UserProfileMapper userProfileMapper;

    @NonFinal
    @Value("${idp.client-id}")
    String clientId;

    @NonFinal
    @Value("${idp.client-secret}")
    String clientSecret;

    public ProfileResponse register(RegistrationRequest request) {
        // Step 1: Get admin token via client_credentials grant
        TokenExchangeParam tokenParam = TokenExchangeParam.builder()
                .grant_type("client_credentials")
                .client_id(clientId)
                .client_secret(clientSecret)
                .scope("openid")
                .build();

        TokenExchangeResponse tokenResponse = identityClient.exchangeToken(tokenParam);
        log.info("Token exchange successful");

        // Step 2: Create user on Keycloak
        UserCreationParam userCreationParam = UserCreationParam.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .enabled(true)
                .emailVerified(false)
                .credentials(List.of(Credential.builder()
                        .type("password")
                        .value(request.getPassword())
                        .temporary(false)
                        .build()))
                .build();

        ResponseEntity<?> creationResponse =
                identityClient.createUser("Bearer " + tokenResponse.getAccessToken(), userCreationParam);

        // Step 3: Extract userId from Keycloak response Location header
        String userId = extractUserId(creationResponse);
        log.info("User created on Keycloak with userId: {}", userId);

        // Step 4: Create UserProfile in Neo4j
        UserProfile userProfile = userProfileMapper.toUserProfile(request);
        userProfile.setUserId(userId);

        userProfile = userProfileRepository.save(userProfile);
        log.info("UserProfile saved in Neo4j with id: {}", userProfile.getId());

        return userProfileMapper.toProfileResponse(userProfile);
    }

    public TokenExchangeResponse login(LoginRequest request) {
        TokenExchangeParam tokenParam = TokenExchangeParam.builder()
                .grant_type("password")
                .client_id(clientId)
                .client_secret(clientSecret)
                .username(request.getUsername())
                .password(request.getPassword())
                .scope("openid")
                .build();

        return identityClient.exchangeToken(tokenParam);
    }

    public ProfileResponse getMyProfile() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        UserProfile userProfile = userProfileRepository
                .findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));

        return userProfileMapper.toProfileResponse(userProfile);
    }

    public ProfileResponse getProfileById(String profileId) {
        UserProfile userProfile = userProfileRepository
                .findById(profileId)
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));

        return userProfileMapper.toProfileResponse(userProfile);
    }

    public List<ProfileResponse> getAllProfiles() {
        return userProfileRepository.findAll().stream()
                .map(userProfileMapper::toProfileResponse)
                .toList();
    }

    private String extractUserId(ResponseEntity<?> response) {
        // Keycloak returns the user ID in the Location header:
        // http://localhost:8280/admin/realms/markie/users/{userId}
        String location = response.getHeaders().get("Location").getFirst();
        String[] parts = location.split("/");
        return parts[parts.length - 1];
    }
}
