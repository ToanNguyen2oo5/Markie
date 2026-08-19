package com.stewie.event.dto;

import java.time.Instant;

import com.stewie.event.enums.EventType;

import lombok.Builder;

@Builder
public record PostSyncEvent(
        String postId,
        String userId,
        String username,
        String content,
        Instant createdDate,
        EventType eventType) {}
