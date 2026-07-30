package com.stewie.profile.configuration;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Keycloak JWT → GrantedAuthority converter for Spring MVC (Servlet / Blocking).
 *
 * <p>Keycloak embeds roles inside the JWT under:
 * <pre>
 *   {
 *     "realm_access": {
 *       "roles": ["ADMIN", "USER", ...]
 *     }
 *   }
 * </pre>
 * Spring Security's default converter only processes the {@code scope} claim,
 * resulting in authorities like {@code SCOPE_openid}. This converter additionally
 * extracts {@code realm_access.roles} and maps each role to a
 * {@link SimpleGrantedAuthority} with the {@code ROLE_} prefix, enabling
 * method-level security annotations such as {@code @PreAuthorize("hasRole('ADMIN')")}.
 *
 * <p>Strategy: <b>Offline JWT Validation</b> — roles are read directly from the
 * already-verified JWT payload; no additional Keycloak network call is made.
 */
public class KeycloakRoleConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    private static final String REALM_ACCESS_CLAIM = "realm_access";
    private static final String ROLES_CLAIM = "roles";
    private static final String ROLE_PREFIX = "ROLE_";

    @Override
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaimAsMap(REALM_ACCESS_CLAIM);

        if (realmAccess == null || !realmAccess.containsKey(ROLES_CLAIM)) {
            return Collections.emptyList();
        }

        @SuppressWarnings("unchecked")
        List<String> roles = (List<String>) realmAccess.get(ROLES_CLAIM);
        if (roles == null || roles.isEmpty()) {
            return Collections.emptyList();
        }

        return roles.stream()
                .map(role -> (GrantedAuthority) new SimpleGrantedAuthority(ROLE_PREFIX + role))
                .toList();
    }
}
