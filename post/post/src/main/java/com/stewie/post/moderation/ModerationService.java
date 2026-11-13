package com.stewie.post.moderation;

import org.springframework.stereotype.Service;

import com.stewie.post.exception.AppException;
import com.stewie.post.exception.ErrorCode;

@Service
public class ModerationService {

    private final ModerationClient client;

    public ModerationService(ModerationClient client) {
        this.client = client;
    }

    public void assertAllowed(String content) {
        boolean flagged;
        try {
            flagged = client.isFlagged(content);
        } catch (ModerationProviderException exception) {
            throw new AppException(ErrorCode.MODERATION_UNAVAILABLE);
        }
        if (flagged) {
            throw new AppException(ErrorCode.POST_CONTENT_REJECTED);
        }
    }
}
