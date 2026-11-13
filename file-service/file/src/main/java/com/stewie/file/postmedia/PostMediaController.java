package com.stewie.file.postmedia;

import com.stewie.file.dto.ApiResponse;
import com.stewie.file.exception.AppException;
import static com.stewie.file.exception.ErrorCode.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import java.io.IOException;
import jakarta.servlet.ServletException;

@RestController
public class PostMediaController {
    private final PostMediaSettings settings;
    private final PostImageValidator validator;
    private final PostMediaService service;
    public PostMediaController(PostMediaSettings settings, PostImageValidator validator, PostMediaService service) {
        this.settings = settings; this.validator = validator; this.service = service;
    }
    @PostMapping(value = "/internal/post-media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<PostMediaResponse> create(MultipartHttpServletRequest request, Authentication auth,
            @RequestHeader(value = PostMediaSettings.HEADER, required = false) String secret) throws IOException, ServletException {
        settings.authorize(secret);
        String owner = owner(auth);
        var parts = request.getParts();
        long count = parts.stream().filter(p -> p.getName().equals("image")).count();
        if (count > 1) throw new AppException(POST_IMAGE_COUNT_EXCEEDED);
        if (count == 0) throw new AppException(POST_IMAGE_REQUIRED);
        if (parts.size() != 1 || parts.iterator().next().getSubmittedFileName() == null)
            throw new AppException(POST_IMAGE_INVALID);
        return ApiResponse.<PostMediaResponse>builder()
                .result(service.create(validator.validate(request.getFiles("image")), owner)).build();
    }
    @DeleteMapping("/internal/post-media/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication auth,
            @RequestHeader(value = PostMediaSettings.HEADER, required = false) String secret) {
        settings.authorize(secret);
        service.delete(id, owner(auth));
        return ResponseEntity.noContent().build();
    }
    private String owner(Authentication auth) {
        if (auth == null || auth.getName() == null || auth.getName().isBlank())
            throw new AppException(UNAUTHENTICATED);
        return auth.getName();
    }
    @GetMapping("/post-media/{id}")
    public ResponseEntity<byte[]> read(@PathVariable String id) {
        var media = service.get(id);
        byte[] bytes = service.read(media);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(media.getContentType()))
                .contentLength(bytes.length).header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .cacheControl(CacheControl.noStore()).body(bytes);
    }
}
