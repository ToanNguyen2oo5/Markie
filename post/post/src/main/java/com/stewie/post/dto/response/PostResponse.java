package com.stewie.post.dto.response;

import com.stewie.post.entity.PostFile;
import com.stewie.post.entity.PostStats;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

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
    String status;

    @Builder.Default
    List<PostFile> files = new ArrayList<>();

    @Builder.Default
    PostStats stats = new PostStats();

    Instant createdDate;
    Instant modifiedDate;
}
