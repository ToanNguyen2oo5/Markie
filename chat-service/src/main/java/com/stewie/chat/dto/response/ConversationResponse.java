package com.stewie.chat.dto.response;

import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.stewie.chat.entity.ParticipantInfo;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ConversationResponse {
    String id;
    String type; // GROUP, DIRECT
    String participantsHash;
    String conversationAvatar;
    String conversationName;
    List<ParticipantInfo> participants;
    String lastMessage;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    Instant lastMessageTime;

    String lastSenderId;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    Instant createdDate;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    Instant modifiedDate;
}
