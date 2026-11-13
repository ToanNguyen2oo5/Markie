package com.stewie.file.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(1001, "Uncategorized error", HttpStatus.BAD_REQUEST),
    UNAUTHENTICATED(1006, "Unauthenticated", HttpStatus.UNAUTHORIZED),
    EMAIL_EXISTED(1008, "Email existed, please choose another one", HttpStatus.BAD_REQUEST),
    USER_EXISTED(1009, "Username existed, please choose another one", HttpStatus.BAD_REQUEST),
    USERNAME_IS_MISSING(1010, "Please enter username", HttpStatus.BAD_REQUEST),
    USERNAME_INVALID_CHARACTER(
            1011, "username contains invalid character, please choose another one", HttpStatus.BAD_REQUEST),
    USER_NOT_EXISTED(1012, "user not found", HttpStatus.BAD_REQUEST),
    FILE_NOT_FOUND(1013, "file not found", HttpStatus.BAD_REQUEST),
    POST_IMAGE_REQUIRED(1019, "Image required", HttpStatus.BAD_REQUEST),
    POST_IMAGE_TOO_LARGE(1020, "Image exceeds 5 MiB", HttpStatus.PAYLOAD_TOO_LARGE),
    POST_IMAGE_INVALID(1021, "Invalid static JPEG/PNG image", HttpStatus.BAD_REQUEST),
    POST_IMAGE_DIMENSIONS_EXCEEDED(1022, "Image dimensions exceeded", HttpStatus.BAD_REQUEST),
    POST_IMAGE_COUNT_EXCEEDED(1023, "Only one image allowed", HttpStatus.BAD_REQUEST),
    POST_MEDIA_STORAGE_UNAVAILABLE(1024, "Post media unavailable", HttpStatus.SERVICE_UNAVAILABLE),
    POST_MEDIA_FORBIDDEN(1025, "Forbidden", HttpStatus.FORBIDDEN),
    POST_MEDIA_NOT_FOUND(1026, "Image not found", HttpStatus.NOT_FOUND);


    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

    private final int code;
    private final HttpStatusCode statusCode;
    private final String message;
}
