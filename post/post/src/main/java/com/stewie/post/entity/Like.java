package com.stewie.post.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;

import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "likes")
@CompoundIndex(
        name = "uniq_post_user_like",
        def = "{'post_id': 1, 'user_id': 1}",
        unique = true,
        // Shared development databases can also contain target_type/target_id likes.
        // Their existing unique index owns that schema; missing post_id is not a post like.
        partialFilter = "{'post_id': {'$exists': true}}"
)
public class Like {

    @Id
    private String id;

    @Field("post_id")
    private String postId;

    @Field("user_id")
    private String userId;

    @CreatedDate
    @Field("created_at")
    private Instant createdAt;
}
