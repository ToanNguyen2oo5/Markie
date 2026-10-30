package com.stewie.post.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.MongoId;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "posts")
@CompoundIndexes({
        @CompoundIndex(name = "idx_user_id_desc", def = "{'user_id': 1, '_id': -1}"),
        @CompoundIndex(name = "idx_status_id_desc", def = "{'status': 1, '_id': -1}")
})
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Post {
    @MongoId
    String id;

    @Field("user_id")
    String userId;

    String content;

    PostStatus status;

    @Field("client_request_id")
    String clientRequestId;

    List<String> fileIds;

    @Builder.Default
    List<PostFile> files = new ArrayList<>();

    @Builder.Default
    PostStats stats = new PostStats();

    Instant createdDate;

    Instant modifiedDate;
}
