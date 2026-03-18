package com.rpl.auction.rbac.repository;

import com.rpl.auction.rbac.entity.PermissionGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PermissionGroupRepository extends JpaRepository<PermissionGroup, Long> {
    Optional<PermissionGroup> findByName(String name);
    boolean existsByNameAndLeagueIdIsNull(String name);
    boolean existsByNameAndLeagueId(String name, Long leagueId);
}
