package com.stewie.post.moderation;

public class ModerationProviderException extends RuntimeException {

    public ModerationProviderException() {
        super("Moderation provider request failed");
    }
}
