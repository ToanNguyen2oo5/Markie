package com.stewie.chat.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.stewie.chat.dto.request.ChatMessageRequest;
import com.stewie.chat.dto.response.ChatMessageResponse;
import com.stewie.chat.entity.ChatMessage;

@Mapper(componentModel = "spring")
public interface ChatMessageMapper {
    @Mapping(target = "me", ignore = true)
    ChatMessageResponse toChatMessageResponse(ChatMessage chatMessage);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "sender", ignore = true)
    @Mapping(target = "createdDate", ignore = true)
    ChatMessage toChatMessage(ChatMessageRequest request);

    List<ChatMessageResponse> toChatMessageResponses(List<ChatMessage> chatMessages);
}
