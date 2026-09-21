package com.stewie.profile.dto.response;

import com.stewie.profile.enums.FriendshipState;

public record RelationshipStatus(
        Boolean isFriend, Boolean hasSentRequest, Boolean hasReceivedRequest, Boolean isFollowing) {

    // Helper method: chuyển đổi 3 cờ boolean bạn bè thành 1 Enum duy nhất cho Frontend dễ dùng
    public FriendshipState getFriendshipState() {
        if (Boolean.TRUE.equals(isFriend)) return FriendshipState.FRIENDS;
        if (Boolean.TRUE.equals(hasSentRequest)) return FriendshipState.REQUEST_SENT;
        if (Boolean.TRUE.equals(hasReceivedRequest)) return FriendshipState.REQUEST_RECEIVED;
        return FriendshipState.NONE;
    }
}
