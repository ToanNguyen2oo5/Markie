package com.stewie.profile.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Profile Service Security Configuration — Fine-grained RBAC at the method level.
 *
 * <p>Strategy: <b>Offline JWT Validation</b>
 * Spring Security OAuth2 Resource Server fetches the JWKS from Keycloak once on startup,
 * caches the public keys, and validates JWT signatures locally on every request.
 * No Keycloak network call is made per-request.
 *
 * <p>Role extraction: {@link KeycloakRoleConverter} reads {@code realm_access.roles}
 * from the already-verified JWT payload and maps them to {@code ROLE_*} authorities.
 *
 * <p>Method-level rules (fine-grained) are declared with {@code @PreAuthorize}
 * annotations directly on controller methods (see {@code UserProfileController}).
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new KeycloakRoleConverter());
        return converter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity httpSecurity) throws Exception {
        // All endpoints require authentication at minimum;
        // fine-grained role checks are applied via @PreAuthorize on each method.
        httpSecurity.authorizeHttpRequests(request -> request.anyRequest().authenticated());

        httpSecurity.oauth2ResourceServer(
                oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                        .authenticationEntryPoint(new JwtAuthenticationEntryPoint()));

        httpSecurity.csrf(AbstractHttpConfigurer::disable);

        return httpSecurity.build();
    }
}
