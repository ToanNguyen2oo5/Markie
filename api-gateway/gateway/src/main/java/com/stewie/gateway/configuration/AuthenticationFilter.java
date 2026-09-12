package com.stewie.gateway.configuration;

import java.util.Arrays;
import java.util.List;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stewie.gateway.dto.ApiResponse;

import lombok.extern.slf4j.Slf4j;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;

import reactor.core.publisher.Mono;

@Component
@Slf4j
public class AuthenticationFilter implements GlobalFilter, Ordered {

    private String[] PUBLIC_ENDPOINTS = {
            "/profile/internal/registration",
            "/profile/internal/login",
            "/file/media/download/.*",
            "/search/.*"

    };

    // These paths are only for internal service-to-service calls; block from
    // external clients
    private static final List<String> INTERNAL_ENDPOINTS = List.of(
            "/profile/internal/users",
            "/post/internal");

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        log.info("Gateway routing request to: {}", path);

        // Block internal endpoints from external clients
        if (isInternalEndpoint(path)) {
            log.warn("Blocked external access to internal endpoint: {}", path);
            return forbiddenResponse(exchange.getResponse());
        }

        // Skip authentication check for public endpoints
        if (isPublicEndpoint(exchange.getRequest())) {
            return chain.filter(exchange);
        }

        // Check for Bearer token
        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("Missing or invalid Authorization header for path: {}", path);
            return unauthenticatedResponse(exchange.getResponse());
        }

        log.debug("Request contains Bearer token, forwarding to downstream");
        return chain.filter(exchange);
    }

    private boolean isPublicEndpoint(ServerHttpRequest request) {
        return Arrays.stream(PUBLIC_ENDPOINTS)
                .anyMatch(s -> request.getURI().getPath().matches(s));
    }

    private boolean isInternalEndpoint(String path) {
        return INTERNAL_ENDPOINTS.stream().anyMatch(path::startsWith);
    }

    private Mono<Void> unauthenticatedResponse(ServerHttpResponse response) {
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        ApiResponse<?> body = ApiResponse.builder()
                .code(1006)
                .message("Unauthenticated")
                .build();

        try {
            byte[] bytes = objectMapper.writeValueAsBytes(body);
            DataBuffer buffer = response.bufferFactory().wrap(bytes);
            return response.writeWith(Mono.just(buffer));
        } catch (JsonProcessingException e) {
            log.error("Error writing unauthenticated response", e);
            return response.setComplete();
        }
    }

    private Mono<Void> forbiddenResponse(ServerHttpResponse response) {
        response.setStatusCode(HttpStatus.FORBIDDEN);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        ApiResponse<?> body = ApiResponse.builder()
                .code(1007)
                .message("Access to internal endpoints is forbidden")
                .build();

        try {
            byte[] bytes = objectMapper.writeValueAsBytes(body);
            DataBuffer buffer = response.bufferFactory().wrap(bytes);
            return response.writeWith(Mono.just(buffer));
        } catch (JsonProcessingException e) {
            log.error("Error writing forbidden response", e);
            return response.setComplete();
        }
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
