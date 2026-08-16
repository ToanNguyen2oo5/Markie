package com.stewie.file.service;

import com.stewie.file.dto.response.FileData;
import com.stewie.file.dto.response.FileResponse;
import com.stewie.file.exception.AppException;
import com.stewie.file.exception.ErrorCode;
import com.stewie.file.mapper.FileMgmtMapper;
import com.stewie.file.repository.FileMgmtRepository;
import com.stewie.file.repository.FileRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FileService {
    FileRepository fileRepository;
    FileMgmtRepository fileMgmtRepository;

    FileMgmtMapper fileMgmtMapper;

    public FileResponse uploadFile(MultipartFile file) throws IOException {

        var fileInfo = fileRepository.store(file);

        var fileMgmt = fileMgmtMapper.toFileMgmt(fileInfo);

        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        fileMgmt.setOwnerId(userId);

        fileMgmt = fileMgmtRepository.save(fileMgmt);
        return FileResponse.builder()
                .originalName(fileInfo.getName())
                .ownerId(userId)
                .url(fileInfo.getUrl())
                .build();
    }

    public FileResponse uploadFileFromSaga(byte[] fileData, String originalFilename, String contentType, String userId) throws IOException {

        var fileInfo = fileRepository.storeBytes(fileData, originalFilename, contentType);

        var fileMgmt = fileMgmtMapper.toFileMgmt(fileInfo);

        // SecurityContext is not available in Kafka listener thread, use provided userId
        fileMgmt.setOwnerId(userId);

        fileMgmt = fileMgmtRepository.save(fileMgmt);
        return FileResponse.builder()
                .originalName(fileInfo.getName())
                .ownerId(userId)
                .url(fileInfo.getUrl())
                .build();
    }

    public void deleteFileBySaga(String fileName) {
        fileMgmtRepository.findById(fileName).ifPresent(fileMgmt -> {
            fileMgmtRepository.delete(fileMgmt);
            try {
                fileRepository.deleteFile(fileMgmt.getId());
            } catch (IOException e) {
                log.error("Failed to delete physical file {}", fileMgmt.getId(), e);
            }
        });
    }

    public FileData downloadFile(String fileName) throws IOException {
        var fileMgmt = fileMgmtRepository.findById(fileName).orElseThrow(
                () -> new AppException(ErrorCode.FILE_NOT_FOUND)
        );

        var resource = fileRepository.read(fileMgmt);
        return new FileData(fileMgmt.getContentType(), resource);
    }
}
