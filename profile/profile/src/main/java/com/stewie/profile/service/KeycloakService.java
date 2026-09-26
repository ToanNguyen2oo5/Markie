package com.stewie.profile.service;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import com.stewie.profile.configuration.KeycloakProperties;
import com.stewie.profile.dto.response.KeycloakRoleResponse;
import com.stewie.profile.dto.response.KeycloakTokenResponse;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class KeycloakService {

    KeycloakProperties keycloakProperties;

    AtomicReference<CachedToken> cachedToken = new AtomicReference<>(null);

    private record CachedToken(String token, long expiryTimeMs) {
        boolean isValid() {
            return System.currentTimeMillis() < (expiryTimeMs - 5000);
        }
    }

    private RestClient getRestClient() {
        return RestClient.builder().baseUrl(keycloakProperties.getUrl()).build();
    }

    public synchronized String getAdminAccessToken() {
        CachedToken current = cachedToken.get();
        if (current != null && current.isValid()) {
            return current.token();
        }

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("client_id", keycloakProperties.getAdminClientId());
        formData.add("username", keycloakProperties.getAdminUsername());
        formData.add("password", keycloakProperties.getAdminPassword());
        formData.add("grant_type", "password");

        try {
            KeycloakTokenResponse response = getRestClient()
                    .post()
                    .uri("/realms/master/protocol/openid-connect/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(formData)
                    .retrieve()
                    .body(KeycloakTokenResponse.class);

            if (response == null || response.getAccessToken() == null) {
                throw new IllegalStateException("Failed to obtain Keycloak admin token: empty response");
            }

            long expiryMs = System.currentTimeMillis()
                    + (response.getExpiresIn() != null ? response.getExpiresIn() * 1000 : 60000);
            cachedToken.set(new CachedToken(response.getAccessToken(), expiryMs));
            return response.getAccessToken();
        } catch (Exception e) {
            log.error("Error getting Keycloak admin token: {}", e.getMessage(), e);
            throw new RuntimeException("Cannot connect to Keycloak Admin API", e);
        }
    }

    public KeycloakRoleResponse getRoleByName(String roleName) {
        String adminToken = getAdminAccessToken();
        try {
            return getRestClient()
                    .get()
                    .uri("/admin/realms/{realm}/roles/{roleName}", keycloakProperties.getRealm(), roleName)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                    .retrieve()
                    .body(KeycloakRoleResponse.class);
        } catch (Exception e) {
            log.error(
                    "Error fetching role '{}' from Keycloak realm '{}': {}",
                    roleName,
                    keycloakProperties.getRealm(),
                    e.getMessage());
            return null;
        }
    }

    public List<KeycloakRoleResponse> getUserRealmRoles(String userId) {
        String adminToken = getAdminAccessToken();
        try {
            return getRestClient()
                    .get()
                    .uri(
                            "/admin/realms/{realm}/users/{userId}/role-mappings/realm",
                            keycloakProperties.getRealm(),
                            userId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<KeycloakRoleResponse>>() {});
        } catch (Exception e) {
            log.warn("Could not check existing roles for user {}: {}", userId, e.getMessage());
            return List.of();
        }
    }

    public void assignRoleToUser(String userId, String roleName) {
        log.info(
                "Assigning role '{}' to user '{}' in Keycloak realm '{}'",
                roleName,
                userId,
                keycloakProperties.getRealm());

        // 1. Check if user already has this role
        List<KeycloakRoleResponse> existingRoles = getUserRealmRoles(userId);
        if (existingRoles != null && existingRoles.stream().anyMatch(r -> roleName.equalsIgnoreCase(r.getName()))) {
            log.info("User '{}' already has role '{}', skipping assignment.", userId, roleName);
            return;
        }

        // 2. Fetch role representation
        KeycloakRoleResponse role = getRoleByName(roleName);
        if (role == null) {
            log.error(
                    "Role '{}' not found in realm '{}'. Please make sure the role exists in Keycloak.",
                    roleName,
                    keycloakProperties.getRealm());
            return;
        }

        // 3. Assign role to user
        String adminToken = getAdminAccessToken();
        getRestClient()
                .post()
                .uri("/admin/realms/{realm}/users/{userId}/role-mappings/realm", keycloakProperties.getRealm(), userId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(List.of(role))
                .retrieve()
                .toBodilessEntity();

        log.info("Successfully assigned role '{}' (id: {}) to user '{}'", roleName, role.getId(), userId);
    }
}
