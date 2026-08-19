package org.stewie.event.dto;

import lombok.Builder;
import org.stewie.event.dto.enums.EventType;

// Event user profile
@Builder
public record ProfileSyncEvent(
        String userId,
        String profileId,
        String username,
        String firstName,
        String lastName,
        String email,
        String avatar,
        EventType eventType // "CREATED", "UPDATED", "DELETED"
        ) {}
