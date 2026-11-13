package com.stewie.file.postmedia;

import com.stewie.file.dto.ApiResponse;
import com.stewie.file.exception.AppException;
import static com.stewie.file.exception.ErrorCode.*;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

@RestControllerAdvice(assignableTypes = PostMediaController.class)
@Order(-1)
public class PostMediaAdvice {
    @ExceptionHandler(AppException.class)
    public ResponseEntity<?> app(AppException e) {
        var code = e.getErrorCode();
        return ResponseEntity.status(code.getStatusCode()).body(ApiResponse.builder().code(code.getCode()).message(code.getMessage()).build());
    }
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<?> tooLarge() { return app(new AppException(POST_IMAGE_TOO_LARGE)); }
    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<?> malformed() { return app(new AppException(POST_IMAGE_INVALID)); }
    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<?> mediaType() { return ResponseEntity.status(415).build(); }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> unavailable() { return app(new AppException(POST_MEDIA_STORAGE_UNAVAILABLE)); }
}
