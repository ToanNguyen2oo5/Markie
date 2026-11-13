package com.stewie.post.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(1001, "Uncategorized error", HttpStatus.BAD_REQUEST),
    INVALID_USERNAME(1003, "Username must be at least {min} characters", HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD(1004, "Password must be at least {min} characters", HttpStatus.BAD_REQUEST),
    UNAUTHENTICATED(1006, "Unauthenticated", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1007, "You do not have permission", HttpStatus.FORBIDDEN),
    EMAIL_EXISTED(1008, "Email existed, please choose another one", HttpStatus.BAD_REQUEST),
    USER_EXISTED(1009, "Username existed, please choose another one", HttpStatus.BAD_REQUEST),
    USERNAME_IS_MISSING(1010, "Please enter username", HttpStatus.BAD_REQUEST),
    USERNAME_INVALID_CHARACTER(
            1011, "username contains invalid character, please choose another one", HttpStatus.BAD_REQUEST),
    USER_NOT_EXISTED(1012, "user not found", HttpStatus.BAD_REQUEST),
    POST_NOT_EXISTED(1013, "post not found", HttpStatus.BAD_REQUEST),
    COMMENT_NOT_EXISTED(1014, "comment not found", HttpStatus.BAD_REQUEST),
    POST_CONTENT_REJECTED(
            1015, "Nội dung bài viết chưa phù hợp. Vui lòng chỉnh sửa và thử lại.", HttpStatus.UNPROCESSABLE_ENTITY),
    MODERATION_UNAVAILABLE(
            1016, "Chưa thể kiểm duyệt bài viết. Vui lòng thử lại sau.", HttpStatus.SERVICE_UNAVAILABLE),
    POST_CONTENT_REQUIRED(1017, "Vui lòng nhập nội dung bài viết.", HttpStatus.BAD_REQUEST),
    POST_CONTENT_TOO_LONG(
            1018, "Nội dung bài viết không được vượt quá 500 ký tự.", HttpStatus.BAD_REQUEST),
    POST_IMAGE_REQUIRED(1019, "Vui lòng chọn một ảnh.", HttpStatus.BAD_REQUEST),
    POST_IMAGE_TOO_LARGE(1020, "Ảnh không được vượt quá 5 MiB.", HttpStatus.PAYLOAD_TOO_LARGE),
    POST_IMAGE_INVALID(
            1021, "Ảnh không hợp lệ. Chỉ hỗ trợ ảnh JPEG hoặc PNG tĩnh.", HttpStatus.BAD_REQUEST),
    POST_IMAGE_DIMENSIONS_EXCEEDED(
            1022, "Kích thước ảnh vượt giới hạn cho phép.", HttpStatus.BAD_REQUEST),
    POST_IMAGE_COUNT_EXCEEDED(
            1023, "Mỗi bài viết chỉ được đính kèm một ảnh.", HttpStatus.BAD_REQUEST),
    POST_MEDIA_STORAGE_UNAVAILABLE(
            1024, "Chưa thể lưu ảnh. Vui lòng thử lại sau.", HttpStatus.SERVICE_UNAVAILABLE);

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

    private final int code;
    private final HttpStatusCode statusCode;
    private final String message;
}
