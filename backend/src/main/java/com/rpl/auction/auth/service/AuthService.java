package com.rpl.auction.auth.service;

import com.rpl.auction.auth.dto.LoginRequest;
import com.rpl.auction.auth.dto.LoginResponse;
import com.rpl.auction.auth.dto.RefreshRequest;
import com.rpl.auction.auth.entity.RefreshToken;
import com.rpl.auction.auth.repository.RefreshTokenRepository;
import com.rpl.auction.common.exception.UnauthorizedException;
import com.rpl.auction.rbac.entity.Permission;
import com.rpl.auction.user.entity.User;
import com.rpl.auction.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final long accessTokenExpiryMs;
    private final long refreshTokenExpiryMs;

    public AuthService(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository,
                       JwtService jwtService, PasswordEncoder passwordEncoder,
                       @Value("${app.jwt.access-token-expiry-ms}") long accessTokenExpiryMs,
                       @Value("${app.jwt.refresh-token-expiry-ms}") long refreshTokenExpiryMs) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.accessTokenExpiryMs = accessTokenExpiryMs;
        this.refreshTokenExpiryMs = refreshTokenExpiryMs;
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));
        if (!user.getIsActive()) throw new UnauthorizedException("Account is deactivated");
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash()))
            throw new UnauthorizedException("Invalid credentials");

        List<String> permissions = flattenPermissions(user);
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getUsername(), permissions);
        String refreshToken = jwtService.generateRefreshToken(user.getId());
        saveRefreshToken(user.getId(), refreshToken);

        return LoginResponse.builder()
                .accessToken(accessToken).refreshToken(refreshToken).expiresIn(accessTokenExpiryMs / 1000)
                .user(LoginResponse.UserInfo.builder().id(user.getId()).username(user.getUsername())
                        .displayName(user.getDisplayName()).permissions(permissions).build())
                .build();
    }

    @Transactional
    public LoginResponse refresh(RefreshRequest request) {
        String tokenHash = hashToken(request.getRefreshToken());
        RefreshToken stored = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));
        if (stored.getRevoked()) {
            refreshTokenRepository.revokeAllByUserId(stored.getUserId());
            throw new UnauthorizedException("Refresh token has been revoked");
        }
        if (stored.getExpiresAt().isBefore(Instant.now()))
            throw new UnauthorizedException("Refresh token has expired");

        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        User user = userRepository.findById(stored.getUserId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        List<String> permissions = flattenPermissions(user);
        String newAccessToken = jwtService.generateAccessToken(user.getId(), user.getUsername(), permissions);
        String newRefreshToken = jwtService.generateRefreshToken(user.getId());
        saveRefreshToken(user.getId(), newRefreshToken);

        return LoginResponse.builder()
                .accessToken(newAccessToken).refreshToken(newRefreshToken).expiresIn(accessTokenExpiryMs / 1000)
                .user(LoginResponse.UserInfo.builder().id(user.getId()).username(user.getUsername())
                        .displayName(user.getDisplayName()).permissions(permissions).build())
                .build();
    }

    @Transactional
    public void logout(String refreshToken) {
        String tokenHash = hashToken(refreshToken);
        RefreshToken stored = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);
    }

    public LoginResponse.UserInfo getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        return LoginResponse.UserInfo.builder().id(user.getId()).username(user.getUsername())
                .displayName(user.getDisplayName()).permissions(flattenPermissions(user)).build();
    }

    private List<String> flattenPermissions(User user) {
        return user.getPermissionGroups().stream()
                .flatMap(group -> group.getPermissions().stream())
                .map(Permission::toFlatString).distinct().sorted().toList();
    }

    private void saveRefreshToken(Long userId, String rawToken) {
        refreshTokenRepository.save(RefreshToken.builder()
                .userId(userId).tokenHash(hashToken(rawToken))
                .expiresAt(Instant.now().plusMillis(refreshTokenExpiryMs)).revoked(false).build());
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Base64.getEncoder().encodeToString(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) { throw new RuntimeException("SHA-256 not available", e); }
    }
}
