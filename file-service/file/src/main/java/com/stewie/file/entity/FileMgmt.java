package com.stewie.file.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.MongoId;

import java.time.Instant;

@Setter
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "file_mgmt")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FileMgmt {
    @MongoId
    String id;
    String ownerId;
    String originalName;
    String contentType;
    long size;
    String md5Checksum;
    String path;

    String purpose; // POST_ATTACHMENT, AVATAR, LEGACY
    String state;   // TEMPORARY, CLAIMED, ATTACHED, DELETING
    String postId;

    Instant createdAt;
    Instant expiresAt;
    Instant updatedAt;
}
