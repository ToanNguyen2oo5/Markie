package com.stewie.chat.dto.request;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ConversationRequest {
    @Builder.Default
    String type = "DIRECT"; // DIRECT, GROUP

    @NotEmpty(message = "Participant IDs list cannot be empty")
    List<String> participantIds;
}
