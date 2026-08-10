package com.stewie.profile.repository.httpclient;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

import com.stewie.profile.configuration.AuthenticationRequestInterceptor;
import com.stewie.profile.dto.ApiResponse;
import com.stewie.profile.dto.response.FileResponse;

@FeignClient(
        name = "file-service",
        url = "${spring.app.file-service.url}",
        configuration = {AuthenticationRequestInterceptor.class})
public interface FileClient {
    @PostMapping(value = "/file/media/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ApiResponse<FileResponse> uploadFile(@RequestPart("file") MultipartFile file);
}
