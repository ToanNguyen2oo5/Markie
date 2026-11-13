package com.stewie.gateway.configuration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.http.HttpStatus;
import org.springframework.core.io.buffer.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.util.concurrent.atomic.AtomicBoolean;
import static org.assertj.core.api.Assertions.*;

class PostMediaGatewayTest {
    @ParameterizedTest @ValueSource(strings={"/file/internal/post-media","/file/internal/post-media/id","/file/internal/other"})
    void internalRoutesAreBlockedEvenWithBothCredentials(String path) {
        var exchange=MockServerWebExchange.from(MockServerHttpRequest.post(path).header("Authorization","Bearer fake").header("X-Post-Media-Internal-Secret","fake"));
        var called=new AtomicBoolean();
        new AuthenticationFilter().filter(exchange,e -> { called.set(true);return Mono.empty(); }).block();
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);assertThat(called.get()).isFalse();
    }
    @Test void publicReadKeepsFullContextPathAndRequiresNoJwt() {
        var exchange=MockServerWebExchange.from(MockServerHttpRequest.get("/file/post-media/id"));
        var called=new AtomicBoolean();
        new AuthenticationFilter().filter(exchange,e -> { called.set(true);assertThat(e.getRequest().getURI().getPath()).isEqualTo("/file/post-media/id");return Mono.empty(); }).block();
        assertThat(called.get()).isTrue();
    }
    @Test void postMediaWriteIsNotPublic() {
        var exchange=MockServerWebExchange.from(MockServerHttpRequest.post("/file/post-media/id"));
        new AuthenticationFilter().filter(exchange,e -> { throw new AssertionError("must reject"); }).block();
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
    @Test void genericReadRemainsPublic() {
        var exchange=MockServerWebExchange.from(MockServerHttpRequest.get("/file/media/download/old.png"));
        var called=new AtomicBoolean();new AuthenticationFilter().filter(exchange,e -> { called.set(true);return Mono.empty(); }).block();assertThat(called.get()).isTrue();
    }
    @ParameterizedTest @ValueSource(strings={"/post/create-with-image","/file/media/upload"})
    void declaredOversizeIsRejectedBeforeDownstream(String path) {
        var exchange=MockServerWebExchange.from(MockServerHttpRequest.post(path).header("Content-Length","6291457"));
        new MediaUploadLimitFilter().filter(exchange,e -> { throw new AssertionError("must reject"); }).block();
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
    }
    @ParameterizedTest @ValueSource(ints={6_291_456,6_291_457})
    void chunkedUploadIsCountedAndBoundaryIsInclusive(int size) {
        var factory=new DefaultDataBufferFactory();
        var body=Flux.just(factory.wrap(new byte[3_000_000]),factory.wrap(new byte[size-3_000_000]));
        var exchange=MockServerWebExchange.from(MockServerHttpRequest.post("/post/create-with-image").body(body));
        var bytes=new java.util.concurrent.atomic.AtomicLong();
        new MediaUploadLimitFilter().filter(exchange,e -> e.getRequest().getBody().doOnNext(b -> { bytes.addAndGet(b.readableByteCount());DataBufferUtils.release(b); }).then()).block();
        if(size==6_291_456) { assertThat(bytes.get()).isEqualTo(size);assertThat(exchange.getResponse().getStatusCode()).isNull(); }
        else { assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);assertThat(bytes.get()).isEqualTo(3_000_000); }
    }
}
