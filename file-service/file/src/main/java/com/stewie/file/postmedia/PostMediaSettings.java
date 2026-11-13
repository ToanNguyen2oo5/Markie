package com.stewie.file.postmedia;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.net.URI;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
public class PostMediaSettings {
    public static final String HEADER = "X-Post-Media-Internal-Secret";
    final Path root;
    final String publicBase;
    private final byte[] secret;

    public PostMediaSettings(@Value("${app.post-media.internal-secret}") String secret,
            @Value("${app.post-media.storage-dir}") String root,
            @Value("${app.file.storage-dir}") String genericRoot,
            @Value("${app.post-media.public-base-url}") String publicBase) {
        if (secret == null || secret.isBlank() || secret.contains("${") || secret.contains("\r") || secret.contains("\n"))
            throw new IllegalArgumentException("POST_MEDIA_INTERNAL_SECRET must be configured");
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        if (root == null || root.isBlank() || genericRoot == null || genericRoot.isBlank())
            throw new IllegalArgumentException("Storage roots must be configured");
        this.root = Path.of(root).toAbsolutePath().normalize();
        Path generic = Path.of(genericRoot).toAbsolutePath().normalize();
        if (this.root.startsWith(generic) || generic.startsWith(this.root))
            throw new IllegalArgumentException("Post media and generic roots must be disjoint");
        URI uri = URI.create(publicBase);
        if (uri.getHost() == null || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
                || !("https".equals(uri.getScheme()) || ("http".equals(uri.getScheme()) && "localhost".equals(uri.getHost())))
                || !uri.getPath().equals("/file/post-media"))
            throw new IllegalArgumentException("Invalid post media public base URL");
        this.publicBase = publicBase;
    }

    public void authorize(String candidate) {
        if (candidate == null || !MessageDigest.isEqual(secret, candidate.getBytes(StandardCharsets.UTF_8)))
            throw new com.stewie.file.exception.AppException(com.stewie.file.exception.ErrorCode.POST_MEDIA_FORBIDDEN);
    }
}
