package com.stewie.chat.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.StringJoiner;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.stewie.chat.dto.request.ConversationRequest;
import com.stewie.chat.dto.response.ConversationResponse;
import com.stewie.chat.dto.response.ProfileResponse;
import com.stewie.chat.entity.Conversation;
import com.stewie.chat.entity.ParticipantInfo;
import com.stewie.chat.exception.AppException;
import com.stewie.chat.exception.ErrorCode;
import com.stewie.chat.mapper.ConversationMapper;
import com.stewie.chat.repository.ConversationRepository;
import com.stewie.chat.repository.httpclient.ProfileClient;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ConversationService {
    ConversationRepository conversationRepository;
    ProfileClient profileClient;
    ConversationMapper conversationMapper;

    public List<ConversationResponse> myConversations() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        List<Conversation> conversations = conversationRepository.findAllByParticipantIdsContains(userId);

        return conversations.stream()
                .map(conversation -> toConversationResponse(conversation, userId))
                .toList();
    }

    public ConversationResponse create(ConversationRequest request) {
        String currentUserId =
                SecurityContextHolder.getContext().getAuthentication().getName();

        // Filter out current user from participant list
        List<String> otherParticipantIds = request.getParticipantIds().stream()
                .filter(id -> StringUtils.hasText(id) && !id.equals(currentUserId))
                .distinct()
                .toList();

        if (otherParticipantIds.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_PARTICIPANTS, "At least one recipient user ID is required");
        }

        boolean isGroup = "GROUP".equalsIgnoreCase(request.getType()) || otherParticipantIds.size() > 1;

        if (!isGroup) {
            String targetUserId = otherParticipantIds.get(0);
            List<String> sortedUserIds =
                    List.of(currentUserId, targetUserId).stream().sorted().toList();
            String hash = generateParticipantHash(sortedUserIds);

            // Check if 1-on-1 conversation already exists
            var existing = conversationRepository.findByParticipantsHash(hash);
            if (existing.isPresent()) {
                return toConversationResponse(existing.get(), currentUserId);
            }

            // Fetch profiles
            ParticipantInfo me = fetchParticipantInfo(currentUserId);
            ParticipantInfo other = fetchParticipantInfo(targetUserId);

            Conversation newConversation = Conversation.builder()
                    .type("DIRECT")
                    .participantsHash(hash)
                    .participants(List.of(me, other))
                    .createdDate(Instant.now())
                    .modifiedDate(Instant.now())
                    .build();

            newConversation = conversationRepository.save(newConversation);
            return toConversationResponse(newConversation, currentUserId);
        } else {
            // Group conversation
            List<String> allUserIds = new ArrayList<>();
            allUserIds.add(currentUserId);
            allUserIds.addAll(otherParticipantIds);

            List<ParticipantInfo> participantInfos =
                    allUserIds.stream().map(this::fetchParticipantInfo).toList();

            Conversation newGroup = Conversation.builder()
                    .type("GROUP")
                    .participants(participantInfos)
                    .createdDate(Instant.now())
                    .modifiedDate(Instant.now())
                    .build();

            newGroup = conversationRepository.save(newGroup);
            return toConversationResponse(newGroup, currentUserId);
        }
    }

    public ParticipantInfo fetchParticipantInfo(String userId) {
        try {
            var response = profileClient.getProfileByUserId(userId);
            if (response != null && response.getResult() != null) {
                ProfileResponse p = response.getResult();
                return ParticipantInfo.builder()
                        .userId(p.getUserId())
                        .username(p.getUsername())
                        .firstName(p.getFirstName())
                        .lastName(p.getLastName())
                        .avatar(p.getAvatar())
                        .build();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch user profile for userId {}: {}", userId, e.getMessage());
        }

        // Fallback info if profile service is unreachable or profile is not yet created
        String fallbackName = "User_" + (userId.length() > 8 ? userId.substring(0, 8) : userId);
        return ParticipantInfo.builder()
                .userId(userId)
                .username(fallbackName)
                .firstName(fallbackName)
                .lastName("")
                .avatar(null)
                .build();
    }

    private String generateParticipantHash(List<String> ids) {
        StringJoiner stringJoiner = new StringJoiner("_");
        ids.forEach(stringJoiner::add);
        return stringJoiner.toString();
    }

    public ConversationResponse toConversationResponse(Conversation conversation, String currentUserId) {
        ConversationResponse response = conversationMapper.toConversationResponse(conversation);

        if ("GROUP".equalsIgnoreCase(conversation.getType())) {
            response.setConversationName(
                    "Nhóm trò chuyện (" + conversation.getParticipants().size() + ")");
            response.setConversationAvatar(null);
        } else {
            conversation.getParticipants().stream()
                    .filter(p -> !currentUserId.equals(p.getUserId()))
                    .findFirst()
                    .ifPresent(other -> {
                        String displayName = buildDisplayName(other);
                        response.setConversationName(displayName);
                        response.setConversationAvatar(other.getAvatar());
                    });
        }

        return response;
    }

    private String buildDisplayName(ParticipantInfo info) {
        if (StringUtils.hasText(info.getFirstName()) || StringUtils.hasText(info.getLastName())) {
            String first = info.getFirstName() != null ? info.getFirstName() : "";
            String last = info.getLastName() != null ? info.getLastName() : "";
            String full = (first + " " + last).trim();
            if (StringUtils.hasText(full)) {
                return full;
            }
        }
        return StringUtils.hasText(info.getUsername()) ? info.getUsername() : "Markie User";
    }
}
