package com.stewie.post.moderation;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.util.Base64;
import java.util.List;
import java.util.stream.Stream;
import javax.imageio.ImageIO;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stewie.post.exception.AppException;
import com.stewie.post.exception.ErrorCode;
import com.stewie.post.image.PostImageValidator;
import com.stewie.post.image.PostImageValidator.ValidatedImage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.BearerTokenAuthenticationToken;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** Explicit objects and mock transport only: no application context or real network. */
class MultimodalModerationTest {
    private static final String ENDPOINT = "https://moderation.invalid/v1/moderations";
    private static final String CONTENT = "  Nội dung \"quoted\" \\ path\n\t🙂  ";
    private MockRestServiceServer server;
    private ModerationClient client;
    private ModerationService service;
    private ValidatedImage image;

    @BeforeEach
    void setUp() throws Exception {
        var properties = new ModerationProperties();
        properties.setApiKey("fake-unit-test-key");
        properties.setBaseUrl("https://moderation.invalid");
        properties.setModel("configured-test-model");
        properties.setConnectTimeoutMs(123);
        properties.setReadTimeoutMs(456);
        var builder = new ModerationConfiguration().moderationRestClient(properties).mutate();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new ModerationClient(builder.build(), properties);
        service = new ModerationService(client);
        image = validate(imageBytes("png"));
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
        SecurityContextHolder.clearContext();
        // Each expectation permits exactly one request. Retrying fails the test.
        server.verify();
    }

    private static byte[] imageBytes(String format) throws IOException {
        var output = new ByteArrayOutputStream();
        assertThat(ImageIO.write(new BufferedImage(3, 2, BufferedImage.TYPE_INT_RGB), format, output)).isTrue();
        return output.toByteArray();
    }

    private static ValidatedImage validate(byte[] bytes) {
        // Deliberately false caller metadata: the validated MIME must win.
        return new PostImageValidator().validate(List.of(
                new MockMultipartFile("image", "untrusted.gif", "image/gif", bytes)));
    }

    @ParameterizedTest
    @CsvSource({"png,image/png,false", "png,image/png,true", "jpg,image/jpeg,false", "jpg,image/jpeg,true"})
    void sendsExactMultimodalRequestAndUsesOnlyFirstBoolean(String format, String mime, boolean flagged)
            throws Exception {
        byte[] original = imageBytes(format);
        image = validate(original);
        byte[] snapshot = original.clone();
        original[0] ^= 1;
        image.bytes()[0] ^= 1;
        SecurityContextHolder.getContext().setAuthentication(
                new BearerTokenAuthenticationToken("fake-user-jwt"));
        var incoming = new MockHttpServletRequest();
        incoming.addHeader(HttpHeaders.AUTHORIZATION, "Bearer fake-user-jwt");
        incoming.addHeader("X-Post-Media-Internal-Secret", "fake-internal-secret");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(incoming));

