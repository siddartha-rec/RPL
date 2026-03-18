# Foundation + Auth/RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the RPL Auction Platform with Spring Boot scaffolding, MySQL, JWT authentication, and granular RBAC.

**Architecture:** Spring Boot 3.4.x backend with feature-based package structure (auth, user, rbac, audit, common). JWT tokens carry embedded permissions for zero-DB-lookup authorization. RBAC uses User -> PermissionGroup -> Permission -> Module hierarchy enforced via custom `@RequiresPermission` AOP annotation.

**Tech Stack:** Java 21, Spring Boot 3.4.x, Spring Data JPA, MySQL 8.0, jjwt, Maven, Docker Compose, SpringDoc OpenAPI, Testcontainers

**Spec:** `docs/superpowers/specs/2026-03-18-foundation-auth-rbac-design.md`

---

## File Structure

```
backend/
├── pom.xml
├── docker-compose.yml
├── src/main/java/com/rpl/auction/
│   ├── RplAuctionApplication.java
│   ├── config/
│   │   ├── SecurityConfig.java
│   │   ├── AppConfig.java
│   │   └── OpenApiConfig.java
│   ├── common/
│   │   ├── dto/ApiResponse.java
│   │   ├── dto/FieldErrorDetail.java
│   │   ├── exception/ResourceNotFoundException.java
│   │   ├── exception/BadRequestException.java
│   │   ├── exception/UnauthorizedException.java
│   │   ├── exception/ForbiddenException.java
│   │   ├── exception/GlobalExceptionHandler.java
│   │   └── util/SecurityUtil.java
│   ├── auth/
│   │   ├── controller/AuthController.java
│   │   ├── service/AuthService.java
│   │   ├── service/JwtService.java
│   │   ├── filter/JwtAuthFilter.java
│   │   ├── entity/RefreshToken.java
│   │   ├── repository/RefreshTokenRepository.java
│   │   ├── dto/LoginRequest.java
│   │   ├── dto/LoginResponse.java
│   │   └── dto/RefreshRequest.java
│   ├── user/
│   │   ├── controller/UserController.java
│   │   ├── service/UserService.java
│   │   ├── repository/UserRepository.java
│   │   ├── entity/User.java
│   │   ├── dto/CreateUserRequest.java
│   │   ├── dto/UpdateUserRequest.java
│   │   ├── dto/ChangePasswordRequest.java
│   │   └── dto/UserResponse.java
│   ├── rbac/
│   │   ├── controller/RbacController.java
│   │   ├── service/RbacService.java
│   │   ├── repository/PermissionGroupRepository.java
│   │   ├── repository/ModuleRepository.java
│   │   ├── repository/PermissionRepository.java
│   │   ├── entity/PermissionGroup.java
│   │   ├── entity/Module.java
│   │   ├── entity/Permission.java
│   │   ├── annotation/RequiresPermission.java
│   │   ├── aspect/PermissionAspect.java
│   │   ├── dto/PermissionGroupRequest.java
│   │   ├── dto/ModuleRequest.java
│   │   ├── dto/PermissionRequest.java
│   │   ├── dto/AssignPermissionsRequest.java
│   │   └── dto/AssignGroupsRequest.java
│   └── audit/
│       ├── service/AuditService.java
│       ├── repository/AuditLogRepository.java
│       └── entity/AuditLog.java
├── src/main/resources/
│   └── application.yml
└── src/test/java/com/rpl/auction/
    ├── RplAuctionApplicationTests.java
    ├── auth/
    │   ├── service/JwtServiceTest.java
    │   ├── service/AuthServiceTest.java
    │   └── controller/AuthControllerIntegrationTest.java
    ├── user/
    │   └── controller/UserControllerIntegrationTest.java
    ├── rbac/
    │   ├── service/RbacServiceTest.java
    │   ├── aspect/PermissionAspectTest.java
    │   └── controller/RbacControllerIntegrationTest.java
    └── common/
        └── exception/GlobalExceptionHandlerTest.java
```

---

## Task 1: Project Scaffolding + Docker Compose

**Files:**
- Create: `backend/pom.xml`
- Create: `backend/docker-compose.yml`
- Create: `backend/src/main/java/com/rpl/auction/RplAuctionApplication.java`
- Create: `backend/src/main/resources/application.yml`

- [ ] **Step 1: Create `backend/` directory and `pom.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.4.3</version>
        <relativePath/>
    </parent>

    <groupId>com.rpl</groupId>
    <artifactId>rpl-auction</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>RPL Auction Platform</name>
    <description>Real IPL-style Auction Platform</description>

    <properties>
        <java.version>21</java.version>
        <jjwt.version>0.12.6</jjwt.version>
    </properties>

    <dependencies>
        <!-- Spring Boot Starters -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-aop</artifactId>
        </dependency>

        <!-- MySQL -->
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- JWT -->
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>${jjwt.version}</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>

        <!-- Swagger / OpenAPI -->
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
            <version>2.8.4</version>
        </dependency>

        <!-- Lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- Test -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>mysql</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>junit-jupiter</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Step 2: Create `docker-compose.yml`**

```yaml
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: rpl_auction
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

- [ ] **Step 3: Create `RplAuctionApplication.java`**

```java
package com.rpl.auction;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class RplAuctionApplication {
    public static void main(String[] args) {
        SpringApplication.run(RplAuctionApplication.class, args);
    }
}
```

- [ ] **Step 4: Create `application.yml`**

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/rpl_auction?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
    username: root
    password: root
    driver-class-name: com.mysql.cj.jdbc.Driver
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
        format_sql: true
app:
  jwt:
    secret: RPL_AUCTION_JWT_SECRET_KEY_MUST_BE_AT_LEAST_256_BITS_LONG_FOR_HS256
    access-token-expiry-ms: 3600000
    refresh-token-expiry-ms: 604800000
  cors:
    allowed-origins: http://localhost:3000

springdoc:
  api-docs:
    path: /api-docs
  swagger-ui:
    path: /swagger-ui.html

server:
  port: 8080
```

- [ ] **Step 5: Start MySQL via Docker Compose and verify app compiles**

Run:
```bash
cd backend && docker compose up -d
./mvnw clean compile
```
Expected: BUILD SUCCESS

- [ ] **Step 6: Commit**

```bash
git init
git add pom.xml docker-compose.yml src/
git commit -m "feat: scaffold Spring Boot project with Maven, MySQL, Docker Compose"
```

---

## Task 2: Common Layer — ApiResponse, Exceptions, GlobalExceptionHandler

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/common/dto/ApiResponse.java`
- Create: `backend/src/main/java/com/rpl/auction/common/dto/FieldErrorDetail.java`
- Create: `backend/src/main/java/com/rpl/auction/common/exception/ResourceNotFoundException.java`
- Create: `backend/src/main/java/com/rpl/auction/common/exception/BadRequestException.java`
- Create: `backend/src/main/java/com/rpl/auction/common/exception/UnauthorizedException.java`
- Create: `backend/src/main/java/com/rpl/auction/common/exception/ForbiddenException.java`
- Create: `backend/src/main/java/com/rpl/auction/common/exception/GlobalExceptionHandler.java`
- Test: `backend/src/test/java/com/rpl/auction/common/exception/GlobalExceptionHandlerTest.java`

- [ ] **Step 1: Write the test for ApiResponse and GlobalExceptionHandler**

