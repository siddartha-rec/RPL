package com.rpl.auction.rbac.repository;

import com.rpl.auction.rbac.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PermissionRepository extends JpaRepository<Permission, Long> {
    Optional<Permission> findByModuleNameAndName(String moduleName, String name);
    List<Permission> findByModuleId(Long moduleId);
}
