package com.stewie.post.moderation;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;

import com.stewie.post.exception.AppException;
import com.stewie.post.exception.ErrorCode;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

class ModerationServiceTest {

    private static final String CONTENT = "  Nội dung giả lập\n  ";
    private final ModerationClient client = mock(ModerationClient.class);
    private final ModerationService service = new ModerationService(client);

    @Test
    void wiresServiceToExistingQualifiedClientWithNoDuplicateBeans() {
        new ApplicationContextRunner()
                .withUserConfiguration(ModerationConfiguration.class, ModerationClient.class, ModerationService.class)
                .withBean("otherRestClient", RestClient.class, () -> RestClient.builder().build())
                .withPropertyValues(
                        "app.moderation.api-key=fake-unit-test-key",
                        "app.moderation.base-url=https://moderation.invalid",
                        "app.moderation.model=configured-test-model",
                        "app.moderation.connect-timeout-ms=123",
                        "app.moderation.read-timeout-ms=456")
                .run(context -> {
                    assertThat(context).hasNotFailed().hasSingleBean(ModerationProperties.class)
                            .hasSingleBean(ModerationClient.class).hasSingleBean(ModerationService.class);
                    var wiredClient = context.getBean(ModerationClient.class);
                    assertThat(ReflectionTestUtils.getField(wiredClient, "restClient"))
                            .isSameAs(context.getBean("moderationRestClient"));
                    assertThat(ReflectionTestUtils.getField(context.getBean(ModerationService.class), "client"))
                            .isSameAs(wiredClient);
                });
    }

    @Test
    void allowsUnflaggedContent() {
        when(client.isFlagged(CONTENT)).thenReturn(false);
        assertThatCode(() -> service.assertAllowed(CONTENT)).doesNotThrowAnyException();
        verifySingleCall();
    }

    @Test
    void mapsFlaggedContentTo1015WithoutWrappingAsUnavailable() {
        when(client.isFlagged(CONTENT)).thenReturn(true);
        assertError(ErrorCode.POST_CONTENT_REJECTED, 1015);
        verifySingleCall();
    }

    @Test
    void mapsProviderFailureTo1016WithoutRetry() {
        when(client.isFlagged(CONTENT)).thenThrow(new ModerationProviderException());
        assertError(ErrorCode.MODERATION_UNAVAILABLE, 1016);
        verifySingleCall();
    }

    @Test
    void doesNotMaskProgrammingErrors() {
        var failure = new IllegalStateException("test programming error");
        when(client.isFlagged(CONTENT)).thenThrow(failure);
        assertThatThrownBy(() -> service.assertAllowed(CONTENT)).isSameAs(failure);
        verifySingleCall();
    }

    private void assertError(ErrorCode expected, int code) {
        assertThatThrownBy(() -> service.assertAllowed(CONTENT))
                .isExactlyInstanceOf(AppException.class)
                .hasMessage(expected.getMessage())
                .hasNoCause()
                .satisfies(exception -> {
                    var error = ((AppException) exception).getErrorCode();
                    assertThat(error).isSameAs(expected);
                    assertThat(error.getCode()).isEqualTo(code);
                });
    }

    private void verifySingleCall() {
        verify(client).isFlagged(CONTENT);
        verifyNoMoreInteractions(client);
    }
}
