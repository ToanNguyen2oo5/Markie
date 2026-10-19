package com.stewie.chat.dto.request;

import jakarta.validation.constraints.NotBlank;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatMessageRequest {
    @NotBlank(message = "Conversation ID is required")
    String conversationId;

    @NotBlank(message = "Message content cannot be blank")
    String message;
}
