package com.stewie.chat.entity;

import java.time.Instant;
import java.util.List;

import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.MongoId;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Setter
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "conversation")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Conversation {
    @MongoId
    String id;

    String type; // GROUP, DIRECT

    @Indexed(unique = true, sparse = true)
    String participantsHash;

    List<ParticipantInfo> participants;

    String lastMessage;

    Instant lastMessageTime;

    String lastSenderId;

    @Indexed
    Instant createdDate;

    @Indexed
    Instant modifiedDate;
}
