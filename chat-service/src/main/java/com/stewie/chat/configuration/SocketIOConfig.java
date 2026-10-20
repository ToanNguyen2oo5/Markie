package com.stewie.chat.configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.protocol.JacksonJsonSupport;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@Configuration
public class SocketIOConfig {

    @Value("${app.socket.host:0.0.0.0}")
    private String host;

    @Value("${app.socket.port:8099}")
    private Integer port;

    @Bean
    public SocketIOServer socketIOServer() {
        com.corundumstudio.socketio.Configuration configuration = new com.corundumstudio.socketio.Configuration();
        configuration.setHostname(host);
        configuration.setPort(port);
        configuration.setOrigin(null);
        configuration.setEnableCors(true);
        configuration.setJsonSupport(new JacksonJsonSupport(new JavaTimeModule()));

        return new SocketIOServer(configuration);
    }
}
