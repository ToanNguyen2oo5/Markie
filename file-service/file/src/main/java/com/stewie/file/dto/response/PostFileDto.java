package com.stewie.file.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PostFileDto {
    String fileId;
    String url;
    String originalName;
    String contentType;
    Long size;
}
