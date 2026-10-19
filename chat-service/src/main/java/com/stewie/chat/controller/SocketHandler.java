package com.stewie.chat.controller;

import java.util.Map;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.annotation.OnConnect;
import com.corundumstudio.socketio.annotation.OnDisconnect;
import com.corundumstudio.socketio.annotation.OnEvent;
import com.stewie.chat.dto.request.ChatMessageRequest;
import com.stewie.chat.service.ChatMessageService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SocketHandler {
    SocketIOServer server;
    JwtDecoder jwtDecoder;
    ChatMessageService chatMessageService;

    @OnConnect
    public void clientConnected(SocketIOClient client) {
        String token = client.getHandshakeData().getSingleUrlParam("token");
        if (!StringUtils.hasText(token)) {
            var authHeader = client.getHandshakeData().getHttpHeaders().get("Authorization");
            if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }
        }

        if (!StringUtils.hasText(token)) {
            log.warn("Socket connection rejected: No token provided (sessionId: {})", client.getSessionId());
            client.disconnect();
            return;
        }

        try {
            Jwt jwt = jwtDecoder.decode(token);
            String userId = jwt.getSubject();

            client.set("userId", userId);
            // Join user personal room for targeted notifications
            client.joinRoom(userId);

            log.info("Socket client authenticated: sessionId={}, userId={}", client.getSessionId(), userId);
        } catch (Exception e) {
            log.error("Socket authentication failed for sessionId {}: {}", client.getSessionId(), e.getMessage());
            client.disconnect();
        }
    }

    @OnDisconnect
    public void clientDisconnected(SocketIOClient client) {
        String userId = client.get("userId");
        log.info("Socket client disconnected: sessionId={}, userId={}", client.getSessionId(), userId);
    }

    @OnEvent("join_conversation")
    public void onJoinConversation(SocketIOClient client, String conversationId) {
        if (StringUtils.hasText(conversationId)) {
            client.joinRoom(conversationId);
            log.info(
                    "Client {} (user {}) joined conversation {}",
                    client.getSessionId(),
                    client.get("userId"),
                    conversationId);
        }
    }

    @OnEvent("leave_conversation")
    public void onLeaveConversation(SocketIOClient client, String conversationId) {
        if (StringUtils.hasText(conversationId)) {
            client.leaveRoom(conversationId);
            log.info(
                    "Client {} (user {}) left conversation {}",
                    client.getSessionId(),
                    client.get("userId"),
                    conversationId);
        }
    }

    @OnEvent("typing")
    public void onTyping(SocketIOClient client, Map<String, Object> data) {
        if (data == null) return;
        String conversationId = (String) data.get("conversationId");
        String userId = client.get("userId");

        if (StringUtils.hasText(conversationId)) {
            server.getRoomOperations(conversationId)
                    .sendEvent(
                            "user_typing",
                            Map.of(
                                    "conversationId",
                                    conversationId,
                                    "userId",
                                    userId != null ? userId : "",
                                    "isTyping",
                                    Boolean.TRUE.equals(data.get("isTyping"))));
        }
    }

    @OnEvent("send_message")
    public void onSendMessage(SocketIOClient client, ChatMessageRequest request) {
        String userId = client.get("userId");
        if (!StringUtils.hasText(userId)) {
            log.warn("Attempt to send message from unauthenticated socket {}", client.getSessionId());
            return;
        }

        try {
            chatMessageService.createFromSocket(userId, request);
        } catch (Exception e) {
            log.error("Error processing socket message from user {}: {}", userId, e.getMessage());
            client.sendEvent("error", Map.of("message", e.getMessage()));
        }
    }

    @PostConstruct
    public void startServer() {
        server.start();
        server.addListeners(this);
        log.info(
                "Netty-SocketIO server started successfully on port {}",
                server.getConfiguration().getPort());
    }

    @PreDestroy
    public void stopServer() {
        server.stop();
        log.info("Netty-SocketIO server stopped");
    }
}
