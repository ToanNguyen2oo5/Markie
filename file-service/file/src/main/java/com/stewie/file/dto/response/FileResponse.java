package com.stewie.file.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FileResponse {
    String originalName;
    String ownerId;
    String ownerName;
    String url;
}