```java
package com.rpl.auction.common.exception;

import com.rpl.auction.common.dto.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleResourceNotFound_returns404() {
        var ex = new ResourceNotFoundException("User", 1L);
        ResponseEntity<ApiResponse<Void>> response = handler.handleResourceNotFound(ex);
        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).contains("User");
    }

    @Test
    void handleBadRequest_returns400() {
        var ex = new BadRequestException("Invalid input");
        ResponseEntity<ApiResponse<Void>> response = handler.handleBadRequest(ex);
        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().isSuccess()).isFalse();
    }

    @Test
    void handleUnauthorized_returns401() {
        var ex = new UnauthorizedException("Invalid credentials");
        ResponseEntity<ApiResponse<Void>> response = handler.handleUnauthorized(ex);
        assertThat(response.getStatusCode().value()).isEqualTo(401);
    }

    @Test
    void handleForbidden_returns403() {
        var ex = new ForbiddenException("Insufficient permissions");
        ResponseEntity<ApiResponse<Void>> response = handler.handleForbidden(ex);
        assertThat(response.getStatusCode().value()).isEqualTo(403);
    }

    @Test
    void apiResponse_success_hasCorrectShape() {
        ApiResponse<String> response = ApiResponse.success("test data", "OK");
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData()).isEqualTo("test data");
        assertThat(response.getMessage()).isEqualTo("OK");
        assertThat(response.getErrors()).isNull();
        assertThat(response.getTimestamp()).isNotNull();
    }

    @Test
    void apiResponse_error_hasCorrectShape() {
        ApiResponse<Void> response = ApiResponse.error("Something failed");
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getData()).isNull();
        assertThat(response.getMessage()).isEqualTo("Something failed");
        assertThat(response.getTimestamp()).isNotNull();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./mvnw test -Dtest=GlobalExceptionHandlerTest -pl . -q`
Expected: FAIL — classes not found

- [ ] **Step 3: Implement ApiResponse**

```java
package com.rpl.auction.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.ALWAYS)
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    private List<FieldErrorDetail> errors;
    private Instant timestamp;

    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .errors(null)
                .timestamp(Instant.now())
                .build();
    }

    public static <T> ApiResponse<T> success(T data) {
        return success(data, null);
    }

    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .data(null)
                .errors(null)
                .timestamp(Instant.now())
                .build();
    }

    public static <T> ApiResponse<T> error(String message, List<FieldErrorDetail> errors) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .data(null)
                .errors(errors)
                .timestamp(Instant.now())
                .build();
    }
}
```

- [ ] **Step 4: Implement FieldErrorDetail**

```java
package com.rpl.auction.common.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FieldErrorDetail {
    private String field;
    private String message;
}
```

- [ ] **Step 5: Implement exception classes**

`ResourceNotFoundException.java`:
```java
package com.rpl.auction.common.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resource, Long id) {
        super(resource + " not found with id: " + id);
    }

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
```

`BadRequestException.java`:
```java
package com.rpl.auction.common.exception;

public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
```

`UnauthorizedException.java`:
```java
package com.rpl.auction.common.exception;

public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
}
```

`ForbiddenException.java`:
```java
package com.rpl.auction.common.exception;

public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
```

- [ ] **Step 6: Implement GlobalExceptionHandler**

```java
package com.rpl.auction.common.exception;

import com.rpl.auction.common.dto.ApiResponse;
import com.rpl.auction.common.dto.FieldErrorDetail;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(BadRequestException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnauthorized(UnauthorizedException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ApiResponse<Void>> handleForbidden(ForbiddenException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        List<FieldErrorDetail> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> new FieldErrorDetail(e.getField(), e.getDefaultMessage()))
                .toList();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error("Validation failed", errors));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("An unexpected error occurred"));
    }
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && ./mvnw test -Dtest=GlobalExceptionHandlerTest -pl . -q`
Expected: All 6 tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/main/java/com/rpl/auction/common/ src/test/java/com/rpl/auction/common/
git commit -m "feat: add ApiResponse, custom exceptions, and GlobalExceptionHandler"
```

---

## Task 3: User Entity + Repository

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/user/entity/User.java`
- Create: `backend/src/main/java/com/rpl/auction/user/repository/UserRepository.java`

- [ ] **Step 1: Create User entity**

```java
package com.rpl.auction.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "display_name", length = 100)
    private String displayName;

    @Column(unique = true, length = 150)
    private String email;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // NOTE: @ManyToMany to PermissionGroup will be added in Task 4 after PermissionGroup entity exists
    @Transient
    @Builder.Default
    private Set<Object> permissionGroups = new HashSet<>();
}
```

- [ ] **Step 2: Create UserRepository**

```java
package com.rpl.auction.user.repository;

import com.rpl.auction.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    Page<User> findByIsActiveTrue(Pageable pageable);
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd backend && ./mvnw clean compile -q`
Expected: BUILD SUCCESS (PermissionGroup not yet created — will compile once RBAC entities exist in Task 4)

Note: Compilation may fail here due to missing `PermissionGroup` class. That's OK — it's created in the next task. If needed, temporarily comment out the `@ManyToMany` field to verify compile, then restore it after Task 4.

- [ ] **Step 4: Commit**

```bash
git add src/main/java/com/rpl/auction/user/
git commit -m "feat: add User entity and UserRepository"
```

---

## Task 4: RBAC Entities — Module, Permission, PermissionGroup

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/rbac/entity/Module.java`
- Create: `backend/src/main/java/com/rpl/auction/rbac/entity/Permission.java`
- Create: `backend/src/main/java/com/rpl/auction/rbac/entity/PermissionGroup.java`
- Create: `backend/src/main/java/com/rpl/auction/rbac/repository/ModuleRepository.java`
- Create: `backend/src/main/java/com/rpl/auction/rbac/repository/PermissionRepository.java`
- Create: `backend/src/main/java/com/rpl/auction/rbac/repository/PermissionGroupRepository.java`

- [ ] **Step 1: Create Module entity**

```java
package com.rpl.auction.rbac.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "modules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Module {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(length = 255)
    private String description;

    @OneToMany(mappedBy = "module", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonIgnore
    @Builder.Default
    private List<Permission> permissions = new ArrayList<>();
}
```

- [ ] **Step 2: Create Permission entity**

```java
package com.rpl.auction.rbac.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "permissions", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"module_id", "name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Module module;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 255)
    private String description;

    /**
     * Returns "module:permission" format, e.g., "user:CREATE"
     */
    public String toFlatString() {
        return module.getName() + ":" + name;
    }
}
```

- [ ] **Step 3: Create PermissionGroup entity**

```java
package com.rpl.auction.rbac.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "permission_groups", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"name", "league_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PermissionGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 255)
    private String description;

    @Column(name = "league_id")
    private Long leagueId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "group_permissions",
            joinColumns = @JoinColumn(name = "group_id"),
            inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    @Builder.Default
    private Set<Permission> permissions = new HashSet<>();
}
```

- [ ] **Step 4: Create repositories**

`ModuleRepository.java`:
```java
package com.rpl.auction.rbac.repository;

import com.rpl.auction.rbac.entity.Module;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ModuleRepository extends JpaRepository<Module, Long> {
    Optional<Module> findByName(String name);
    boolean existsByName(String name);
}
```

`PermissionRepository.java`:
```java
package com.rpl.auction.rbac.repository;

import com.rpl.auction.rbac.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PermissionRepository extends JpaRepository<Permission, Long> {
    Optional<Permission> findByModuleNameAndName(String moduleName, String name);
    List<Permission> findByModuleId(Long moduleId);
}
```

`PermissionGroupRepository.java`:
```java
package com.rpl.auction.rbac.repository;

import com.rpl.auction.rbac.entity.PermissionGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PermissionGroupRepository extends JpaRepository<PermissionGroup, Long> {
    Optional<PermissionGroup> findByName(String name);
    boolean existsByNameAndLeagueIdIsNull(String name);
    boolean existsByNameAndLeagueId(String name, Long leagueId);
}
```

- [ ] **Step 5: Update User entity — replace @Transient placeholder with real @ManyToMany**

Now that `PermissionGroup` exists, update `User.java` to replace the temporary `@Transient` field:

Replace the `permissionGroups` field in `User.java` with:
```java
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "user_groups",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "group_id")
    )
    @Builder.Default
    private Set<com.rpl.auction.rbac.entity.PermissionGroup> permissionGroups = new HashSet<>();
```

Remove the `@Transient` import if no longer needed.

- [ ] **Step 6: Verify everything compiles**

Run: `cd backend && ./mvnw clean compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 7: Commit**

```bash
git add src/main/java/com/rpl/auction/rbac/ src/main/java/com/rpl/auction/user/entity/User.java
git commit -m "feat: add RBAC entities (Module, Permission, PermissionGroup) and repositories"
```

---

