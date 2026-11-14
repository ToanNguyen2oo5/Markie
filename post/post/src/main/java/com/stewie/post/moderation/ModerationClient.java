package com.stewie.post.moderation;

import java.util.Map;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.fasterxml.jackson.databind.JsonNode;

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
        JsonNode response;
        try {
            response = restClient.post()
                    .uri("/v1/moderations")
                    .body(Map.of("model", properties.getModel(), "input", content))
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
}
