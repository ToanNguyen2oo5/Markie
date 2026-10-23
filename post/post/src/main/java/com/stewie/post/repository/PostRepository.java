package com.stewie.post.repository;

import com.stewie.post.entity.Post;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.mongodb.repository.MongoRepository;

import org.springframework.data.mongodb.repository.Query;

import java.util.Optional;

public interface PostRepository extends MongoRepository<Post, String> {
    Optional<Post> findByUserIdAndClientRequestId(String userId, String clientRequestId);

    @Query("{ 'user_id': ?0, '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }")
    Slice<Post> findPublishedByUserIdOrderByIdDesc(String userId, Pageable pageable);

    @Query("{ '_id': { '$lt': ?0 }, 'user_id': ?1, '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }")
    Slice<Post> findPublishedByIdLessThanAndUserIdOrderByIdDesc(String id, String userId, Pageable pageable);

    Slice<Post> findByUserIdOrderByIdDesc(String userId, Pageable pageable);
    Slice<Post> findByIdLessThanAndUserIdOrderByIdDesc(String id, String userId, Pageable pageable);
}
