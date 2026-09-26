package com.stewie.profile.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Configuration
@ConfigurationProperties(prefix = "idp")
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KeycloakProperties {
    String url = "http://localhost:8280";
    String realm = "markie";
    String adminClientId = "admin-cli";
    String adminUsername = "admin";
    String adminPassword = "admin";
    String defaultRole = "USER";
}
