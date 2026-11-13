package com.stewie.post.image;

import com.stewie.post.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.autoconfigure.http.HttpMessageConvertersAutoConfiguration;
import org.springframework.boot.autoconfigure.web.servlet.DispatcherServletAutoConfiguration;
import org.springframework.boot.autoconfigure.web.servlet.MultipartAutoConfiguration;
import org.springframework.boot.autoconfigure.web.servlet.ServletWebServerFactoryAutoConfiguration;
import org.springframework.boot.autoconfigure.web.servlet.WebMvcAutoConfiguration;
import org.springframework.boot.autoconfigure.web.embedded.EmbeddedWebServerFactoryCustomizerAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Only an isolated test server: no production application, security, Mongo, Kafka, AI or File clients. */
@SpringBootTest(classes = PostImageMultipartTest.TestApp.class,
        properties = {"server.address=127.0.0.1", "logging.level.root=WARN"},
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@org.springframework.test.annotation.DirtiesContext(classMode = org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
class PostImageMultipartTest {
    @Configuration(proxyBeanMethods = false)
    @TestComponent
    @ImportAutoConfiguration({ServletWebServerFactoryAutoConfiguration.class, DispatcherServletAutoConfiguration.class,
            WebMvcAutoConfiguration.class, HttpMessageConvertersAutoConfiguration.class, MultipartAutoConfiguration.class,
            EmbeddedWebServerFactoryCustomizerAutoConfiguration.class})
    @Import({ProbeController.class, GlobalExceptionHandler.class})
    static class TestApp {}

    @RestController
    @TestComponent
    static class ProbeController {
        @PostMapping(value = "/probe", consumes = "multipart/form-data")
        String probe(MultipartHttpServletRequest request) throws Exception {
            PostImageMultipart.validateParts(request.getParts());
            return new PostImageValidator().validate(request.getFiles("image")).contentType();
        }

    }

    @LocalServerPort int port;
    @org.springframework.beans.factory.annotation.Autowired org.springframework.context.ApplicationContext context;
    private static final String BOUNDARY = "markie-test-boundary";

    @Test
    void usesProductionLimitsWithoutExternalInfrastructure() {
        var config = context.getBean(jakarta.servlet.MultipartConfigElement.class);
        assertThat(config.getMaxFileSize()).isEqualTo(5_242_880L);
        assertThat(config.getMaxRequestSize()).isEqualTo(6_291_456L);
        var server = (org.springframework.boot.web.embedded.tomcat.TomcatWebServer)
                ((org.springframework.boot.web.context.WebServerApplicationContext) context).getWebServer();
        var protocol = (org.apache.coyote.http11.AbstractHttp11Protocol<?>) server.getTomcat().getConnector().getProtocolHandler();
        assertThat(protocol.getMaxSwallowSize()).isEqualTo(-1);
        assertThat(context.getBeansOfType(com.mongodb.client.MongoClient.class)).isEmpty();
        assertThat(context.getBeansOfType(com.stewie.post.PostApplication.class)).isEmpty();
        assertThat(context.getBeansOfType(com.stewie.post.service.PostService.class)).isEmpty();
        assertThat(context.getBeansOfType(com.stewie.post.moderation.ModerationClient.class)).isEmpty();
    }

    private static byte[] part(String name, String filename, byte[] value) throws Exception {
        var output = new ByteArrayOutputStream();
        String header = "--" + BOUNDARY + "\r\nContent-Disposition: form-data; name=\"" + name + "\""
                + (filename == null ? "" : "; filename=\"" + filename + "\"") + "\r\n\r\n";
        output.write(header.getBytes(StandardCharsets.UTF_8));
        output.write(value);
        output.write("\r\n".getBytes(StandardCharsets.US_ASCII));
        return output.toByteArray();
    }

    private static byte[] body(byte[]... parts) throws Exception {
        var output = new ByteArrayOutputStream();
        for (byte[] part : parts) output.write(part);
        output.write(("--" + BOUNDARY + "--\r\n").getBytes(StandardCharsets.US_ASCII));
        return output.toByteArray();
    }

    private HttpResponse<String> send(byte[] body) throws Exception {
        try (HttpClient client = HttpClient.newHttpClient()) {
            return client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/post/probe"))
                    .header("Content-Type", "multipart/form-data; boundary=" + BOUNDARY)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body)).build(), HttpResponse.BodyHandlers.ofString());
        }
    }

    private static byte[] content() throws Exception { return part("content", null, new byte[]{65}); }
    private static byte[] image(int size) throws Exception { return part("image", "test.png", ImageFixtures.paddedPng(size)); }

    private void error(HttpResponse<String> response, int status, int code) throws Exception {
        assertThat(response.statusCode()).isEqualTo(status);
        var json = new com.fasterxml.jackson.databind.ObjectMapper().readTree(response.body());
        assertThat(json.size()).isEqualTo(2);
        assertThat(json.get("code").asInt()).isEqualTo(code);
        assertThat(json.get("message").asText()).isEqualTo(java.util.Arrays.stream(
                com.stewie.post.exception.ErrorCode.values()).filter(e -> e.getCode() == code).findFirst().orElseThrow().getMessage());
    }

    @Test
    void acceptsExactFileLimitIncludingMultipartOverhead() throws Exception {
        var response = send(body(content(), image(5_242_880)));
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).isEqualTo("image/png");
    }

    @Test
    void actualResolverRejectsFileOneByteOverLimit() throws Exception {
        error(send(body(content(), image(5_242_881))), 413, 1020);
    }

    @ParameterizedTest
    @CsvSource({"6291456,200", "6291457,413"})
    void actualResolverChecksExactTotalBoundary(int length, int expectedStatus) throws Exception {
        byte[] image = image(5_242_880);
        int overhead = body(content(), image).length - 1;
        byte[] bytes = body(part("content", null, new byte[length - overhead]), image);
        assertThat(bytes.length).isEqualTo(length);
        // Large text is intentional: this probe isolates transport; I06 must also validate content length.
        var response = send(bytes);
        if (expectedStatus == 413) error(response, 413, 1020);
        else assertThat(response.statusCode()).isEqualTo(200);
    }

    @ParameterizedTest
    @CsvSource({"file", "text", "empty"})
    void rejectsDuplicateImageIncludingTextOrEmptyPart(String kind) throws Exception {
        byte[] second = part("image", kind.equals("text") ? null : "other.png",
                kind.equals("empty") ? new byte[0] : new byte[]{65});
        error(send(body(content(), part("image", "first.png", ImageFixtures.image("png")), second)), 400, 1023);
    }

    @Test
    void rejectsMissingAndEmptyFile() throws Exception {
        error(send(body(content())), 400, 1019);
        error(send(body(content(), part("image", "empty.png", new byte[0]))), 400, 1019);
    }

    @Test
    void rejectsTextImageDuplicateContentBlobContentAndExtraParts() throws Exception {
        byte[] image = part("image", "test.png", ImageFixtures.image("png"));
        for (byte[] request : List.of(
                body(content(), part("image", null, "http://example.invalid/".getBytes(StandardCharsets.UTF_8))),
                body(content(), content(), image),
                body(part("content", "content.json", new byte[]{65}), image),
                body(content(), image, part("fileId", null, new byte[]{65})))) {
            error(send(request), 400, 1021);
        }
    }

    @Test
    void malformedMultipartGetsSafeResponse() throws Exception {
        try (HttpClient client = HttpClient.newHttpClient()) {
            var response = client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/post/probe"))
                    .header("Content-Type", "multipart/form-data")
                    .POST(HttpRequest.BodyPublishers.ofString("private-path-body")).build(), HttpResponse.BodyHandlers.ofString());
            error(response, 400, 1021);
        }
    }

    @ParameterizedTest
    @CsvSource({"text/plain; charset=UTF-8,200", "application/json,400", "text/plain; charset=ISO-8859-1,400"})
    void checksTextPartType(String type, int status) throws Exception {
        byte[] text = ("--" + BOUNDARY + "\r\nContent-Disposition: form-data; name=\"content\"\r\n"
                + "Content-Type: " + type + "\r\n\r\nA\r\n").getBytes(StandardCharsets.UTF_8);
        var response = send(body(text, part("image", "test.png", ImageFixtures.image("png"))));
        if (status == 400) error(response, 400, 1021);
        else assertThat(response.statusCode()).isEqualTo(200);
    }
}
