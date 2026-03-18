package com.rpl.auction.auth.service;

import com.rpl.auction.auth.dto.LoginRequest;
import com.rpl.auction.auth.dto.LoginResponse;
import com.rpl.auction.auth.entity.RefreshToken;
import com.rpl.auction.auth.repository.RefreshTokenRepository;
import com.rpl.auction.common.exception.UnauthorizedException;
import com.rpl.auction.rbac.entity.Module;
import com.rpl.auction.rbac.entity.Permission;
import com.rpl.auction.rbac.entity.PermissionGroup;
import com.rpl.auction.user.entity.User;
import com.rpl.auction.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;

    private AuthService authService;
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        JwtService jwtService = new JwtService(
                "TEST_SECRET_KEY_MUST_BE_AT_LEAST_256_BITS_LONG_FOR_HS256_ALGORITHM",
                3600000L, 604800000L
        );
        authService = new AuthService(userRepository, refreshTokenRepository, jwtService, passwordEncoder, 3600000L, 604800000L);
    }

    private User createTestUser() {
        Module userModule = Module.builder().id(1L).name("user").build();
        Permission readPerm = Permission.builder().id(1L).module(userModule).name("READ").build();
        PermissionGroup group = PermissionGroup.builder().id(1L).name("Test Group").permissions(Set.of(readPerm)).build();
        return User.builder().id(1L).username("admin").passwordHash(passwordEncoder.encode("admin123"))
                .displayName("Admin").isActive(true).permissionGroups(Set.of(group)).build();
    }

    @Test
    void login_validCredentials_returnsTokens() {
        User user = createTestUser();
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));
        when(refreshTokenRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        LoginResponse response = authService.login(new LoginRequest("admin", "admin123"));
        assertThat(response.getAccessToken()).isNotBlank();
        assertThat(response.getRefreshToken()).isNotBlank();
        assertThat(response.getExpiresIn()).isEqualTo(3600);
        assertThat(response.getUser().getUsername()).isEqualTo("admin");
        assertThat(response.getUser().getPermissions()).contains("user:READ");
    }

    @Test
    void login_wrongPassword_throwsUnauthorized() {
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(createTestUser()));
        assertThatThrownBy(() -> authService.login(new LoginRequest("admin", "wrong")))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void login_userNotFound_throwsUnauthorized() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> authService.login(new LoginRequest("unknown", "password")))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void login_inactiveUser_throwsUnauthorized() {
        User user = createTestUser();
        user.setIsActive(false);
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));
        assertThatThrownBy(() -> authService.login(new LoginRequest("admin", "admin123")))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void logout_revokesRefreshToken() {
        RefreshToken token = RefreshToken.builder().id(1L).userId(1L).revoked(false)
                .expiresAt(Instant.now().plusSeconds(3600)).build();
        when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));
        authService.logout("some-refresh-token");
        assertThat(token.getRevoked()).isTrue();
        verify(refreshTokenRepository).save(token);
    }
}
