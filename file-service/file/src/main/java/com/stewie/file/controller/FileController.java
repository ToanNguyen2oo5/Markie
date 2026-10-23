package com.stewie.file.controller;

import com.stewie.file.dto.ApiResponse;
import com.stewie.file.dto.response.FileData;
import com.stewie.file.dto.response.FileResponse;
import com.stewie.file.service.FileService;
import com.stewie.file.service.FileValidator;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@RestController
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FileController {
    FileService fileService;
    FileValidator fileValidator;

    @PostMapping("/media/upload")
    public ApiResponse<?> uploadMedia(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "purpose", required = false) String purpose) throws IOException {

        if ("POST_ATTACHMENT".equalsIgnoreCase(purpose)) {
            return ApiResponse.builder()
                    .result(fileService.uploadAttachment(file))
                    .build();
        }

        return ApiResponse.<FileResponse>builder()
                .result(fileService.uploadFile(file))
                .build();
    }

    @GetMapping("/media/preview/{fileId}")
    public ResponseEntity<Resource> previewAttachment(@PathVariable String fileId) throws IOException {
        FileData fileData = fileService.getAttachmentPreview(fileId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, fileData.contentType())
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(fileData.size()))
                .body(fileData.resource());
    }

    @DeleteMapping("/media/{fileId}")
    public ApiResponse<Void> deleteTemporaryAttachment(@PathVariable String fileId) {
        fileService.deleteTemporaryFile(fileId);
        return ApiResponse.<Void>builder().build();
    }

    @GetMapping("/media/download/{fileName}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String fileName) throws IOException {
        FileData fileData = fileService.downloadFile(fileName);

        boolean isImage = fileValidator.isImageContentType(fileData.contentType());
        String filenameToUse = fileData.originalName() != null ? fileData.originalName() : fileName;

        ContentDisposition disposition = isImage
                ? ContentDisposition.inline().filename(filenameToUse, StandardCharsets.UTF_8).build()
                : ContentDisposition.attachment().filename(filenameToUse, StandardCharsets.UTF_8).build();

        var builder = ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, fileData.contentType() != null ? fileData.contentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff");

        if (fileData.size() > 0) {
            builder.header(HttpHeaders.CONTENT_LENGTH, String.valueOf(fileData.size()));
        }

        return builder.body(fileData.resource());
    }
}
