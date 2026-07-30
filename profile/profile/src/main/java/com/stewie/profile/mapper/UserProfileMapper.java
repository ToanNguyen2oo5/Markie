package com.stewie.profile.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import com.stewie.profile.dto.request.UpdateProfileRequest;
import com.stewie.profile.dto.response.ProfileResponse;
import com.stewie.profile.entity.UserProfile;

@Mapper(componentModel = "spring")
public interface UserProfileMapper {
    ProfileResponse toProfileResponse(UserProfile entity);

    void update(@MappingTarget UserProfile entity, UpdateProfileRequest request);
}
