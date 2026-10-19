package com.stewie.chat.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import com.stewie.chat.entity.Conversation;

@Repository
public interface ConversationRepository extends MongoRepository<Conversation, String> {
    Optional<Conversation> findByParticipantsHash(String hash);

    @Query(value = "{'participants.userId' : ?0}", sort = "{'modifiedDate' : -1}")
    List<Conversation> findAllByParticipantIdsContains(String userId);
}
