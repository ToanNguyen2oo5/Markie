package com.stewie.profile.service;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import com.stewie.event.dto.AvatarUpdateFailedEvent;
import com.stewie.event.dto.FileUploadedEvent;
import com.stewie.profile.entity.UserProfile;
import com.stewie.profile.repository.UserProfileRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class AvatarSagaConsumer {

    UserProfileRepository userProfileRepository;
    KafkaTemplate<String, Object> kafkaTemplate;

    @KafkaListener(topics = "avatar.file.uploaded", groupId = "profile-service-group")
    public void onFileUploaded(FileUploadedEvent event) {
        log.info("Received FileUploadedEvent for sagaId: {}", event.getSagaId());

        try {
            UserProfile profile = userProfileRepository
                    .findByUserId(event.getUserId())
                    .orElseThrow(() -> new RuntimeException("Profile not found for userId: " + event.getUserId()));

            profile.setAvatar(event.getNewFileUrl());
            userProfileRepository.save(profile);

            log.info("Successfully updated avatar for userId: {} (sagaId: {})", event.getUserId(), event.getSagaId());
            // Optional: Publish AvatarUpdated event here if needed.

        } catch (Exception e) {
            log.error(
                    "Failed to update profile avatar for userId: {} (sagaId: {}). Triggering compensation...",
                    event.getUserId(),
                    event.getSagaId(),
                    e);

            // Compensation: Send event to file-service to delete the uploaded file
            AvatarUpdateFailedEvent compensationEvent = AvatarUpdateFailedEvent.builder()
                    .sagaId(event.getSagaId())
                    .userId(event.getUserId())
                    .storedFileName(event.getStoredFileName())
                    .build();

            kafkaTemplate.send("avatar.profile.update.failed", event.getSagaId(), compensationEvent);
        }
    }
}
