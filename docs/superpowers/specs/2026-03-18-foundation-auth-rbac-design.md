# Sub-project 1: Foundation + Auth/RBAC — Design Spec

## Overview

Bootstrap the RPL Auction Platform with project scaffolding, MySQL database setup, JWT authentication, and a granular RBAC (Role-Based Access Control) system with group-module-permission hierarchy.

This is the foundation layer that all subsequent sub-projects depend on.

## Goals

- Spring Boot 3.4.x project with Java 21, JPA/Hibernate, MySQL
- JWT-based stateless authentication (login, token refresh)
- Granular RBAC: Users belong to Permission Groups, which have Permissions scoped to Modules
- Seed data for default roles and permissions
- Global exception handling and consistent API response format
- Docker Compose for MySQL dev environment

## Non-Goals (deferred to later sub-projects)

- League/Season/Team/Player entities
- Auction engine
- WebSocket infrastructure
- Frontend React app
- Rate limiting on auth endpoints (small-scale platform; can be added later if needed)

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Java 21 |
| Framework | Spring Boot 3.4.x |
| ORM | Spring Data JPA / Hibernate |
| Database | MySQL 8.0 |
| Auth | JWT (jjwt library) |
| Build | Maven |
| Dev Environment | Docker Compose (MySQL) |
| API Docs | SpringDoc OpenAPI (Swagger) |

### Package Structure

```
com.rpl.auction
├── RplAuctionApplication.java
│
├── config/
│   ├── SecurityConfig.java          -- Spring Security filter chain, CORS, public endpoints
│   ├── AppConfig.java               -- PasswordEncoder, ObjectMapper beans
│   └── OpenApiConfig.java           -- Swagger config
│
├── auth/
│   ├── controller/AuthController.java
│   ├── service/AuthService.java
│   ├── service/JwtService.java
│   ├── filter/JwtAuthFilter.java
│   ├── entity/RefreshToken.java
│   ├── repository/RefreshTokenRepository.java
│   ├── dto/LoginRequest.java
│   ├── dto/LoginResponse.java
│   ├── dto/RefreshRequest.java
│   └── dto/TokenPayload.java
│
├── user/
│   ├── controller/UserController.java
│   ├── service/UserService.java
│   ├── repository/UserRepository.java
│   ├── entity/User.java
│   └── dto/
│       ├── CreateUserRequest.java
│       ├── UpdateUserRequest.java
│       ├── ChangePasswordRequest.java
│       └── UserResponse.java
│
├── rbac/
│   ├── controller/RbacController.java
│   ├── service/RbacService.java
│   ├── repository/
│   │   ├── PermissionGroupRepository.java
│   │   ├── ModuleRepository.java
│   │   └── PermissionRepository.java
│   ├── entity/
│   │   ├── PermissionGroup.java
│   │   ├── Module.java
│   │   ├── Permission.java
│   │   ├── UserGroup.java           -- join entity
│   │   └── GroupPermission.java      -- join entity
│   ├── annotation/RequiresPermission.java
│   ├── aspect/PermissionAspect.java
│   └── dto/
│       ├── PermissionGroupRequest.java
│       ├── ModuleRequest.java
│       ├── PermissionRequest.java
│       ├── AssignPermissionsRequest.java
│       └── AssignGroupsRequest.java
│
├── audit/
│   ├── service/AuditService.java
│   ├── repository/AuditLogRepository.java
│   ├── entity/AuditLog.java
│   └── aspect/AuditAspect.java
│
└── common/
    ├── dto/ApiResponse.java          -- { success, message, data, errors }
    ├── dto/PagedResponse.java        -- paginated wrapper
    ├── exception/
    │   ├── GlobalExceptionHandler.java
    │   ├── ResourceNotFoundException.java
    │   ├── BadRequestException.java
    │   ├── UnauthorizedException.java
    │   └── ForbiddenException.java
    └── util/
        └── SecurityUtil.java         -- get current user from context
```

---

## Database Schema

### users

