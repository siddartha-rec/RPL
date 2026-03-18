package com.rpl.auction.config;

import com.rpl.auction.rbac.entity.Module;
import com.rpl.auction.rbac.entity.Permission;
import com.rpl.auction.rbac.entity.PermissionGroup;
import com.rpl.auction.rbac.repository.ModuleRepository;
import com.rpl.auction.rbac.repository.PermissionGroupRepository;
import com.rpl.auction.rbac.repository.PermissionRepository;
import com.rpl.auction.user.entity.User;
import com.rpl.auction.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements ApplicationRunner {
    private final ModuleRepository moduleRepository;
    private final PermissionRepository permissionRepository;
    private final PermissionGroupRepository permissionGroupRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.existsByUsername("admin")) {
            log.info("Seed data already exists, skipping.");
            return;
        }
        log.info("Seeding initial data...");

        List<String> moduleNames = List.of("user", "rbac", "league", "team", "player",
                "retention", "auction", "dashboard", "report", "audit");
        Map<String, Module> modules = new LinkedHashMap<>();
        for (String name : moduleNames) {
            modules.put(name, moduleRepository.save(Module.builder().name(name).description(name + " management").build()));
        }

        List<String> crudOps = List.of("CREATE", "READ", "UPDATE", "DELETE");
        Map<String, List<String>> extraPermissions = Map.of(
                "user", List.of("MANAGE_GROUPS"),
                "rbac", List.of("MANAGE_PERMISSIONS"),
                "auction", List.of("BID", "START", "PAUSE", "RESUME", "COMPLETE")
        );

        Set<Permission> allPermissions = new HashSet<>();
        for (Map.Entry<String, Module> entry : modules.entrySet()) {
            for (String op : crudOps) {
                allPermissions.add(permissionRepository.save(Permission.builder()
                        .module(entry.getValue()).name(op).description(entry.getKey() + " " + op.toLowerCase()).build()));
            }
            for (String extra : extraPermissions.getOrDefault(entry.getKey(), List.of())) {
                allPermissions.add(permissionRepository.save(Permission.builder()
                        .module(entry.getValue()).name(extra).description(entry.getKey() + " " + extra.toLowerCase()).build()));
            }
        }

        PermissionGroup superAdmin = permissionGroupRepository.save(PermissionGroup.builder()
                .name("Super Admin").description("Full platform access").permissions(allPermissions).build());

        Set<Permission> leagueAdminPerms = new HashSet<>();
        for (Permission p : allPermissions) {
            if (!p.getModule().getName().equals("rbac") && !p.getModule().getName().equals("audit"))
                leagueAdminPerms.add(p);
        }
        permissionGroupRepository.save(PermissionGroup.builder()
                .name("League Admin").description("League-level administration").permissions(leagueAdminPerms).build());

        Set<Permission> teamOwnerPerms = new HashSet<>();
        permissionRepository.findByModuleNameAndName("team", "READ").ifPresent(teamOwnerPerms::add);
        permissionRepository.findByModuleNameAndName("player", "READ").ifPresent(teamOwnerPerms::add);
        permissionRepository.findByModuleNameAndName("auction", "BID").ifPresent(teamOwnerPerms::add);
        permissionRepository.findByModuleNameAndName("dashboard", "READ").ifPresent(teamOwnerPerms::add);
        permissionGroupRepository.save(PermissionGroup.builder()
                .name("Team Owner").description("Team owner with bidding access").permissions(teamOwnerPerms).build());

        Set<Permission> spectatorPerms = new HashSet<>();
        permissionRepository.findByModuleNameAndName("dashboard", "READ").ifPresent(spectatorPerms::add);
        permissionGroupRepository.save(PermissionGroup.builder()
                .name("Spectator").description("View-only access to dashboard").permissions(spectatorPerms).build());

        userRepository.save(User.builder().username("admin").passwordHash(passwordEncoder.encode("admin123"))
                .displayName("Admin").email("admin@rpl.com").isActive(true).permissionGroups(Set.of(superAdmin)).build());

        log.info("Seed data created successfully. Default login: admin / admin123");
    }
}
