package com.stewie.post.dto.request;

import com.stewie.post.entity.PostStats;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PostRequest {
    String content;
    List<String> fileIds;
    String clientRequestId;
    @Builder.Default
    PostStats stats = new PostStats();
}
