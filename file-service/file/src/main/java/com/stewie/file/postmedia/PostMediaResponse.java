package com.stewie.file.postmedia;

public record PostMediaResponse(String fileId, String url, String contentType, long size, int width, int height) {}