        server.expect(requestTo(ENDPOINT))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer fake-unit-test-key"))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(request -> {
                    assertThat(request.getHeaders().get(HttpHeaders.AUTHORIZATION))
                            .containsExactly("Bearer fake-unit-test-key");
                    assertThat(request.getHeaders()).doesNotContainKey("X-Post-Media-Internal-Secret");
                    var body = new ObjectMapper().readTree(((MockClientHttpRequest) request).getBodyAsBytes());
                    assertThat(body.size()).isEqualTo(2);
                    assertThat(body.path("model").asText()).isEqualTo("configured-test-model");
                    var input = body.path("input");
                    assertThat(input.isArray()).isTrue();
                    assertThat(input.size()).isEqualTo(2);
                    assertThat(input.get(0).size()).isEqualTo(2);
                    assertThat(input.get(0).path("type").asText()).isEqualTo("text");
                    assertThat(input.get(0).path("text").asText()).isEqualTo(CONTENT);
                    assertThat(input.get(1).size()).isEqualTo(2);
                    assertThat(input.get(1).path("type").asText()).isEqualTo("image_url");
                    var imageUrl = input.get(1).path("image_url");
                    assertThat(imageUrl.size()).isEqualTo(1);
                    String url = imageUrl.path("url").asText();
                    String prefix = "data:" + mime + ";base64,";
                    assertThat(url).startsWith(prefix);
                    assertThat(Base64.getDecoder().decode(url.substring(prefix.length()))).isEqualTo(snapshot);
                })
                .andRespond(withSuccess("{\"results\":[{\"flagged\":" + flagged
                        + ",\"category_scores\":{\"hate\":0}},{\"flagged\":" + !flagged + "}]}",
                        MediaType.APPLICATION_JSON));

        if (flagged) assertServiceError(ErrorCode.POST_CONTENT_REJECTED, 1015);
        else assertThatCode(() -> service.assertAllowed(CONTENT, image)).doesNotThrowAnyException();
        assertThat(image.bytes()).isEqualTo(snapshot);
        assertThat(image.contentType()).isEqualTo(mime);
        assertThat(image.width()).isEqualTo(3);
        assertThat(image.height()).isEqualTo(2);
    }

    @ParameterizedTest
    @ValueSource(ints = {302, 401, 403, 429, 500, 502, 503, 504})
    void mapsHttpErrorsTo1016WithoutRetryOrProviderDetails(int status) {
        server.expect(requestTo(ENDPOINT)).andRespond(withStatus(HttpStatusCode.valueOf(status))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"results\":[{\"flagged\":false}],\"error\":\"fake-unit-test-key private-input\"}"));
        assertServiceError(ErrorCode.MODERATION_UNAVAILABLE, 1016);
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "", " ", "not-json private-input", "{", "null", "[]", "false", "{}",
        "{\"results\":null}", "{\"results\":{\"0\":{\"flagged\":false}}}",
        "{\"results\":[]}", "{\"results\":[null]}", "{\"results\":[false]}",
        "{\"results\":[[]]}", "{\"results\":[\"false\"]}", "{\"results\":[{}]}",
        "{\"results\":[{\"flagged\":null}]}", "{\"results\":[{\"flagged\":\"false\"}]}",
        "{\"results\":[{\"flagged\":\"true\"}]}", "{\"results\":[{\"flagged\":0}]}",
        "{\"results\":[{\"flagged\":1}]}", "{\"results\":[{\"flagged\":[]}]}",
        "{\"results\":[{\"flagged\":{}}]}", "{\"results\":[{}, {\"flagged\":false}]}"
    })
    void mapsMalformedResponsesTo1016WithoutRetry(String body) {
        server.expect(requestTo(ENDPOINT)).andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
        assertServiceError(ErrorCode.MODERATION_UNAVAILABLE, 1016);
    }

    static Stream<IOException> transportFailures() {
        return Stream.of(new ConnectException("fake-unit-test-key private-input"),
                new IOException("private provider response"),
                new SocketTimeoutException("read timeout private-input"));
    }

    @ParameterizedTest
    @MethodSource("transportFailures")
    void mapsTransportFailuresTo1016WithoutRetry(IOException failure) {
        server.expect(requestTo(ENDPOINT)).andRespond(withException(failure));
        assertServiceError(ErrorCode.MODERATION_UNAVAILABLE, 1016);
    }

    @Test
    void rejectsUnsupportedResponseType() {
        server.expect(requestTo(ENDPOINT)).andRespond(withSuccess("private-input", MediaType.TEXT_HTML));
        assertServiceError(ErrorCode.MODERATION_UNAVAILABLE, 1016);
    }

    @Test
    void textAndImageCallsShareTheSameClientAndConfiguredModel() {
        server.expect(requestTo(ENDPOINT)).andExpect(content().json(
                "{\"model\":\"configured-test-model\",\"input\":\"text only\"}", true))
                .andRespond(withSuccess("{\"results\":[{\"flagged\":false}]}", MediaType.APPLICATION_JSON));
        server.expect(requestTo(ENDPOINT)).andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer fake-unit-test-key"))
                .andRespond(withSuccess("{\"results\":[{\"flagged\":true}]}", MediaType.APPLICATION_JSON));
        service.assertAllowed("text only");
        assertThat(client.isFlagged(CONTENT, image)).isTrue();
    }

    @Test
    void missingValidatedImageCannotFallBackToTextOnly() {
        assertThatThrownBy(() -> service.assertAllowed(CONTENT, null))
                .isExactlyInstanceOf(NullPointerException.class).hasMessage("Validated image is required");
    }

    @Test
    void frameworkTraceLogsCannotExposeRequestOrProviderData() {
        Logger logger = (Logger) LoggerFactory.getLogger("org.springframework.web.client");
        Level previous = logger.getLevel();
        var events = new ListAppender<ILoggingEvent>();
        events.start();
        logger.addAppender(events);
        logger.setLevel(Level.TRACE);
        try {
            server.expect(requestTo(ENDPOINT)).andRespond(withSuccess(
                    "{\"results\":[{\"flagged\":false}],\"private\":\"private-provider-body\"}",
                    MediaType.APPLICATION_JSON));
            server.expect(requestTo(ENDPOINT)).andRespond(withSuccess(
                    "{\"results\":[{\"flagged\":false}]}", MediaType.APPLICATION_JSON));
            server.expect(requestTo(ENDPOINT)).andRespond(withStatus(HttpStatusCode.valueOf(500))
                    .body("private-provider-body fake-unit-test-key"));
            service.assertAllowed(CONTENT, image);
            service.assertAllowed(CONTENT);
            assertServiceError(ErrorCode.MODERATION_UNAVAILABLE, 1016);
            assertThat(events.list).isNotEmpty();
            assertThat(events.list).allSatisfy(event -> {
                assertThat(event.getFormattedMessage()).doesNotContain(CONTENT, "data:image/", "base64,",
                        Base64.getEncoder().encodeToString(image.bytes()), "fake-unit-test-key",
                        "private-provider-body");
                assertThat(event.getThrowableProxy()).isNull();
            });
        } finally {
            logger.setLevel(previous);
            logger.detachAppender(events);
            events.stop();
        }
    }

    private void assertServiceError(ErrorCode expected, int code) {
        assertThatThrownBy(() -> service.assertAllowed(CONTENT, image))
                .isExactlyInstanceOf(AppException.class)
                .hasMessage(expected.getMessage()).hasNoCause()
                .satisfies(failure -> {
                    assertThat(((AppException) failure).getErrorCode()).isEqualTo(expected);
                    assertThat(((AppException) failure).getErrorCode().getCode()).isEqualTo(code);
                    assertThat(failure.getSuppressed()).isEmpty();
                });
    }
}
