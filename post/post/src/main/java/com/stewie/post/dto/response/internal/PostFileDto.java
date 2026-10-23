package com.stewie.post.dto.response.internal;

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
