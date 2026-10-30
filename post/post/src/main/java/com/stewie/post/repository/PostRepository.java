package com.stewie.post.repository;

import com.stewie.post.entity.Post;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.Collection;
import java.util.Optional;

public interface PostRepository extends MongoRepository<Post, String> {
    Optional<Post> findByUserIdAndClientRequestId(String userId, String clientRequestId);

    @Query("{ 'user_id': ?0, '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }")
    Slice<Post> findPublishedByUserIdOrderByIdDesc(String userId, Pageable pageable);

    @Query("{ '_id': { '$lt': ?0 }, 'user_id': ?1, '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }")
    Slice<Post> findPublishedByIdLessThanAndUserIdOrderByIdDesc(String id, String userId, Pageable pageable);

    @Query("{ 'user_id': { '$in': ?0 }, '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }")
    Slice<Post> findPublishedByUserIdIn(Collection<String> userIds, Pageable pageable);

    @Query("{ '_id': { '$lt': ?0 }, 'user_id': { '$in': ?1 }, '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }")
    Slice<Post> findPublishedByIdLessThanAndUserIdIn(String id, Collection<String> userIds, Pageable pageable);

    @Query("{ 'user_id': { '$ne': ?0 }, '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }")
    Slice<Post> findPublishedDiscover(String excludedUserId, Pageable pageable);

    @Query("{ '_id': { '$lt': ?0 }, 'user_id': { '$ne': ?1 }, '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }")
    Slice<Post> findPublishedDiscoverBefore(String id, String excludedUserId, Pageable pageable);

    Slice<Post> findByUserIdOrderByIdDesc(String userId, Pageable pageable);
    Slice<Post> findByIdLessThanAndUserIdOrderByIdDesc(String id, String userId, Pageable pageable);
}
