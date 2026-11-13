package com.stewie.post.dto.request;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class PostRequestValidationTest {
    private static ValidatorFactory factory;
    private static Validator validator;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    static Stream<Arguments> invalidRequests() {
        return Stream.of(
                Arguments.of("{}", "POST_CONTENT_REQUIRED"),
                Arguments.of("{\"content\":null}", "POST_CONTENT_REQUIRED"),
                Arguments.of("{\"content\":\"\"}", "POST_CONTENT_REQUIRED"),
                Arguments.of("{\"content\":\" \\t\\n\"}", "POST_CONTENT_REQUIRED"),
                Arguments.of("{\"content\":\"" + "a".repeat(501) + "\"}", "POST_CONTENT_TOO_LONG"),
                Arguments.of("{\"content\":\"" + "\uD83D\uDE0A".repeat(251) + "\"}", "POST_CONTENT_TOO_LONG"));
    }

    @ParameterizedTest
    @MethodSource("invalidRequests")
    void rejectsInvalidContent(String json, String message) throws Exception {
        PostRequest request = objectMapper.readValue(json, PostRequest.class);

        var violations = validator.validate(request);

        assertThat(violations).hasSize(1);
        var violation = violations.iterator().next();
        assertThat(violation.getPropertyPath().toString()).isEqualTo("content");
        assertThat(violation.getMessage()).isEqualTo(message);
    }

    static Stream<String> validContent() {
        return Stream.of("a".repeat(500), "\uD83D\uDE0A".repeat(250), "  Xin chao! \t\n ");
    }

    @ParameterizedTest
    @MethodSource("validContent")
    void acceptsContentWithoutChangingIt(String content) throws Exception {
        PostRequest request = objectMapper.readValue(
                objectMapper.writeValueAsString(java.util.Map.of("content", content)), PostRequest.class);

        assertThat(validator.validate(request)).isEmpty();
        assertThat(request.getContent()).isEqualTo(content);
    }
}
