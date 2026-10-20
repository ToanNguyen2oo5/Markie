package com.devteria.chat.mapper;

import java.util.List;

import org.mapstruct.Mapper;

import com.devteria.chat.dto.response.ConversationResponse;
import com.devteria.chat.entity.Conversation;

@Mapper(componentModel = "spring")
public interface ConversationMapper {
    ConversationResponse toConversationResponse(Conversation conversation);

    List<ConversationResponse> toConversationResponseList(List<Conversation> conversations);
}
