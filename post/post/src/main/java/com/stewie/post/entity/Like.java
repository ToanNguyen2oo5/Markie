package com.stewie.post.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "likes")
@CompoundIndexes({
        @CompoundIndex(
                name = "uniq_target_user_like",
                def = "{'target_type': 1, 'target_id': 1, 'user_id': 1}",
                unique = true
        ),
        @CompoundIndex(
                name = "idx_target_recent",
                def = "{'target_type': 1, 'target_id': 1, '_id': -1}"
        )
})
public class Like {

    @Id
    private String id;

    @Field("target_type")
    private LikeTargetType targetType;

    @Field("target_id")
    private String targetId;

    @Field("user_id")
    private String userId;

    @CreatedDate
    @Field("created_at")
    private Instant createdAt;
}
