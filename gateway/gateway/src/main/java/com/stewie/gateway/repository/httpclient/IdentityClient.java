package com.stewie.gateway.repository.httpclient;

import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

import reactor.core.publisher.Mono;
import java.util.Map;

@HttpExchange
public interface IdentityClient {
    /**
     * Gọi Keycloak's OIDC /userinfo endpoint để lấy thông tin user từ Bearer Token.
     * Endpoint này cũng hoạt động như một cách xác minh token còn hợp lệ hay không.
     */
    @GetExchange("/realms/markie/protocol/openid-connect/userinfo")
    Mono<Map<String, Object>> getUserInfo(@RequestHeader("Authorization") String bearerToken);
}
