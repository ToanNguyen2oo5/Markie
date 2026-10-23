package com.stewie.post.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PostFile {
    String fileId;
    String url;
    String originalName;
    String contentType;
    Long size;
}
