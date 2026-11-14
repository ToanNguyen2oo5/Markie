package com.stewie.post.service;

import java.time.Instant;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Stream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mapstruct.factory.Mappers;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import com.stewie.event.dto.PostSyncEvent;
import com.stewie.event.enums.EventType;
import com.stewie.post.dto.ApiResponse;
import com.stewie.post.dto.request.PostRequest;
import com.stewie.post.dto.response.ProfileResponse;
import com.stewie.post.entity.Post;
import com.stewie.post.exception.AppException;
import com.stewie.post.exception.ErrorCode;
import com.stewie.post.mapper.PostMapper;
import com.stewie.post.moderation.ModerationService;
import com.stewie.post.repository.PostRepository;
import com.stewie.post.repository.httpclient.ProfileClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    private static final String USER_ID = "unit-test-user";

    @Mock PostRepository postRepository;
    @Mock ProfileClient profileClient;
    @Mock KafkaTemplate<String, Object> kafkaTemplate;
    @Mock ModerationService moderationService;
    @Spy PostMapper postMapper = Mappers.getMapper(PostMapper.class);
    @InjectMocks PostService service;

    @BeforeEach
    void authenticate() {
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(USER_ID, null));
        SecurityContextHolder.setContext(context);
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    static Stream<String> allowedContent() {
        return Stream.of("Nội dung giả lập", "  Tiếng Việt 😀\n\t\"test\" \\  ", "a".repeat(500));
    }

    @ParameterizedTest
    @MethodSource("allowedContent")
    void moderatesBeforeSavingAndPublishingUnchangedContent(String content) {
        var before = Instant.now();
        when(postRepository.save(any(Post.class))).thenAnswer(invocation -> {
            Post post = invocation.getArgument(0);
            post.setId("unit-test-post");
            return post;
        });
        when(profileClient.getProfileByUserId(USER_ID)).thenReturn(
                ApiResponse.<ProfileResponse>builder()
                        .result(ProfileResponse.builder().username("test-username").build())
                        .build());
        when(kafkaTemplate.send(eq("post.sync.events"), any(PostSyncEvent.class)))
                .thenReturn(CompletableFuture.completedFuture(null));

        var response = service.createPost(PostRequest.builder().content(content).build());

        var moderatedContent = ArgumentCaptor.forClass(String.class);
        var savedPost = ArgumentCaptor.forClass(Post.class);
        var publishedEvent = ArgumentCaptor.forClass(PostSyncEvent.class);
        var order = inOrder(moderationService, postRepository, profileClient, kafkaTemplate, postMapper);
        order.verify(moderationService).assertAllowed(moderatedContent.capture());
        order.verify(postRepository).save(savedPost.capture());
        order.verify(profileClient).getProfileByUserId(USER_ID);
        order.verify(kafkaTemplate).send(eq("post.sync.events"), publishedEvent.capture());
        order.verify(postMapper).toPostResponse(savedPost.getValue());
        verifyNoMoreInteractions(moderationService, postRepository, profileClient, kafkaTemplate, postMapper);

        var post = savedPost.getValue();
        var event = publishedEvent.getValue();
        assertThat(moderatedContent.getValue()).isEqualTo(content);
        assertThat(post.getContent()).isEqualTo(moderatedContent.getValue());
        assertThat(event.content()).isEqualTo(moderatedContent.getValue());
        assertThat(post.getUserId()).isEqualTo(USER_ID);
        assertThat(post.getStats()).isNotNull();
        assertThat(post.getStats().getLikeCount()).isZero();
        assertThat(post.getStats().getCommentCount()).isZero();
        assertThat(post.getStats().getShareCount()).isZero();
        assertThat(post.getCreatedDate()).isBetween(before, Instant.now());
        assertThat(post.getModifiedDate()).isBetween(before, Instant.now());
        assertThat(event.postId()).isEqualTo(post.getId());
        assertThat(event.userId()).isEqualTo(USER_ID);
        assertThat(event.username()).isEqualTo("test-username");
        assertThat(event.createdDate()).isEqualTo(post.getCreatedDate());
        assertThat(event.eventType()).isEqualTo(EventType.CREATED);
        // Exercise the actual generated mapper to preserve the existing response fields.
        assertThat(response.getId()).isEqualTo(post.getId());
        assertThat(response.getUserId()).isEqualTo(USER_ID);
        assertThat(response.getContent()).isEqualTo(content);
        assertThat(response.getStats()).isEqualTo(post.getStats());
        assertThat(response.getCreatedDate()).isEqualTo(post.getCreatedDate());
        assertThat(response.getModifiedDate()).isEqualTo(post.getModifiedDate());
        assertThat(response.getUsername()).isNull();
    }

    @Test
    void propagatesRejection1015WithoutSideEffects() {
        assertModerationFailure(ErrorCode.POST_CONTENT_REJECTED, 1015);
    }

    @Test
    void propagatesUnavailable1016WithoutSideEffects() {
        assertModerationFailure(ErrorCode.MODERATION_UNAVAILABLE, 1016);
    }

    private void assertModerationFailure(ErrorCode errorCode, int code) {
        var content = "Nội dung giả lập";
        var failure = new AppException(errorCode);
        doThrow(failure).when(moderationService).assertAllowed(content);

        assertThatThrownBy(() -> service.createPost(PostRequest.builder().content(content).build()))
                .isSameAs(failure)
                .satisfies(exception -> assertThat(((AppException) exception).getErrorCode().getCode())
                        .isEqualTo(code));

        verify(moderationService).assertAllowed(content);
        verifyNoMoreInteractions(moderationService);
        verifyNoInteractions(postRepository, profileClient, kafkaTemplate, postMapper);
    }
}
