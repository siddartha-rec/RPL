package com.rpl.auction.audit.service;

import com.rpl.auction.audit.dto.AuditLogPageResponse;
import com.rpl.auction.audit.dto.AuditLogResponse;
import com.rpl.auction.audit.entity.AuditLog;
import com.rpl.auction.audit.repository.AuditLogRepository;
import com.rpl.auction.user.entity.User;
import com.rpl.auction.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @Async
    public void log(Long userId, String action, String entityType, Long entityId,
                    Map<String, Object> details, String ipAddress) {
        AuditLog log = AuditLog.builder()
                .userId(userId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .ipAddress(ipAddress)
                .build();
        auditLogRepository.save(log);
    }

    public AuditLogPageResponse getLogs(int page, int size, String entityType) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AuditLog> result = (entityType != null && !entityType.isBlank())
                ? auditLogRepository.findByEntityType(entityType, pageable)
                : auditLogRepository.findAll(pageable);
        Map<Long, String> usernameByUserId = resolveUsernames(result.getContent());
        List<AuditLogResponse> content = result.getContent().stream()
                .map(l -> AuditLogResponse.from(l, usernameByUserId.getOrDefault(l.getUserId(), null)))
                .toList();
        return AuditLogPageResponse.builder()
                .content(content)
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .first(result.isFirst())
                .last(result.isLast())
                .build();
    }

    private Map<Long, String> resolveUsernames(List<AuditLog> logs) {
        Map<Long, String> map = new HashMap<>();
        for (AuditLog l : logs) {
            Long uid = l.getUserId();
            if (uid == null || map.containsKey(uid)) continue;
            User user = userRepository.findById(uid).orElse(null);
            map.put(uid, user != null ? user.getUsername() : null);
        }
        return map;
    }
}
