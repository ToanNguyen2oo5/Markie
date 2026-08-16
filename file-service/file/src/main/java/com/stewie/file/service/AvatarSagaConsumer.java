package com.stewie.file.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import com.stewie.event.dto.AvatarUpdateFailedEvent;
import com.stewie.event.dto.AvatarUploadRequestedEvent;
import com.stewie.event.dto.FileDeleted;
import com.stewie.event.dto.FileUploadedEvent;
import com.stewie.file.dto.response.FileResponse;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

import java.util.Base64;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class AvatarSagaConsumer {

    StringRedisTemplate stringRedisTemplate;
    KafkaTemplate<String, Object> kafkaTemplate;
    FileService fileService;

    @KafkaListener(topics = "avatar.upload.requested", groupId = "file-service-group")
    public void onAvatarUploadRequested(AvatarUploadRequestedEvent event) {
        log.info("Received AvatarUploadRequestedEvent for sagaId: {}", event.getSagaId());
        
        try {
            // 1. Fetch from Redis
            String redisKey = "avatar:" + event.getSagaId();
            String base64File = stringRedisTemplate.opsForValue().get(redisKey);
            
            if (base64File == null) {
                throw new RuntimeException("File data not found in Redis for sagaId: " + event.getSagaId());
            }

            // 2. Decode and save
            byte[] fileData = Base64.getDecoder().decode(base64File);
            FileResponse fileResponse = fileService.uploadFileFromSaga(
                    fileData, 
                    event.getUrl(), // this was mapped to originalFilename in profile-service
                    event.getContentType(), 
                    event.getUserId()
            );

            // 3. Delete from Redis to free up memory
            stringRedisTemplate.delete(redisKey);

            // 4. Publish success event
            FileUploadedEvent successEvent = FileUploadedEvent.builder()
                    .sagaId(event.getSagaId())
                    .userId(event.getUserId())
                    .newFileUrl(fileResponse.getUrl())
                    .storedFileName(fileResponse.getOriginalName())
                    .build();
            
            kafkaTemplate.send("avatar.file.uploaded", event.getSagaId(), successEvent);
            log.info("Successfully processed avatar upload for sagaId: {}", event.getSagaId());

        } catch (Exception e) {
            log.error("Failed to process avatar upload for sagaId: {}", event.getSagaId(), e);
            // Publish failure event (though not strictly handled in profile-service yet, it's good practice)
            // kafkaTemplate.send("avatar.file.upload.failed", event.getSagaId(), new FileUploadFailedEvent(...));
        }
    }

    @KafkaListener(topics = "avatar.profile.update.failed", groupId = "file-service-group")
    public void onAvatarProfileUpdateFailed(AvatarUpdateFailedEvent event) {
        log.info("Received AvatarUpdateFailedEvent for sagaId: {}. Compensating by deleting file...", event.getSagaId());
        
        try {
            fileService.deleteFileBySaga(event.getStoredFileName());
            
            FileDeleted deletedEvent = FileDeleted.builder()
                    .sagaId(event.getSagaId())
                    .userId(event.getUserId())
                    .deletedFileName(event.getStoredFileName())
                    .build();
                    
            kafkaTemplate.send("avatar.file.deleted", event.getSagaId(), deletedEvent);
            log.info("Compensation successful for sagaId: {}. File {} deleted.", event.getSagaId(), event.getStoredFileName());
        } catch (Exception e) {
            log.error("Compensation failed for sagaId: {}. Manual intervention may be required.", event.getSagaId(), e);
        }
    }
}
