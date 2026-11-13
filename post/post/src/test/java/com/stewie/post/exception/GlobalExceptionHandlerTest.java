package com.stewie.post.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stewie.post.controller.PostController;
import com.stewie.post.service.PostService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;
import java.util.stream.Stream;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class GlobalExceptionHandlerTest {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private PostService postService;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        postService = mock(PostService.class);
        // Exercise the real advice through an existing controller with no infrastructure or AI.
        mvc = MockMvcBuilders.standaloneSetup(new PostController(postService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    static Stream<Arguments> moderationErrors() {
        return Stream.of(
                Arguments.of(ErrorCode.POST_CONTENT_REJECTED, 422, 1015,
                        "Nội dung bài viết chưa phù hợp. Vui lòng chỉnh sửa và thử lại."),
                Arguments.of(ErrorCode.MODERATION_UNAVAILABLE, 503, 1016,
                        "Chưa thể kiểm duyệt bài viết. Vui lòng thử lại sau."));
    }

    @ParameterizedTest
    @MethodSource("moderationErrors")
    void returnsModerationContractWithoutInternalDetails(ErrorCode error, int httpStatus, int code, String message)
            throws Exception {
        var exception = new AppException(error);
        // Synthetic sensitive data in the cause must never become part of the API response.
        exception.initCause(new RuntimeException(
                "api-key=fake-test-key; provider-body={\"internal\":\"fake-provider-detail\"}"));
        assertErrorResponse(exception, httpStatus, code, message);
    }

    static Stream<Arguments> existingErrors() {
        return Stream.of(
                Arguments.of(ErrorCode.UNCATEGORIZED_EXCEPTION, 500, 9999, "Uncategorized error"),
                Arguments.of(ErrorCode.INVALID_KEY, 400, 1001, "Uncategorized error"),
                Arguments.of(ErrorCode.INVALID_USERNAME, 400, 1003, "Username must be at least {min} characters"),
                Arguments.of(ErrorCode.INVALID_PASSWORD, 400, 1004, "Password must be at least {min} characters"),
                Arguments.of(ErrorCode.UNAUTHENTICATED, 401, 1006, "Unauthenticated"),
                Arguments.of(ErrorCode.UNAUTHORIZED, 403, 1007, "You do not have permission"),
                Arguments.of(ErrorCode.EMAIL_EXISTED, 400, 1008, "Email existed, please choose another one"),
                Arguments.of(ErrorCode.USER_EXISTED, 400, 1009, "Username existed, please choose another one"),
                Arguments.of(ErrorCode.USERNAME_IS_MISSING, 400, 1010, "Please enter username"),
                Arguments.of(ErrorCode.USERNAME_INVALID_CHARACTER, 400, 1011,
                        "username contains invalid character, please choose another one"),
                Arguments.of(ErrorCode.USER_NOT_EXISTED, 400, 1012, "user not found"),
                Arguments.of(ErrorCode.POST_NOT_EXISTED, 400, 1013, "post not found"),
                Arguments.of(ErrorCode.COMMENT_NOT_EXISTED, 400, 1014, "comment not found"));
    }

    @ParameterizedTest
    @MethodSource("existingErrors")
    void preservesExistingAppExceptionResponses(ErrorCode error, int httpStatus, int code, String message)
            throws Exception {
        assertErrorResponse(new AppException(error), httpStatus, code, message);
    }

    private void assertErrorResponse(AppException exception, int httpStatus, int code, String message)
            throws Exception {
        when(postService.getPostById("test-post")).thenThrow(exception);

        mvc.perform(get("/post/test-post"))
                .andExpect(status().is(httpStatus))
                // Strict JSON comparison also excludes result, stack trace, cause and provider fields.
                .andExpect(content().json(objectMapper.writeValueAsString(
                        Map.of("code", code, "message", message)), true));

        verify(postService).getPostById("test-post");
        verifyNoMoreInteractions(postService);
    }
}
