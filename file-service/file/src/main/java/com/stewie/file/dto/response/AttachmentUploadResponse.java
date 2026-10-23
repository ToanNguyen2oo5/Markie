package com.stewie.file.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AttachmentUploadResponse {
    String fileId;
    String originalName;
    String contentType;
    Long size;
    String previewUrl;
    Instant expiresAt;
}
