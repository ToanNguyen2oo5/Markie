package com.stewie.gateway.configuration;

import java.util.concurrent.atomic.AtomicLong;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequestDecorator;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/** Bound both declared and chunked uploads without buffering the whole request. */
@Component
public class MediaUploadLimitFilter implements GlobalFilter, Ordered {
    static final long MAX_BYTES = 6_291_456;
    private static final class UploadTooLarge extends RuntimeException {}
    @Override public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        if (!path.startsWith("/post/") && !path.startsWith("/file/")) return chain.filter(exchange);
        if (exchange.getRequest().getHeaders().getContentLength() > MAX_BYTES) return reject(exchange);
        AtomicLong received = new AtomicLong();
        var request = new ServerHttpRequestDecorator(exchange.getRequest()) {
            @Override public Flux<DataBuffer> getBody() {
                return super.getBody().<DataBuffer>handle((buffer, sink) -> {
                    if (received.addAndGet(buffer.readableByteCount()) > MAX_BYTES) {
                        DataBufferUtils.release(buffer);
                        sink.error(new UploadTooLarge());
                    } else sink.next(buffer);
                }).doOnDiscard(DataBuffer.class, DataBufferUtils::release);
            }
        };
        return chain.filter(exchange.mutate().request(request).build())
                .onErrorResume(UploadTooLarge.class, error -> reject(exchange));
    }
    private Mono<Void> reject(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.PAYLOAD_TOO_LARGE);
        return exchange.getResponse().setComplete();
    }
    @Override public int getOrder() { return 0; }
}
