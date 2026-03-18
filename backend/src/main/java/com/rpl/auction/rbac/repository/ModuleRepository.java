package com.rpl.auction.rbac.repository;

import com.rpl.auction.rbac.entity.Module;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ModuleRepository extends JpaRepository<Module, Long> {
    Optional<Module> findByName(String name);
    boolean existsByName(String name);
}
