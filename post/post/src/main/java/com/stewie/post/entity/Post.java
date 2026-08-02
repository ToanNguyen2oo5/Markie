package com.stewie.post.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.MongoId;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "posts")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Post {
    @MongoId
    @Field("post_id")
    String id;

    @Field("user_id")

    String userId;

    String content;

    PostStats stats = new PostStats();



    Instant createdDate;

    Instant modifiedDate;
}
