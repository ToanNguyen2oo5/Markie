package com.stewie.file.postmedia;

import com.stewie.file.exception.AppException;
import static com.stewie.file.exception.ErrorCode.*;
import org.springframework.stereotype.Service;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.InvalidDataAccessApiUsageException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.io.IOException;
import java.nio.file.NoSuchFileException;

@Service
public class PostMediaService {
    private static final Logger log = LoggerFactory.getLogger(PostMediaService.class);
    private final PostMediaRepository repository;
    private final PostMediaStorage storage;
    private final PostMediaSettings settings;
    public PostMediaService(PostMediaRepository repository, PostMediaStorage storage, PostMediaSettings settings) {
        this.repository = repository; this.storage = storage; this.settings = settings;
    }
    public PostMediaResponse create(PostImageValidator.ValidatedImage image, String owner) {
        String id;
        try { id = storage.create(image.bytes()); }
        catch (IOException e) { throw new AppException(POST_MEDIA_STORAGE_UNAVAILABLE); }
        PostMedia media = new PostMedia(id, owner, image.contentType(), image.size(), image.width(), image.height(), false);
        try { repository.insert(media); }
        catch (RuntimeException e) {
            // Only a definitive rejected write permits deletion. Network/write concern failures
            // may still commit after a read returns absent; retain bytes for reconciliation.
            if (e instanceof DataIntegrityViolationException || e instanceof InvalidDataAccessApiUsageException) {
                try { storage.delete(id); }
                catch (IOException cleanup) { log.warn("Post media cleanup required fileId={}", id); }
            } else {
                try {
                    var committed = repository.findById(id);
                    log.warn("Post media uncertain write fileId={} metadataPresent={}", id, committed.isPresent());
                } catch (RuntimeException readFailure) { log.warn("Post media reconciliation required fileId={}", id); }
            }
            throw new AppException(POST_MEDIA_STORAGE_UNAVAILABLE);
        }
        return new PostMediaResponse(id, settings.publicBase + "/" + id, image.contentType(), image.size(), image.width(), image.height());
    }
    private PostMedia find(String id) {
        if (!PostMediaStorage.validId(id)) throw new AppException(POST_MEDIA_NOT_FOUND);
        try { return repository.findById(id).orElse(null); }
        catch (RuntimeException e) { throw new AppException(POST_MEDIA_STORAGE_UNAVAILABLE); }
    }
    public PostMedia get(String id) {
        PostMedia media = find(id);
        if (media == null || media.isDeleted()) throw new AppException(POST_MEDIA_NOT_FOUND);
        return media;
    }
    public byte[] read(PostMedia media) {
        try {
            byte[] bytes = storage.read(media.getId());
            if (bytes.length != media.getSize()) throw new IOException("Invalid stored size");
            return bytes;
        } catch (NoSuchFileException e) { throw new AppException(POST_MEDIA_NOT_FOUND); }
        catch (IOException e) { throw new AppException(POST_MEDIA_STORAGE_UNAVAILABLE); }
    }
    public void delete(String id, String owner) {
        PostMedia media = find(id);
        if (media == null) return;
        if (!owner.equals(media.getOwnerId())) throw new AppException(POST_MEDIA_FORBIDDEN);
        if (media.isDeleted()) return;
        try {
            storage.delete(id);
            media.setDeleted(true);
            repository.save(media);
        } catch (IOException | RuntimeException e) { throw new AppException(POST_MEDIA_STORAGE_UNAVAILABLE); }
    }
}
