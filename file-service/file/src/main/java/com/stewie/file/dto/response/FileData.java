package com.stewie.file.dto.response;

import org.springframework.core.io.Resource;

public record FileData(String contentType, Resource resource, String originalName, long size) {
    public FileData(String contentType, Resource resource) {
        this(contentType, resource, null, 0);
    }
}