## Task 5: Audit Log Entity + Service

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/audit/entity/AuditLog.java`
- Create: `backend/src/main/java/com/rpl/auction/audit/repository/AuditLogRepository.java`
- Create: `backend/src/main/java/com/rpl/auction/audit/service/AuditService.java`

- [ ] **Step 1: Create AuditLog entity**

```java
package com.rpl.auction.audit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(name = "entity_type", length = 50)
    private String entityType;

    @Column(name = "entity_id")
    private Long entityId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "json")
    private Map<String, Object> details;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
```

- [ ] **Step 2: Create AuditLogRepository**

```java
package com.rpl.auction.audit.repository;

import com.rpl.auction.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByEntityType(String entityType, Pageable pageable);
    Page<AuditLog> findByUserId(Long userId, Pageable pageable);
}
```

- [ ] **Step 3: Create AuditService**

```java
package com.rpl.auction.audit.service;

import com.rpl.auction.audit.entity.AuditLog;
import com.rpl.auction.audit.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

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

    public Page<AuditLog> getLogs(Pageable pageable) {
        return auditLogRepository.findAll(pageable);
    }

    public Page<AuditLog> getLogsByEntityType(String entityType, Pageable pageable) {
        return auditLogRepository.findByEntityType(entityType, pageable);
    }
}
```

- [ ] **Step 4: Verify compilation**

Run: `cd backend && ./mvnw clean compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add src/main/java/com/rpl/auction/audit/
git commit -m "feat: add AuditLog entity, repository, and AuditService"
```

---

## Task 6: JWT Service

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/auth/service/JwtService.java`
- Test: `backend/src/test/java/com/rpl/auction/auth/service/JwtServiceTest.java`

- [ ] **Step 1: Write the failing tests**

```java
package com.rpl.auction.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(
                "TEST_SECRET_KEY_MUST_BE_AT_LEAST_256_BITS_LONG_FOR_HS256_ALGORITHM",
                3600000L,   // 1 hour
                604800000L  // 7 days
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
                -1000L, // already expired
                -1000L
        );
        String token = shortLivedService.generateAccessToken(1L, "admin", List.of());
        assertThat(shortLivedService.isTokenValid(token)).isFalse();
    }

    @Test
    void validateToken_tamperedToken_returnsFalse() {
        String token = jwtService.generateAccessToken(1L, "admin", List.of());
        String tampered = token + "tampered";
        assertThat(jwtService.isTokenValid(tampered)).isFalse();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./mvnw test -Dtest=JwtServiceTest -pl . -q`
Expected: FAIL — JwtService not found

- [ ] **Step 3: Implement JwtService**

```java
package com.rpl.auction.auth.service;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

@Service
public class JwtService {

    private final SecretKey secretKey;
    private final long accessTokenExpiryMs;
    private final long refreshTokenExpiryMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-expiry-ms}") Long accessTokenExpiryMs,
            @Value("${app.jwt.refresh-token-expiry-ms}") Long refreshTokenExpiryMs
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpiryMs = accessTokenExpiryMs;
        this.refreshTokenExpiryMs = refreshTokenExpiryMs;
    }

    public String generateAccessToken(Long userId, String username, List<String> permissions) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + accessTokenExpiryMs);

        return Jwts.builder()
                .subject(userId.toString())
                .claim("username", username)
                .claim("permissions", permissions)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    public String generateRefreshToken(Long userId) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + refreshTokenExpiryMs);

        return Jwts.builder()
                .subject(userId.toString())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    public boolean isTokenValid(String token) {
        try {
            parseToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public Long extractUserId(String token) {
        return Long.parseLong(parseToken(token).getPayload().getSubject());
    }

    public String extractUsername(String token) {
        return parseToken(token).getPayload().get("username", String.class);
    }

    @SuppressWarnings("unchecked")
    public List<String> extractPermissions(String token) {
        return parseToken(token).getPayload().get("permissions", List.class);
    }

    private Jws<Claims> parseToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token);
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && ./mvnw test -Dtest=JwtServiceTest -pl . -q`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/java/com/rpl/auction/auth/service/JwtService.java src/test/java/com/rpl/auction/auth/service/JwtServiceTest.java
git commit -m "feat: add JwtService with access/refresh token generation and validation"
```

---

## Task 7: RefreshToken Entity + SecurityUtil

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/auth/entity/RefreshToken.java`
- Create: `backend/src/main/java/com/rpl/auction/auth/repository/RefreshTokenRepository.java`
- Create: `backend/src/main/java/com/rpl/auction/common/util/SecurityUtil.java`

- [ ] **Step 1: Create RefreshToken entity**

```java
package com.rpl.auction.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    @Builder.Default
    private Boolean revoked = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
```

- [ ] **Step 2: Create RefreshTokenRepository**

```java
package com.rpl.auction.auth.repository;

import com.rpl.auction.auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("UPDATE RefreshToken r SET r.revoked = true WHERE r.userId = :userId AND r.revoked = false")
    void revokeAllByUserId(Long userId);
}
```

- [ ] **Step 3: Create SecurityUtil**

```java
package com.rpl.auction.common.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collections;
import java.util.List;

public final class SecurityUtil {

    private SecurityUtil() {}

    public static Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            return null;
        }
        return (Long) auth.getPrincipal();
    }

    @SuppressWarnings("unchecked")
    public static List<String> getCurrentPermissions() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getCredentials() == null) {
            return Collections.emptyList();
        }
        return (List<String>) auth.getCredentials();
    }
}
```

- [ ] **Step 4: Verify compilation**

Run: `cd backend && ./mvnw clean compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add src/main/java/com/rpl/auction/auth/entity/ src/main/java/com/rpl/auction/auth/repository/ src/main/java/com/rpl/auction/common/util/
git commit -m "feat: add RefreshToken entity, repository, and SecurityUtil"
```

---

## Task 8: JWT Filter + Security Config

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/auth/filter/JwtAuthFilter.java`
- Create: `backend/src/main/java/com/rpl/auction/config/SecurityConfig.java`
- Create: `backend/src/main/java/com/rpl/auction/config/AppConfig.java`
- Create: `backend/src/main/java/com/rpl/auction/config/OpenApiConfig.java`

- [ ] **Step 1: Create JwtAuthFilter**

```java
package com.rpl.auction.auth.filter;

import com.rpl.auction.auth.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        if (!jwtService.isTokenValid(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        Long userId = jwtService.extractUserId(token);
        List<String> permissions = jwtService.extractPermissions(token);

        List<SimpleGrantedAuthority> authorities = permissions != null
                ? permissions.stream().map(SimpleGrantedAuthority::new).toList()
                : List.of();

        // Principal = userId, Credentials = permissions list (for SecurityUtil)
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(userId, permissions, authorities);

        SecurityContextHolder.getContext().setAuthentication(authentication);
        filterChain.doFilter(request, response);
    }
}
```

- [ ] **Step 2: Create SecurityConfig**

```java
package com.rpl.auction.config;

