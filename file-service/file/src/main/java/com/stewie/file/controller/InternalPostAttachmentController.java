package com.stewie.file.controller;

import com.stewie.file.dto.ApiResponse;
import com.stewie.file.dto.request.ClaimAttachmentRequest;
import com.stewie.file.dto.request.CommitAttachmentRequest;
import com.stewie.file.dto.request.ReleaseAttachmentRequest;
import com.stewie.file.dto.response.PostFileDto;
import com.stewie.file.service.FileService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/internal/post-attachments")
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class InternalPostAttachmentController {
    FileService fileService;

    @PostMapping("/claim")
    public ApiResponse<List<PostFileDto>> claimPostAttachments(@RequestBody ClaimAttachmentRequest request) {
        log.info("Claim attachments request for postId: {}, count: {}", request.getPostId(),
                request.getFileIds() != null ? request.getFileIds().size() : 0);
        List<PostFileDto> claimed = fileService.claimPostAttachments(request);
        return ApiResponse.<List<PostFileDto>>builder()
                .result(claimed)
                .build();
    }

    @PostMapping("/commit")
    public ApiResponse<Void> commitPostAttachments(@RequestBody CommitAttachmentRequest request) {
        log.info("Commit attachments request for postId: {}", request.getPostId());
        fileService.commitPostAttachments(request);
        return ApiResponse.<Void>builder().build();
    }

    @PostMapping("/release")
    public ApiResponse<Void> releasePostAttachments(@RequestBody ReleaseAttachmentRequest request) {
        log.info("Release attachments request for postId: {}", request.getPostId());
        fileService.releasePostAttachments(request);
        return ApiResponse.<Void>builder().build();
    }
}
