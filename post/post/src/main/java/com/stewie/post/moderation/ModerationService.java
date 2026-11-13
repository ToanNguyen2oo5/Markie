package com.stewie.post.moderation;

import java.util.function.BooleanSupplier;

import org.springframework.stereotype.Service;

import com.stewie.post.exception.AppException;
import com.stewie.post.exception.ErrorCode;
import com.stewie.post.image.PostImageValidator.ValidatedImage;

@Service
public class ModerationService {

    private final ModerationClient client;

    public ModerationService(ModerationClient client) {
        this.client = client;
    }

    public void assertAllowed(String content) {
        assertAllowed(() -> client.isFlagged(content));
    }

    public void assertAllowed(String content, ValidatedImage image) {
        assertAllowed(() -> client.isFlagged(content, image));
    }

    private void assertAllowed(BooleanSupplier check) {
        boolean flagged;
        try {
            flagged = check.getAsBoolean();
        } catch (ModerationProviderException exception) {
            throw new AppException(ErrorCode.MODERATION_UNAVAILABLE);
        }
        if (flagged) {
            throw new AppException(ErrorCode.POST_CONTENT_REJECTED);
        }
    }
}
