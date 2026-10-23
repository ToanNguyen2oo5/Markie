package com.stewie.file.repository;

import com.stewie.file.entity.FileMgmt;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface FileMgmtRepository extends MongoRepository<FileMgmt, String> {
    Optional<FileMgmt> findByIdAndOwnerId(String id, String ownerId);
    List<FileMgmt> findAllByIdIn(List<String> ids);
    List<FileMgmt> findByPurposeAndStateAndExpiresAtBefore(String purpose, String state, Instant time);
    List<FileMgmt> findByPostId(String postId);
}
