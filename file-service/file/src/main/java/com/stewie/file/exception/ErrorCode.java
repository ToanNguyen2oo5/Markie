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
    FILE_TOO_LARGE(1014, "File size exceeds maximum allowed limit of 25MB", HttpStatus.PAYLOAD_TOO_LARGE),
    INVALID_FILE_TYPE(1015, "File type not supported", HttpStatus.UNSUPPORTED_MEDIA_TYPE),
    FILE_EMPTY(1016, "File cannot be empty", HttpStatus.BAD_REQUEST),
    FILE_CLAIM_FAILED(1017, "Unable to claim file attachments", HttpStatus.CONFLICT),
    FILE_ACCESS_DENIED(1018, "Access denied to requested file", HttpStatus.FORBIDDEN),
    TOTAL_SIZE_EXCEEDED(1019, "Total file size exceeds maximum limit of 50MB", HttpStatus.BAD_REQUEST),
    TOO_MANY_FILES(1020, "Cannot attach more than 10 files per post", HttpStatus.BAD_REQUEST);


    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

    private final int code;
    private final HttpStatusCode statusCode;
    private final String message;
}
