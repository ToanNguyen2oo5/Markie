package com.stewie.event.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AvatarUploadRequestedEvent {
    String sagaId;

    String userId;

    String url;

    String contentType; // image/jpeg, image/png
}
