package com.stewie.post.repository.httpclient;

import com.stewie.post.image.PostImageValidator;
import com.stewie.post.exception.AppException;
import com.stewie.post.exception.ErrorCode;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.http.*;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.io.ByteArrayOutputStream;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class FileClientTest {
    static final String ID="12345678-1234-4123-8123-123456789abc";
    static final String PUBLIC="http://localhost:8888/file/post-media";
    PostImageValidator.ValidatedImage image;
    MockRestServiceServer server;
    FileClient client;
    @BeforeEach void setup() throws Exception {
        var bytes=new ByteArrayOutputStream();ImageIO.write(new BufferedImage(3,2,BufferedImage.TYPE_INT_RGB),"png",bytes);
        image=new PostImageValidator().validate(List.of(new MockMultipartFile("image","browser.svg","text/html",bytes.toByteArray())));
        var builder=RestClient.builder().baseUrl("https://file.invalid/file");
        server=MockRestServiceServer.bindTo(builder).build();
        client=new FileClient(builder.build(),"fake-backend-secret",PUBLIC);
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(Jwt.withTokenValue("fake-user-jwt")
                .header("alg","test").subject("alice").build(), List.of()));
    }
    @AfterEach void cleanup() { SecurityContextHolder.clearContext();org.springframework.web.context.request.RequestContextHolder.resetRequestAttributes(); }
    String response() { return "{\"code\":1000,\"result\":{\"fileId\":\""+ID+"\",\"url\":\""+PUBLIC+"/"+ID+"\",\"contentType\":\"image/png\",\"size\":"+image.size()+",\"width\":3,\"height\":2}}"; }
    void unavailable(Runnable call) {
        assertThatThrownBy(call::run).isInstanceOfSatisfying(AppException.class,e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.POST_MEDIA_STORAGE_UNAVAILABLE)).hasNoCause();
    }
    @Test void sendsOnlyBackendCredentialAndAuthenticatedJwtAndExactBytes() {
        var browser=new MockHttpServletRequest();browser.addHeader(FileClient.HEADER,"browser-injected-secret");browser.addHeader("Authorization","Bearer browser-injected-jwt");
        org.springframework.web.context.request.RequestContextHolder.setRequestAttributes(new org.springframework.web.context.request.ServletRequestAttributes(browser));
        server.expect(requestTo("https://file.invalid/file/internal/post-media")).andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization","Bearer fake-user-jwt")).andExpect(header(FileClient.HEADER,"fake-backend-secret"))
                .andExpect(request -> {
                    var mock=(org.springframework.mock.http.client.MockClientHttpRequest)request;
                    byte[] body=mock.getBodyAsBytes();
                    String raw=new String(body,java.nio.charset.StandardCharsets.ISO_8859_1);
                    assertThat(raw).contains("name=\"image\"; filename=\"image\"", "Content-Type: image/png");
                    assertThat(raw).doesNotContain("ownerId","browser-injected", "fake-user-jwt", "fake-backend-secret");
                    assertThat(raw).contains(new String(image.bytes(),java.nio.charset.StandardCharsets.ISO_8859_1));
                }).andRespond(withSuccess(response(),MediaType.APPLICATION_JSON));
        var media=client.create(image);
        assertThat(media.fileId()).isEqualTo(ID);assertThat(media.url()).isEqualTo(PUBLIC+"/"+ID);
        assertThat(media.size()).isEqualTo(image.size());assertThat(media.width()).isEqualTo(3);
        server.verify();
    }
    @Test void deleteUsesDedicatedCredentialsAndNoBody() {
        server.expect(requestTo("https://file.invalid/file/internal/post-media/"+ID)).andExpect(method(HttpMethod.DELETE))
                .andExpect(header("Authorization","Bearer fake-user-jwt")).andExpect(header(FileClient.HEADER,"fake-backend-secret"))
                .andExpect(content().string("")).andRespond(withNoContent());
        client.delete(ID);server.verify();
    }
    @ParameterizedTest @ValueSource(ints={200,301,302,307,401,403,404,413,500,503})
    void errorsAndRedirectsMapTo1024WithoutRetry(int status) {
        server.expect(requestTo("https://file.invalid/file/internal/post-media"))
                .andRespond(withStatus(HttpStatusCode.valueOf(status)).body("private-provider-body fake-secret").contentType(MediaType.APPLICATION_JSON));
        unavailable(() -> client.create(image));server.verify();
    }
    @ParameterizedTest @ValueSource(strings={"{}","null","[]","{\"code\":1000}","{\"code\":\"1000\"}","{\"code\":4294968296}","not-json"})
    void malformedEnvelopeIsRejected(String body) {
        server.expect(requestTo("https://file.invalid/file/internal/post-media")).andRespond(withSuccess(body,MediaType.APPLICATION_JSON));
        unavailable(() -> client.create(image));server.verify();
    }
    @ParameterizedTest @ValueSource(strings={"fileId","url","contentType","size","width","height"})
    void missingOrUntrustedMetadataIsRejected(String field) throws Exception {
        var mapper=new com.fasterxml.jackson.databind.ObjectMapper();var body=mapper.readTree(response());
        ((com.fasterxml.jackson.databind.node.ObjectNode)body.path("result")).remove(field);
        server.expect(requestTo("https://file.invalid/file/internal/post-media")).andRespond(withSuccess(body.toString(),MediaType.APPLICATION_JSON));
        unavailable(() -> client.create(image));server.verify();
    }
    @ParameterizedTest @ValueSource(strings={"url","contentType","size","width","height","fileId"})
    void metadataMustMatchImageAndTrustedUrl(String field) throws Exception {
        var body=new com.fasterxml.jackson.databind.ObjectMapper().readTree(response());
        var r=(com.fasterxml.jackson.databind.node.ObjectNode)body.path("result");
        if(field.equals("url"))r.put(field,"https://untrusted.invalid/file/post-media/"+ID);
        else if(field.equals("fileId"))r.put(field,"../other");
        else if(field.equals("contentType"))r.put(field,"image/jpeg");
        else r.put(field,999);
        server.expect(requestTo("https://file.invalid/file/internal/post-media")).andRespond(withSuccess(body.toString(),MediaType.APPLICATION_JSON));
        unavailable(() -> client.create(image));server.verify();
    }
    @Test void ioFailureIsSanitized() {
        server.expect(requestTo("https://file.invalid/file/internal/post-media")).andRespond(request -> { throw new java.io.IOException("private path token fake-backend-secret"); });
        unavailable(() -> client.create(image));server.verify();
    }
    @Test void missingSecurityContextCannotUseBrowserJwt() {
        SecurityContextHolder.clearContext();unavailable(() -> client.create(image));server.verify();
    }
    @Test void invalidDeleteIdNeverMakesRequest() { unavailable(() -> client.delete("../other"));server.verify(); }
    @ParameterizedTest @ValueSource(ints={200,302,401,403,500})
    void deleteFailuresAreSanitizedWithoutRetry(int status) {
        server.expect(requestTo("https://file.invalid/file/internal/post-media/"+ID))
                .andRespond(withStatus(HttpStatusCode.valueOf(status)).body("private-error fake-backend-secret"));
        unavailable(() -> client.delete(ID));server.verify();
    }
    @ParameterizedTest @ValueSource(strings={"", " ", "${UNSET}"})
    void secretConfigurationFailsStartup(String secret) {
        new org.springframework.boot.test.context.runner.ApplicationContextRunner()
                .withUserConfiguration(FileClientConfiguration.class)
                .withPropertyValues("app.post-media.internal-secret="+secret,
                        "app.post-media.file-base-url=http://localhost:8084/file", "app.post-media.public-base-url="+PUBLIC)
                .run(context -> assertThat(context).hasFailed());
    }
    @Test void productionTransportDoesNotFollowRedirects() throws Exception {
        var http=com.sun.net.httpserver.HttpServer.create(new java.net.InetSocketAddress("127.0.0.1",0),0);
        var redirected=new java.util.concurrent.atomic.AtomicInteger();
        http.createContext("/file/internal/post-media",exchange -> { exchange.getRequestBody().readAllBytes();exchange.getResponseHeaders().add("Location","/leak");exchange.sendResponseHeaders(302,-1);exchange.close(); });
        http.createContext("/leak",exchange -> { redirected.incrementAndGet();exchange.sendResponseHeaders(500,-1);exchange.close(); });
        http.start();
        try {
            var real=new FileClientConfiguration().fileClient("fake-backend-secret","http://localhost:"+http.getAddress().getPort()+"/file",PUBLIC);
            unavailable(() -> real.create(image));assertThat(redirected.get()).isZero();
        } finally { http.stop(0); }
    }
    @Test void dedicatedClientDoesNotModifyOtherRestClients() {
        var builder=RestClient.builder().baseUrl("https://profile.invalid");var otherServer=MockRestServiceServer.bindTo(builder).build();
        otherServer.expect(requestTo("https://profile.invalid/probe")).andExpect(headerDoesNotExist(FileClient.HEADER))
                .andExpect(headerDoesNotExist(HttpHeaders.AUTHORIZATION)).andRespond(withSuccess());
        builder.build().get().uri("/probe").retrieve().toBodilessEntity();otherServer.verify();
    }
    @Test void traceLogsContainNoCredentialsOrImageBytes() {
        var logger=(ch.qos.logback.classic.Logger)org.slf4j.LoggerFactory.getLogger("org.springframework.web.client");
        var previous=logger.getLevel();
        var events=new ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent>();
        events.start();logger.addAppender(events);logger.setLevel(ch.qos.logback.classic.Level.TRACE);
        try {
            server.expect(requestTo("https://file.invalid/file/internal/post-media")).andRespond(withSuccess(response(),MediaType.APPLICATION_JSON));
            server.expect(requestTo("https://file.invalid/file/internal/post-media")).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR).body("private-error fake-backend-secret"));
            client.create(image);unavailable(() -> client.create(image));server.verify();
            String logs=events.list.stream().map(ch.qos.logback.classic.spi.ILoggingEvent::getFormattedMessage).collect(java.util.stream.Collectors.joining("\n"));
            assertThat(logs).contains("PostMediaMultipart[redacted]").doesNotContain("fake-user-jwt","fake-backend-secret","private-error",java.util.Base64.getEncoder().encodeToString(image.bytes()));
            assertThat(events.list).allMatch(e -> e.getThrowableProxy()==null);
        } finally { logger.setLevel(previous);logger.detachAppender(events);events.stop(); }
    }
}
