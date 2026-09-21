package com.stewie.profile.enums;

public enum FriendshipState {
    NONE, // Chưa có quan hệ gì -> Hiển thị nút "Thêm bạn bè"
    REQUEST_SENT, // Mình đã gửi lời mời -> Hiển thị nút "Hủy lời mời"
    REQUEST_RECEIVED, // Đối phương gửi cho mình -> Hiển thị 2 nút "Chấp nhận" & "Từ chối"
    FRIENDS // Đã là bạn bè -> Hiển thị nút "Bạn bè"
}
