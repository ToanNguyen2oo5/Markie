package com.stewie.profile.repository;

import java.util.Optional;

import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.stereotype.Repository;

import com.stewie.profile.entity.UserProfile;

@Repository
public interface UserProfileRepository extends Neo4jRepository<UserProfile, String> {
    Optional<UserProfile> findByUserId(String userId);
}