| Column | Type | Constraints |
|--------|------|------------|
| id | BIGINT | PK, AUTO_INCREMENT |
| username | VARCHAR(100) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| display_name | VARCHAR(100) | |
| email | VARCHAR(150) | UNIQUE, optional (nullable) |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP |

### permission_groups

| Column | Type | Constraints |
|--------|------|------------|
| id | BIGINT | PK, AUTO_INCREMENT |
| name | VARCHAR(100) | NOT NULL |
| description | VARCHAR(255) | |
| league_id | BIGINT | NULL (NULL = platform-level) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| UNIQUE | (name, league_id) | Prevents duplicate group names per league scope |

`league_id` is nullable for now (league entity comes in sub-project 2). No FK constraint on `league_id` in sub-project 1; FK will be added via migration in sub-project 2. Platform-level groups (Super Admin) have `league_id = NULL`.

**Note on NULL uniqueness in MySQL:** MySQL treats each `NULL` as distinct in unique indexes, so `UNIQUE(name, league_id)` won't prevent duplicate platform-level group names where `league_id = NULL`. This is enforced at the application level: `RbacService` must check for existing groups with the same name and `league_id = NULL` before creating platform-level groups.

### modules

| Column | Type | Constraints |
|--------|------|------------|
| id | BIGINT | PK, AUTO_INCREMENT |
| name | VARCHAR(100) | UNIQUE, NOT NULL |
| description | VARCHAR(255) | |

### permissions

| Column | Type | Constraints |
|--------|------|------------|
| id | BIGINT | PK, AUTO_INCREMENT |
| module_id | BIGINT | FK -> modules(id), NOT NULL |
| name | VARCHAR(100) | NOT NULL |
| description | VARCHAR(255) | |
| UNIQUE | (module_id, name) | |

### group_permissions

| Column | Type | Constraints |
|--------|------|------------|
| group_id | BIGINT | FK -> permission_groups(id) |
| permission_id | BIGINT | FK -> permissions(id) |
| PRIMARY KEY | (group_id, permission_id) | |

### user_groups

| Column | Type | Constraints |
|--------|------|------------|
| user_id | BIGINT | FK -> users(id) |
| group_id | BIGINT | FK -> permission_groups(id) |
| PRIMARY KEY | (user_id, group_id) | |

### refresh_tokens

| Column | Type | Constraints |
|--------|------|------------|
| id | BIGINT | PK, AUTO_INCREMENT |
| user_id | BIGINT | FK -> users(id), NOT NULL |
| token_hash | VARCHAR(255) | UNIQUE, NOT NULL |
| expires_at | TIMESTAMP | NOT NULL |
| revoked | BOOLEAN | DEFAULT FALSE |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

On logout, the refresh token is marked `revoked = TRUE`. On refresh, verify token is not revoked before issuing new access token. Expired tokens can be cleaned up via scheduled job.

### audit_logs

| Column | Type | Constraints |
|--------|------|------------|
| id | BIGINT | PK, AUTO_INCREMENT |
| user_id | BIGINT | FK -> users(id), NULL (system actions) |
| action | VARCHAR(100) | NOT NULL |
| entity_type | VARCHAR(50) | |
| entity_id | BIGINT | |
| details | JSON | |
| ip_address | VARCHAR(45) | |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

## Authentication Flow

### Login

```
POST /api/auth/login
Body: { "username": "admin", "password": "password" }
Response: {
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 3600,
  "user": { "id": 1, "username": "admin", "displayName": "Admin", "permissions": [...] }
}
```

- Access token: 1 hour expiry, contains userId, username, and flattened permissions list (e.g., `["user:CREATE", "user:READ", "rbac:READ"]`)
- Refresh token: 7 day expiry, contains userId only, stored in `refresh_tokens` table for revocation support
- Passwords hashed with BCrypt
- Permissions format in responses: flat string array like `["user:CREATE", "user:READ", "rbac:MANAGE_PERMISSIONS"]`
- JWT size consideration: with ~10 modules x ~5 permissions each, the permissions array is ~50 entries. Even for a Super Admin, this adds ~1-2KB to the token — acceptable for this platform's scale

### Token Refresh (with rotation)

