package com.stewie.event.dto;

import com.stewie.event.dto.enums.EventType;

import lombok.Builder;

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
