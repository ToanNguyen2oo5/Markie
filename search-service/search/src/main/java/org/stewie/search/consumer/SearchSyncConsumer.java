package org.stewie.search.consumer;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.stewie.event.dto.PostSyncEvent;
import org.stewie.event.dto.ProfileSyncEvent;
import org.stewie.event.enums.EventType;
import org.stewie.search.entity.PostDocument;
import org.stewie.search.entity.UserDocument;
import org.stewie.search.repository.PostSearchRepository;
import org.stewie.search.repository.UserSearchRepository;

@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class SearchSyncConsumer {

    PostSearchRepository postSearchRepository;
    UserSearchRepository userSearchRepository;

    @KafkaListener(topics = "post.sync.events", groupId = "search-service-group")
    public void handlePostEvent(PostSyncEvent event) {
        log.info("Received post sync event: {}", event);
        if (EventType.DELETED.equals(event.eventType())) {
            postSearchRepository.deleteById(event.postId());
        } else {
            PostDocument doc = PostDocument.builder()
                    .id(event.postId())
                    .userId(event.userId())
                    .username(event.username())
                    .content(event.content())
                    .createdDate(event.createdDate())
                    .build();
            postSearchRepository.save(doc);
        }
    }

    @KafkaListener(topics = "profile.sync.events", groupId = "search-service-group")
    public void handleProfileEvent(ProfileSyncEvent event) {
        log.info("Received profile sync event: {}", event);
        if (EventType.DELETED.equals(event.eventType())) {
            userSearchRepository.deleteById(event.userId());
        } else {
            UserDocument doc = UserDocument.builder()
                    .userId(event.userId())
                    .profileId(event.profileId())
                    .username(event.username())
                    .firstName(event.firstName())
                    .lastName(event.lastName())
                    .email(event.email())
                    .avatar(event.avatar())
                    .build();
            userSearchRepository.save(doc);
        }
    }
}


