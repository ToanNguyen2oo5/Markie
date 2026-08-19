package com.stewie.event.dto;

import java.time.Instant;

import lombok.Builder;

@Builder
public record PostSyncEvent(
        String postId,
        String userId,
        String username,
        String content,
        Instant createdDate,
        String eventType // "CREATED", "UPDATED", "DELETED"
        ) {}
