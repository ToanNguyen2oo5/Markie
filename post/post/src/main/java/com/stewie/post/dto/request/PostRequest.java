package com.stewie.post.dto.request;

import com.stewie.post.entity.PostStats;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PostRequest {

    String content;

    PostStats stats = new PostStats();


}
