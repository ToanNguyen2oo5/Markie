package com.stewie.file.service;

import com.stewie.file.dto.FileInfo;
import com.stewie.file.dto.request.ClaimAttachmentRequest;
import com.stewie.file.dto.request.CommitAttachmentRequest;
import com.stewie.file.dto.request.ReleaseAttachmentRequest;
import com.stewie.file.dto.response.AttachmentUploadResponse;
import com.stewie.file.dto.response.FileData;
import com.stewie.file.dto.response.FileResponse;
import com.stewie.file.dto.response.PostFileDto;
import com.stewie.file.entity.FileMgmt;
import com.stewie.file.exception.AppException;
import com.stewie.file.exception.ErrorCode;
import com.stewie.file.mapper.FileMgmtMapper;
import com.stewie.file.repository.FileMgmtRepository;
import com.stewie.file.repository.FileRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FileService {
    FileRepository fileRepository;
    FileMgmtRepository fileMgmtRepository;
    FileMgmtMapper fileMgmtMapper;
    FileValidator fileValidator;

    @NonFinal
    @Value("${app.file.download-prefix}")
    String downloadPrefix;

    @NonFinal
    @Value("${app.file.preview-prefix}")
    String previewPrefix;

    /**
     * Legacy / avatar file upload (preserves original behavior)
     */
    public FileResponse uploadFile(MultipartFile file) throws IOException {
        var fileInfo = fileRepository.store(file);
        var fileMgmt = fileMgmtMapper.toFileMgmt(fileInfo);

        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        fileMgmt.setOwnerId(userId);
        fileMgmt.setOriginalName(file.getOriginalFilename());
        fileMgmt.setPurpose("LEGACY");
        fileMgmt.setState("ATTACHED");
        fileMgmt.setCreatedAt(Instant.now());
        fileMgmt.setUpdatedAt(Instant.now());

        fileMgmt = fileMgmtRepository.save(fileMgmt);
        return FileResponse.builder()
                .originalName(file.getOriginalFilename() != null ? file.getOriginalFilename() : fileInfo.getName())
                .ownerId(userId)
                .url(fileInfo.getUrl())
                .contentType(fileInfo.getContentType())
                .size(file.getSize())
                .build();
    }

    /**
     * Upload an attachment for a post. Creates a TEMPORARY file record expiring in 24 hours.
     */
    public AttachmentUploadResponse uploadAttachment(MultipartFile file) throws IOException {
        fileValidator.validateAttachment(file);

        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        String originalName = fileValidator.sanitizeFilename(file.getOriginalFilename());
        String ext = StringUtils.getFilenameExtension(originalName);
        String contentType = fileValidator.determineContentType(ext, file.getContentType());

        FileInfo fileInfo = fileRepository.store(file);

        Instant now = Instant.now();
        Instant expiresAt = now.plus(24, ChronoUnit.HOURS);

        FileMgmt fileMgmt = FileMgmt.builder()
                .id(fileInfo.getName())
                .ownerId(userId)
                .originalName(originalName)
                .contentType(contentType)
                .size(file.getSize())
                .md5Checksum(fileInfo.getMd5Checksum())
                .path(fileInfo.getPath())
                .purpose("POST_ATTACHMENT")
                .state("TEMPORARY")
                .createdAt(now)
                .expiresAt(expiresAt)
                .updatedAt(now)
                .build();

        fileMgmtRepository.save(fileMgmt);

        String previewUrl = null;
        if (fileValidator.isImageContentType(contentType)) {
            previewUrl = previewPrefix + fileInfo.getName();
        }

        return AttachmentUploadResponse.builder()
                .fileId(fileInfo.getName())
                .originalName(originalName)
                .contentType(contentType)
                .size(file.getSize())
                .previewUrl(previewUrl)
                .expiresAt(expiresAt)
                .build();
    }

    /**
     * Preview endpoint: owner can preview their own TEMPORARY or ATTACHED image attachments.
     */
    public FileData getAttachmentPreview(String fileId) throws IOException {
        FileMgmt fileMgmt = fileMgmtRepository.findById(fileId)
                .orElseThrow(() -> new AppException(ErrorCode.FILE_NOT_FOUND));

        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        if (!userId.equals(fileMgmt.getOwnerId())) {
            throw new AppException(ErrorCode.FILE_ACCESS_DENIED);
        }

        if (!fileValidator.isImageContentType(fileMgmt.getContentType())) {
            throw new AppException(ErrorCode.INVALID_FILE_TYPE);
        }

        var resource = fileRepository.read(fileMgmt);
        return new FileData(fileMgmt.getContentType(), resource, fileMgmt.getOriginalName(), fileMgmt.getSize());
    }

    /**
     * Delete endpoint: owner can delete their own TEMPORARY file (before posting). Idempotent.
     */
    public void deleteTemporaryFile(String fileId) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<FileMgmt> opt = fileMgmtRepository.findById(fileId);
        if (opt.isEmpty()) {
            return; // Idempotent
        }

        FileMgmt file = opt.get();
        if (!userId.equals(file.getOwnerId())) {
            throw new AppException(ErrorCode.FILE_ACCESS_DENIED);
        }

        if (!"TEMPORARY".equals(file.getState())) {
            // Cannot delete claimed or attached files via client DELETE
            throw new AppException(ErrorCode.FILE_ACCESS_DENIED);
        }

        file.setState("DELETING");
        fileMgmtRepository.save(file);

        try {
            fileRepository.deleteFile(file.getId());
        } catch (IOException e) {
            log.error("Failed to delete physical file {}", file.getId(), e);
        }
        fileMgmtRepository.delete(file);
    }

    /**
     * Download endpoint: public download for published ATTACHED or legacy files.
     * Denies public access to TEMPORARY or CLAIMED attachments.
     */
    public FileData downloadFile(String fileName) throws IOException {
        var fileMgmt = fileMgmtRepository.findById(fileName).orElseThrow(
                () -> new AppException(ErrorCode.FILE_NOT_FOUND)
        );

        if ("POST_ATTACHMENT".equals(fileMgmt.getPurpose()) && !"ATTACHED".equals(fileMgmt.getState())) {
            // Unattached temporary/claimed attachments cannot be accessed publicly
            throw new AppException(ErrorCode.FILE_ACCESS_DENIED);
        }

        var resource = fileRepository.read(fileMgmt);
        return new FileData(fileMgmt.getContentType(), resource, fileMgmt.getOriginalName(), fileMgmt.getSize());
    }

    /**
     * Internal claim endpoint for post-service.
     */
    public List<PostFileDto> claimPostAttachments(ClaimAttachmentRequest request) {
        if (request.getFileIds() == null || request.getFileIds().isEmpty()) {
            return Collections.emptyList();
        }

        if (request.getFileIds().size() > FileValidator.MAX_ATTACHMENTS) {
            throw new AppException(ErrorCode.TOO_MANY_FILES);
        }

        Set<String> uniqueIds = new HashSet<>(request.getFileIds());
        if (uniqueIds.size() != request.getFileIds().size()) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }

        List<FileMgmt> files = fileMgmtRepository.findAllByIdIn(request.getFileIds());
        if (files.size() != request.getFileIds().size()) {
            log.warn("Claim failed: requested {} files, found {}", request.getFileIds().size(), files.size());
            throw new AppException(ErrorCode.FILE_CLAIM_FAILED);
        }

        long totalSize = 0;
        Instant now = Instant.now();

        for (FileMgmt file : files) {
            if (!request.getOwnerId().equals(file.getOwnerId())) {
                log.warn("Claim failed: ownerId mismatch for file {}", file.getId());
                throw new AppException(ErrorCode.FILE_CLAIM_FAILED);
            }

            if (file.getExpiresAt() != null && file.getExpiresAt().isBefore(now)) {
                log.warn("Claim failed: file {} is expired", file.getId());
                throw new AppException(ErrorCode.FILE_CLAIM_FAILED);
            }

            boolean canClaim = "TEMPORARY".equals(file.getState())
                    || ("CLAIMED".equals(file.getState()) && request.getPostId().equals(file.getPostId()));
            if (!canClaim) {
                log.warn("Claim failed: invalid state {} or postId {} for file {}", file.getState(), file.getPostId(), file.getId());
                throw new AppException(ErrorCode.FILE_CLAIM_FAILED);
            }

            totalSize += file.getSize();
        }

        if (totalSize > FileValidator.MAX_TOTAL_SIZE) {
            throw new AppException(ErrorCode.TOTAL_SIZE_EXCEEDED);
        }

        Map<String, FileMgmt> fileMap = new HashMap<>();
        for (FileMgmt file : files) {
            file.setState("CLAIMED");
            file.setPostId(request.getPostId());
            file.setUpdatedAt(now);
            fileMgmtRepository.save(file);
            fileMap.put(file.getId(), file);
        }

        // Return PostFileDto keeping the exact order of fileIds from request
        List<PostFileDto> result = new ArrayList<>();
        for (String fileId : request.getFileIds()) {
            FileMgmt file = fileMap.get(fileId);
            if (file != null) {
                result.add(PostFileDto.builder()
                        .fileId(file.getId())
                        .url(downloadPrefix + file.getId())
                        .originalName(file.getOriginalName())
                        .contentType(file.getContentType())
                        .size(file.getSize())
                        .build());
            }
        }

        return result;
    }

    /**
     * Internal commit endpoint for post-service. Transitions CLAIMED files to ATTACHED. Idempotent.
     */
    public void commitPostAttachments(CommitAttachmentRequest request) {
        if (request.getFileIds() == null || request.getFileIds().isEmpty()) {
            return;
        }

        List<FileMgmt> files = fileMgmtRepository.findAllByIdIn(request.getFileIds());
        Instant now = Instant.now();
        for (FileMgmt file : files) {
            if (request.getPostId().equals(file.getPostId())) {
                file.setState("ATTACHED");
                file.setUpdatedAt(now);
                fileMgmtRepository.save(file);
            }
        }
    }

    /**
     * Internal release endpoint for post-service. Releases CLAIMED files back to TEMPORARY. Idempotent.
     */
    public void releasePostAttachments(ReleaseAttachmentRequest request) {
        if (request.getFileIds() == null || request.getFileIds().isEmpty()) {
            return;
        }

        List<FileMgmt> files = fileMgmtRepository.findAllByIdIn(request.getFileIds());
        Instant now = Instant.now();
        Instant newExpiry = now.plus(24, ChronoUnit.HOURS);
        for (FileMgmt file : files) {
            if (request.getPostId().equals(file.getPostId())) {
                file.setState("TEMPORARY");
                file.setPostId(null);
                file.setExpiresAt(newExpiry);
                file.setUpdatedAt(now);
                fileMgmtRepository.save(file);
            }
        }
    }

    /**
     * Hourly cleanup job for expired TEMPORARY post attachment files.
     */
    @Scheduled(cron = "0 0 * * * *")
    public void cleanupExpiredTemporaryFiles() {
        try {
            var expired = fileMgmtRepository.findByPurposeAndStateAndExpiresAtBefore("POST_ATTACHMENT", "TEMPORARY", Instant.now());
            if (!expired.isEmpty()) {
                log.info("Starting cleanup of {} expired temporary attachment files", expired.size());
            }
            for (FileMgmt file : expired) {
                try {
                    file.setState("DELETING");
                    fileMgmtRepository.save(file);
                    fileRepository.deleteFile(file.getId());
                    fileMgmtRepository.delete(file);
                    log.info("Cleaned up expired temporary file: {}", file.getId());
                } catch (Exception e) {
                    log.error("Failed to delete expired file {}", file.getId(), e);
                }
            }
        } catch (Exception e) {
            log.error("Error running temporary files cleanup job", e);
        }
    }

    public FileResponse uploadFileFromSaga(byte[] fileData, String originalFilename, String contentType, String userId) throws IOException {
        var fileInfo = fileRepository.storeBytes(fileData, originalFilename, contentType);
        var fileMgmt = fileMgmtMapper.toFileMgmt(fileInfo);

        fileMgmt.setOwnerId(userId);
        fileMgmt.setOriginalName(originalFilename);
        fileMgmt.setPurpose("AVATAR");
        fileMgmt.setState("ATTACHED");
        fileMgmt.setCreatedAt(Instant.now());
        fileMgmt.setUpdatedAt(Instant.now());

        fileMgmt = fileMgmtRepository.save(fileMgmt);
        return FileResponse.builder()
                .originalName(originalFilename != null ? originalFilename : fileInfo.getName())
                .ownerId(userId)
                .url(fileInfo.getUrl())
                .contentType(contentType)
                .size((long) fileData.length)
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
}
