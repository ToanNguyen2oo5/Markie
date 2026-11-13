package com.stewie.post.moderation;

import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.fasterxml.jackson.databind.JsonNode;
import com.stewie.post.image.PostImageValidator.ValidatedImage;

@Component
public class ModerationClient {

    private final RestClient restClient;
    private final ModerationProperties properties;

    public ModerationClient(
            @Qualifier("moderationRestClient") RestClient restClient,
            ModerationProperties properties) {
        this.restClient = restClient;
        this.properties = properties;
    }

    public boolean isFlagged(String content) {
        return moderate(content);
    }

    public boolean isFlagged(String content, ValidatedImage image) {
        Objects.requireNonNull(image, "Validated image is required");
        // I03 bounds the file before encoding. Read its defensive copy only once;
        // do not decode/re-encode pixels, cache Base64, or retain the byte copy.
        String dataUrl = "data:" + image.contentType() + ";base64,"
                + Base64.getEncoder().encodeToString(image.bytes());
        return moderate(List.of(
                Map.of("type", "text", "text", content),
                Map.of("type", "image_url", "image_url", Map.of("url", dataUrl))));
    }

    private boolean moderate(Object input) {
        JsonNode response;
        try {
            response = restClient.post()
                    .uri("/v1/moderations")
                    .body(new ModerationRequest(properties.getModel(), input))
                    .retrieve()
                    .onStatus(status -> !status.is2xxSuccessful(), (request, result) -> {
                        throw new ModerationProviderException();
                    })
                    .body(JsonNode.class);
        } catch (RestClientException exception) {
            // HTTP client exceptions can contain credentials, input or provider bodies.
            // Deliberately discard the original message and cause.
            throw new ModerationProviderException();
        }

        JsonNode results = response == null ? null : response.get("results");
        if (results == null || !results.isArray() || results.isEmpty()) {
            throw new ModerationProviderException();
        }
        JsonNode flagged = results.get(0).get("flagged");
        if (flagged == null || !flagged.isBoolean()) {
            throw new ModerationProviderException();
        }
        return flagged.booleanValue();
    }

    // RestClient formats the body via toString at DEBUG/TRACE. Keep the wire
    // fields available to Jackson without exposing text or Base64 to that log.
    private record ModerationRequest(String model, Object input) {
        @Override
        public String toString() {
            return "ModerationRequest[redacted]";
        }
    }
}
