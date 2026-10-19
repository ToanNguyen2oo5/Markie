package com.stewie.chat.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.stewie.chat.dto.response.ConversationResponse;
import com.stewie.chat.entity.Conversation;

@Mapper(componentModel = "spring")
public interface ConversationMapper {
    @Mapping(target = "conversationAvatar", ignore = true)
    @Mapping(target = "conversationName", ignore = true)
    ConversationResponse toConversationResponse(Conversation conversation);

    List<ConversationResponse> toConversationResponseList(List<Conversation> conversations);
}
