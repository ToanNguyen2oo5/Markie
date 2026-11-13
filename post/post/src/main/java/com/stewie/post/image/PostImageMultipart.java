package com.stewie.post.image;

import com.stewie.post.exception.AppException;
import jakarta.servlet.http.Part;
import org.springframework.http.MediaType;

import java.nio.charset.StandardCharsets;
import java.util.Collection;

import static com.stewie.post.exception.ErrorCode.*;

/** Structural guard for I06, called after content validation, with ALL request.getParts(). */
public final class PostImageMultipart {
    private PostImageMultipart() {}

    public static void validateParts(Collection<Part> parts) {
        long images = parts.stream().filter(p -> "image".equals(p.getName())).count();
        if (images > 1) throw new AppException(POST_IMAGE_COUNT_EXCEEDED);
        if (images == 0) throw new AppException(POST_IMAGE_REQUIRED);
        long contents = parts.stream().filter(p -> "content".equals(p.getName())).count();
        if (contents != 1 || parts.size() != 2) throw new AppException(POST_IMAGE_INVALID);
        for (Part part : parts) {
            if (("image".equals(part.getName()) && part.getSubmittedFileName() == null)
                    || ("content".equals(part.getName()) && part.getSubmittedFileName() != null)) {
                throw new AppException(POST_IMAGE_INVALID);
            }
            if ("content".equals(part.getName()) && part.getContentType() != null) {
                try {
                    MediaType type = MediaType.parseMediaType(part.getContentType());
                    if (!"text".equals(type.getType()) || !"plain".equals(type.getSubtype())
                            || (type.getCharset() != null && !StandardCharsets.UTF_8.equals(type.getCharset()))) {
                        throw new AppException(POST_IMAGE_INVALID);
                    }
                } catch (IllegalArgumentException e) {
                    throw new AppException(POST_IMAGE_INVALID);
                }
            }
        }
    }
}
