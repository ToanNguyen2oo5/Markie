package com.stewie.post.repository.httpclient;

import com.fasterxml.jackson.databind.JsonNode;
import com.stewie.post.exception.AppException;
import com.stewie.post.exception.ErrorCode;
import com.stewie.post.image.PostImageValidator.ValidatedImage;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import java.net.URI;

/** Dedicated client: credentials are attached per call, never via shared interceptors. */
public class FileClient {
    public static final String HEADER = "X-Post-Media-Internal-Secret";
    private final RestClient client;
    private final String secret;
    private final String publicBase;
    public record Media(String fileId, String url, String contentType, long size, int width, int height) {}

    public FileClient(RestClient client, String secret, String publicBase) {
        if (secret == null || secret.isBlank() || secret.contains("${") || secret.contains("\r") || secret.contains("\n"))
            throw new IllegalArgumentException("POST_MEDIA_INTERNAL_SECRET must be configured");
        if (!trustedBase(URI.create(publicBase), "/file/post-media"))
            throw new IllegalArgumentException("Invalid public media URL");
        this.client = client; this.secret = secret; this.publicBase = publicBase;
    }
    static boolean trustedBase(URI uri, String path) {
        return uri.getHost() != null && uri.getUserInfo() == null && uri.getQuery() == null && uri.getFragment() == null
                && uri.getPath().equals(path) && ("https".equals(uri.getScheme())
                || ("http".equals(uri.getScheme()) && "localhost".equals(uri.getHost())));
    }
    private String jwt() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken token) || !auth.isAuthenticated()) throw unavailable();
        return token.getToken().getTokenValue();
    }
    private static boolean validId(String id) {
        return id != null && id.matches("[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}");
    }
    public Media create(ValidatedImage image) {
        try {
            HttpHeaders partHeaders = new HttpHeaders();
            partHeaders.setContentType(MediaType.parseMediaType(image.contentType()));
            // RestClient DEBUG/TRACE prints body.toString(); never print bytes or image content.
            var body = new LinkedMultiValueMap<String, Object>() {
                @Override public String toString() { return "PostMediaMultipart[redacted]"; }
            };
            var resource = new ByteArrayResource(image.bytes()) {
                @Override public String getFilename() { return "image"; }
            };
            body.add("image", new HttpEntity<>(resource, partHeaders));
            var response = client.post().uri("/internal/post-media")
                    .headers(h -> { h.setBearerAuth(jwt()); h.set(HEADER, secret); })
                    .contentType(MediaType.MULTIPART_FORM_DATA).body(body).retrieve().toEntity(JsonNode.class);
            if (response.getStatusCode().value() != 200) throw unavailable();
            JsonNode envelope = response.getBody();
            if (envelope == null || !matches(envelope.path("code"), 1000))
                throw unavailable();
            JsonNode r = envelope.path("result");
            String id = r.path("fileId").textValue();
            String url = r.path("url").textValue();
            if (!validId(id) || !(publicBase + "/" + id).equals(url)
                    || !image.contentType().equals(r.path("contentType").textValue())
                    || !matches(r.path("size"), image.size()) || !matches(r.path("width"), image.width())
                    || !matches(r.path("height"), image.height())) throw unavailable();
            return new Media(id, url, image.contentType(), image.size(), image.width(), image.height());
        } catch (RuntimeException e) { throw unavailable(); }
    }
    private static boolean matches(JsonNode value, long expected) {
        return value.isIntegralNumber() && value.canConvertToLong() && value.longValue() == expected;
    }
    public void delete(String fileId) {
        if (!validId(fileId)) throw unavailable();
        try {
            var response = client.delete().uri("/internal/post-media/{id}", fileId)
                    .headers(h -> { h.setBearerAuth(jwt()); h.set(HEADER, secret); })
                    .retrieve().toBodilessEntity();
            if (response.getStatusCode().value() != 204) throw unavailable();
        } catch (RuntimeException e) { throw unavailable(); }
    }
    private static AppException unavailable() { return new AppException(ErrorCode.POST_MEDIA_STORAGE_UNAVAILABLE); }
}
