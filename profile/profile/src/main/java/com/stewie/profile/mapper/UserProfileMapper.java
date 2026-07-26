package com.stewie.profile.mapper;

import org.mapstruct.Mapper;

import com.stewie.profile.dto.request.RegistrationRequest;
import com.stewie.profile.dto.response.ProfileResponse;
import com.stewie.profile.entity.UserProfile;

@Mapper(componentModel = "spring")
public interface UserProfileMapper {
    UserProfile toUserProfile(RegistrationRequest request);

    ProfileResponse toProfileResponse(UserProfile entity);
}
