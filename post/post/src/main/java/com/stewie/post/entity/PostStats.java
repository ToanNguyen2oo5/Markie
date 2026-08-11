package com.stewie.post.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PostStats {
    @Builder.Default
    long likeCount = 0;

    @Builder.Default
    long commentCount = 0;

    @Builder.Default
    long shareCount = 0;
}
