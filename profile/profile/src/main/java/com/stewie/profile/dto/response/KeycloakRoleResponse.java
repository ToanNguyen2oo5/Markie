package com.stewie.profile.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KeycloakRoleResponse {
    String id;
    String name;
    String description;
    Boolean composite;
    Boolean clientRole;
    String containerId;
}
