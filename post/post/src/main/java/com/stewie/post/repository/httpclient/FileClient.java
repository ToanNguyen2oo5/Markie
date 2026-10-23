package com.stewie.post.repository.httpclient;

import com.stewie.post.dto.ApiResponse;
import com.stewie.post.dto.request.internal.ClaimAttachmentRequest;
import com.stewie.post.dto.request.internal.CommitAttachmentRequest;
import com.stewie.post.dto.request.internal.ReleaseAttachmentRequest;
import com.stewie.post.dto.response.internal.PostFileDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

import com.stewie.post.configuration.AuthenticationRequestInterceptor;

@FeignClient(
        name = "file-client",
        url = "${app.services.file.url}",
        configuration = {AuthenticationRequestInterceptor.class})
public interface FileClient {
    @PostMapping("/internal/post-attachments/claim")
    ApiResponse<List<PostFileDto>> claimPostAttachments(@RequestBody ClaimAttachmentRequest request);

    @PostMapping("/internal/post-attachments/commit")
    ApiResponse<Void> commitPostAttachments(@RequestBody CommitAttachmentRequest request);

    @PostMapping("/internal/post-attachments/release")
    ApiResponse<Void> releasePostAttachments(@RequestBody ReleaseAttachmentRequest request);
}
