package com.rpl.auction.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(
                "TEST_SECRET_KEY_MUST_BE_AT_LEAST_256_BITS_LONG_FOR_HS256_ALGORITHM",
                3600000L, 604800000L
        );
    }

    @Test
    void generateAccessToken_containsUserIdAndPermissions() {
        List<String> permissions = List.of("user:CREATE", "user:READ");
        String token = jwtService.generateAccessToken(1L, "admin", permissions);
        assertThat(token).isNotBlank();
        assertThat(jwtService.extractUserId(token)).isEqualTo(1L);
        assertThat(jwtService.extractUsername(token)).isEqualTo("admin");
        assertThat(jwtService.extractPermissions(token)).containsExactlyInAnyOrder("user:CREATE", "user:READ");
    }

    @Test
    void generateRefreshToken_containsUserId() {
        String token = jwtService.generateRefreshToken(1L);
        assertThat(token).isNotBlank();
        assertThat(jwtService.extractUserId(token)).isEqualTo(1L);
    }

    @Test
    void validateToken_validToken_returnsTrue() {
        String token = jwtService.generateAccessToken(1L, "admin", List.of());
        assertThat(jwtService.isTokenValid(token)).isTrue();
    }

    @Test
    void validateToken_expiredToken_returnsFalse() {
        JwtService shortLivedService = new JwtService(
                "TEST_SECRET_KEY_MUST_BE_AT_LEAST_256_BITS_LONG_FOR_HS256_ALGORITHM",
                -1000L, -1000L
        );
        String token = shortLivedService.generateAccessToken(1L, "admin", List.of());
        assertThat(shortLivedService.isTokenValid(token)).isFalse();
    }

    @Test
    void validateToken_tamperedToken_returnsFalse() {
        String token = jwtService.generateAccessToken(1L, "admin", List.of());
        assertThat(jwtService.isTokenValid(token + "tampered")).isFalse();
    }
}
