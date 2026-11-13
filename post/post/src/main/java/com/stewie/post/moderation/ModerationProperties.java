package com.stewie.post.moderation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app.moderation")
public class ModerationProperties {

    @NotBlank(message = "app.moderation.api-key / OPENAI_API_KEY must be configured")
    @Pattern(regexp = "^(?!\\$\\{).*$", message = "OPENAI_API_KEY must resolve to a configured value")
    private String apiKey;

    @NotBlank(message = "app.moderation.base-url must not be blank")
    private String baseUrl;

    @NotBlank(message = "app.moderation.model must not be blank")
    private String model;

    @Positive(message = "app.moderation.connect-timeout-ms must be positive")
    private int connectTimeoutMs;

    @Positive(message = "app.moderation.read-timeout-ms must be positive")
    private int readTimeoutMs;
}
