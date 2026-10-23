package com.stewie.file.service;

import com.stewie.file.exception.AppException;
import com.stewie.file.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;

@Component
@Slf4j
public class FileValidator {

    public static final long MAX_FILE_SIZE = 25L * 1024 * 1024; // 25 MiB
    public static final long MAX_TOTAL_SIZE = 50L * 1024 * 1024; // 50 MiB
    public static final int MAX_ATTACHMENTS = 10;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "webp", "gif",
            "pdf", "docx", "xlsx", "pptx", "txt", "csv", "zip"
    );

    private static final Map<String, String> EXTENSION_TO_CONTENT_TYPE = Map.ofEntries(
            Map.entry("jpg", "image/jpeg"),
            Map.entry("jpeg", "image/jpeg"),
            Map.entry("png", "image/png"),
            Map.entry("webp", "image/webp"),
            Map.entry("gif", "image/gif"),
            Map.entry("pdf", "application/pdf"),
            Map.entry("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            Map.entry("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            Map.entry("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
            Map.entry("txt", "text/plain"),
            Map.entry("csv", "text/csv"),
            Map.entry("zip", "application/zip")
    );

    public void validateAttachment(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() == 0) {
            throw new AppException(ErrorCode.FILE_EMPTY);
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new AppException(ErrorCode.FILE_TOO_LARGE);
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new AppException(ErrorCode.INVALID_FILE_TYPE);
        }

        String extension = StringUtils.getFilenameExtension(originalFilename);
        if (extension == null || !ALLOWED_EXTENSIONS.contains(extension.toLowerCase(Locale.ROOT))) {
            throw new AppException(ErrorCode.INVALID_FILE_TYPE);
        }

        String ext = extension.toLowerCase(Locale.ROOT);

        // Disallow dangerous extensions
        if (ext.equals("svg") || ext.equals("html") || ext.equals("htm") || ext.equals("exe") || ext.equals("sh")
                || ext.equals("bat") || ext.equals("docm") || ext.equals("xlsm")) {
            throw new AppException(ErrorCode.INVALID_FILE_TYPE);
        }

        // Validate magic bytes
        try (InputStream is = file.getInputStream()) {
            byte[] header = new byte[12];
            int read = is.read(header);
            if (read < 4) {
                throw new AppException(ErrorCode.INVALID_FILE_TYPE);
            }
            if (!validateMagicBytes(ext, header, read)) {
                log.warn("Magic byte mismatch for file {} with ext {}", originalFilename, ext);
                throw new AppException(ErrorCode.INVALID_FILE_TYPE);
            }
        } catch (IOException e) {
            log.error("Failed to read file header for {}", originalFilename, e);
            throw new AppException(ErrorCode.INVALID_FILE_TYPE);
        }
    }

    private boolean validateMagicBytes(String ext, byte[] header, int length) {
        switch (ext) {
            case "jpg":
            case "jpeg":
                return (header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF;
            case "png":
                return (header[0] & 0xFF) == 0x89 && header[1] == 'P' && header[2] == 'N' && header[3] == 'G';
            case "gif":
                return header[0] == 'G' && header[1] == 'I' && header[2] == 'F' && header[3] == '8';
            case "webp":
                if (length < 12) return false;
                return header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                        && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P';
            case "pdf":
                return header[0] == '%' && header[1] == 'P' && header[2] == 'D' && header[3] == 'F';
            case "zip":
            case "docx":
            case "xlsx":
            case "pptx":
                // Standard PK zip header
                return header[0] == 'P' && header[1] == 'K';
            case "txt":
            case "csv":
                // Text files: check that bytes are valid ascii / utf-8 text characters
                for (int i = 0; i < Math.min(length, 12); i++) {
                    int b = header[i] & 0xFF;
                    if (b == 0) return false; // NUL byte indicates binary file
                }
                return true;
            default:
                return false;
        }
    }

    public String sanitizeFilename(String filename) {
        if (filename == null) return "attachment";
        // Strip path traversal characters
        String clean = filename.replace("\\", "/");
        int lastSlash = clean.lastIndexOf('/');
        if (lastSlash >= 0) {
            clean = clean.substring(lastSlash + 1);
        }
        // Remove control characters (ASCII 0-31 and 127)
        clean = clean.replaceAll("[\\p{Cntrl}]", "");
        clean = clean.trim();
        if (clean.length() > 255) {
            clean = clean.substring(0, 255);
        }
        return clean.isEmpty() ? "attachment" : clean;
    }

    public String determineContentType(String extension, String reportedContentType) {
        if (extension != null) {
            String standard = EXTENSION_TO_CONTENT_TYPE.get(extension.toLowerCase(Locale.ROOT));
            if (standard != null) return standard;
        }
        return (reportedContentType != null && !reportedContentType.isBlank())
                ? reportedContentType
                : "application/octet-stream";
    }

    public boolean isImageContentType(String contentType) {
        if (contentType == null) return false;
        return contentType.equalsIgnoreCase("image/jpeg")
                || contentType.equalsIgnoreCase("image/png")
                || contentType.equalsIgnoreCase("image/webp")
                || contentType.equalsIgnoreCase("image/gif");
    }
}
