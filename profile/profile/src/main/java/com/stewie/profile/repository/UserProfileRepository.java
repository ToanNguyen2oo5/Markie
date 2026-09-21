package com.stewie.profile.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.stewie.profile.dto.response.RelationshipStatus;
import com.stewie.profile.entity.UserProfile;

@Repository
public interface UserProfileRepository extends Neo4jRepository<UserProfile, String> {
    Optional<UserProfile> findByUserId(String userId);

    List<UserProfile> findAllByUserIdIn(Collection<String> userIds);
    // ── 1. THEO DÕI (FOLLOW) ──
    @Query("MATCH (from:user_profile {userId: $fromUserId}), (to:user_profile {userId: $toUserId}) "
            + "MERGE (from)-[r:FOLLOWS]->(to) "
            + "ON CREATE SET r.createdAt = datetime()")
    void followUser(@Param("fromUserId") String fromUserId, @Param("toUserId") String toUserId);

    @Query("MATCH (from:user_profile {userId:$fromUserId})-[r:FOLLOWS]->(to:user_profile {userId: $toUserId}) "
            + "DELETE r")
    void unfollowUser(@Param("fromUserId") String fromUserId, @Param("toUserId") String toUserId);

    @Query("MATCH (from:user_profile {userId: $fromUserId}), (to:user_profile {userId: $toUserId}) "
            + "MERGE (from)-[r:REQUESTED_FRIEND]->(to) "
            + "ON CREATE SET r.createdAt = datetime()")
    void sendFriendRequest(@Param("fromUserId") String fromUserId, @Param("toUserId") String toUserId);

    @Query(
            "MATCH (from:user_profile {userId: $fromUserId})-[r:REQUESTED_FRIEND]->(to:user_profile {userId: $toUserId}) "
                    + "DELETE r")
    void cancelOrRejectFriendRequest(@Param("fromUserId") String fromUserId, @Param("toUserId") String toUserId);

    @Query(
            "MATCH (from:user_profile {userId: $fromUserId})-[req:REQUESTED_FRIEND]->(to:user_profile {userId: $toUserId}) "
                    + "DELETE req "
                    + "MERGE (from)-[f1:IS_FRIENDS_WITH]->(to) ON CREATE SET f1.since = datetime() "
                    + "MERGE (to)-[f2:IS_FRIENDS_WITH]->(from) ON CREATE SET f2.since = datetime() "
                    + "MERGE (from)-[:FOLLOWS]->(to) "
                    + "MERGE (to)-[:FOLLOWS]->(from)")
    void acceptFriendRequest(@Param("fromUserId") String fromUserId, @Param("toUserId") String toUserId);

    @Query("MATCH (u1:user_profile {userId: $userId1})-[r:IS_FRIENDS_WITH]-(u2:user_profile {userId: $userId2}) "
            + "DELETE r")
    void unfriend(@Param("userId1") String userId1, @Param("userId2") String userId2);
    // ── 5. TRUY VẤN DANH SÁCH ──
    // Lấy danh sách bạn bè của 1 user
    @Query("MATCH (u:user_profile {userId: $userId})-[:IS_FRIENDS_WITH]->(friend:user_profile) "
            + "RETURN friend SKIP $skip LIMIT $limit")
    List<UserProfile> findFriends(@Param("userId") String userId, @Param("skip") int skip, @Param("limit") int limit);
    // Kiểm tra trạng thái quan hệ giữa currentUser và targetUser
    @Query("MATCH (me:user_profile {userId: $meId}), (target:user_profile {userId: $targetId}) " + "RETURN "
            + "EXISTS((me)-[:IS_FRIENDS_WITH]->(target)) AS isFriend, "
            + "EXISTS((me)-[:REQUESTED_FRIEND]->(target)) AS hasSentRequest, "
            + "EXISTS((target)-[:REQUESTED_FRIEND]->(me)) AS hasReceivedRequest, "
            + "EXISTS((me)-[:FOLLOWS]->(target)) AS isFollowing")
    RelationshipStatus getRelationshipStatus(@Param("meId") String meId, @Param("targetId") String targetId);
}
