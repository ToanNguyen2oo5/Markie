package com.stewie.post.dto.response;

import com.stewie.post.entity.PostStats;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PostResponse {
    String id;

    String userId;

    String username;

    String content;

    PostStats stats = new PostStats();

    Instant createdDate;

    Instant modifiedDate;
}
