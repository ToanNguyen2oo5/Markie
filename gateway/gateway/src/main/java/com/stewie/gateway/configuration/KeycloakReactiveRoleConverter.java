package com.stewie.gateway.configuration;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import reactor.core.publisher.Flux;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Keycloak JWT → GrantedAuthority converter for Spring WebFlux (Reactive).
 *
 * <p>Keycloak embeds roles inside the JWT under:
 * <pre>
 *   {
 *     "realm_access": {
 *       "roles": ["ADMIN", "USER", ...]
 *     }
 *   }
 * </pre>
 * Spring Security's default converter only reads the {@code scope} claim,
 * so we must extract realm roles manually and prefix them with {@code ROLE_}.
 *
 * <p>Strategy: <b>Offline JWT Validation</b> — roles are extracted from the
 * already-verified JWT payload without any additional Keycloak network call.
 */
public class KeycloakReactiveRoleConverter implements Converter<Jwt, Flux<GrantedAuthority>> {

    private static final String REALM_ACCESS_CLAIM = "realm_access";
    private static final String ROLES_CLAIM = "roles";
    private static final String ROLE_PREFIX = "ROLE_";

    @Override
    public Flux<GrantedAuthority> convert(Jwt source) {
        Map<String, Object> realmAccess = source.getClaimAsMap(REALM_ACCESS_CLAIM);

        if (realmAccess == null || !realmAccess.containsKey(ROLES_CLAIM)) {
            return Flux.empty();
        }

        List<String> roles = (List<String>) realmAccess.get(ROLES_CLAIM);
        if (roles == null || roles.isEmpty()) {
            return Flux.empty();
        }

        Collection<GrantedAuthority> authorities = roles.stream()
                .map(role -> (GrantedAuthority) new SimpleGrantedAuthority(ROLE_PREFIX + role))
                .toList();

        return Flux.fromIterable(authorities);
    }
}
