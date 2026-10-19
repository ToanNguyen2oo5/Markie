package com.stewie.chat.service;

import java.time.Instant;
import java.util.List;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.corundumstudio.socketio.SocketIOServer;
import com.stewie.chat.dto.request.ChatMessageRequest;
import com.stewie.chat.dto.response.ChatMessageResponse;
import com.stewie.chat.entity.ChatMessage;
import com.stewie.chat.entity.Conversation;
import com.stewie.chat.entity.ParticipantInfo;
import com.stewie.chat.exception.AppException;
import com.stewie.chat.exception.ErrorCode;
import com.stewie.chat.mapper.ChatMessageMapper;
import com.stewie.chat.repository.ChatMessageRepository;
import com.stewie.chat.repository.ConversationRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ChatMessageService {
    SocketIOServer socketIOServer;
    ChatMessageRepository chatMessageRepository;
    ConversationRepository conversationRepository;
    ConversationService conversationService;
    ChatMessageMapper chatMessageMapper;

    public List<ChatMessageResponse> getMessages(String conversationId) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        Conversation conversation = getValidatedConversation(conversationId, userId);

        var messages = chatMessageRepository.findAllByConversationIdOrderByCreatedDateAsc(conversationId);

        return messages.stream().map(msg -> toChatMessageResponse(msg, userId)).toList();
    }

    public ChatMessageResponse create(ChatMessageRequest request) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return processAndSaveMessage(userId, request);
    }

    public ChatMessageResponse createFromSocket(String senderUserId, ChatMessageRequest request) {
        return processAndSaveMessage(senderUserId, request);
    }

    private ChatMessageResponse processAndSaveMessage(String userId, ChatMessageRequest request) {
        Conversation conversation = getValidatedConversation(request.getConversationId(), userId);

        // Find or fetch sender participant info
        ParticipantInfo sender = conversation.getParticipants().stream()
                .filter(p -> userId.equals(p.getUserId()))
                .findFirst()
                .orElseGet(() -> conversationService.fetchParticipantInfo(userId));

        Instant now = Instant.now();
        ChatMessage chatMessage = ChatMessage.builder()
                .conversationId(request.getConversationId())
                .message(request.getMessage())
                .sender(sender)
                .createdDate(now)
                .build();

        chatMessage = chatMessageRepository.save(chatMessage);

        // Update conversation last message and modified time
        conversation.setLastMessage(chatMessage.getMessage());
        conversation.setLastMessageTime(now);
        conversation.setLastSenderId(userId);
        conversation.setModifiedDate(now);
        conversationRepository.save(conversation);

        // Convert to response
        ChatMessageResponse response = toChatMessageResponse(chatMessage, userId);

        // 1. Broadcast to conversation room (clients who have this chat window open)
        socketIOServer.getRoomOperations(request.getConversationId()).sendEvent("receive_message", response);

        // 2. Broadcast to each participant's user room for in-app notification / inbox badge
        for (ParticipantInfo participant : conversation.getParticipants()) {
            if (!userId.equals(participant.getUserId())) {
                socketIOServer.getRoomOperations(participant.getUserId()).sendEvent("receive_message", response);
                socketIOServer
                        .getRoomOperations(participant.getUserId())
                        .sendEvent("new_message_notification", response);
            }
        }

        return response;
    }

    private Conversation getValidatedConversation(String conversationId, String userId) {
        Conversation conversation = conversationRepository
                .findById(conversationId)
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));

        boolean isParticipant = conversation.getParticipants().stream().anyMatch(p -> userId.equals(p.getUserId()));

        if (!isParticipant) {
            throw new AppException(ErrorCode.CONVERSATION_NOT_FOUND);
        }

        return conversation;
    }

    private ChatMessageResponse toChatMessageResponse(ChatMessage chatMessage, String currentUserId) {
        ChatMessageResponse response = chatMessageMapper.toChatMessageResponse(chatMessage);
        response.setMe(currentUserId.equals(
                chatMessage.getSender() != null ? chatMessage.getSender().getUserId() : null));
        return response;
    }
}
