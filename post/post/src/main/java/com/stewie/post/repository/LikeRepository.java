package com.stewie.post.repository;

import com.stewie.post.entity.Like;
import com.stewie.post.entity.LikeTargetType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface LikeRepository extends MongoRepository<Like, String> {

    long deleteByTargetTypeAndTargetIdAndUserId(LikeTargetType targetType, String targetId, String userId);

    boolean existsByTargetTypeAndTargetIdAndUserId(LikeTargetType targetType, String targetId, String userId);

    List<Like> findByUserIdAndTargetTypeAndTargetIdIn(String userId, LikeTargetType targetType, Collection<String> targetIds);

    Slice<Like> findByTargetTypeAndTargetIdOrderByIdDesc(LikeTargetType targetType, String targetId, Pageable pageable);

    Slice<Like> findByTargetTypeAndTargetIdAndIdLessThanOrderByIdDesc(
            LikeTargetType targetType, String targetId, String id, Pageable pageable);

    void deleteByTargetTypeAndTargetIdIn(LikeTargetType targetType, Collection<String> targetIds);
}
