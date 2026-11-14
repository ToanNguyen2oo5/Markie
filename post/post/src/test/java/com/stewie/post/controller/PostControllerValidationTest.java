package com.stewie.post.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stewie.post.dto.request.PostRequest;
import com.stewie.post.dto.response.PostResponse;
import com.stewie.post.exception.GlobalExceptionHandler;
import com.stewie.post.service.PostService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.Map;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PostControllerValidationTest {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private PostService postService;
    private LocalValidatorFactoryBean validator;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        postService = mock(PostService.class);
        validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        // Standalone MVC isolates validation from JWT filters and external infrastructure.
        // Production security is unchanged; these tests do not verify authentication.
        mvc = MockMvcBuilders.standaloneSetup(new PostController(postService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @AfterEach
    void tearDown() {
        validator.close();
    }

    static Stream<Arguments> invalidRequests() {
        return Stream.of(
                Arguments.of("{}", "POST_CONTENT_REQUIRED", 1017, "Vui lòng nhập nội dung bài viết."),
                Arguments.of("{\"content\":null}", "POST_CONTENT_REQUIRED", 1017, "Vui lòng nhập nội dung bài viết."),
                Arguments.of("{\"content\":\"\"}", "POST_CONTENT_REQUIRED", 1017, "Vui lòng nhập nội dung bài viết."),
                Arguments.of("{\"content\":\" \\t\\n\"}", "POST_CONTENT_REQUIRED", 1017, "Vui lòng nhập nội dung bài viết."),
                Arguments.of("{\"content\":\"" + "a".repeat(501) + "\"}", "POST_CONTENT_TOO_LONG",
                        1018, "Nội dung bài viết không được vượt quá 500 ký tự."),
                Arguments.of("{\"content\":\"" + "\uD83D\uDE0A".repeat(251) + "\"}", "POST_CONTENT_TOO_LONG",
                        1018, "Nội dung bài viết không được vượt quá 500 ký tự."));
    }

    @ParameterizedTest
    @MethodSource("invalidRequests")
    void rejectsInvalidContentBeforeCallingService(String json, String message, int code, String responseMessage)
            throws Exception {
        var result = mvc.perform(post("/create").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isBadRequest())
                .andExpect(content().json(objectMapper.writeValueAsString(
                        Map.of("code", code, "message", responseMessage)), true))
                .andReturn();

        assertThat(result.getResolvedException()).isInstanceOf(MethodArgumentNotValidException.class);
        var exception = (MethodArgumentNotValidException) result.getResolvedException();
        assertThat(exception.getBindingResult().getFieldError("content").getDefaultMessage())
                .isEqualTo(message);
        verifyNoInteractions(postService);
    }

    static Stream<String> validContent() {
        return Stream.of("a".repeat(500), "\uD83D\uDE0A".repeat(250), "  Xin chao! \t\n ");
    }

    @ParameterizedTest
    @MethodSource("validContent")
    void passesOriginalContentAndKeepsSuccessResponse(String content) throws Exception {
        when(postService.createPost(any(PostRequest.class)))
                .thenReturn(PostResponse.builder().id("test-post").content(content).build());

        mvc.perform(post("/create").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("content", content))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(1000))
                .andExpect(jsonPath("$.result.id").value("test-post"))
                .andExpect(jsonPath("$.result.content").value(content));

        var request = ArgumentCaptor.forClass(PostRequest.class);
        verify(postService).createPost(request.capture());
        assertThat(request.getValue().getContent()).isEqualTo(content);
        verifyNoMoreInteractions(postService);
    }
}
