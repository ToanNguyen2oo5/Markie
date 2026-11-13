package com.stewie.post.moderation;

import java.io.IOException;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.util.stream.Stream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.BearerTokenAuthenticationToken;
import org.springframework.test.web.client.MockRestServiceServer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ModerationClientTest {

    private static final String CONTENT = "  Nội dung giả lập \"quoted\" \\ path\n\t🙂  ";
    private MockRestServiceServer server;
    private ModerationClient client;

    @BeforeEach
    void setUp() {
        var properties = new ModerationProperties();
        properties.setApiKey("fake-unit-test-key");
        properties.setBaseUrl("https://moderation.invalid");
        properties.setModel("configured-test-model");
        properties.setConnectTimeoutMs(123);
        properties.setReadTimeoutMs(456);
        // Reuse Task 02 headers/base URL; replace only the transport, before building.
        var builder = new ModerationConfiguration().moderationRestClient(properties).mutate();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new ModerationClient(builder.build(), properties);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        server.verify();
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void sendsExactRequestWithBackendKeyAndReadsBoolean(boolean flagged) {
        SecurityContextHolder.getContext().setAuthentication(
                new BearerTokenAuthenticationToken("fake-user-token"));
        server.expect(requestTo("https://moderation.invalid/v1/moderations"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer fake-unit-test-key"))
                .andExpect(request -> assertThat(request.getHeaders().get(HttpHeaders.AUTHORIZATION))
                        .containsExactly("Bearer fake-unit-test-key"))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {"model":"configured-test-model",
                         "input":"  Nội dung giả lập \\"quoted\\" \\\\ path\\n\\t🙂  "}
                        """, true))
                .andRespond(withSuccess("{\"extra\":{},\"results\":[{\"flagged\":" + flagged
                        + ",\"categories\":{}},{\"flagged\":" + !flagged + "}]}", MediaType.APPLICATION_JSON));

        assertThat(client.isFlagged(CONTENT)).isEqualTo(flagged);
    }

    @ParameterizedTest
    @ValueSource(ints = {302, 401, 403, 429, 500, 502, 503, 504})
    void rejectsHttpErrorsWithoutRetryOrSensitiveDetails(int status) {
        server.expect(requestTo("https://moderation.invalid/v1/moderations"))
                .andRespond(withStatus(HttpStatusCode.valueOf(status))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"results\":[{\"flagged\":false}],\"error\":\"fake-unit-test-key private-input\"}"));

        assertSanitizedFailure();
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "", " ", "not-json private-input", "{", "null", "[]", "false", "{}",
        "{\"results\":null}", "{\"results\":{\"0\":{\"flagged\":false}}}",
        "{\"results\":[]}", "{\"results\":[null]}", "{\"results\":[false]}",
        "{\"results\":[{}]}", "{\"results\":[{\"flagged\":null}]}",
        "{\"results\":[{\"flagged\":\"false\"}]}", "{\"results\":[{\"flagged\":\"true\"}]}",
        "{\"results\":[{\"flagged\":0}]}", "{\"results\":[{\"flagged\":1}]}",
        "{\"results\":[{\"flagged\":[]}]}", "{\"results\":[{\"flagged\":{}}]}",
        "{\"results\":[{}, {\"flagged\":false}]}"
    })
    void rejectsInvalidResponsesWithoutRetry(String body) {
        server.expect(requestTo("https://moderation.invalid/v1/moderations"))
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));

        assertSanitizedFailure();
    }

    @Test
    void rejectsUnsupportedResponseContentType() {
        server.expect(requestTo("https://moderation.invalid/v1/moderations"))
                .andRespond(withSuccess("private-input", MediaType.TEXT_HTML));
        assertSanitizedFailure();
    }

    static Stream<IOException> transportFailures() {
        return Stream.of(new ConnectException("fake-unit-test-key private-input"),
                new IOException("private provider response"),
                new SocketTimeoutException("read timeout private-input"));
    }

    @ParameterizedTest
    @MethodSource("transportFailures")
    void rejectsNetworkAndTimeoutFailuresWithoutRetry(IOException failure) {
        server.expect(requestTo("https://moderation.invalid/v1/moderations"))
                .andRespond(withException(failure));
        assertSanitizedFailure();
    }

    private void assertSanitizedFailure() {
        // Exactly one expected request; any retry fails at the mock transport.
        assertThatThrownBy(() -> client.isFlagged(CONTENT))
                .isExactlyInstanceOf(ModerationProviderException.class)
                .hasMessage("Moderation provider request failed")
                .hasNoCause()
                .hasStackTraceContaining("ModerationProviderException")
                .satisfies(exception -> assertThat(exception.getSuppressed()).isEmpty());
    }
}