import com.rpl.auction.auth.filter.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/auth/login",
                                "/api/auth/refresh",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/api-docs/**",
                                "/v3/api-docs/**"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
```

- [ ] **Step 3: Create AppConfig**

```java
package com.rpl.auction.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@EnableAsync
public class AppConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

- [ ] **Step 4: Create OpenApiConfig**

```java
package com.rpl.auction.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("RPL Auction Platform API")
                        .version("1.0")
                        .description("Real IPL-style Auction Platform"))
                .addSecurityItem(new SecurityRequirement().addList("Bearer"))
                .components(new Components()
                        .addSecuritySchemes("Bearer",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")));
    }
}
```

- [ ] **Step 5: Verify compilation**

Run: `cd backend && ./mvnw clean compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 6: Commit**

```bash
git add src/main/java/com/rpl/auction/auth/filter/ src/main/java/com/rpl/auction/config/
git commit -m "feat: add JwtAuthFilter, SecurityConfig with CORS, AppConfig, OpenApiConfig"
```

---

## Task 9: Auth Service + Auth DTOs

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/auth/dto/LoginRequest.java`
- Create: `backend/src/main/java/com/rpl/auction/auth/dto/LoginResponse.java`
- Create: `backend/src/main/java/com/rpl/auction/auth/dto/RefreshRequest.java`
- Create: `backend/src/main/java/com/rpl/auction/auth/service/AuthService.java`
- Test: `backend/src/test/java/com/rpl/auction/auth/service/AuthServiceTest.java`

- [ ] **Step 1: Create DTOs**

`LoginRequest.java`:
```java
package com.rpl.auction.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {
    @NotBlank(message = "Username is required")
    private String username;

    @NotBlank(message = "Password is required")
    private String password;
}
```

`LoginResponse.java`:
```java
package com.rpl.auction.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private String accessToken;
    private String refreshToken;
    private long expiresIn;
    private UserInfo user;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private Long id;
        private String username;
        private String displayName;
        private List<String> permissions;
    }
}
```

`RefreshRequest.java`:
```java
package com.rpl.auction.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RefreshRequest {
    @NotBlank(message = "Refresh token is required")
    private String refreshToken;
}
```

- [ ] **Step 2: Write the failing tests for AuthService**

```java
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
import org.mockito.ArgumentCaptor;
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
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        jwtService = new JwtService(
                "TEST_SECRET_KEY_MUST_BE_AT_LEAST_256_BITS_LONG_FOR_HS256_ALGORITHM",
                3600000L,
                604800000L
        );
        authService = new AuthService(userRepository, refreshTokenRepository, jwtService, passwordEncoder, 3600000L, 604800000L);
    }

    private User createTestUser() {
        Module userModule = Module.builder().id(1L).name("user").build();
        Permission readPerm = Permission.builder().id(1L).module(userModule).name("READ").build();
        PermissionGroup group = PermissionGroup.builder()
                .id(1L).name("Test Group")
                .permissions(Set.of(readPerm))
                .build();

        return User.builder()
                .id(1L)
                .username("admin")
                .passwordHash(passwordEncoder.encode("admin123"))
                .displayName("Admin")
                .isActive(true)
                .permissionGroups(Set.of(group))
                .build();
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
        User user = createTestUser();
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));

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
        RefreshToken token = RefreshToken.builder()
                .id(1L).userId(1L).revoked(false)
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
        when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));

        authService.logout("some-refresh-token");

        assertThat(token.getRevoked()).isTrue();
        verify(refreshTokenRepository).save(token);
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && ./mvnw test -Dtest=AuthServiceTest -pl . -q`
Expected: FAIL — AuthService not found

- [ ] **Step 4: Implement AuthService**

```java
package com.rpl.auction.auth.service;

import com.rpl.auction.auth.dto.LoginRequest;
import com.rpl.auction.auth.dto.LoginResponse;
import com.rpl.auction.auth.dto.RefreshRequest;
import com.rpl.auction.auth.entity.RefreshToken;
import com.rpl.auction.auth.repository.RefreshTokenRepository;
import com.rpl.auction.common.exception.UnauthorizedException;
import com.rpl.auction.rbac.entity.Permission;
import com.rpl.auction.rbac.entity.PermissionGroup;
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

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       JwtService jwtService,
                       PasswordEncoder passwordEncoder,
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

        if (!user.getIsActive()) {
            throw new UnauthorizedException("Account is deactivated");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid credentials");
        }

        List<String> permissions = flattenPermissions(user);
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getUsername(), permissions);
        String refreshToken = jwtService.generateRefreshToken(user.getId());

        saveRefreshToken(user.getId(), refreshToken);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(accessTokenExpiryMs / 1000)
                .user(LoginResponse.UserInfo.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .displayName(user.getDisplayName())
                        .permissions(permissions)
                        .build())
                .build();
    }

    @Transactional
    public LoginResponse refresh(RefreshRequest request) {
        String tokenHash = hashToken(request.getRefreshToken());
        RefreshToken stored = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (stored.getRevoked()) {
            // Possible token theft — revoke all tokens for this user
            refreshTokenRepository.revokeAllByUserId(stored.getUserId());
            throw new UnauthorizedException("Refresh token has been revoked");
        }

        if (stored.getExpiresAt().isBefore(Instant.now())) {
            throw new UnauthorizedException("Refresh token has expired");
        }

        // Revoke old token (rotation)
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        // Issue new tokens
        User user = userRepository.findById(stored.getUserId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        List<String> permissions = flattenPermissions(user);
        String newAccessToken = jwtService.generateAccessToken(user.getId(), user.getUsername(), permissions);
        String newRefreshToken = jwtService.generateRefreshToken(user.getId());

        saveRefreshToken(user.getId(), newRefreshToken);

        return LoginResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .expiresIn(accessTokenExpiryMs / 1000)
                .user(LoginResponse.UserInfo.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .displayName(user.getDisplayName())
                        .permissions(permissions)
                        .build())
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

        return LoginResponse.UserInfo.builder()
                .id(user.getId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .permissions(flattenPermissions(user))
                .build();
    }

    private List<String> flattenPermissions(User user) {
        return user.getPermissionGroups().stream()
                .flatMap(group -> group.getPermissions().stream())
                .map(Permission::toFlatString)
                .distinct()
                .sorted()
                .toList();
    }

    private void saveRefreshToken(Long userId, String rawToken) {
        RefreshToken refreshToken = RefreshToken.builder()
                .userId(userId)
                .tokenHash(hashToken(rawToken))
                .expiresAt(Instant.now().plusMillis(refreshTokenExpiryMs))
                .revoked(false)
                .build();
        refreshTokenRepository.save(refreshToken);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && ./mvnw test -Dtest=AuthServiceTest -pl . -q`
Expected: All 5 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/java/com/rpl/auction/auth/dto/ src/main/java/com/rpl/auction/auth/service/AuthService.java src/test/java/com/rpl/auction/auth/service/AuthServiceTest.java
git commit -m "feat: add AuthService with login, refresh (with rotation), and logout"
```

---

## Task 10: Seed Data

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/config/DataSeeder.java`

**Note:** DataSeeder must exist before integration tests in later tasks (they login as `admin`).

- [ ] **Step 1: Create DataSeeder using ApplicationRunner**

```java
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

        // 1. Create modules
        List<String> moduleNames = List.of(
                "user", "rbac", "league", "team", "player",
                "retention", "auction", "dashboard", "report", "audit"
        );

        Map<String, Module> modules = new LinkedHashMap<>();
        for (String name : moduleNames) {
            Module module = moduleRepository.save(
                    Module.builder().name(name).description(name + " management").build()
            );
            modules.put(name, module);
        }

        // 2. Create permissions (CRUD for each module + module-specific)
        List<String> crudOps = List.of("CREATE", "READ", "UPDATE", "DELETE");
        Map<String, List<String>> extraPermissions = Map.of(
                "user", List.of("MANAGE_GROUPS"),
                "rbac", List.of("MANAGE_PERMISSIONS"),
                "auction", List.of("BID", "START", "PAUSE", "RESUME", "COMPLETE")
        );

        Set<Permission> allPermissions = new HashSet<>();
        for (Map.Entry<String, Module> entry : modules.entrySet()) {
            for (String op : crudOps) {
                Permission p = permissionRepository.save(
                        Permission.builder()
                                .module(entry.getValue())
                                .name(op)
                                .description(entry.getKey() + " " + op.toLowerCase())
                                .build()
                );
                allPermissions.add(p);
            }
            List<String> extras = extraPermissions.getOrDefault(entry.getKey(), List.of());
            for (String extra : extras) {
                Permission p = permissionRepository.save(
                        Permission.builder()
                                .module(entry.getValue())
                                .name(extra)
                                .description(entry.getKey() + " " + extra.toLowerCase())
                                .build()
                );
                allPermissions.add(p);
            }
        }

        // 3. Create permission groups
        PermissionGroup superAdmin = PermissionGroup.builder()
                .name("Super Admin")
                .description("Full platform access")
                .permissions(allPermissions)
                .build();
        permissionGroupRepository.save(superAdmin);

        Set<Permission> leagueAdminPerms = new HashSet<>();
        for (Permission p : allPermissions) {
            String moduleName = p.getModule().getName();
            if (!moduleName.equals("rbac") && !moduleName.equals("audit")) {
                leagueAdminPerms.add(p);
            }
        }
        PermissionGroup leagueAdmin = PermissionGroup.builder()
                .name("League Admin")
                .description("League-level administration")
                .permissions(leagueAdminPerms)
                .build();
        permissionGroupRepository.save(leagueAdmin);

        Set<Permission> teamOwnerPerms = new HashSet<>();
        permissionRepository.findByModuleNameAndName("team", "READ").ifPresent(teamOwnerPerms::add);
        permissionRepository.findByModuleNameAndName("player", "READ").ifPresent(teamOwnerPerms::add);
        permissionRepository.findByModuleNameAndName("auction", "BID").ifPresent(teamOwnerPerms::add);
        permissionRepository.findByModuleNameAndName("dashboard", "READ").ifPresent(teamOwnerPerms::add);
        PermissionGroup teamOwner = PermissionGroup.builder()
                .name("Team Owner")
                .description("Team owner with bidding access")
                .permissions(teamOwnerPerms)
                .build();
        permissionGroupRepository.save(teamOwner);

        Set<Permission> spectatorPerms = new HashSet<>();
        permissionRepository.findByModuleNameAndName("dashboard", "READ").ifPresent(spectatorPerms::add);
        PermissionGroup spectator = PermissionGroup.builder()
                .name("Spectator")
                .description("View-only access to dashboard")
                .permissions(spectatorPerms)
                .build();
        permissionGroupRepository.save(spectator);

        // 4. Create default admin user
        User admin = User.builder()
                .username("admin")
                .passwordHash(passwordEncoder.encode("admin123"))
                .displayName("Admin")
                .email("admin@rpl.com")
                .isActive(true)
                .permissionGroups(Set.of(superAdmin))
                .build();
        userRepository.save(admin);

        log.info("Seed data created successfully. Default login: admin / admin123");
    }
}
```

- [ ] **Step 2: Start app and verify seed data is created**

Run:
```bash
cd backend && docker compose up -d && ./mvnw spring-boot:run
```
Expected: Log output shows "Seed data created successfully"

- [ ] **Step 3: Test login with curl**

Run:
```bash
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -m json.tool
```
Expected: JSON response with accessToken, refreshToken, and user info with permissions

- [ ] **Step 4: Commit**

```bash
git add src/main/java/com/rpl/auction/config/DataSeeder.java
git commit -m "feat: add DataSeeder with modules, permissions, groups, and default admin user"
```

---

## Task 11: Auth Controller

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/auth/controller/AuthController.java`
- Test: `backend/src/test/java/com/rpl/auction/auth/controller/AuthControllerIntegrationTest.java`

- [ ] **Step 1: Create AuthController**

```java
package com.rpl.auction.auth.controller;

import com.rpl.auction.auth.dto.LoginRequest;
import com.rpl.auction.auth.dto.LoginResponse;
import com.rpl.auction.auth.dto.RefreshRequest;
import com.rpl.auction.auth.service.AuthService;
import com.rpl.auction.common.dto.ApiResponse;
import com.rpl.auction.common.util.SecurityUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Login successful"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(@Valid @RequestBody RefreshRequest request) {
        LoginResponse response = authService.refresh(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Token refreshed"));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@Valid @RequestBody RefreshRequest request) {
        authService.logout(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success(null, "Logged out successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<LoginResponse.UserInfo>> me() {
        Long userId = SecurityUtil.getCurrentUserId();
        LoginResponse.UserInfo user = authService.getCurrentUser(userId);
        return ResponseEntity.ok(ApiResponse.success(user));
    }
}
```

- [ ] **Step 2: Write integration test**

```java
package com.rpl.auction.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rpl.auction.auth.dto.LoginRequest;
import com.rpl.auction.auth.dto.RefreshRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AuthControllerIntegrationTest {

    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("rpl_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.sql.init.mode", () -> "always");
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void login_withSeededAdmin_returnsTokens() throws Exception {
        LoginRequest request = new LoginRequest("admin", "admin123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.data.user.username").value("admin"));
    }

    @Test
    void login_wrongPassword_returns401() throws Exception {
        LoginRequest request = new LoginRequest("admin", "wrongpassword");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void me_withValidToken_returnsUserInfo() throws Exception {
        // Login first to get token
        LoginRequest loginReq = new LoginRequest("admin", "admin123");
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andReturn();

        String accessToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .path("data").path("accessToken").asText();

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("admin"));
    }

    @Test
    void me_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refresh_withValidToken_returnsNewTokens() throws Exception {
        // Login first
        LoginRequest loginReq = new LoginRequest("admin", "admin123");
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andReturn();

        String refreshToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .path("data").path("refreshToken").asText();

        RefreshRequest refreshReq = new RefreshRequest(refreshToken);

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty());
    }
}
```

- [ ] **Step 3: Run integration tests (requires Docker for Testcontainers)**

Run: `cd backend && ./mvnw test -Dtest=AuthControllerIntegrationTest -pl . -q`
Expected: All 5 tests PASS (DataSeeder from Task 9 seeds the admin user)

- [ ] **Step 4: Commit**

```bash
git add src/main/java/com/rpl/auction/auth/controller/ src/test/java/com/rpl/auction/auth/controller/
git commit -m "feat: add AuthController with login, refresh, logout, me endpoints"
```

---

## Task 12: RequiresPermission Annotation + AOP Aspect

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/rbac/annotation/RequiresPermission.java`
- Create: `backend/src/main/java/com/rpl/auction/rbac/aspect/PermissionAspect.java`
- Test: `backend/src/test/java/com/rpl/auction/rbac/aspect/PermissionAspectTest.java`

- [ ] **Step 1: Write the failing test**

```java
package com.rpl.auction.rbac.aspect;

import com.rpl.auction.common.exception.ForbiddenException;
import com.rpl.auction.rbac.annotation.RequiresPermission;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Method;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PermissionAspectTest {

    private final PermissionAspect aspect = new PermissionAspect();

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void setPermissions(List<String> permissions) {
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(1L, permissions, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void checkPermission_userHasPermission_passes() throws NoSuchMethodException {
        setPermissions(List.of("user:CREATE", "user:READ"));

        RequiresPermission annotation = getAnnotation("methodWithUserCreate");
        assertThatCode(() -> aspect.checkPermission(annotation)).doesNotThrowAnyException();
    }

    @Test
    void checkPermission_userLacksPermission_throwsForbidden() throws NoSuchMethodException {
        setPermissions(List.of("user:READ"));

        RequiresPermission annotation = getAnnotation("methodWithUserCreate");
        assertThatThrownBy(() -> aspect.checkPermission(annotation))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void checkPermission_noAuthentication_throwsForbidden() throws NoSuchMethodException {
        RequiresPermission annotation = getAnnotation("methodWithUserCreate");
        assertThatThrownBy(() -> aspect.checkPermission(annotation))
                .isInstanceOf(ForbiddenException.class);
    }

    // Dummy annotated methods for test
    @RequiresPermission(module = "user", permission = "CREATE")
    public void methodWithUserCreate() {}

    private RequiresPermission getAnnotation(String methodName) throws NoSuchMethodException {
        Method method = this.getClass().getMethod(methodName);
        return method.getAnnotation(RequiresPermission.class);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./mvnw test -Dtest=PermissionAspectTest -pl . -q`
Expected: FAIL — classes not found

- [ ] **Step 3: Create RequiresPermission annotation**

```java
package com.rpl.auction.rbac.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiresPermission {
    String module();
    String permission();
}
```

- [ ] **Step 4: Create PermissionAspect**

```java
package com.rpl.auction.rbac.aspect;

import com.rpl.auction.common.exception.ForbiddenException;
import com.rpl.auction.common.util.SecurityUtil;
import com.rpl.auction.rbac.annotation.RequiresPermission;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

import java.util.List;

@Aspect
@Component
public class PermissionAspect {

    @Before("@annotation(requiresPermission)")
    public void checkPermission(RequiresPermission requiresPermission) {
        List<String> permissions = SecurityUtil.getCurrentPermissions();
        String required = requiresPermission.module() + ":" + requiresPermission.permission();

        if (permissions == null || !permissions.contains(required)) {
            throw new ForbiddenException("Missing required permission: " + required);
        }
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && ./mvnw test -Dtest=PermissionAspectTest -pl . -q`
Expected: All 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/java/com/rpl/auction/rbac/annotation/ src/main/java/com/rpl/auction/rbac/aspect/ src/test/java/com/rpl/auction/rbac/aspect/
git commit -m "feat: add @RequiresPermission annotation and AOP-based permission enforcement"
```

---

## Task 13: User Service + Controller + DTOs (with RBAC forbidden test)

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/user/dto/CreateUserRequest.java`
- Create: `backend/src/main/java/com/rpl/auction/user/dto/UpdateUserRequest.java`
- Create: `backend/src/main/java/com/rpl/auction/user/dto/ChangePasswordRequest.java`
- Create: `backend/src/main/java/com/rpl/auction/user/dto/UserResponse.java`
- Create: `backend/src/main/java/com/rpl/auction/user/service/UserService.java`
- Create: `backend/src/main/java/com/rpl/auction/user/controller/UserController.java`
- Test: `backend/src/test/java/com/rpl/auction/user/controller/UserControllerIntegrationTest.java`

- [ ] **Step 1: Create DTOs**

`CreateUserRequest.java`:
```java
package com.rpl.auction.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserRequest {
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 100)
    private String username;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100)
    private String password;

    private String displayName;
    private String email;
}
```

`UpdateUserRequest.java`:
```java
package com.rpl.auction.user.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {
    private String displayName;
    private String email;
}
```

`ChangePasswordRequest.java`:
```java
package com.rpl.auction.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChangePasswordRequest {
    private String oldPassword; // required for self-service, omitted for admin
    @NotBlank(message = "New password is required")
    @Size(min = 6, max = 100)
    private String newPassword;
}
```

`UserResponse.java`:
```java
package com.rpl.auction.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String username;
    private String displayName;
    private String email;
    private Boolean isActive;
    private List<String> groups;
    private Instant createdAt;
}
```

- [ ] **Step 2: Create UserService**

```java
package com.rpl.auction.user.service;

import com.rpl.auction.common.exception.BadRequestException;
import com.rpl.auction.common.exception.ForbiddenException;
import com.rpl.auction.common.exception.ResourceNotFoundException;
import com.rpl.auction.rbac.entity.PermissionGroup;
import com.rpl.auction.rbac.repository.PermissionGroupRepository;
import com.rpl.auction.user.dto.*;
import com.rpl.auction.user.entity.User;
import com.rpl.auction.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PermissionGroupRepository permissionGroupRepository;
    private final PasswordEncoder passwordEncoder;

    public Page<UserResponse> getUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::toResponse);
    }

    public UserResponse getUserById(Long id) {
        User user = findUserOrThrow(id);
        return toResponse(user);
    }

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username already exists");
        }
        if (request.getEmail() != null && userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already exists");
        }

        User user = User.builder()
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .displayName(request.getDisplayName())
                .email(request.getEmail())
                .isActive(true)
                .build();

        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateUser(Long id, UpdateUserRequest request) {
        User user = findUserOrThrow(id);

        if (request.getDisplayName() != null) {
            user.setDisplayName(request.getDisplayName());
        }
        if (request.getEmail() != null) {
            if (!request.getEmail().equals(user.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
                throw new BadRequestException("Email already exists");
            }
            user.setEmail(request.getEmail());
        }

        return toResponse(userRepository.save(user));
    }

    @Transactional
    public void deactivateUser(Long id) {
        User user = findUserOrThrow(id);
        user.setIsActive(false);
        userRepository.save(user);
    }

    @Transactional
    public void changePassword(Long targetUserId, Long currentUserId, ChangePasswordRequest request) {
        User user = findUserOrThrow(targetUserId);

        boolean isSelfService = targetUserId.equals(currentUserId);

        if (isSelfService) {
            if (request.getOldPassword() == null || request.getOldPassword().isBlank()) {
                throw new BadRequestException("Old password is required for self-service password change");
            }
            if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
                throw new BadRequestException("Old password is incorrect");
            }
        }
        // If not self-service, caller must have user:UPDATE permission (checked by controller annotation)

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Transactional
    public UserResponse assignGroups(Long userId, List<Long> groupIds) {
        User user = findUserOrThrow(userId);
        Set<PermissionGroup> groups = new HashSet<>(permissionGroupRepository.findAllById(groupIds));
        user.setPermissionGroups(groups);
        return toResponse(userRepository.save(user));
    }

    private User findUserOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .email(user.getEmail())
                .isActive(user.getIsActive())
                .groups(user.getPermissionGroups().stream()
                        .map(PermissionGroup::getName)
                        .sorted()
                        .toList())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
```

- [ ] **Step 3: Create UserController**

```java
package com.rpl.auction.user.controller;

import com.rpl.auction.common.dto.ApiResponse;
import com.rpl.auction.common.util.SecurityUtil;
import com.rpl.auction.rbac.annotation.RequiresPermission;
import com.rpl.auction.user.dto.*;
import com.rpl.auction.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    @RequiresPermission(module = "user", permission = "READ")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getUsers(Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUsers(pageable)));
    }

    @GetMapping("/{id}")
    @RequiresPermission(module = "user", permission = "READ")
    public ResponseEntity<ApiResponse<UserResponse>> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserById(id)));
    }

    @PostMapping
    @RequiresPermission(module = "user", permission = "CREATE")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(@Valid @RequestBody CreateUserRequest request) {
        UserResponse user = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(user, "User created successfully"));
    }

    @PutMapping("/{id}")
    @RequiresPermission(module = "user", permission = "UPDATE")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(ApiResponse.success(userService.updateUser(id, request), "User updated"));
    }

    @PatchMapping("/{id}/deactivate")
    @RequiresPermission(module = "user", permission = "DELETE")
    public ResponseEntity<ApiResponse<Void>> deactivateUser(@PathVariable Long id) {
        userService.deactivateUser(id);
        return ResponseEntity.ok(ApiResponse.success(null, "User deactivated"));
    }

    @PutMapping("/{id}/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @PathVariable Long id, @Valid @RequestBody ChangePasswordRequest request) {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        boolean isSelfService = id.equals(currentUserId);

        if (!isSelfService) {
            // Check for user:UPDATE permission manually
            List<String> permissions = SecurityUtil.getCurrentPermissions();
            if (!permissions.contains("user:UPDATE")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Missing required permission: user:UPDATE"));
            }
        }

        userService.changePassword(id, currentUserId, request);
        return ResponseEntity.ok(ApiResponse.success(null, "Password changed"));
    }

    @PutMapping("/{id}/groups")
    @RequiresPermission(module = "user", permission = "MANAGE_GROUPS")
    public ResponseEntity<ApiResponse<UserResponse>> assignGroups(
            @PathVariable Long id, @RequestBody List<Long> groupIds) {
        return ResponseEntity.ok(ApiResponse.success(userService.assignGroups(id, groupIds), "Groups assigned"));
    }
}
```

- [ ] **Step 4: Write integration test**

```java
package com.rpl.auction.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rpl.auction.auth.dto.LoginRequest;
import com.rpl.auction.user.dto.CreateUserRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class UserControllerIntegrationTest {

    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("rpl_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    private String adminToken;

    @BeforeEach
    void loginAsAdmin() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("admin", "admin123"))))
                .andExpect(status().isOk())
                .andReturn();

        adminToken = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("accessToken").asText();
    }

    @Test
    void createUser_withAdminToken_returns201() throws Exception {
        CreateUserRequest req = new CreateUserRequest("newuser", "password123", "New User", "new@test.com");

        mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.username").value("newuser"));
    }

    @Test
    void getUsers_withAdminToken_returnsPage() throws Exception {
        mockMvc.perform(get("/api/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void getUsers_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deactivateUser_withAdminToken_returns200() throws Exception {
        // Create a user first
        CreateUserRequest req = new CreateUserRequest("todeactivate", "password123", "Temp", null);
        MvcResult createResult = mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        Long userId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(patch("/api/users/" + userId + "/deactivate")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User deactivated"));
    }

    @Test
    void createUser_withSpectatorToken_returns403() throws Exception {
        // Create a spectator user first
        CreateUserRequest spectatorReq = new CreateUserRequest("spectator1", "password123", "Spec", null);
        MvcResult createResult = mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(spectatorReq)))
                .andExpect(status().isCreated())
                .andReturn();

        Long spectatorId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Assign Spectator group (has only dashboard:READ, no user:CREATE)
        // Get the Spectator group ID by listing groups
        MvcResult groupsResult = mockMvc.perform(get("/api/rbac/groups")
                        .header("Authorization", "Bearer " + adminToken))
                .andReturn();

        // Find Spectator group ID from response
        var groupsNode = objectMapper.readTree(groupsResult.getResponse().getContentAsString()).path("data");
        Long spectatorGroupId = null;
        for (var node : groupsNode) {
            if ("Spectator".equals(node.path("name").asText())) {
                spectatorGroupId = node.path("id").asLong();
                break;
            }
        }

        // Assign spectator group
        mockMvc.perform(put("/api/users/" + spectatorId + "/groups")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[" + spectatorGroupId + "]"))
                .andExpect(status().isOk());

        // Login as spectator
        MvcResult specLogin = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("spectator1", "password123"))))
                .andExpect(status().isOk())
                .andReturn();

        String spectatorToken = objectMapper.readTree(specLogin.getResponse().getContentAsString())
                .path("data").path("accessToken").asText();

        // Try to create user with spectator token — should get 403
        CreateUserRequest req = new CreateUserRequest("blocked", "password123", "Blocked", null);
        mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + spectatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }
}
```

- [ ] **Step 5: Run tests**

Run: `cd backend && ./mvnw test -Dtest=UserControllerIntegrationTest -pl . -q`
Expected: All 5 tests PASS (including the RBAC forbidden test)

- [ ] **Step 6: Commit**

```bash
git add src/main/java/com/rpl/auction/user/ src/test/java/com/rpl/auction/user/
git commit -m "feat: add UserService, UserController with CRUD, deactivate, password change, group assignment"
```

---

## Task 14: RBAC Service + Controller + DTOs

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/rbac/dto/PermissionGroupRequest.java`
- Create: `backend/src/main/java/com/rpl/auction/rbac/dto/ModuleRequest.java`
- Create: `backend/src/main/java/com/rpl/auction/rbac/dto/PermissionRequest.java`
- Create: `backend/src/main/java/com/rpl/auction/rbac/dto/AssignPermissionsRequest.java`
- Create: `backend/src/main/java/com/rpl/auction/rbac/service/RbacService.java`
- Create: `backend/src/main/java/com/rpl/auction/rbac/controller/RbacController.java`
- Test: `backend/src/test/java/com/rpl/auction/rbac/service/RbacServiceTest.java`
- Test: `backend/src/test/java/com/rpl/auction/rbac/controller/RbacControllerIntegrationTest.java`

- [ ] **Step 1: Create DTOs**

`PermissionGroupRequest.java`:
```java
package com.rpl.auction.rbac.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PermissionGroupRequest {
    @NotBlank(message = "Group name is required")
    private String name;
    private String description;
    private Long leagueId;
}
```

`ModuleRequest.java`:
```java
package com.rpl.auction.rbac.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ModuleRequest {
    @NotBlank(message = "Module name is required")
    private String name;
    private String description;
}
```

`PermissionRequest.java`:
```java
package com.rpl.auction.rbac.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PermissionRequest {
    @NotNull(message = "Module ID is required")
    private Long moduleId;
    @NotBlank(message = "Permission name is required")
    private String name;
    private String description;
}
```

`AssignPermissionsRequest.java`:
```java
package com.rpl.auction.rbac.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssignPermissionsRequest {
    @NotNull(message = "Permission IDs are required")
    private List<Long> permissionIds;
}
```

- [ ] **Step 2: Write the failing test for RbacService**

```java
package com.rpl.auction.rbac.service;

import com.rpl.auction.common.exception.BadRequestException;
import com.rpl.auction.rbac.dto.PermissionGroupRequest;
import com.rpl.auction.rbac.entity.PermissionGroup;
import com.rpl.auction.rbac.repository.ModuleRepository;
import com.rpl.auction.rbac.repository.PermissionGroupRepository;
import com.rpl.auction.rbac.repository.PermissionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RbacServiceTest {

    @Mock private PermissionGroupRepository groupRepository;
    @Mock private ModuleRepository moduleRepository;
    @Mock private PermissionRepository permissionRepository;

    @InjectMocks private RbacService rbacService;

    @Test
    void createGroup_platformLevel_checksForDuplicate() {
        when(groupRepository.existsByNameAndLeagueIdIsNull("Super Admin")).thenReturn(true);

        PermissionGroupRequest request = new PermissionGroupRequest("Super Admin", "test", null);

        assertThatThrownBy(() -> rbacService.createGroup(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void createGroup_leagueLevel_checksForDuplicate() {
        when(groupRepository.existsByNameAndLeagueId("Admin", 1L)).thenReturn(true);

        PermissionGroupRequest request = new PermissionGroupRequest("Admin", "test", 1L);

        assertThatThrownBy(() -> rbacService.createGroup(request))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void createGroup_valid_savesSuccessfully() {
        when(groupRepository.existsByNameAndLeagueIdIsNull("New Group")).thenReturn(false);
        PermissionGroup saved = PermissionGroup.builder().id(1L).name("New Group").build();
        when(groupRepository.save(any())).thenReturn(saved);

        PermissionGroupRequest request = new PermissionGroupRequest("New Group", "desc", null);
        PermissionGroup result = rbacService.createGroup(request);

        assertThat(result.getName()).isEqualTo("New Group");
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && ./mvnw test -Dtest=RbacServiceTest -pl . -q`
Expected: FAIL — RbacService not found

- [ ] **Step 4: Implement RbacService**

```java
package com.rpl.auction.rbac.service;

import com.rpl.auction.common.exception.BadRequestException;
import com.rpl.auction.common.exception.ResourceNotFoundException;
import com.rpl.auction.rbac.dto.*;
import com.rpl.auction.rbac.entity.Module;
import com.rpl.auction.rbac.entity.Permission;
import com.rpl.auction.rbac.entity.PermissionGroup;
import com.rpl.auction.rbac.repository.ModuleRepository;
import com.rpl.auction.rbac.repository.PermissionGroupRepository;
import com.rpl.auction.rbac.repository.PermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class RbacService {

    private final PermissionGroupRepository groupRepository;
    private final ModuleRepository moduleRepository;
    private final PermissionRepository permissionRepository;

    // --- Permission Groups ---

    public List<PermissionGroup> getAllGroups() {
        return groupRepository.findAll();
    }

    @Transactional
    public PermissionGroup createGroup(PermissionGroupRequest request) {
        checkGroupNameUniqueness(request.getName(), request.getLeagueId());

        PermissionGroup group = PermissionGroup.builder()
                .name(request.getName())
                .description(request.getDescription())
                .leagueId(request.getLeagueId())
                .build();

        return groupRepository.save(group);
    }

    @Transactional
    public PermissionGroup updateGroup(Long id, PermissionGroupRequest request) {
        PermissionGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PermissionGroup", id));

        if (!group.getName().equals(request.getName())) {
            checkGroupNameUniqueness(request.getName(), request.getLeagueId());
        }

        group.setName(request.getName());
        group.setDescription(request.getDescription());
        return groupRepository.save(group);
    }

    @Transactional
    public void deleteGroup(Long id) {
        if (!groupRepository.existsById(id)) {
            throw new ResourceNotFoundException("PermissionGroup", id);
        }
        groupRepository.deleteById(id);
    }

    @Transactional
    public PermissionGroup assignPermissions(Long groupId, AssignPermissionsRequest request) {
        PermissionGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("PermissionGroup", groupId));

        Set<Permission> permissions = new HashSet<>(permissionRepository.findAllById(request.getPermissionIds()));
        group.setPermissions(permissions);
        return groupRepository.save(group);
    }

    // --- Modules ---

    public List<Module> getAllModules() {
        return moduleRepository.findAll();
    }

    @Transactional
    public Module createModule(ModuleRequest request) {
        if (moduleRepository.existsByName(request.getName())) {
            throw new BadRequestException("Module '" + request.getName() + "' already exists");
        }
        Module module = Module.builder()
                .name(request.getName())
                .description(request.getDescription())
                .build();
        return moduleRepository.save(module);
    }

    // --- Permissions ---

    public List<Permission> getAllPermissions() {
        return permissionRepository.findAll();
    }

    @Transactional
    public Permission createPermission(PermissionRequest request) {
        Module module = moduleRepository.findById(request.getModuleId())
                .orElseThrow(() -> new ResourceNotFoundException("Module", request.getModuleId()));

        Permission permission = Permission.builder()
                .module(module)
                .name(request.getName())
                .description(request.getDescription())
                .build();
        return permissionRepository.save(permission);
    }

    private void checkGroupNameUniqueness(String name, Long leagueId) {
        boolean exists;
        if (leagueId == null) {
            exists = groupRepository.existsByNameAndLeagueIdIsNull(name);
        } else {
            exists = groupRepository.existsByNameAndLeagueId(name, leagueId);
        }
        if (exists) {
            throw new BadRequestException("Permission group '" + name + "' already exists");
        }
    }
}
```

- [ ] **Step 5: Run RbacService tests**

Run: `cd backend && ./mvnw test -Dtest=RbacServiceTest -pl . -q`
Expected: All 3 tests PASS

- [ ] **Step 6: Create RbacController**

```java
package com.rpl.auction.rbac.controller;

import com.rpl.auction.common.dto.ApiResponse;
import com.rpl.auction.rbac.annotation.RequiresPermission;
import com.rpl.auction.rbac.dto.*;
import com.rpl.auction.rbac.entity.Module;
import com.rpl.auction.rbac.entity.Permission;
import com.rpl.auction.rbac.entity.PermissionGroup;
import com.rpl.auction.rbac.service.RbacService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rbac")
@RequiredArgsConstructor
public class RbacController {

    private final RbacService rbacService;

    // --- Permission Groups ---

    @GetMapping("/groups")
    @RequiresPermission(module = "rbac", permission = "READ")
    public ResponseEntity<ApiResponse<List<PermissionGroup>>> getGroups() {
        return ResponseEntity.ok(ApiResponse.success(rbacService.getAllGroups()));
    }

    @PostMapping("/groups")
    @RequiresPermission(module = "rbac", permission = "CREATE")
    public ResponseEntity<ApiResponse<PermissionGroup>> createGroup(@Valid @RequestBody PermissionGroupRequest request) {
        PermissionGroup group = rbacService.createGroup(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(group, "Permission group created"));
    }

    @PutMapping("/groups/{id}")
    @RequiresPermission(module = "rbac", permission = "UPDATE")
    public ResponseEntity<ApiResponse<PermissionGroup>> updateGroup(
            @PathVariable Long id, @Valid @RequestBody PermissionGroupRequest request) {
        return ResponseEntity.ok(ApiResponse.success(rbacService.updateGroup(id, request), "Group updated"));
    }

    @DeleteMapping("/groups/{id}")
    @RequiresPermission(module = "rbac", permission = "DELETE")
    public ResponseEntity<ApiResponse<Void>> deleteGroup(@PathVariable Long id) {
        rbacService.deleteGroup(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Group deleted"));
    }

    @PutMapping("/groups/{id}/permissions")
    @RequiresPermission(module = "rbac", permission = "MANAGE_PERMISSIONS")
    public ResponseEntity<ApiResponse<PermissionGroup>> assignPermissions(
            @PathVariable Long id, @Valid @RequestBody AssignPermissionsRequest request) {
        return ResponseEntity.ok(ApiResponse.success(rbacService.assignPermissions(id, request), "Permissions assigned"));
    }

    // --- Modules ---

    @GetMapping("/modules")
    @RequiresPermission(module = "rbac", permission = "READ")
    public ResponseEntity<ApiResponse<List<Module>>> getModules() {
        return ResponseEntity.ok(ApiResponse.success(rbacService.getAllModules()));
    }

    @PostMapping("/modules")
    @RequiresPermission(module = "rbac", permission = "CREATE")
    public ResponseEntity<ApiResponse<Module>> createModule(@Valid @RequestBody ModuleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(rbacService.createModule(request), "Module created"));
    }

    // --- Permissions ---

    @GetMapping("/permissions")
    @RequiresPermission(module = "rbac", permission = "READ")
    public ResponseEntity<ApiResponse<List<Permission>>> getPermissions() {
        return ResponseEntity.ok(ApiResponse.success(rbacService.getAllPermissions()));
    }

    @PostMapping("/permissions")
    @RequiresPermission(module = "rbac", permission = "CREATE")
    public ResponseEntity<ApiResponse<Permission>> createPermission(@Valid @RequestBody PermissionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(rbacService.createPermission(request), "Permission created"));
    }
}
```

- [ ] **Step 7: Write RBAC integration test**

```java
package com.rpl.auction.rbac.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rpl.auction.auth.dto.LoginRequest;
import com.rpl.auction.rbac.dto.PermissionGroupRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class RbacControllerIntegrationTest {

    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("rpl_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    private String adminToken;

    @BeforeEach
    void loginAsAdmin() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("admin", "admin123"))))
                .andExpect(status().isOk())
                .andReturn();

        adminToken = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("accessToken").asText();
    }

    @Test
    void getGroups_withAdmin_returnsSeededGroups() throws Exception {
        mockMvc.perform(get("/api/rbac/groups")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void createGroup_withAdmin_returns201() throws Exception {
        PermissionGroupRequest req = new PermissionGroupRequest("Custom Group", "Custom desc", null);

        mockMvc.perform(post("/api/rbac/groups")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("Custom Group"));
    }

    @Test
    void getModules_withAdmin_returnsSeededModules() throws Exception {
        mockMvc.perform(get("/api/rbac/modules")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void getPermissions_withAdmin_returnsList() throws Exception {
        mockMvc.perform(get("/api/rbac/permissions")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void getGroups_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/rbac/groups"))
                .andExpect(status().isUnauthorized());
    }
}
```

- [ ] **Step 8: Run all RBAC tests**

Run: `cd backend && ./mvnw test -Dtest="RbacServiceTest,RbacControllerIntegrationTest" -pl . -q`
Expected: All 8 tests PASS

- [ ] **Step 9: Commit**

```bash
git add src/main/java/com/rpl/auction/rbac/ src/test/java/com/rpl/auction/rbac/
git commit -m "feat: add RbacService, RbacController with groups, modules, permissions management"
```

---

## Task 15: Audit Log Endpoint

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/audit/controller/AuditController.java`

- [ ] **Step 1: Create AuditController**

```java
package com.rpl.auction.audit.controller;

import com.rpl.auction.audit.entity.AuditLog;
import com.rpl.auction.audit.service.AuditService;
import com.rpl.auction.common.dto.ApiResponse;
import com.rpl.auction.rbac.annotation.RequiresPermission;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;

    @GetMapping
    @RequiresPermission(module = "audit", permission = "READ")
    public ResponseEntity<ApiResponse<Page<AuditLog>>> getLogs(
            @RequestParam(required = false) String entityType,
            Pageable pageable) {
        Page<AuditLog> logs = entityType != null
                ? auditService.getLogsByEntityType(entityType, pageable)
                : auditService.getLogs(pageable);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && ./mvnw clean compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add src/main/java/com/rpl/auction/audit/controller/
git commit -m "feat: add AuditController with paginated, filterable audit log endpoint"
```

---

## Task 16: Run Full Test Suite + Verify Swagger

- [ ] **Step 1: Run all tests**

Run: `cd backend && ./mvnw test -pl . -q`
Expected: All tests PASS

- [ ] **Step 2: Start the app and verify Swagger UI**

Run: `cd backend && ./mvnw spring-boot:run`

Open in browser: `http://localhost:8080/swagger-ui.html`
Expected: Swagger UI shows all endpoints organized by controller

- [ ] **Step 3: Verify all success criteria**

1. App starts and connects to MySQL — PASS
2. Admin login returns JWT tokens — PASS
3. Token refresh with rotation works — PASS
4. RBAC groups/modules/permissions seeded — PASS
5. `@RequiresPermission` enforces access — PASS
6. Users CRUD with deactivate — PASS
7. Permission groups manageable — PASS
8. All endpoints return `ApiResponse` format — PASS
9. Audit service ready for logging — PASS
10. Swagger UI available — PASS

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Sub-project 1 — Foundation + Auth/RBAC"
```
