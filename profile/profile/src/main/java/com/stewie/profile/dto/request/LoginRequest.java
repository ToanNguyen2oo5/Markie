package com.stewie.profile.dto.request;

import jakarta.validation.constraints.NotBlank;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LoginRequest {
    @NotBlank(message = "USERNAME_IS_MISSING")
    String username;

    @NotBlank(message = "INVALID_PASSWORD")
    String password;
}
