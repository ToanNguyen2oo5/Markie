package org.stewie.search.entity;


import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(indexName = "posts")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PostDocument {
    @Id
    String id;
    @Field(type = FieldType.Keyword)
    String userId;
    @Field(type = FieldType.Text, analyzer = "standard")
    String username;
    @Field(type = FieldType.Text, analyzer = "standard")
    String content;
    @Field(type = FieldType.Date)
    Instant createdDate;
    @Field(type = FieldType.Long)
    Long likeCount;
    @Field(type = FieldType.Long)
    Long commentCount;
}
