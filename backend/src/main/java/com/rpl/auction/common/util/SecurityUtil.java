package com.rpl.auction.common.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collections;
import java.util.List;

public final class SecurityUtil {
    private SecurityUtil() {}

    public static Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) return null;
        return (Long) auth.getPrincipal();
    }

    @SuppressWarnings("unchecked")
    public static List<String> getCurrentPermissions() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getCredentials() == null) return Collections.emptyList();
        return (List<String>) auth.getCredentials();
    }
}
