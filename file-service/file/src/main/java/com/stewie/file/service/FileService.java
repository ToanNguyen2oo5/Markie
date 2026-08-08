package com.stewie.file.service;

import com.stewie.file.configuration.SecurityUtils;
import com.stewie.file.dto.response.FileResponse;
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
        String ownerName = SecurityUtils.getPreferredUsername();
        fileMgmt.setOwnerId(userId);

        fileMgmt = fileMgmtRepository.save(fileMgmt);
        return FileResponse.builder()
                .originalName(fileInfo.getName())
                .ownerId(userId)
                .ownerName(ownerName)
                .url(fileInfo.getUrl())
                .build();
    }
}
