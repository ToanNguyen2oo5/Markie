package com.stewie.chat.dto.response;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.stewie.chat.entity.ParticipantInfo;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatMessageResponse {
    String id;
    String conversationId;
    boolean me;
    String message;
    ParticipantInfo sender;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    Instant createdDate;
}
