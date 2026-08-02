package com.stewie.post.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.mongodb.core.index.CompoundIndex;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@CompoundIndex(
        name = "uniq_post_user_like",
        def = "{'post_id': 1, 'user_id': 1}",
        unique = true
)
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PostStats {
    @Builder.Default
    long likeCount = 0;

    @Builder.Default
    long commentCount = 0;

    @Builder.Default
    long shareCount = 0;
}
