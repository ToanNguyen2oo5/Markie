package com.stewie.file.service;

import com.stewie.file.exception.AppException;
import com.stewie.file.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;

class FileValidatorTest {

    private FileValidator fileValidator;

    @BeforeEach
    void setUp() {
        fileValidator = new FileValidator();
    }

    @Test
    void testValidateValidJpeg() {
        byte[] jpegBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0};
        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", jpegBytes);
        assertDoesNotThrow(() -> fileValidator.validateAttachment(file));
    }

    @Test
    void testValidateValidPng() {
        byte[] pngBytes = new byte[]{(byte) 0x89, 'P', 'N', 'G', 0, 0, 0, 0};
        MockMultipartFile file = new MockMultipartFile("file", "image.png", "image/png", pngBytes);
        assertDoesNotThrow(() -> fileValidator.validateAttachment(file));
    }

    @Test
    void testValidateValidPdf() {
        byte[] pdfBytes = new byte[]{'%', 'P', 'D', 'F', '-', '1', '.', '7'};
        MockMultipartFile file = new MockMultipartFile("file", "document.pdf", "application/pdf", pdfBytes);
        assertDoesNotThrow(() -> fileValidator.validateAttachment(file));
    }

    @Test
    void testEmptyFileThrowsException() {
        MockMultipartFile file = new MockMultipartFile("file", "empty.png", "image/png", new byte[0]);
        AppException ex = assertThrows(AppException.class, () -> fileValidator.validateAttachment(file));
        assertEquals(ErrorCode.FILE_EMPTY, ex.getErrorCode());
    }

    @Test
    void testDisallowedExtensionThrowsException() {
        byte[] bytes = new byte[]{1, 2, 3, 4, 5};
        MockMultipartFile file = new MockMultipartFile("file", "malware.exe", "application/octet-stream", bytes);
        AppException ex = assertThrows(AppException.class, () -> fileValidator.validateAttachment(file));
        assertEquals(ErrorCode.INVALID_FILE_TYPE, ex.getErrorCode());
    }

    @Test
    void testSvgDisallowed() {
        byte[] bytes = "<svg></svg>".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "vector.svg", "image/svg+xml", bytes);
        AppException ex = assertThrows(AppException.class, () -> fileValidator.validateAttachment(file));
        assertEquals(ErrorCode.INVALID_FILE_TYPE, ex.getErrorCode());
    }

    @Test
    void testSanitizeFilename() {
        assertEquals("photo.png", fileValidator.sanitizeFilename("photo.png"));
        assertEquals("photo.png", fileValidator.sanitizeFilename("../../photo.png"));
        assertEquals("photo.png", fileValidator.sanitizeFilename("C:\\Users\\admin\\photo.png"));
        assertEquals("attachment", fileValidator.sanitizeFilename(null));
        assertEquals("attachment", fileValidator.sanitizeFilename(""));
    }
}
