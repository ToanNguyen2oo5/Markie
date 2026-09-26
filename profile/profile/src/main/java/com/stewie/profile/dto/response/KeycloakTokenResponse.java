package com.stewie.profile.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KeycloakTokenResponse {
    @JsonProperty("access_token")
    String accessToken;

    @JsonProperty("expires_in")
    Long expiresIn;

    @JsonProperty("token_type")
    String tokenType;
}
