package com.stewie.post.repository.httpclient;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;

@Configuration(proxyBeanMethods = false)
public class FileClientConfiguration {
    @Bean
    public FileClient fileClient(
            @Value("${app.post-media.internal-secret}") String secret,
            @Value("${app.post-media.file-base-url}") String base,
            @Value("${app.post-media.public-base-url}") String publicBase) {
        URI uri = URI.create(base);
        if (!FileClient.trustedBase(uri, "/file")) throw new IllegalArgumentException("Invalid File backend URL");
        HttpClient transport = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER)
                .connectTimeout(Duration.ofSeconds(2)).build();
        var factory = new JdkClientHttpRequestFactory(transport);
        factory.setReadTimeout(Duration.ofSeconds(5));
        return new FileClient(RestClient.builder().requestFactory(factory).baseUrl(base).build(), secret, publicBase);
    }
}