```
POST /api/auth/refresh
Body: { "refreshToken": "eyJ..." }
Response: { "accessToken": "eyJ...", "refreshToken": "eyJ...(new)...", "expiresIn": 3600 }
```

Refresh token rotation: on each refresh, the old refresh token is revoked and a new one is issued. This limits the window of a leaked refresh token. If a revoked token is used, all tokens for that user are revoked (indicates token theft).

### Logout

```
POST /api/auth/logout
Headers: Authorization: Bearer <accessToken>
Body: { "refreshToken": "eyJ..." }
Response: { "success": true, "message": "Logged out successfully" }
```

Marks the refresh token as revoked. The access token remains valid until expiry (stateless), but the refresh token can no longer be used.

### Current User

```
GET /api/auth/me
Headers: Authorization: Bearer <accessToken>
Response: { user details + flattened permission list }
```

### JWT Filter

- Extracts token from `Authorization: Bearer <token>` header
- Validates signature and expiry
- Loads user and sets `SecurityContextHolder`
- Skips public endpoints: `/api/auth/login`, `/api/auth/refresh`, Swagger UI

---

## RBAC Design

### Permission Model

```
User  --M:N-->  PermissionGroup  --M:N-->  Permission  --M:1-->  Module
```

- A **Module** represents a functional area (e.g., `user`, `league`, `team`, `auction`, `report`)
- A **Permission** is an action within a module (e.g., `user:CREATE`, `user:READ`, `auction:BID`)
- A **PermissionGroup** bundles permissions (e.g., "Super Admin" gets all, "Team Owner" gets `team:READ`, `auction:BID`)
- A **User** can belong to multiple groups; effective permissions = union of all group permissions

### Enforcement via Custom Annotation

```java
@RequiresPermission(module = "user", permission = "CREATE")
@PostMapping
public ApiResponse<UserResponse> createUser(@RequestBody CreateUserRequest request) { ... }
```

AOP aspect intercepts, loads current user's permissions, checks for match, throws `ForbiddenException` if denied.

### Permission Check Logic

Permissions are embedded in the JWT access token as a flat string array. This avoids per-request database lookups.

```
1. Get current user from SecurityContext (populated by JWT filter)
2. Read permissions from JWT claims (already flattened during token creation)
3. Check if required (module:permission) string exists in the list
4. Allow or throw ForbiddenException
```

When permissions change (e.g., admin updates a group), the change takes effect on next token refresh. This is an acceptable tradeoff for a small-scale platform — no caching layer needed.

---

## API Endpoints

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login |
| POST | `/api/auth/refresh` | No | Refresh access token |
| POST | `/api/auth/logout` | Yes | Invalidate refresh token |
| GET | `/api/auth/me` | Yes | Current user + permissions |

### Users

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/users` | user:READ | List users (paginated) |
| GET | `/api/users/{id}` | user:READ | Get user by ID |
| POST | `/api/users` | user:CREATE | Create user |
| PUT | `/api/users/{id}` | user:UPDATE | Update user |
| PATCH | `/api/users/{id}/deactivate` | user:DELETE | Soft-delete: sets `is_active = FALSE`. User data is preserved. |
| PUT | `/api/users/{id}/groups` | user:MANAGE_GROUPS | Assign groups to user |
| PUT | `/api/users/{id}/password` | self-service (own) or user:UPDATE (others) | Change password. Body: `{ "oldPassword": "...", "newPassword": "..." }`. Self-service: `oldPassword` required, no permission needed. Admin changing another user's password: `oldPassword` omitted, requires `user:UPDATE`. |

### RBAC

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/rbac/groups` | rbac:READ | List permission groups |
| POST | `/api/rbac/groups` | rbac:CREATE | Create group |
| PUT | `/api/rbac/groups/{id}` | rbac:UPDATE | Update group |
| DELETE | `/api/rbac/groups/{id}` | rbac:DELETE | Delete group |
| PUT | `/api/rbac/groups/{id}/permissions` | rbac:MANAGE_PERMISSIONS | Assign permissions to group |
| GET | `/api/rbac/modules` | rbac:READ | List modules |
| POST | `/api/rbac/modules` | rbac:CREATE | Create module |
| GET | `/api/rbac/permissions` | rbac:READ | List permissions |
| POST | `/api/rbac/permissions` | rbac:CREATE | Create permission |

