package com.stewie.event.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FileDeleted {
    String sagaId;
    String userId;
    String deletedFileName;
}
