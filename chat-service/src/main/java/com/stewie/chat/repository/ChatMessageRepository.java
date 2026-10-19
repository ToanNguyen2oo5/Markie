package com.stewie.chat.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.stewie.chat.entity.ChatMessage;

@Repository
public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {
    List<ChatMessage> findAllByConversationIdOrderByCreatedDateAsc(String conversationId);

    List<ChatMessage> findAllByConversationIdOrderByCreatedDateDesc(String conversationId);

    Optional<ChatMessage> findFirstByConversationIdOrderByCreatedDateDesc(String conversationId);
}