### Audit

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/audit-logs` | audit:READ | List audit logs (paginated, filterable) |

---

## Seed Data

On first startup, seed the following via `data.sql` or `ApplicationRunner`:

### Modules

`user`, `rbac`, `league`, `team`, `player`, `retention`, `auction`, `dashboard`, `report`, `audit`

### Default Permissions (per module)

`CREATE`, `READ`, `UPDATE`, `DELETE` + module-specific ones (e.g., `auction:BID`, `user:MANAGE_GROUPS`, `rbac:MANAGE_PERMISSIONS`)

### Default Groups

| Group | Permissions |
|-------|-----------|
| Super Admin | ALL permissions |
| League Admin | All except rbac:* and audit:* |
| Team Owner | team:READ, player:READ, auction:BID |
| Spectator | dashboard:READ |

### Default User

- Username: `admin` / Password: `admin123` (Super Admin group)

---

## Consistent API Response Format

```json
// Success
{
  "success": true,
  "message": "User created successfully",
  "data": { ... },
  "timestamp": "2026-03-18T10:30:00Z"
}

// Error
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "username", "message": "Username already exists" }
  ],
  "timestamp": "2026-03-18T10:30:00Z"
}

// Paginated
{
  "success": true,
  "message": null,
  "data": {
    "content": [...],
    "page": 0,
    "size": 20,
    "totalElements": 45,
    "totalPages": 3
  },
  "errors": null,
  "timestamp": "2026-03-18T10:30:00Z"
}
```

All fields are always present in the response. `data` is null on errors, `errors` is null on success, `message` is null when not applicable. The canonical `ApiResponse<T>` DTO:

```java
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    private List<FieldError> errors;
    private Instant timestamp;
}
```

---

## Global Exception Handling

`@RestControllerAdvice` handles:

| Exception | HTTP Status | Example |
|-----------|------------|---------|
| `ResourceNotFoundException` | 404 | User not found |
| `BadRequestException` | 400 | Invalid input |
| `UnauthorizedException` | 401 | Invalid credentials |
| `ForbiddenException` | 403 | Insufficient permissions |
| `MethodArgumentNotValidException` | 400 | Bean validation errors |
| `Exception` (fallback) | 500 | Unexpected errors |

---

## Docker Compose (Dev)

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

Application connects via `spring.datasource.url=jdbc:mysql://localhost:3306/rpl_auction`.

---

## CORS Configuration

Configured in `SecurityConfig.java` via `CorsConfigurationSource`:

- **Allowed origins**: `http://localhost:3000` (React dev server), configurable via `app.cors.allowed-origins` property
- **Allowed methods**: GET, POST, PUT, DELETE, OPTIONS
- **Allowed headers**: Authorization, Content-Type
- **Exposed headers**: Authorization
- **Allow credentials**: true
- **Max age**: 3600 seconds

Production origins will be configured via environment variable / application properties.

---

## Testing Strategy

- Unit tests for `JwtService`, `AuthService`, `RbacService`, `PermissionAspect`
- Integration tests for auth endpoints (`/login`, `/refresh`, `/logout`, `/me`)
- Integration tests for RBAC enforcement (access allowed/denied based on permissions)
- Use Testcontainers with MySQL for integration tests to avoid H2/MySQL dialect differences (JSON columns, `ON UPDATE CURRENT_TIMESTAMP`)
- Unit tests use Mockito — no database needed

---

## Success Criteria

1. Spring Boot app starts and connects to MySQL
2. Admin can login and receive JWT tokens
3. Token refresh works
4. RBAC groups, modules, permissions are seeded
5. Custom `@RequiresPermission` annotation enforces access control
6. Users can be created/updated/deactivated
7. Permission groups can be managed with granular permissions
8. All endpoints return consistent `ApiResponse` format
9. Audit logs capture state-changing actions
10. Swagger UI available at `/swagger-ui.html`
