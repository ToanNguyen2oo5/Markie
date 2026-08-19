package org.stewie.event.dto;

import lombok.Builder;
import org.stewie.event.enums.EventType;

import java.time.Instant;

@Builder
public record PostSyncEvent(
        String postId,
        String userId,
        String username,
        String content,
        Instant createdDate,
        EventType eventType) {}
