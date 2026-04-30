package com.rpl.auction.audit.controller;

import com.rpl.auction.audit.dto.AuditLogPageResponse;
import com.rpl.auction.audit.service.AuditService;
import com.rpl.auction.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<ApiResponse<AuditLogPageResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(required = false) String entityType) {
        return ResponseEntity.ok(ApiResponse.success(auditService.getLogs(page, size, entityType)));
    }
}
