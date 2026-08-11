package com.stewie.post.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "comments")
@CompoundIndexes({
        @CompoundIndex(name = "idx_post_parent_id", def = "{'postId': 1, 'parentId': 1, '_id': -1}"),
        @CompoundIndex(name = "idx_parent_id",      def = "{'parentId': 1, '_id': -1}")
})
public class Comment {

    @Id
    private String id;

    private String postId;

    private String userId;

    //reply to another comment
    private String parentId;

    private String content;

    @Builder.Default
    private long likeCount = 0;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}