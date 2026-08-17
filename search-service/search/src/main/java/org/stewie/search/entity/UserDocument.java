package org.stewie.search.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(indexName = "users")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserDocument {
    @Id
    String userId;

    @Field(type = FieldType.Keyword)
    String profileId;

    @Field(type = FieldType.Text, analyzer = "standard")
    String username;

    @Field(type = FieldType.Text, analyzer = "standard")
    String firstName;

    @Field(type = FieldType.Text, analyzer = "standard")
    String lastName;

    @Field(type = FieldType.Keyword)
    String email;

    @Field(type = FieldType.Keyword)
    String avatar;
}
