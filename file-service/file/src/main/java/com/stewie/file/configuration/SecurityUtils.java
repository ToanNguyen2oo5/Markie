package com.stewie.file.configuration;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class SecurityUtils {

    public static String getPreferredUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            // Lấy claim preferred_username từ JWT Payload
            return jwt.getClaimAsString("preferred_username");
        }
        
        return null; // Hoặc throw Custom Exception nếu chưa xác thực
    }
}