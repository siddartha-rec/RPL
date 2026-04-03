# RPL Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the RPL cricket auction platform with React PWA frontend and Spring Boot backend extensions for teams, players, live auction with SSE, and league management.

**Architecture:** Two-service microservice — React+TS PWA on port 3000, Spring Boot on port 8080, MySQL 8.0 on port 3306. Frontend communicates via REST + SSE. Existing auth/RBAC/audit infrastructure is reused.

**Tech Stack:** Spring Boot 3.4.3, Java 21, React 18, TypeScript, Vite, MUI v5, TanStack Query v5, React Router v6, vite-plugin-pwa, EventSource API for SSE.

**Spec:** `docs/superpowers/specs/2026-04-03-rpl-platform-ui-design.md`

---

## Sub-project 1: Backend — Domain Entities & CRUD APIs

### Task 1: League Entity, Repository, and DTO

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/league/entity/League.java`
- Create: `backend/src/main/java/com/rpl/auction/league/repository/LeagueRepository.java`
- Create: `backend/src/main/java/com/rpl/auction/league/dto/LeagueRequest.java`
- Create: `backend/src/main/java/com/rpl/auction/league/dto/LeagueResponse.java`

- [ ] **Step 1: Create League entity**

```java
package com.rpl.auction.league.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "leagues")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class League {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 20)
    private String season;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private LeagueStatus status = LeagueStatus.SETUP;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal teamBudget;

    @Column(nullable = false)
    private Integer maxPlayersPerTeam;

    @Column(nullable = false)
    @Builder.Default
    private Integer maxRetentionsPerTeam = 0;

    @Column(precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal retentionCost = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal bidIncrement;

    @Column(nullable = false)
    @Builder.Default
    private Integer timerSeconds = 30;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum LeagueStatus {
        SETUP, ACTIVE, COMPLETED
    }
}
```

- [ ] **Step 2: Create LeagueRepository**

```java
package com.rpl.auction.league.repository;

import com.rpl.auction.league.entity.League;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LeagueRepository extends JpaRepository<League, Long> {
    Optional<League> findBySeason(String season);
    boolean existsBySeason(String season);
}
```

- [ ] **Step 3: Create LeagueRequest DTO**

```java
package com.rpl.auction.league.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Data @NoArgsConstructor @AllArgsConstructor
public class LeagueRequest {

    @NotBlank
    private String name;

    @NotBlank
    private String season;

    @NotNull @DecimalMin("1.0")
    private BigDecimal teamBudget;

    @NotNull @Min(1)
    private Integer maxPlayersPerTeam;

    @Min(0)
    private Integer maxRetentionsPerTeam = 0;

    @DecimalMin("0.0")
    private BigDecimal retentionCost = BigDecimal.ZERO;

    @NotNull @DecimalMin("0.1")
    private BigDecimal bidIncrement;

    @Min(5) @Max(120)
    private Integer timerSeconds = 30;
}
```

- [ ] **Step 4: Create LeagueResponse DTO**

```java
package com.rpl.auction.league.dto;

import com.rpl.auction.league.entity.League;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class LeagueResponse {
    private Long id;
    private String name;
    private String season;
    private String status;
    private BigDecimal teamBudget;
    private Integer maxPlayersPerTeam;
    private Integer maxRetentionsPerTeam;
    private BigDecimal retentionCost;
    private BigDecimal bidIncrement;
    private Integer timerSeconds;
    private Instant createdAt;
    private Instant updatedAt;

    public static LeagueResponse from(League league) {
        return LeagueResponse.builder()
                .id(league.getId())
                .name(league.getName())
                .season(league.getSeason())
                .status(league.getStatus().name())
                .teamBudget(league.getTeamBudget())
                .maxPlayersPerTeam(league.getMaxPlayersPerTeam())
                .maxRetentionsPerTeam(league.getMaxRetentionsPerTeam())
                .retentionCost(league.getRetentionCost())
                .bidIncrement(league.getBidIncrement())
                .timerSeconds(league.getTimerSeconds())
                .createdAt(league.getCreatedAt())
                .updatedAt(league.getUpdatedAt())
                .build();
    }
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/rpl/auction/league/
git commit -m "feat: add League entity, repository, and DTOs"
```

---

### Task 2: League Service and Controller

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/league/service/LeagueService.java`
- Create: `backend/src/main/java/com/rpl/auction/league/controller/LeagueController.java`
- Modify: `backend/src/main/java/com/rpl/auction/config/SecurityConfig.java`

- [ ] **Step 1: Create LeagueService**

```java
package com.rpl.auction.league.service;

import com.rpl.auction.common.exception.BadRequestException;
import com.rpl.auction.common.exception.ResourceNotFoundException;
import com.rpl.auction.league.dto.LeagueRequest;
import com.rpl.auction.league.dto.LeagueResponse;
import com.rpl.auction.league.entity.League;
import com.rpl.auction.league.repository.LeagueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LeagueService {

    private final LeagueRepository leagueRepository;

    @Transactional
    public LeagueResponse create(LeagueRequest request) {
        if (leagueRepository.existsBySeason(request.getSeason())) {
            throw new BadRequestException("League already exists for season: " + request.getSeason());
        }
        League league = League.builder()
                .name(request.getName())
                .season(request.getSeason())
                .teamBudget(request.getTeamBudget())
                .maxPlayersPerTeam(request.getMaxPlayersPerTeam())
                .maxRetentionsPerTeam(request.getMaxRetentionsPerTeam())
                .retentionCost(request.getRetentionCost())
                .bidIncrement(request.getBidIncrement())
                .timerSeconds(request.getTimerSeconds())
                .build();
        return LeagueResponse.from(leagueRepository.save(league));
    }

    public List<LeagueResponse> findAll() {
        return leagueRepository.findAll().stream()
                .map(LeagueResponse::from)
                .toList();
    }

    public LeagueResponse findById(Long id) {
        return LeagueResponse.from(getLeagueOrThrow(id));
    }

    @Transactional
    public LeagueResponse update(Long id, LeagueRequest request) {
        League league = getLeagueOrThrow(id);
        league.setName(request.getName());
        league.setSeason(request.getSeason());
        league.setTeamBudget(request.getTeamBudget());
        league.setMaxPlayersPerTeam(request.getMaxPlayersPerTeam());
        league.setMaxRetentionsPerTeam(request.getMaxRetentionsPerTeam());
        league.setRetentionCost(request.getRetentionCost());
        league.setBidIncrement(request.getBidIncrement());
        league.setTimerSeconds(request.getTimerSeconds());
        return LeagueResponse.from(leagueRepository.save(league));
    }

    @Transactional
    public void delete(Long id) {
        League league = getLeagueOrThrow(id);
        leagueRepository.delete(league);
    }

    public League getLeagueOrThrow(Long id) {
        return leagueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("League", id));
    }
}
```

- [ ] **Step 2: Create LeagueController**

```java
package com.rpl.auction.league.controller;

import com.rpl.auction.common.dto.ApiResponse;
import com.rpl.auction.league.dto.LeagueRequest;
import com.rpl.auction.league.dto.LeagueResponse;
import com.rpl.auction.league.service.LeagueService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leagues")
@RequiredArgsConstructor
public class LeagueController {

    private final LeagueService leagueService;

    @PostMapping
    public ResponseEntity<ApiResponse<LeagueResponse>> create(@Valid @RequestBody LeagueRequest request) {
        LeagueResponse response = leagueService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "League created successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<LeagueResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponse.success(leagueService.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LeagueResponse>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(leagueService.findById(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<LeagueResponse>> update(@PathVariable Long id,
                                                               @Valid @RequestBody LeagueRequest request) {
        return ResponseEntity.ok(ApiResponse.success(leagueService.update(id, request), "League updated"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        leagueService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "League deleted"));
    }
}
```

- [ ] **Step 3: Add public GET endpoints to SecurityConfig**

In `SecurityConfig.java`, add to the `securityFilterChain` method's `requestMatchers` for public access:

```java
.requestMatchers(HttpMethod.GET, "/api/leagues", "/api/leagues/**").permitAll()
.requestMatchers(HttpMethod.GET, "/api/teams/**", "/api/players/**").permitAll()
.requestMatchers(HttpMethod.GET, "/api/auctions/*/stream").permitAll()
```

Add this import: `import org.springframework.http.HttpMethod;`

- [ ] **Step 4: Verify build compiles**

Run: `cd backend && ./mvnw compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/rpl/auction/league/service/ backend/src/main/java/com/rpl/auction/league/controller/ backend/src/main/java/com/rpl/auction/config/SecurityConfig.java
git commit -m "feat: add League service, controller, and public GET endpoints"
```

---

### Task 3: Team Entity, Repository, and DTOs

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/team/entity/Team.java`
- Create: `backend/src/main/java/com/rpl/auction/team/repository/TeamRepository.java`
- Create: `backend/src/main/java/com/rpl/auction/team/dto/TeamRequest.java`
- Create: `backend/src/main/java/com/rpl/auction/team/dto/TeamResponse.java`

- [ ] **Step 1: Create Team entity**

```java
package com.rpl.auction.team.entity;

import com.rpl.auction.league.entity.League;
import com.rpl.auction.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "teams", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"name", "league_id"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "short_name", nullable = false, length = 10)
    private String shortName;

    @Column(length = 7)
    private String color;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "captain_id")
    private Long captainId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "league_id", nullable = false)
    private League league;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal budget;

    @Column(name = "budget_spent", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal budgetSpent = BigDecimal.ZERO;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
```

- [ ] **Step 2: Create TeamRepository**

```java
package com.rpl.auction.team.repository;

import com.rpl.auction.team.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TeamRepository extends JpaRepository<Team, Long> {
    List<Team> findByLeagueId(Long leagueId);
    Optional<Team> findByOwnerIdAndLeagueId(Long ownerId, Long leagueId);
    boolean existsByNameAndLeagueId(String name, Long leagueId);
}
```

- [ ] **Step 3: Create TeamRequest DTO**

```java
package com.rpl.auction.team.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class TeamRequest {

    @NotBlank
    private String name;

    @NotBlank
    private String shortName;

    private String color;

    private String logoUrl;

    @NotNull
    private Long ownerId;
}
```

- [ ] **Step 4: Create TeamResponse DTO**

```java
package com.rpl.auction.team.dto;

import com.rpl.auction.team.entity.Team;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TeamResponse {
    private Long id;
    private String name;
    private String shortName;
    private String color;
    private String logoUrl;
    private Long captainId;
    private String captainName;
    private Long ownerId;
    private String ownerName;
    private Long leagueId;
    private BigDecimal budget;
    private BigDecimal budgetSpent;
    private Integer playerCount;
    private Instant createdAt;

    public static TeamResponse from(Team team) {
        return TeamResponse.builder()
                .id(team.getId())
                .name(team.getName())
                .shortName(team.getShortName())
                .color(team.getColor())
                .logoUrl(team.getLogoUrl())
                .captainId(team.getCaptainId())
                .ownerId(team.getOwner() != null ? team.getOwner().getId() : null)
                .ownerName(team.getOwner() != null ? team.getOwner().getDisplayName() : null)
                .leagueId(team.getLeague().getId())
                .budget(team.getBudget())
                .budgetSpent(team.getBudgetSpent())
                .createdAt(team.getCreatedAt())
                .build();
    }
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/rpl/auction/team/
git commit -m "feat: add Team entity, repository, and DTOs"
```

---

### Task 4: Team Service and Controller

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/team/service/TeamService.java`
- Create: `backend/src/main/java/com/rpl/auction/team/controller/TeamController.java`

- [ ] **Step 1: Create TeamService**

```java
package com.rpl.auction.team.service;

import com.rpl.auction.common.exception.BadRequestException;
import com.rpl.auction.common.exception.ResourceNotFoundException;
import com.rpl.auction.league.entity.League;
import com.rpl.auction.league.service.LeagueService;
import com.rpl.auction.team.dto.TeamRequest;
import com.rpl.auction.team.dto.TeamResponse;
import com.rpl.auction.team.entity.Team;
import com.rpl.auction.team.repository.TeamRepository;
import com.rpl.auction.user.entity.User;
import com.rpl.auction.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepository;
    private final LeagueService leagueService;
    private final UserRepository userRepository;

    @Transactional
    public TeamResponse create(Long leagueId, TeamRequest request) {
        League league = leagueService.getLeagueOrThrow(leagueId);
        if (teamRepository.existsByNameAndLeagueId(request.getName(), leagueId)) {
            throw new BadRequestException("Team '" + request.getName() + "' already exists in this league");
        }
        User owner = userRepository.findById(request.getOwnerId())
                .orElseThrow(() -> new ResourceNotFoundException("User", request.getOwnerId()));

        Team team = Team.builder()
                .name(request.getName())
                .shortName(request.getShortName())
                .color(request.getColor())
                .logoUrl(request.getLogoUrl())
                .owner(owner)
                .league(league)
                .budget(league.getTeamBudget())
                .build();
        return TeamResponse.from(teamRepository.save(team));
    }

    public List<TeamResponse> findByLeague(Long leagueId) {
        return teamRepository.findByLeagueId(leagueId).stream()
                .map(TeamResponse::from)
                .toList();
    }

    public TeamResponse findById(Long id) {
        return TeamResponse.from(getTeamOrThrow(id));
    }

    @Transactional
    public TeamResponse update(Long id, TeamRequest request) {
        Team team = getTeamOrThrow(id);
        team.setName(request.getName());
        team.setShortName(request.getShortName());
        team.setColor(request.getColor());
        team.setLogoUrl(request.getLogoUrl());
        if (request.getOwnerId() != null) {
            User owner = userRepository.findById(request.getOwnerId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", request.getOwnerId()));
            team.setOwner(owner);
        }
        return TeamResponse.from(teamRepository.save(team));
    }

    @Transactional
    public void delete(Long id) {
        Team team = getTeamOrThrow(id);
        teamRepository.delete(team);
    }

    public Team getTeamOrThrow(Long id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Team", id));
    }
}
```

- [ ] **Step 2: Create TeamController**

```java
package com.rpl.auction.team.controller;

import com.rpl.auction.common.dto.ApiResponse;
import com.rpl.auction.team.dto.TeamRequest;
import com.rpl.auction.team.dto.TeamResponse;
import com.rpl.auction.team.service.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @PostMapping("/api/leagues/{leagueId}/teams")
    public ResponseEntity<ApiResponse<TeamResponse>> create(@PathVariable Long leagueId,
                                                             @Valid @RequestBody TeamRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(teamService.create(leagueId, request), "Team created"));
    }

    @GetMapping("/api/leagues/{leagueId}/teams")
    public ResponseEntity<ApiResponse<List<TeamResponse>>> findByLeague(@PathVariable Long leagueId) {
        return ResponseEntity.ok(ApiResponse.success(teamService.findByLeague(leagueId)));
    }

    @GetMapping("/api/teams/{id}")
    public ResponseEntity<ApiResponse<TeamResponse>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(teamService.findById(id)));
    }

    @PutMapping("/api/teams/{id}")
    public ResponseEntity<ApiResponse<TeamResponse>> update(@PathVariable Long id,
                                                             @Valid @RequestBody TeamRequest request) {
        return ResponseEntity.ok(ApiResponse.success(teamService.update(id, request), "Team updated"));
    }

    @DeleteMapping("/api/teams/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        teamService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Team deleted"));
    }
}
```

- [ ] **Step 3: Verify build**

Run: `cd backend && ./mvnw compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/rpl/auction/team/
git commit -m "feat: add Team service and controller with CRUD APIs"
```

---

### Task 5: Player Entity, Repository, and DTOs

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/player/entity/Player.java`
- Create: `backend/src/main/java/com/rpl/auction/player/repository/PlayerRepository.java`
- Create: `backend/src/main/java/com/rpl/auction/player/dto/PlayerRequest.java`
- Create: `backend/src/main/java/com/rpl/auction/player/dto/PlayerResponse.java`
- Create: `backend/src/main/java/com/rpl/auction/player/dto/PlayerImportRequest.java`

- [ ] **Step 1: Create Player entity**

```java
package com.rpl.auction.player.entity;

import com.rpl.auction.league.entity.League;
import com.rpl.auction.team.entity.Team;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "players")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Player {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "player_number")
    private Integer playerNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PlayerCategory category;

    @Column(length = 50)
    private String role;

    @Column(name = "base_price", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal basePrice = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "league_id", nullable = false)
    private League league;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PlayerStatus status = PlayerStatus.AVAILABLE;

    @Column(name = "is_captain")
    @Builder.Default
    private Boolean isCaptain = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum PlayerCategory {
        CRICKET, OTHER
    }

    public enum PlayerStatus {
        AVAILABLE, RETAINED, SOLD, UNSOLD
    }
}
```

- [ ] **Step 2: Create PlayerRepository**

```java
package com.rpl.auction.player.repository;

import com.rpl.auction.player.entity.Player;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlayerRepository extends JpaRepository<Player, Long> {
    List<Player> findByLeagueId(Long leagueId);
    List<Player> findByTeamId(Long teamId);
    List<Player> findByLeagueIdAndStatus(Long leagueId, Player.PlayerStatus status);
    List<Player> findByLeagueIdAndCategory(Long leagueId, Player.PlayerCategory category);
    List<Player> findByLeagueIdAndTeamId(Long leagueId, Long teamId);
    long countByTeamId(Long teamId);
}
```

- [ ] **Step 3: Create PlayerRequest DTO**

```java
package com.rpl.auction.player.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Data @NoArgsConstructor @AllArgsConstructor
public class PlayerRequest {

    @NotBlank
    private String name;

    private Integer playerNumber;

    @NotNull
    private String category;

    private String role;

    private BigDecimal basePrice = BigDecimal.ZERO;

    private Boolean isCaptain = false;
}
```

- [ ] **Step 4: Create PlayerImportRequest DTO**

```java
package com.rpl.auction.player.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor
public class PlayerImportRequest {

    @NotEmpty
    private List<PlayerRequest> players;
}
```

- [ ] **Step 5: Create PlayerResponse DTO**

```java
package com.rpl.auction.player.dto;

import com.rpl.auction.player.entity.Player;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PlayerResponse {
    private Long id;
    private String name;
    private Integer playerNumber;
    private String category;
    private String role;
    private BigDecimal basePrice;
    private Long teamId;
    private String teamName;
    private String teamColor;
    private Long leagueId;
    private String status;
    private Boolean isCaptain;
    private Instant createdAt;

    public static PlayerResponse from(Player player) {
        return PlayerResponse.builder()
                .id(player.getId())
                .name(player.getName())
                .playerNumber(player.getPlayerNumber())
                .category(player.getCategory().name())
                .role(player.getRole())
                .basePrice(player.getBasePrice())
                .teamId(player.getTeam() != null ? player.getTeam().getId() : null)
                .teamName(player.getTeam() != null ? player.getTeam().getName() : null)
                .teamColor(player.getTeam() != null ? player.getTeam().getColor() : null)
                .leagueId(player.getLeague().getId())
                .status(player.getStatus().name())
                .isCaptain(player.getIsCaptain())
                .createdAt(player.getCreatedAt())
                .build();
    }
}
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/rpl/auction/player/
git commit -m "feat: add Player entity, repository, and DTOs"
```

---

### Task 6: Player Service and Controller

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/player/service/PlayerService.java`
- Create: `backend/src/main/java/com/rpl/auction/player/controller/PlayerController.java`

- [ ] **Step 1: Create PlayerService**

```java
package com.rpl.auction.player.service;

import com.rpl.auction.common.exception.ResourceNotFoundException;
import com.rpl.auction.league.entity.League;
import com.rpl.auction.league.service.LeagueService;
import com.rpl.auction.player.dto.PlayerImportRequest;
import com.rpl.auction.player.dto.PlayerRequest;
import com.rpl.auction.player.dto.PlayerResponse;
import com.rpl.auction.player.entity.Player;
import com.rpl.auction.player.repository.PlayerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PlayerService {

    private final PlayerRepository playerRepository;
    private final LeagueService leagueService;

    @Transactional
    public PlayerResponse create(Long leagueId, PlayerRequest request) {
        League league = leagueService.getLeagueOrThrow(leagueId);
        Player player = buildPlayer(request, league);
        return PlayerResponse.from(playerRepository.save(player));
    }

    @Transactional
    public List<PlayerResponse> importPlayers(Long leagueId, PlayerImportRequest request) {
        League league = leagueService.getLeagueOrThrow(leagueId);
        List<Player> players = request.getPlayers().stream()
                .map(req -> buildPlayer(req, league))
                .toList();
        return playerRepository.saveAll(players).stream()
                .map(PlayerResponse::from)
                .toList();
    }

    public List<PlayerResponse> findByLeague(Long leagueId, String category, String status, Long teamId) {
        List<Player> players;
        if (teamId != null) {
            players = playerRepository.findByLeagueIdAndTeamId(leagueId, teamId);
        } else if (category != null) {
            players = playerRepository.findByLeagueIdAndCategory(leagueId, Player.PlayerCategory.valueOf(category));
        } else if (status != null) {
            players = playerRepository.findByLeagueIdAndStatus(leagueId, Player.PlayerStatus.valueOf(status));
        } else {
            players = playerRepository.findByLeagueId(leagueId);
        }
        return players.stream().map(PlayerResponse::from).toList();
    }

    public PlayerResponse findById(Long id) {
        return PlayerResponse.from(getPlayerOrThrow(id));
    }

    @Transactional
    public PlayerResponse update(Long id, PlayerRequest request) {
        Player player = getPlayerOrThrow(id);
        player.setName(request.getName());
        player.setPlayerNumber(request.getPlayerNumber());
        player.setCategory(Player.PlayerCategory.valueOf(request.getCategory()));
        player.setRole(request.getRole());
        player.setBasePrice(request.getBasePrice());
        player.setIsCaptain(request.getIsCaptain());
        return PlayerResponse.from(playerRepository.save(player));
    }

    @Transactional
    public void delete(Long id) {
        Player player = getPlayerOrThrow(id);
        playerRepository.delete(player);
    }

    public Player getPlayerOrThrow(Long id) {
        return playerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Player", id));
    }

    private Player buildPlayer(PlayerRequest request, League league) {
        return Player.builder()
                .name(request.getName())
                .playerNumber(request.getPlayerNumber())
                .category(Player.PlayerCategory.valueOf(request.getCategory()))
                .role(request.getRole())
                .basePrice(request.getBasePrice())
                .isCaptain(request.getIsCaptain())
                .league(league)
                .build();
    }
}
```

- [ ] **Step 2: Create PlayerController**

```java
package com.rpl.auction.player.controller;

import com.rpl.auction.common.dto.ApiResponse;
import com.rpl.auction.player.dto.PlayerImportRequest;
import com.rpl.auction.player.dto.PlayerRequest;
import com.rpl.auction.player.dto.PlayerResponse;
import com.rpl.auction.player.service.PlayerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class PlayerController {

    private final PlayerService playerService;

    @PostMapping("/api/leagues/{leagueId}/players")
    public ResponseEntity<ApiResponse<PlayerResponse>> create(@PathVariable Long leagueId,
                                                               @Valid @RequestBody PlayerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(playerService.create(leagueId, request), "Player created"));
    }

    @PostMapping("/api/leagues/{leagueId}/players/import")
    public ResponseEntity<ApiResponse<List<PlayerResponse>>> importPlayers(@PathVariable Long leagueId,
                                                                           @Valid @RequestBody PlayerImportRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(playerService.importPlayers(leagueId, request), "Players imported"));
    }

    @GetMapping("/api/leagues/{leagueId}/players")
    public ResponseEntity<ApiResponse<List<PlayerResponse>>> findByLeague(
            @PathVariable Long leagueId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long teamId) {
        return ResponseEntity.ok(ApiResponse.success(playerService.findByLeague(leagueId, category, status, teamId)));
    }

    @GetMapping("/api/players/{id}")
    public ResponseEntity<ApiResponse<PlayerResponse>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(playerService.findById(id)));
    }

    @PutMapping("/api/players/{id}")
    public ResponseEntity<ApiResponse<PlayerResponse>> update(@PathVariable Long id,
                                                               @Valid @RequestBody PlayerRequest request) {
        return ResponseEntity.ok(ApiResponse.success(playerService.update(id, request), "Player updated"));
    }

    @DeleteMapping("/api/players/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        playerService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Player deleted"));
    }
}
```

- [ ] **Step 3: Verify build**

Run: `cd backend && ./mvnw compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/rpl/auction/player/
git commit -m "feat: add Player service and controller with CRUD and bulk import APIs"
```

---

### Task 7: PlayerHistory and TeamStanding Entities

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/history/entity/PlayerHistory.java`
- Create: `backend/src/main/java/com/rpl/auction/history/entity/TeamStanding.java`
- Create: `backend/src/main/java/com/rpl/auction/history/repository/PlayerHistoryRepository.java`
- Create: `backend/src/main/java/com/rpl/auction/history/repository/TeamStandingRepository.java`
- Create: `backend/src/main/java/com/rpl/auction/history/dto/PlayerHistoryResponse.java`
- Create: `backend/src/main/java/com/rpl/auction/history/dto/TeamStandingRequest.java`
- Create: `backend/src/main/java/com/rpl/auction/history/dto/TeamStandingResponse.java`
- Create: `backend/src/main/java/com/rpl/auction/history/service/HistoryService.java`
- Create: `backend/src/main/java/com/rpl/auction/history/controller/HistoryController.java`

- [ ] **Step 1: Create PlayerHistory entity**

```java
package com.rpl.auction.history.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "player_history")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PlayerHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "player_id", nullable = false)
    private Long playerId;

    @Column(name = "league_id", nullable = false)
    private Long leagueId;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Enumerated(EnumType.STRING)
    @Column(name = "acquisition_type", nullable = false, length = 20)
    private AcquisitionType acquisitionType;

    @Column(name = "sold_price", precision = 12, scale = 2)
    private BigDecimal soldPrice;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public enum AcquisitionType {
        RETAINED, AUCTIONED, DRAFTED
    }
}
```

- [ ] **Step 2: Create TeamStanding entity**

```java
package com.rpl.auction.history.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "team_standings", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"team_id", "league_id"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TeamStanding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(name = "league_id", nullable = false)
    private Long leagueId;

    @Column(name = "rank_position", nullable = false)
    private Integer rank;

    private Integer points;

    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
```

- [ ] **Step 3: Create repositories**

```java
package com.rpl.auction.history.repository;

import com.rpl.auction.history.entity.PlayerHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlayerHistoryRepository extends JpaRepository<PlayerHistory, Long> {
    List<PlayerHistory> findByPlayerIdOrderByCreatedAtDesc(Long playerId);
    List<PlayerHistory> findByLeagueId(Long leagueId);
}
```

```java
package com.rpl.auction.history.repository;

import com.rpl.auction.history.entity.TeamStanding;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TeamStandingRepository extends JpaRepository<TeamStanding, Long> {
    List<TeamStanding> findByLeagueIdOrderByRankAsc(Long leagueId);
}
```

- [ ] **Step 4: Create DTOs**

```java
package com.rpl.auction.history.dto;

import com.rpl.auction.history.entity.PlayerHistory;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PlayerHistoryResponse {
    private Long id;
    private Long playerId;
    private Long leagueId;
    private String leagueName;
    private Long teamId;
    private String teamName;
    private String acquisitionType;
    private BigDecimal soldPrice;
    private Instant createdAt;

    public static PlayerHistoryResponse from(PlayerHistory h, String leagueName, String teamName) {
        return PlayerHistoryResponse.builder()
                .id(h.getId())
                .playerId(h.getPlayerId())
                .leagueId(h.getLeagueId())
                .leagueName(leagueName)
                .teamId(h.getTeamId())
                .teamName(teamName)
                .acquisitionType(h.getAcquisitionType().name())
                .soldPrice(h.getSoldPrice())
                .createdAt(h.getCreatedAt())
                .build();
    }
}
```

```java
package com.rpl.auction.history.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class TeamStandingRequest {
    @NotNull
    private Long teamId;
    @NotNull
    private Integer rank;
    private Integer points;
    private String notes;
}
```

```java
package com.rpl.auction.history.dto;

import com.rpl.auction.history.entity.TeamStanding;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TeamStandingResponse {
    private Long id;
    private Long teamId;
    private String teamName;
    private Long leagueId;
    private Integer rank;
    private Integer points;
    private String notes;

    public static TeamStandingResponse from(TeamStanding ts, String teamName) {
        return TeamStandingResponse.builder()
                .id(ts.getId())
                .teamId(ts.getTeamId())
                .teamName(teamName)
                .leagueId(ts.getLeagueId())
                .rank(ts.getRank())
                .points(ts.getPoints())
                .notes(ts.getNotes())
                .build();
    }
}
```

- [ ] **Step 5: Create HistoryService**

```java
package com.rpl.auction.history.service;

import com.rpl.auction.history.dto.*;
import com.rpl.auction.history.entity.TeamStanding;
import com.rpl.auction.history.repository.PlayerHistoryRepository;
import com.rpl.auction.history.repository.TeamStandingRepository;
import com.rpl.auction.league.repository.LeagueRepository;
import com.rpl.auction.team.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HistoryService {

    private final PlayerHistoryRepository playerHistoryRepository;
    private final TeamStandingRepository teamStandingRepository;
    private final LeagueRepository leagueRepository;
    private final TeamRepository teamRepository;

    public List<PlayerHistoryResponse> getPlayerHistory(Long playerId) {
        return playerHistoryRepository.findByPlayerIdOrderByCreatedAtDesc(playerId).stream()
                .map(h -> {
                    String leagueName = leagueRepository.findById(h.getLeagueId()).map(l -> l.getName()).orElse("Unknown");
                    String teamName = teamRepository.findById(h.getTeamId()).map(t -> t.getName()).orElse("Unknown");
                    return PlayerHistoryResponse.from(h, leagueName, teamName);
                })
                .toList();
    }

    @Transactional
    public TeamStandingResponse createStanding(Long leagueId, TeamStandingRequest request) {
        TeamStanding standing = TeamStanding.builder()
                .teamId(request.getTeamId())
                .leagueId(leagueId)
                .rank(request.getRank())
                .points(request.getPoints())
                .notes(request.getNotes())
                .build();
        standing = teamStandingRepository.save(standing);
        String teamName = teamRepository.findById(request.getTeamId()).map(t -> t.getName()).orElse("Unknown");
        return TeamStandingResponse.from(standing, teamName);
    }

    public List<TeamStandingResponse> getStandings(Long leagueId) {
        return teamStandingRepository.findByLeagueIdOrderByRankAsc(leagueId).stream()
                .map(ts -> {
                    String teamName = teamRepository.findById(ts.getTeamId()).map(t -> t.getName()).orElse("Unknown");
                    return TeamStandingResponse.from(ts, teamName);
                })
                .toList();
    }
}
```

- [ ] **Step 6: Create HistoryController**

```java
package com.rpl.auction.history.controller;

import com.rpl.auction.common.dto.ApiResponse;
import com.rpl.auction.history.dto.*;
import com.rpl.auction.history.service.HistoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class HistoryController {

    private final HistoryService historyService;

    @GetMapping("/api/players/{playerId}/history")
    public ResponseEntity<ApiResponse<List<PlayerHistoryResponse>>> getPlayerHistory(@PathVariable Long playerId) {
        return ResponseEntity.ok(ApiResponse.success(historyService.getPlayerHistory(playerId)));
    }

    @PostMapping("/api/leagues/{leagueId}/standings")
    public ResponseEntity<ApiResponse<TeamStandingResponse>> createStanding(@PathVariable Long leagueId,
                                                                             @Valid @RequestBody TeamStandingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(historyService.createStanding(leagueId, request), "Standing recorded"));
    }

    @GetMapping("/api/leagues/{leagueId}/standings")
    public ResponseEntity<ApiResponse<List<TeamStandingResponse>>> getStandings(@PathVariable Long leagueId) {
        return ResponseEntity.ok(ApiResponse.success(historyService.getStandings(leagueId)));
    }
}
```

- [ ] **Step 7: Verify build**

Run: `cd backend && ./mvnw compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/rpl/auction/history/
git commit -m "feat: add PlayerHistory, TeamStanding entities with service, controller, and DTOs"
```

---

### Task 8: Seed RPL 2025 Data

**Files:**
- Modify: `backend/src/main/java/com/rpl/auction/config/DataSeeder.java`

- [ ] **Step 1: Add RPL 2025 seed data to DataSeeder**

Add these injected dependencies to the existing DataSeeder class:

```java
private final LeagueRepository leagueRepository;
private final TeamRepository teamRepository;
private final PlayerRepository playerRepository;
```

Add imports for the new entities. Then add this method and call it at the end of `run()`:

```java
private void seedRplData() {
    if (leagueRepository.existsBySeason("2025")) {
        log.info("RPL 2025 data already seeded");
        return;
    }

    // Create League
    League league = leagueRepository.save(League.builder()
            .name("RPL 2025")
            .season("2025")
            .teamBudget(new BigDecimal("100"))
            .maxPlayersPerTeam(35)
            .maxRetentionsPerTeam(5)
            .retentionCost(new BigDecimal("10"))
            .bidIncrement(new BigDecimal("0.5"))
            .timerSeconds(30)
            .build());

    User admin = userRepository.findByUsername("admin").orElseThrow();

    // Create Teams
    String[][] teamData = {
        {"Tribe of Titans", "TOT", "#FF5722"},
        {"Squad of Samurais", "SOS", "#2196F3"},
        {"Clan of Champions", "COC", "#4CAF50"},
        {"Gang of Gladiators", "GOG", "#9C27B0"},
        {"Force of Fighters", "FOF", "#F44336"}
    };

    Team[] teams = new Team[5];
    for (int i = 0; i < teamData.length; i++) {
        teams[i] = teamRepository.save(Team.builder()
                .name(teamData[i][0])
                .shortName(teamData[i][1])
                .color(teamData[i][2])
                .owner(admin)
                .league(league)
                .budget(league.getTeamBudget())
                .build());
    }

    // Cricket Team players per team
    String[][] cricketPlayers = {
        // Tribe of Titans (1-17)
        {"Abhay", "Sukesh Pasupuleti", "Manoj", "Sravanthi", "Lakshmi Hemalatha",
         "Sai Kumar Kappala", "Subhasis Saha", "Bramhendra Reddy", "G.Tarakredy",
         "Harsh khandelwal", "sai nitin", "Nanda Kishore Reddy Mummadi",
         "Rohith Basupally", "Swaroop", "SuryaAkhilesh", "Rajesh Dharavath", "Naresh Kadiga"},
        // Squad of Samurais (18-34)
        {"Sujan", "Shreyas", "Ram", "Ramya potla", "Ankita Naik",
         "Bishal", "Alokesh Sinha", "Ayansh", "Jamirul", "Vivek", "Ravi",
         "Uttej Patange", "Ajay Vunyale", "Nehaal", "Shubham Dnyaneshwar Kale",
         "K Nageshwar Rao", "Sasi Pedapudi"},
        // Clan of Champions (35-51)
        {"Vikram", "Pranay", "Praveen", "Sirivalli Sambaraju", "Josna Theresa Gigo",
         "Suraj Ragineni", "Y Siddartha Reddy", "Dheeraj", "vamsi chirumamilla",
         "Anoj S K", "Aditya Sarkar", "Aryadipta", "Purandhar", "Raja Rohith",
         "Naredla Hari Gopal Reddy", "Venkata Siva Prasad", "Anthony Joseph"},
        // Gang of Gladiators (52-68)
        {"Abhishek", "Anurag", "Madhu", "Aruna Shanmugam", "Annada Shukla",
         "Chetan Baregar", "Rounak", "Parth Mishra", "Satyam Kumar", "Prakhar Maroo",
         "Arun Pillai", "Koushik", "Hari Prasad P", "Sourya Bhattacharjee",
         "Priteesh M", "Nagaraj Patil", "Gourav Sharma"},
        // Force of Fighters (69-85)
        {"Vijay", "Sai Teja", "Varun", "Arya Deshpande", "Dhaanyashree G",
         "Hemalatha", "V Sampath Kumar", "Vinod Mylavarapu", "Hemanth.Alahari",
         "G Ramesh", "Gowtham Naidu", "SURAJ VAIBHAV REDDY", "Chaithanya",
         "GONI VIVEK VARDHAN", "Naveen Ranga", "Prince Pandey", "Swapnil patil"}
    };

    // Captain indices (0-based within each team): position of captain in cricketPlayers array
    int[] captainIndices = {1, 1, 1, 1, 1}; // All captains are at index 1

    // Other players per team
    String[][] otherPlayers = {
        {"SANTHOSH KUMAR NIMMALAPUDI", "Sanket Waghmare", "Chandra Mouli E", "srihita",
         "Kalyan Y", "Penchala Nikitha", "Sneha", "Varshitha", "Varshine", "Kousihk Maji",
         "Satya Ranjan", "Risabh Basin", "P. Nithish Reddy", "Shantanu Pathak",
         "Saurav Gaonkar", "Pramod Hembrom", "Janni Eswara Rao", "Yamika Raina"},
        {"Vaishnavi", "Sanjay Banerjee", "Naveen Goud", "Shubham Pathak", "Sai Chaitanya",
         "Arempula Chandu", "Jagajjeeban Pati", "Yogendra Majjari", "RAVEENDRA BABU G",
         "Gopanagar Srinivas Reddy", "Jyoti Ranjan Barik", "Anand M V", "Pradyumn Yadav",
         "Priyance Sarda", "Kranthi Kumar", "Mohammed Afrith"},
        {"Shruti Totla", "Janga Saikrishna", "Nagesh Golla", "Srinath S",
         "GantiSuryaKushal", "Shyam Kumar Bellam", "Santhosh M", "Gamidi Jadidiah Kingson",
         "Arun Maharana", "Kirananand Karamchetu", "Likhil", "Sreeja Guduri",
         "Hari Kiran K", "Samyuktha Vajja", "Prashanth R", "Sreeya Tipirisetty",
         "Ravi", "Venkata shiva"},
        {"Abhishek Kumar", "Pavan Manoj P", "Prashanth Goud", "Nagaraju", "Pratap",
         "Vamsi Krishna Ayila", "suneel pradeep", "Suresh behera", "AJIJ JAMADAR",
         "Dinesh Bandela", "Dwaipayan Biswas", "Apratim Kumar Singh", "Pallavi",
         "Sandeep Dillerao", "p. shalin", "Nupur Ashturkar"},
        {"Anil Kumar K", "Raghunandana", "Saganti.Akhil", "Prateek Rathi",
         "Kalagiri Rakesh", "Revanth Rallabandi", "mohankumar kodi", "Modi sreenath",
         "Vishal kotwani", "P Vijayasri", "Aditya Th", "Sree", "NAGARAJU BANDI",
         "K pavan sai", "G Keerthi", "Anurag Mishra", "Atharva patil"}
    };

    int playerNumber = 1;
    for (int t = 0; t < 5; t++) {
        // Seed cricket players
        for (int p = 0; p < cricketPlayers[t].length; p++) {
            Player player = playerRepository.save(Player.builder()
                    .name(cricketPlayers[t][p])
                    .playerNumber(playerNumber++)
                    .category(Player.PlayerCategory.CRICKET)
                    .league(league)
                    .team(teams[t])
                    .status(Player.PlayerStatus.RETAINED)
                    .isCaptain(p == captainIndices[t])
                    .build());
            if (p == captainIndices[t]) {
                teams[t].setCaptainId(player.getId());
                teamRepository.save(teams[t]);
            }
        }
        // Seed other players
        for (String name : otherPlayers[t]) {
            playerRepository.save(Player.builder()
                    .name(name)
                    .category(Player.PlayerCategory.OTHER)
                    .league(league)
                    .team(teams[t])
                    .status(Player.PlayerStatus.RETAINED)
                    .build());
        }
    }
    log.info("RPL 2025 data seeded: 5 teams, {} cricket players, other players", playerNumber - 1);
}
```

- [ ] **Step 2: Add call to seedRplData() at end of existing run() method**

```java
seedRplData();
```

- [ ] **Step 3: Verify build**

Run: `cd backend && ./mvnw compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/rpl/auction/config/DataSeeder.java
git commit -m "feat: seed RPL 2025 teams and players from spreadsheet data"
```

---

## Sub-project 2: Backend — Auction Engine & SSE

### Task 9: Auction, Bid, DraftPick Entities and Repositories

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/auction/entity/Auction.java`
- Create: `backend/src/main/java/com/rpl/auction/auction/entity/Bid.java`
- Create: `backend/src/main/java/com/rpl/auction/auction/entity/DraftPick.java`
- Create: `backend/src/main/java/com/rpl/auction/auction/repository/AuctionRepository.java`
- Create: `backend/src/main/java/com/rpl/auction/auction/repository/BidRepository.java`
- Create: `backend/src/main/java/com/rpl/auction/auction/repository/DraftPickRepository.java`

- [ ] **Step 1: Create Auction entity**

```java
package com.rpl.auction.auction.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "auctions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Auction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "league_id", nullable = false)
    private Long leagueId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AuctionStatus status = AuctionStatus.NOT_STARTED;

    @Column(name = "current_player_id")
    private Long currentPlayerId;

    @Column(name = "current_base_price", precision = 12, scale = 2)
    private BigDecimal currentBasePrice;

    @Column(name = "current_highest_bid_id")
    private Long currentHighestBidId;

    @Column(name = "timer_seconds")
    @Builder.Default
    private Integer timerSeconds = 30;

    @Column(name = "current_pick_team_id")
    private Long currentPickTeamId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum AuctionStatus {
        NOT_STARTED, RETENTION, LIVE, PAUSED, DRAFT, COMPLETED
    }
}
```

- [ ] **Step 2: Create Bid entity**

```java
package com.rpl.auction.auction.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "bids")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Bid {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "auction_id", nullable = false)
    private Long auctionId;

    @Column(name = "player_id", nullable = false)
    private Long playerId;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "bid_order", nullable = false)
    private Integer bidOrder;

    @Column(name = "is_winning", nullable = false)
    @Builder.Default
    private Boolean isWinning = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
```

- [ ] **Step 3: Create DraftPick entity**

```java
package com.rpl.auction.auction.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "draft_picks")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DraftPick {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "auction_id", nullable = false)
    private Long auctionId;

    @Column(name = "player_id", nullable = false)
    private Long playerId;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(name = "round_number", nullable = false)
    private Integer roundNumber;

    @Column(name = "pick_order", nullable = false)
    private Integer pickOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "pick_type", nullable = false, length = 20)
    private PickType pickType;

    @Column(precision = 12, scale = 2)
    private BigDecimal cost;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public enum PickType {
        RETENTION, DRAFT
    }
}
```

- [ ] **Step 4: Create repositories**

```java
package com.rpl.auction.auction.repository;

import com.rpl.auction.auction.entity.Auction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AuctionRepository extends JpaRepository<Auction, Long> {
    Optional<Auction> findByLeagueId(Long leagueId);
}
```

```java
package com.rpl.auction.auction.repository;

import com.rpl.auction.auction.entity.Bid;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BidRepository extends JpaRepository<Bid, Long> {
    List<Bid> findByAuctionIdAndPlayerIdOrderByBidOrderDesc(Long auctionId, Long playerId);
    Optional<Bid> findTopByAuctionIdAndPlayerIdOrderByBidOrderDesc(Long auctionId, Long playerId);
    int countByAuctionIdAndPlayerId(Long auctionId, Long playerId);
}
```

```java
package com.rpl.auction.auction.repository;

import com.rpl.auction.auction.entity.DraftPick;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DraftPickRepository extends JpaRepository<DraftPick, Long> {
    List<DraftPick> findByAuctionIdOrderByPickOrderAsc(Long auctionId);
    List<DraftPick> findByAuctionIdAndPickType(Long auctionId, DraftPick.PickType pickType);
    int countByAuctionIdAndTeamIdAndPickType(Long auctionId, Long teamId, DraftPick.PickType pickType);
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/rpl/auction/auction/
git commit -m "feat: add Auction, Bid, DraftPick entities and repositories"
```

---

### Task 10: SSE Service

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/auction/service/SseService.java`
- Create: `backend/src/main/java/com/rpl/auction/auction/dto/AuctionEvent.java`

- [ ] **Step 1: Create AuctionEvent DTO**

```java
package com.rpl.auction.auction.dto;

import lombok.*;

import java.util.Map;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AuctionEvent {
    private String type;
    private Map<String, Object> data;
}
```

- [ ] **Step 2: Create SseService**

```java
package com.rpl.auction.auction.service;

import com.rpl.auction.auction.dto.AuctionEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Slf4j
@RequiredArgsConstructor
public class SseService {

    private final Map<Long, List<SseEmitter>> auctionEmitters = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    public SseEmitter subscribe(Long auctionId) {
        SseEmitter emitter = new SseEmitter(0L); // no timeout
        auctionEmitters.computeIfAbsent(auctionId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(auctionId, emitter));
        emitter.onTimeout(() -> removeEmitter(auctionId, emitter));
        emitter.onError(e -> removeEmitter(auctionId, emitter));

        // Send initial connection event
        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data("{\"message\":\"Connected to auction stream\"}"));
        } catch (IOException e) {
            removeEmitter(auctionId, emitter);
        }

        return emitter;
    }

    public void broadcast(Long auctionId, AuctionEvent event) {
        List<SseEmitter> emitters = auctionEmitters.get(auctionId);
        if (emitters == null || emitters.isEmpty()) return;

        String data;
        try {
            data = objectMapper.writeValueAsString(event);
        } catch (IOException e) {
            log.error("Failed to serialize auction event", e);
            return;
        }

        List<SseEmitter> deadEmitters = new java.util.ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(event.getType())
                        .data(data));
            } catch (IOException e) {
                deadEmitters.add(emitter);
            }
        }
        emitters.removeAll(deadEmitters);
    }

    private void removeEmitter(Long auctionId, SseEmitter emitter) {
        List<SseEmitter> emitters = auctionEmitters.get(auctionId);
        if (emitters != null) {
            emitters.remove(emitter);
        }
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/rpl/auction/auction/service/SseService.java backend/src/main/java/com/rpl/auction/auction/dto/AuctionEvent.java
git commit -m "feat: add SSE service for live auction event broadcasting"
```

---

### Task 11: Auction Service (State Machine + Bidding)

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/auction/service/AuctionService.java`
- Create: `backend/src/main/java/com/rpl/auction/auction/dto/AuctionResponse.java`
- Create: `backend/src/main/java/com/rpl/auction/auction/dto/BidRequest.java`
- Create: `backend/src/main/java/com/rpl/auction/auction/dto/BidResponse.java`
- Create: `backend/src/main/java/com/rpl/auction/auction/dto/PickRequest.java`

- [ ] **Step 1: Create DTOs**

```java
package com.rpl.auction.auction.dto;

import com.rpl.auction.auction.entity.Auction;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AuctionResponse {
    private Long id;
    private Long leagueId;
    private String status;
    private Long currentPlayerId;
    private String currentPlayerName;
    private BigDecimal currentBasePrice;
    private BigDecimal currentHighestBid;
    private String currentHighestBidTeam;
    private Integer timerSeconds;
    private Long currentPickTeamId;
    private String currentPickTeamName;
    private Instant createdAt;

    public static AuctionResponse from(Auction auction) {
        return AuctionResponse.builder()
                .id(auction.getId())
                .leagueId(auction.getLeagueId())
                .status(auction.getStatus().name())
                .currentPlayerId(auction.getCurrentPlayerId())
                .currentBasePrice(auction.getCurrentBasePrice())
                .timerSeconds(auction.getTimerSeconds())
                .currentPickTeamId(auction.getCurrentPickTeamId())
                .createdAt(auction.getCreatedAt())
                .build();
    }
}
```

```java
package com.rpl.auction.auction.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class BidRequest {
    @NotNull
    private Long teamId;
}
```

```java
package com.rpl.auction.auction.dto;

import com.rpl.auction.auction.entity.Bid;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BidResponse {
    private Long id;
    private Long playerId;
    private Long teamId;
    private String teamName;
    private BigDecimal amount;
    private Integer bidOrder;
    private Boolean isWinning;
    private Instant createdAt;

    public static BidResponse from(Bid bid, String teamName) {
        return BidResponse.builder()
                .id(bid.getId())
                .playerId(bid.getPlayerId())
                .teamId(bid.getTeamId())
                .teamName(teamName)
                .amount(bid.getAmount())
                .bidOrder(bid.getBidOrder())
                .isWinning(bid.getIsWinning())
                .createdAt(bid.getCreatedAt())
                .build();
    }
}
```

```java
package com.rpl.auction.auction.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class PickRequest {
    @NotNull
    private Long playerId;
}
```

- [ ] **Step 2: Create AuctionService**

```java
package com.rpl.auction.auction.service;

import com.rpl.auction.auction.dto.*;
import com.rpl.auction.auction.entity.Auction;
import com.rpl.auction.auction.entity.Auction.AuctionStatus;
import com.rpl.auction.auction.entity.Bid;
import com.rpl.auction.auction.entity.DraftPick;
import com.rpl.auction.auction.repository.AuctionRepository;
import com.rpl.auction.auction.repository.BidRepository;
import com.rpl.auction.auction.repository.DraftPickRepository;
import com.rpl.auction.common.exception.BadRequestException;
import com.rpl.auction.common.exception.ResourceNotFoundException;
import com.rpl.auction.history.entity.PlayerHistory;
import com.rpl.auction.history.repository.PlayerHistoryRepository;
import com.rpl.auction.league.entity.League;
import com.rpl.auction.league.repository.LeagueRepository;
import com.rpl.auction.player.entity.Player;
import com.rpl.auction.player.repository.PlayerRepository;
import com.rpl.auction.team.entity.Team;
import com.rpl.auction.team.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuctionService {

    private final AuctionRepository auctionRepository;
    private final BidRepository bidRepository;
    private final DraftPickRepository draftPickRepository;
    private final LeagueRepository leagueRepository;
    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final PlayerHistoryRepository playerHistoryRepository;
    private final SseService sseService;

    @Transactional
    public AuctionResponse create(Long leagueId) {
        if (auctionRepository.findByLeagueId(leagueId).isPresent()) {
            throw new BadRequestException("Auction already exists for this league");
        }
        League league = leagueRepository.findById(leagueId)
                .orElseThrow(() -> new ResourceNotFoundException("League", leagueId));
        Auction auction = auctionRepository.save(Auction.builder()
                .leagueId(leagueId)
                .timerSeconds(league.getTimerSeconds())
                .build());
        return AuctionResponse.from(auction);
    }

    public AuctionResponse getAuction(Long id) {
        Auction auction = getAuctionOrThrow(id);
        AuctionResponse response = AuctionResponse.from(auction);
        enrichAuctionResponse(response, auction);
        return response;
    }

    @Transactional
    public AuctionResponse start(Long id) {
        Auction auction = getAuctionOrThrow(id);
        if (auction.getStatus() != AuctionStatus.NOT_STARTED) {
            throw new BadRequestException("Auction can only be started from NOT_STARTED status");
        }
        auction.setStatus(AuctionStatus.RETENTION);
        // Set first team for retention picks
        List<Team> teams = teamRepository.findByLeagueId(auction.getLeagueId());
        if (!teams.isEmpty()) {
            auction.setCurrentPickTeamId(teams.get(0).getId());
        }
        auction = auctionRepository.save(auction);

        broadcastEvent(auction.getId(), "AUCTION_STARTED", Map.of(
                "auctionId", auction.getId(),
                "leagueId", auction.getLeagueId(),
                "status", auction.getStatus().name()
        ));

        return AuctionResponse.from(auction);
    }

    @Transactional
    public AuctionResponse advanceToLive(Long id) {
        Auction auction = getAuctionOrThrow(id);
        if (auction.getStatus() != AuctionStatus.RETENTION) {
            throw new BadRequestException("Can only advance to LIVE from RETENTION status");
        }
        auction.setStatus(AuctionStatus.LIVE);
        auction.setCurrentPickTeamId(null);
        auction = auctionRepository.save(auction);

        broadcastEvent(auction.getId(), "AUCTION_STARTED", Map.of(
                "auctionId", auction.getId(),
                "status", "LIVE"
        ));

        return AuctionResponse.from(auction);
    }

    @Transactional
    public AuctionResponse putUpPlayer(Long auctionId, Long playerId) {
        Auction auction = getAuctionOrThrow(auctionId);
        if (auction.getStatus() != AuctionStatus.LIVE) {
            throw new BadRequestException("Auction must be LIVE to put up a player");
        }
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new ResourceNotFoundException("Player", playerId));
        if (player.getStatus() != Player.PlayerStatus.AVAILABLE) {
            throw new BadRequestException("Player is not available for auction");
        }

        League league = leagueRepository.findById(auction.getLeagueId())
                .orElseThrow(() -> new ResourceNotFoundException("League", auction.getLeagueId()));

        auction.setCurrentPlayerId(playerId);
        auction.setCurrentBasePrice(player.getBasePrice().compareTo(BigDecimal.ZERO) > 0
                ? player.getBasePrice() : league.getBidIncrement());
        auction.setCurrentHighestBidId(null);
        auction.setTimerSeconds(league.getTimerSeconds());
        auction = auctionRepository.save(auction);

        broadcastEvent(auctionId, "PLAYER_UP", Map.of(
                "playerId", player.getId(),
                "name", player.getName(),
                "category", player.getCategory().name(),
                "basePrice", auction.getCurrentBasePrice(),
                "timer", auction.getTimerSeconds()
        ));

        return AuctionResponse.from(auction);
    }

    @Transactional
    public BidResponse placeBid(Long auctionId, BidRequest request) {
        Auction auction = getAuctionOrThrow(auctionId);
        if (auction.getStatus() != AuctionStatus.LIVE || auction.getCurrentPlayerId() == null) {
            throw new BadRequestException("No active bidding in progress");
        }

        Team team = teamRepository.findById(request.getTeamId())
                .orElseThrow(() -> new ResourceNotFoundException("Team", request.getTeamId()));

        League league = leagueRepository.findById(auction.getLeagueId())
                .orElseThrow(() -> new ResourceNotFoundException("League", auction.getLeagueId()));

        // Calculate bid amount
        BigDecimal bidAmount;
        if (auction.getCurrentHighestBidId() == null) {
            bidAmount = auction.getCurrentBasePrice();
        } else {
            Bid currentHighest = bidRepository.findById(auction.getCurrentHighestBidId())
                    .orElseThrow(() -> new BadRequestException("Bid state error"));
            bidAmount = currentHighest.getAmount().add(league.getBidIncrement());
        }

        // Validate budget
        if (team.getBudget().compareTo(bidAmount) < 0) {
            throw new BadRequestException("Insufficient budget. Required: " + bidAmount + ", Available: " + team.getBudget());
        }

        // Mark previous winning bid as not winning
        if (auction.getCurrentHighestBidId() != null) {
            Bid prev = bidRepository.findById(auction.getCurrentHighestBidId()).orElse(null);
            if (prev != null) {
                prev.setIsWinning(false);
                bidRepository.save(prev);
            }
        }

        // Create bid
        int bidOrder = bidRepository.countByAuctionIdAndPlayerId(auctionId, auction.getCurrentPlayerId()) + 1;
        Bid bid = bidRepository.save(Bid.builder()
                .auctionId(auctionId)
                .playerId(auction.getCurrentPlayerId())
                .teamId(team.getId())
                .amount(bidAmount)
                .bidOrder(bidOrder)
                .isWinning(true)
                .build());

        // Update auction state
        auction.setCurrentHighestBidId(bid.getId());
        auction.setTimerSeconds(league.getTimerSeconds()); // reset timer
        auctionRepository.save(auction);

        broadcastEvent(auctionId, "BID_PLACED", Map.of(
                "bidId", bid.getId(),
                "teamId", team.getId(),
                "teamName", team.getName(),
                "amount", bidAmount,
                "timerReset", league.getTimerSeconds()
        ));

        return BidResponse.from(bid, team.getName());
    }

    @Transactional
    public AuctionResponse soldPlayer(Long auctionId) {
        Auction auction = getAuctionOrThrow(auctionId);
        if (auction.getCurrentPlayerId() == null) {
            throw new BadRequestException("No player currently up for auction");
        }

        Player player = playerRepository.findById(auction.getCurrentPlayerId())
                .orElseThrow(() -> new ResourceNotFoundException("Player", auction.getCurrentPlayerId()));

        if (auction.getCurrentHighestBidId() != null) {
            // SOLD
            Bid winningBid = bidRepository.findById(auction.getCurrentHighestBidId())
                    .orElseThrow(() -> new BadRequestException("Bid state error"));
            Team team = teamRepository.findById(winningBid.getTeamId())
                    .orElseThrow(() -> new ResourceNotFoundException("Team", winningBid.getTeamId()));

            player.setTeam(team);
            player.setStatus(Player.PlayerStatus.SOLD);
            playerRepository.save(player);

            team.setBudgetSpent(team.getBudgetSpent().add(winningBid.getAmount()));
            team.setBudget(team.getBudget().subtract(winningBid.getAmount()));
            teamRepository.save(team);

            playerHistoryRepository.save(PlayerHistory.builder()
                    .playerId(player.getId())
                    .leagueId(auction.getLeagueId())
                    .teamId(team.getId())
                    .acquisitionType(PlayerHistory.AcquisitionType.AUCTIONED)
                    .soldPrice(winningBid.getAmount())
                    .build());

            broadcastEvent(auctionId, "PLAYER_SOLD", Map.of(
                    "playerId", player.getId(),
                    "playerName", player.getName(),
                    "teamId", team.getId(),
                    "teamName", team.getName(),
                    "soldPrice", winningBid.getAmount(),
                    "teamBudgetLeft", team.getBudget()
            ));

            broadcastBudgetUpdate(auctionId, team);
        } else {
            // UNSOLD
            player.setStatus(Player.PlayerStatus.UNSOLD);
            playerRepository.save(player);

            broadcastEvent(auctionId, "PLAYER_UNSOLD", Map.of(
                    "playerId", player.getId(),
                    "name", player.getName()
            ));
        }

        // Clear current player
        auction.setCurrentPlayerId(null);
        auction.setCurrentBasePrice(null);
        auction.setCurrentHighestBidId(null);
        auctionRepository.save(auction);

        return AuctionResponse.from(auction);
    }

    @Transactional
    public AuctionResponse pause(Long id) {
        Auction auction = getAuctionOrThrow(id);
        if (auction.getStatus() != AuctionStatus.LIVE) {
            throw new BadRequestException("Can only pause a LIVE auction");
        }
        auction.setStatus(AuctionStatus.PAUSED);
        auction = auctionRepository.save(auction);
        broadcastEvent(id, "AUCTION_PAUSED", Map.of("auctionId", id));
        return AuctionResponse.from(auction);
    }

    @Transactional
    public AuctionResponse resume(Long id) {
        Auction auction = getAuctionOrThrow(id);
        if (auction.getStatus() != AuctionStatus.PAUSED) {
            throw new BadRequestException("Can only resume a PAUSED auction");
        }
        auction.setStatus(AuctionStatus.LIVE);
        auction = auctionRepository.save(auction);
        broadcastEvent(id, "AUCTION_RESUMED", Map.of("auctionId", id));
        return AuctionResponse.from(auction);
    }

    @Transactional
    public AuctionResponse switchToDraft(Long id) {
        Auction auction = getAuctionOrThrow(id);
        if (auction.getStatus() != AuctionStatus.LIVE && auction.getStatus() != AuctionStatus.PAUSED) {
            throw new BadRequestException("Can only switch to draft from LIVE or PAUSED");
        }
        auction.setStatus(AuctionStatus.DRAFT);
        auction.setCurrentPlayerId(null);
        auction.setCurrentBasePrice(null);
        auction.setCurrentHighestBidId(null);

        // Set first team for draft (reverse budget spent order)
        List<Team> teams = teamRepository.findByLeagueId(auction.getLeagueId());
        teams.sort((a, b) -> a.getBudgetSpent().compareTo(b.getBudgetSpent()));
        if (!teams.isEmpty()) {
            auction.setCurrentPickTeamId(teams.get(0).getId());
        }
        auction = auctionRepository.save(auction);
        broadcastEvent(id, "DRAFT_STARTED", Map.of("auctionId", id, "status", "DRAFT"));
        return AuctionResponse.from(auction);
    }

    @Transactional
    public AuctionResponse makeRetentionPick(Long auctionId, PickRequest request) {
        Auction auction = getAuctionOrThrow(auctionId);
        if (auction.getStatus() != AuctionStatus.RETENTION) {
            throw new BadRequestException("Not in retention phase");
        }

        League league = leagueRepository.findById(auction.getLeagueId())
                .orElseThrow(() -> new ResourceNotFoundException("League", auction.getLeagueId()));

        Team team = teamRepository.findById(auction.getCurrentPickTeamId())
                .orElseThrow(() -> new ResourceNotFoundException("Team", auction.getCurrentPickTeamId()));

        // Check retention limit
        int retentionCount = draftPickRepository.countByAuctionIdAndTeamIdAndPickType(
                auctionId, team.getId(), DraftPick.PickType.RETENTION);
        if (retentionCount >= league.getMaxRetentionsPerTeam()) {
            throw new BadRequestException("Team has reached max retentions");
        }

        Player player = playerRepository.findById(request.getPlayerId())
                .orElseThrow(() -> new ResourceNotFoundException("Player", request.getPlayerId()));

        // Validate budget
        if (team.getBudget().compareTo(league.getRetentionCost()) < 0) {
            throw new BadRequestException("Insufficient budget for retention");
        }

        // Execute pick
        player.setTeam(team);
        player.setStatus(Player.PlayerStatus.RETAINED);
        playerRepository.save(player);

        team.setBudgetSpent(team.getBudgetSpent().add(league.getRetentionCost()));
        team.setBudget(team.getBudget().subtract(league.getRetentionCost()));
        teamRepository.save(team);

        int pickOrder = draftPickRepository.findByAuctionIdAndPickType(auctionId, DraftPick.PickType.RETENTION).size() + 1;
        draftPickRepository.save(DraftPick.builder()
                .auctionId(auctionId)
                .playerId(player.getId())
                .teamId(team.getId())
                .roundNumber(1)
                .pickOrder(pickOrder)
                .pickType(DraftPick.PickType.RETENTION)
                .cost(league.getRetentionCost())
                .build());

        playerHistoryRepository.save(PlayerHistory.builder()
                .playerId(player.getId())
                .leagueId(auction.getLeagueId())
                .teamId(team.getId())
                .acquisitionType(PlayerHistory.AcquisitionType.RETAINED)
                .soldPrice(league.getRetentionCost())
                .build());

        broadcastEvent(auctionId, "RETENTION_PICK", Map.of(
                "playerId", player.getId(),
                "playerName", player.getName(),
                "teamId", team.getId(),
                "teamName", team.getName(),
                "pickOrder", pickOrder
        ));
        broadcastBudgetUpdate(auctionId, team);

        // Advance to next team
        advancePickTeam(auction);

        return AuctionResponse.from(auction);
    }

    @Transactional
    public AuctionResponse makeDraftPick(Long auctionId, PickRequest request) {
        Auction auction = getAuctionOrThrow(auctionId);
        if (auction.getStatus() != AuctionStatus.DRAFT) {
            throw new BadRequestException("Not in draft phase");
        }

        Team team = teamRepository.findById(auction.getCurrentPickTeamId())
                .orElseThrow(() -> new ResourceNotFoundException("Team", auction.getCurrentPickTeamId()));

        Player player = playerRepository.findById(request.getPlayerId())
                .orElseThrow(() -> new ResourceNotFoundException("Player", request.getPlayerId()));
        if (player.getStatus() != Player.PlayerStatus.UNSOLD && player.getStatus() != Player.PlayerStatus.AVAILABLE) {
            throw new BadRequestException("Player is not available for draft");
        }

        League league = leagueRepository.findById(auction.getLeagueId())
                .orElseThrow(() -> new ResourceNotFoundException("League", auction.getLeagueId()));

        player.setTeam(team);
        player.setStatus(Player.PlayerStatus.SOLD);
        playerRepository.save(player);

        BigDecimal draftCost = league.getBidIncrement(); // draft picks cost minimum
        team.setBudgetSpent(team.getBudgetSpent().add(draftCost));
        team.setBudget(team.getBudget().subtract(draftCost));
        teamRepository.save(team);

        int pickOrder = draftPickRepository.findByAuctionIdAndPickType(auctionId, DraftPick.PickType.DRAFT).size() + 1;
        draftPickRepository.save(DraftPick.builder()
                .auctionId(auctionId)
                .playerId(player.getId())
                .teamId(team.getId())
                .roundNumber(1)
                .pickOrder(pickOrder)
                .pickType(DraftPick.PickType.DRAFT)
                .cost(draftCost)
                .build());

        playerHistoryRepository.save(PlayerHistory.builder()
                .playerId(player.getId())
                .leagueId(auction.getLeagueId())
                .teamId(team.getId())
                .acquisitionType(PlayerHistory.AcquisitionType.DRAFTED)
                .soldPrice(draftCost)
                .build());

        broadcastEvent(auctionId, "DRAFT_PICK", Map.of(
                "playerId", player.getId(),
                "playerName", player.getName(),
                "teamId", team.getId(),
                "teamName", team.getName(),
                "pickOrder", pickOrder
        ));
        broadcastBudgetUpdate(auctionId, team);

        advancePickTeam(auction);

        return AuctionResponse.from(auction);
    }

    @Transactional
    public AuctionResponse complete(Long id) {
        Auction auction = getAuctionOrThrow(id);
        auction.setStatus(AuctionStatus.COMPLETED);
        auction.setCurrentPlayerId(null);
        auction.setCurrentPickTeamId(null);
        auction = auctionRepository.save(auction);
        broadcastEvent(id, "AUCTION_COMPLETED", Map.of("auctionId", id));
        return AuctionResponse.from(auction);
    }

    public SseEmitter subscribe(Long auctionId) {
        getAuctionOrThrow(auctionId);
        return sseService.subscribe(auctionId);
    }

    private Auction getAuctionOrThrow(Long id) {
        return auctionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Auction", id));
    }

    private void advancePickTeam(Auction auction) {
        List<Team> teams = teamRepository.findByLeagueId(auction.getLeagueId());
        if (auction.getStatus() == AuctionStatus.DRAFT) {
            teams.sort((a, b) -> a.getBudgetSpent().compareTo(b.getBudgetSpent()));
        }
        Long currentId = auction.getCurrentPickTeamId();
        int idx = -1;
        for (int i = 0; i < teams.size(); i++) {
            if (teams.get(i).getId().equals(currentId)) { idx = i; break; }
        }
        int nextIdx = (idx + 1) % teams.size();
        auction.setCurrentPickTeamId(teams.get(nextIdx).getId());
        auctionRepository.save(auction);
    }

    private void enrichAuctionResponse(AuctionResponse response, Auction auction) {
        if (auction.getCurrentPlayerId() != null) {
            playerRepository.findById(auction.getCurrentPlayerId())
                    .ifPresent(p -> response.setCurrentPlayerName(p.getName()));
        }
        if (auction.getCurrentHighestBidId() != null) {
            bidRepository.findById(auction.getCurrentHighestBidId()).ifPresent(bid -> {
                response.setCurrentHighestBid(bid.getAmount());
                teamRepository.findById(bid.getTeamId())
                        .ifPresent(t -> response.setCurrentHighestBidTeam(t.getName()));
            });
        }
        if (auction.getCurrentPickTeamId() != null) {
            teamRepository.findById(auction.getCurrentPickTeamId())
                    .ifPresent(t -> response.setCurrentPickTeamName(t.getName()));
        }
    }

    private void broadcastEvent(Long auctionId, String type, Map<String, Object> data) {
        sseService.broadcast(auctionId, AuctionEvent.builder().type(type).data(data).build());
    }

    private void broadcastBudgetUpdate(Long auctionId, Team team) {
        broadcastEvent(auctionId, "BUDGET_UPDATED", Map.of(
                "teamId", team.getId(),
                "teamName", team.getName(),
                "budgetRemaining", team.getBudget(),
                "budgetSpent", team.getBudgetSpent()
        ));
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/rpl/auction/auction/
git commit -m "feat: add AuctionService with state machine, bidding, retention, draft, and SSE"
```

---

### Task 12: Auction Controller

**Files:**
- Create: `backend/src/main/java/com/rpl/auction/auction/controller/AuctionController.java`

- [ ] **Step 1: Create AuctionController**

```java
package com.rpl.auction.auction.controller;

import com.rpl.auction.auction.dto.*;
import com.rpl.auction.auction.service.AuctionService;
import com.rpl.auction.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequiredArgsConstructor
public class AuctionController {

    private final AuctionService auctionService;

    @PostMapping("/api/leagues/{leagueId}/auctions")
    public ResponseEntity<ApiResponse<AuctionResponse>> create(@PathVariable Long leagueId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(auctionService.create(leagueId), "Auction created"));
    }

    @GetMapping("/api/auctions/{id}")
    public ResponseEntity<ApiResponse<AuctionResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.getAuction(id)));
    }

    @PutMapping("/api/auctions/{id}/start")
    public ResponseEntity<ApiResponse<AuctionResponse>> start(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.start(id), "Auction started"));
    }

    @PutMapping("/api/auctions/{id}/advance-to-live")
    public ResponseEntity<ApiResponse<AuctionResponse>> advanceToLive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.advanceToLive(id), "Moved to live auction"));
    }

    @PutMapping("/api/auctions/{id}/next-player/{playerId}")
    public ResponseEntity<ApiResponse<AuctionResponse>> putUpPlayer(@PathVariable Long id,
                                                                     @PathVariable Long playerId) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.putUpPlayer(id, playerId), "Player put up"));
    }

    @PostMapping("/api/auctions/{id}/bid")
    public ResponseEntity<ApiResponse<BidResponse>> placeBid(@PathVariable Long id,
                                                              @Valid @RequestBody BidRequest request) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.placeBid(id, request), "Bid placed"));
    }

    @PutMapping("/api/auctions/{id}/sold")
    public ResponseEntity<ApiResponse<AuctionResponse>> sold(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.soldPlayer(id), "Player sold/unsold"));
    }

    @PutMapping("/api/auctions/{id}/pause")
    public ResponseEntity<ApiResponse<AuctionResponse>> pause(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.pause(id), "Auction paused"));
    }

    @PutMapping("/api/auctions/{id}/resume")
    public ResponseEntity<ApiResponse<AuctionResponse>> resume(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.resume(id), "Auction resumed"));
    }

    @PutMapping("/api/auctions/{id}/switch-to-draft")
    public ResponseEntity<ApiResponse<AuctionResponse>> switchToDraft(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.switchToDraft(id), "Switched to draft"));
    }

    @PostMapping("/api/auctions/{id}/retention/pick")
    public ResponseEntity<ApiResponse<AuctionResponse>> retentionPick(@PathVariable Long id,
                                                                       @Valid @RequestBody PickRequest request) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.makeRetentionPick(id, request), "Retention pick made"));
    }

    @PostMapping("/api/auctions/{id}/draft/pick")
    public ResponseEntity<ApiResponse<AuctionResponse>> draftPick(@PathVariable Long id,
                                                                    @Valid @RequestBody PickRequest request) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.makeDraftPick(id, request), "Draft pick made"));
    }

    @PutMapping("/api/auctions/{id}/complete")
    public ResponseEntity<ApiResponse<AuctionResponse>> complete(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.complete(id), "Auction completed"));
    }

    @GetMapping(value = "/api/auctions/{id}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@PathVariable Long id) {
        return auctionService.subscribe(id);
    }
}
```

- [ ] **Step 2: Verify full backend build**

Run: `cd backend && ./mvnw compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/rpl/auction/auction/controller/
git commit -m "feat: add AuctionController with full auction lifecycle endpoints and SSE stream"
```

---

## Sub-project 3: Frontend — React PWA Scaffold

### Task 13: Initialize React + TypeScript + Vite Project

**Files:**
- Create: `frontend/` directory with Vite scaffold

- [ ] **Step 1: Create Vite project**

```bash
cd /Users/siddarthreddy/FunApp/RPL
npm create vite@latest frontend -- --template react-ts
```

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/siddarthreddy/FunApp/RPL/frontend
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install @tanstack/react-query
npm install react-router-dom
npm install axios
npm install vite-plugin-pwa workbox-precaching -D
```

- [ ] **Step 3: Configure Vite for PWA and port 3000**

Replace `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'RPL - Cricket Auction Platform',
        short_name: 'RPL',
        description: 'Real Premier League Cricket Auction Platform',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 4: Verify dev server starts**

```bash
cd /Users/siddarthreddy/FunApp/RPL/frontend && npm run dev -- --host &
sleep 3 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```
Expected: 200

- [ ] **Step 5: Commit**

```bash
cd /Users/siddarthreddy/FunApp/RPL
git add frontend/
git commit -m "feat: initialize React + TypeScript + Vite frontend with PWA and MUI"
```

---

### Task 14: API Client, Auth Context, and Types

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/auth.ts`
- Create: `frontend/src/api/leagues.ts`
- Create: `frontend/src/api/teams.ts`
- Create: `frontend/src/api/players.ts`
- Create: `frontend/src/api/auctions.ts`
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/context/AuthContext.tsx`

- [ ] **Step 1: Create shared types**

```typescript
// frontend/src/types/index.ts
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: FieldError[];
  timestamp: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserInfo;
}

export interface UserInfo {
  id: number;
  username: string;
  displayName: string;
  permissions: string[];
}

export interface League {
  id: number;
  name: string;
  season: string;
  status: string;
  teamBudget: number;
  maxPlayersPerTeam: number;
  maxRetentionsPerTeam: number;
  retentionCost: number;
  bidIncrement: number;
  timerSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: number;
  name: string;
  shortName: string;
  color: string;
  logoUrl?: string;
  captainId?: number;
  captainName?: string;
  ownerId?: number;
  ownerName?: string;
  leagueId: number;
  budget: number;
  budgetSpent: number;
  playerCount?: number;
  createdAt: string;
}

export interface Player {
  id: number;
  name: string;
  playerNumber?: number;
  category: 'CRICKET' | 'OTHER';
  role?: string;
  basePrice: number;
  teamId?: number;
  teamName?: string;
  teamColor?: string;
  leagueId: number;
  status: 'AVAILABLE' | 'RETAINED' | 'SOLD' | 'UNSOLD';
  isCaptain: boolean;
  createdAt: string;
}

export interface Auction {
  id: number;
  leagueId: number;
  status: string;
  currentPlayerId?: number;
  currentPlayerName?: string;
  currentBasePrice?: number;
  currentHighestBid?: number;
  currentHighestBidTeam?: string;
  timerSeconds: number;
  currentPickTeamId?: number;
  currentPickTeamName?: string;
  createdAt: string;
}

export interface AuctionEvent {
  type: string;
  data: Record<string, unknown>;
}

export interface PlayerHistory {
  id: number;
  playerId: number;
  leagueId: number;
  leagueName: string;
  teamId: number;
  teamName: string;
  acquisitionType: string;
  soldPrice?: number;
  createdAt: string;
}

export interface TeamStanding {
  id: number;
  teamId: number;
  teamName: string;
  leagueId: number;
  rank: number;
  points?: number;
  notes?: string;
}
```

- [ ] **Step 2: Create API client**

```typescript
// frontend/src/api/client.ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/refresh', { refreshToken });
          const { accessToken, refreshToken: newRefresh } = res.data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefresh);
          original.headers.Authorization = `Bearer ${accessToken}`;
          return api(original);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

- [ ] **Step 3: Create API modules**

```typescript
// frontend/src/api/auth.ts
import api from './client';
import { ApiResponse, LoginRequest, LoginResponse, UserInfo } from '../types';

export const login = (data: LoginRequest) =>
  api.post<ApiResponse<LoginResponse>>('/auth/login', data).then(r => r.data.data);

export const getMe = () =>
  api.get<ApiResponse<UserInfo>>('/auth/me').then(r => r.data.data);

export const logout = () =>
  api.post('/auth/logout').catch(() => {});
```

```typescript
// frontend/src/api/leagues.ts
import api from './client';
import { ApiResponse, League } from '../types';

export const getLeagues = () =>
  api.get<ApiResponse<League[]>>('/leagues').then(r => r.data.data);

export const getLeague = (id: number) =>
  api.get<ApiResponse<League>>(`/leagues/${id}`).then(r => r.data.data);

export const createLeague = (data: Partial<League>) =>
  api.post<ApiResponse<League>>('/leagues', data).then(r => r.data.data);

export const updateLeague = (id: number, data: Partial<League>) =>
  api.put<ApiResponse<League>>(`/leagues/${id}`, data).then(r => r.data.data);

export const deleteLeague = (id: number) =>
  api.delete(`/leagues/${id}`);
```

```typescript
// frontend/src/api/teams.ts
import api from './client';
import { ApiResponse, Team } from '../types';

export const getTeams = (leagueId: number) =>
  api.get<ApiResponse<Team[]>>(`/leagues/${leagueId}/teams`).then(r => r.data.data);

export const getTeam = (id: number) =>
  api.get<ApiResponse<Team>>(`/teams/${id}`).then(r => r.data.data);

export const createTeam = (leagueId: number, data: Partial<Team>) =>
  api.post<ApiResponse<Team>>(`/leagues/${leagueId}/teams`, data).then(r => r.data.data);

export const updateTeam = (id: number, data: Partial<Team>) =>
  api.put<ApiResponse<Team>>(`/teams/${id}`, data).then(r => r.data.data);

export const deleteTeam = (id: number) =>
  api.delete(`/teams/${id}`);
```

```typescript
// frontend/src/api/players.ts
import api from './client';
import { ApiResponse, Player, PlayerHistory } from '../types';

export const getPlayers = (leagueId: number, params?: { category?: string; status?: string; teamId?: number }) =>
  api.get<ApiResponse<Player[]>>(`/leagues/${leagueId}/players`, { params }).then(r => r.data.data);

export const getPlayer = (id: number) =>
  api.get<ApiResponse<Player>>(`/players/${id}`).then(r => r.data.data);

export const getPlayerHistory = (playerId: number) =>
  api.get<ApiResponse<PlayerHistory[]>>(`/players/${playerId}/history`).then(r => r.data.data);

export const importPlayers = (leagueId: number, players: Partial<Player>[]) =>
  api.post<ApiResponse<Player[]>>(`/leagues/${leagueId}/players/import`, { players }).then(r => r.data.data);
```

```typescript
// frontend/src/api/auctions.ts
import api from './client';
import { ApiResponse, Auction } from '../types';

export const createAuction = (leagueId: number) =>
  api.post<ApiResponse<Auction>>(`/leagues/${leagueId}/auctions`).then(r => r.data.data);

export const getAuction = (id: number) =>
  api.get<ApiResponse<Auction>>(`/auctions/${id}`).then(r => r.data.data);

export const startAuction = (id: number) =>
  api.put<ApiResponse<Auction>>(`/auctions/${id}/start`).then(r => r.data.data);

export const advanceToLive = (id: number) =>
  api.put<ApiResponse<Auction>>(`/auctions/${id}/advance-to-live`).then(r => r.data.data);

export const putUpPlayer = (id: number, playerId: number) =>
  api.put<ApiResponse<Auction>>(`/auctions/${id}/next-player/${playerId}`).then(r => r.data.data);

export const placeBid = (id: number, teamId: number) =>
  api.post(`/auctions/${id}/bid`, { teamId }).then(r => r.data.data);

export const soldPlayer = (id: number) =>
  api.put<ApiResponse<Auction>>(`/auctions/${id}/sold`).then(r => r.data.data);

export const pauseAuction = (id: number) =>
  api.put<ApiResponse<Auction>>(`/auctions/${id}/pause`).then(r => r.data.data);

export const resumeAuction = (id: number) =>
  api.put<ApiResponse<Auction>>(`/auctions/${id}/resume`).then(r => r.data.data);

export const switchToDraft = (id: number) =>
  api.put<ApiResponse<Auction>>(`/auctions/${id}/switch-to-draft`).then(r => r.data.data);

export const retentionPick = (id: number, playerId: number) =>
  api.post(`/auctions/${id}/retention/pick`, { playerId }).then(r => r.data.data);

export const draftPick = (id: number, playerId: number) =>
  api.post(`/auctions/${id}/draft/pick`, { playerId }).then(r => r.data.data);

export const completeAuction = (id: number) =>
  api.put<ApiResponse<Auction>>(`/auctions/${id}/complete`).then(r => r.data.data);
```

- [ ] **Step 4: Create AuthContext**

```tsx
// frontend/src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserInfo } from '../types';
import { login as apiLogin, getMe, logout as apiLogout } from '../api/auth';

interface AuthState {
  user: UserInfo | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      getMe().then(setUser).catch(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await apiLogin({ username, password });
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    setUser(res.user);
  };

  const logout = () => {
    apiLogout();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const hasPermission = (permission: string) =>
    user?.permissions?.includes(permission) ?? false;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
```

- [ ] **Step 5: Commit**

```bash
cd /Users/siddarthreddy/FunApp/RPL
git add frontend/src/api/ frontend/src/types/ frontend/src/context/
git commit -m "feat: add API client, auth context, type definitions, and API modules"
```

---

### Task 15: MUI Theme, Layout, and Routing

**Files:**
- Create: `frontend/src/theme.ts`
- Create: `frontend/src/components/Layout.tsx`
- Create: `frontend/src/components/Sidebar.tsx`
- Create: `frontend/src/components/TopBar.tsx`
- Create: `frontend/src/components/ProtectedRoute.tsx`
- Create: `frontend/src/hooks/useSse.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Create theme**

```typescript
// frontend/src/theme.ts
import { createTheme } from '@mui/material/styles';

export const teamColors: Record<string, string> = {
  TOT: '#FF5722',
  SOS: '#2196F3',
  COC: '#4CAF50',
  GOG: '#9C27B0',
  FOF: '#F44336',
};

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#f59e0b' },
    secondary: { main: '#60a5fa' },
    background: {
      default: '#0f0f1a',
      paper: '#1a1a2e',
    },
    error: { main: '#F44336' },
    success: { main: '#4CAF50' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
});

export default theme;
```

- [ ] **Step 2: Create Sidebar**

```tsx
// frontend/src/components/Sidebar.tsx
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Divider, Box } from '@mui/material';
import { Dashboard, Groups, People, Gavel, EmojiEvents, History, AdminPanelSettings, Security } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 240;

const publicItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/' },
  { text: 'Teams', icon: <Groups />, path: '/teams' },
  { text: 'Players', icon: <People />, path: '/players' },
  { text: 'Live Auction', icon: <Gavel />, path: '/auction' },
  { text: 'Results', icon: <EmojiEvents />, path: '/results' },
  { text: 'History', icon: <History />, path: '/history' },
];

const ownerItems = [
  { text: 'My Team', icon: <Groups />, path: '/my-team' },
];

const adminItems = [
  { text: 'Admin Panel', icon: <AdminPanelSettings />, path: '/admin' },
  { text: 'Audit Logs', icon: <Security />, path: '/admin/audit' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasPermission } = useAuth();

  const isAdmin = hasPermission('user:CREATE') || hasPermission('league:CREATE');
  const isOwner = hasPermission('auction:BID');

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {publicItems.map((item) => (
            <ListItemButton
              key={item.path}
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          ))}
        </List>
        {isOwner && user && (
          <>
            <Divider />
            <List>
              {ownerItems.map((item) => (
                <ListItemButton
                  key={item.path}
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
        {isAdmin && (
          <>
            <Divider />
            <List>
              {adminItems.map((item) => (
                <ListItemButton
                  key={item.path}
                  selected={location.pathname.startsWith(item.path)}
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </Box>
    </Drawer>
  );
}
```

- [ ] **Step 3: Create TopBar**

```tsx
// frontend/src/components/TopBar.tsx
import { AppBar, Toolbar, Typography, Button, Box, Chip } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#f59e0b', mr: 2 }}>
          RPL 2025
        </Typography>
        <Chip label="AUCTION" size="small" color="error" sx={{ animation: 'pulse 2s infinite', mr: 2 }} />
        <Box sx={{ flexGrow: 1 }} />
        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">{user.displayName || user.username}</Typography>
            <Button size="small" color="inherit" onClick={logout}>Logout</Button>
          </Box>
        ) : (
          <Button color="inherit" onClick={() => navigate('/login')}>Login</Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
```

- [ ] **Step 4: Create Layout and ProtectedRoute**

```tsx
// frontend/src/components/Layout.tsx
import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
  return (
    <Box sx={{ display: 'flex' }}>
      <TopBar />
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
```

```tsx
// frontend/src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

export default function ProtectedRoute({ children, permission }: { children: React.ReactNode; permission?: string }) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (!user) return <Navigate to="/login" />;
  if (permission && !hasPermission(permission)) return <Navigate to="/" />;

  return <>{children}</>;
}
```

- [ ] **Step 5: Create SSE hook**

```typescript
// frontend/src/hooks/useSse.ts
import { useEffect, useRef, useCallback } from 'react';
import { AuctionEvent } from '../types';

export function useSse(auctionId: number | null, onEvent: (event: AuctionEvent) => void) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!auctionId) return;

    const es = new EventSource(`/api/auctions/${auctionId}/stream`);
    eventSourceRef.current = es;

    const eventTypes = [
      'AUCTION_STARTED', 'PLAYER_UP', 'BID_PLACED', 'PLAYER_SOLD', 'PLAYER_UNSOLD',
      'AUCTION_PAUSED', 'AUCTION_RESUMED', 'DRAFT_PICK', 'BUDGET_UPDATED',
      'TIMER_TICK', 'RETENTION_PICK', 'AUCTION_COMPLETED', 'DRAFT_STARTED',
    ];

    eventTypes.forEach((type) => {
      es.addEventListener(type, (e: MessageEvent) => {
        const parsed = JSON.parse(e.data);
        onEventRef.current({ type: parsed.type || type, data: parsed.data || parsed });
      });
    });

    es.onerror = () => {
      es.close();
      setTimeout(connect, 3000);
    };
  }, [auctionId]);

  useEffect(() => {
    connect();
    return () => eventSourceRef.current?.close();
  }, [connect]);
}
```

- [ ] **Step 6: Update App.tsx with routes**

```tsx
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import theme from './theme';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TeamsPage from './pages/TeamsPage';
import TeamDetailPage from './pages/TeamDetailPage';
import PlayersPage from './pages/PlayersPage';
import AuctionPage from './pages/AuctionPage';
import AdminPage from './pages/AdminPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<Layout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/teams/:id" element={<TeamDetailPage />} />
                <Route path="/players" element={<PlayersPage />} />
                <Route path="/auction" element={<AuctionPage />} />
                <Route path="/admin/*" element={
                  <ProtectedRoute permission="league:CREATE"><AdminPage /></ProtectedRoute>
                } />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 7: Update main.tsx**

```tsx
// frontend/src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 8: Commit**

```bash
cd /Users/siddarthreddy/FunApp/RPL
git add frontend/src/
git commit -m "feat: add MUI theme, layout, sidebar, topbar, routing, SSE hook, and auth context"
```

---

### Task 16: Login Page

**Files:**
- Create: `frontend/src/pages/LoginPage.tsx`

- [ ] **Step 1: Create LoginPage**

```tsx
// frontend/src/pages/LoginPage.tsx
import { useState } from 'react';
import { Box, Card, CardContent, TextField, Button, Typography, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch {
      setError('Invalid credentials');
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Card sx={{ width: 400, p: 2 }}>
        <CardContent>
          <Typography variant="h4" align="center" sx={{ color: '#f59e0b', mb: 1 }}>RPL</Typography>
          <Typography variant="body2" align="center" sx={{ mb: 3, color: 'text.secondary' }}>Cricket Auction Platform</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="Username" value={username} onChange={e => setUsername(e.target.value)} sx={{ mb: 2 }} />
            <TextField fullWidth label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} sx={{ mb: 3 }} />
            <Button fullWidth variant="contained" type="submit" size="large">Login</Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/LoginPage.tsx
git commit -m "feat: add login page"
```

---

### Task 17: Dashboard Page

**Files:**
- Create: `frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Create DashboardPage**

```tsx
// frontend/src/pages/DashboardPage.tsx
import { Typography, Grid, Card, CardContent, Box, Chip } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getLeagues } from '../api/leagues';
import { getTeams } from '../api/teams';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { data: leagues } = useQuery({ queryKey: ['leagues'], queryFn: getLeagues });
  const activeLeague = leagues?.find(l => l.status !== 'COMPLETED') ?? leagues?.[0];
  const { data: teams } = useQuery({
    queryKey: ['teams', activeLeague?.id],
    queryFn: () => getTeams(activeLeague!.id),
    enabled: !!activeLeague,
  });
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {activeLeague?.name ?? 'RPL'} Dashboard
      </Typography>
      {activeLeague && (
        <Chip label={activeLeague.status} color={activeLeague.status === 'ACTIVE' ? 'success' : 'default'} sx={{ mb: 3 }} />
      )}
      <Grid container spacing={3}>
        {teams?.map((team) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={team.id}>
            <Card
              sx={{ cursor: 'pointer', borderLeft: `4px solid ${team.color}`, '&:hover': { transform: 'translateY(-2px)', transition: '0.2s' } }}
              onClick={() => navigate(`/teams/${team.id}`)}
            >
              <CardContent>
                <Typography variant="h6" sx={{ color: team.color }}>{team.name}</Typography>
                <Typography variant="body2" color="text.secondary">{team.shortName}</Typography>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Budget</Typography>
                    <Typography variant="h6">{team.budget} CR</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Spent</Typography>
                    <Typography variant="h6">{team.budgetSpent} CR</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx
git commit -m "feat: add dashboard page with team cards"
```

---

### Task 18: Teams and Team Detail Pages

**Files:**
- Create: `frontend/src/pages/TeamsPage.tsx`
- Create: `frontend/src/pages/TeamDetailPage.tsx`

- [ ] **Step 1: Create TeamsPage**

```tsx
// frontend/src/pages/TeamsPage.tsx
import { Typography, Grid, Card, CardContent, Box } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getLeagues } from '../api/leagues';
import { getTeams } from '../api/teams';
import { useNavigate } from 'react-router-dom';

export default function TeamsPage() {
  const { data: leagues } = useQuery({ queryKey: ['leagues'], queryFn: getLeagues });
  const activeLeague = leagues?.find(l => l.status !== 'COMPLETED') ?? leagues?.[0];
  const { data: teams } = useQuery({
    queryKey: ['teams', activeLeague?.id],
    queryFn: () => getTeams(activeLeague!.id),
    enabled: !!activeLeague,
  });
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Teams</Typography>
      <Grid container spacing={3}>
        {teams?.map((team) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={team.id}>
            <Card
              sx={{ cursor: 'pointer', borderTop: `4px solid ${team.color}`, '&:hover': { transform: 'translateY(-2px)', transition: '0.2s' } }}
              onClick={() => navigate(`/teams/${team.id}`)}
            >
              <CardContent>
                <Typography variant="h5" sx={{ color: team.color }}>{team.name}</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>Captain: {team.captainName ?? 'TBD'}</Typography>
                <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Budget Left</Typography>
                    <Typography variant="h6">{team.budget} CR</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Spent</Typography>
                    <Typography variant="h6">{team.budgetSpent} CR</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
```

- [ ] **Step 2: Create TeamDetailPage**

```tsx
// frontend/src/pages/TeamDetailPage.tsx
import { Typography, Box, Chip, Table, TableHead, TableRow, TableCell, TableBody, Card, CardContent } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getTeam } from '../api/teams';
import { getPlayers } from '../api/players';

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: team } = useQuery({ queryKey: ['team', id], queryFn: () => getTeam(Number(id)) });
  const { data: players } = useQuery({
    queryKey: ['players', team?.leagueId, { teamId: team?.id }],
    queryFn: () => getPlayers(team!.leagueId, { teamId: team!.id }),
    enabled: !!team,
  });

  if (!team) return null;

  const cricketPlayers = players?.filter(p => p.category === 'CRICKET') ?? [];
  const otherPlayers = players?.filter(p => p.category === 'OTHER') ?? [];

  const statusColor = (s: string) => {
    switch (s) { case 'RETAINED': return 'info'; case 'SOLD': return 'success'; case 'UNSOLD': return 'error'; default: return 'default'; }
  };

  const renderTable = (title: string, list: typeof cricketPlayers) => (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>{title} ({list.length})</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Role</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.playerNumber}</TableCell>
                <TableCell>
                  {p.name} {p.isCaptain && <Chip label="C" size="small" color="warning" sx={{ ml: 1 }} />}
                </TableCell>
                <TableCell><Chip label={p.status} size="small" color={statusColor(p.status) as any} /></TableCell>
                <TableCell>{p.role ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: team.color }} />
        <Typography variant="h4">{team.name}</Typography>
        <Chip label={team.shortName} sx={{ bgcolor: team.color, color: 'white' }} />
      </Box>
      <Box sx={{ display: 'flex', gap: 4, mb: 2 }}>
        <Typography>Budget: <strong>{team.budget} CR</strong></Typography>
        <Typography>Spent: <strong>{team.budgetSpent} CR</strong></Typography>
        <Typography>Owner: {team.ownerName ?? '-'}</Typography>
      </Box>
      {renderTable('Cricket Team', cricketPlayers)}
      {renderTable('Other Players', otherPlayers)}
    </Box>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/TeamsPage.tsx frontend/src/pages/TeamDetailPage.tsx
git commit -m "feat: add teams directory and team detail pages"
```

---

### Task 19: Players Page

**Files:**
- Create: `frontend/src/pages/PlayersPage.tsx`

- [ ] **Step 1: Create PlayersPage**

```tsx
// frontend/src/pages/PlayersPage.tsx
import { useState } from 'react';
import { Typography, Box, TextField, ToggleButtonGroup, ToggleButton, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getLeagues } from '../api/leagues';
import { getPlayers } from '../api/players';

export default function PlayersPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const { data: leagues } = useQuery({ queryKey: ['leagues'], queryFn: getLeagues });
  const activeLeague = leagues?.find(l => l.status !== 'COMPLETED') ?? leagues?.[0];
  const { data: players } = useQuery({
    queryKey: ['players', activeLeague?.id, { category }],
    queryFn: () => getPlayers(activeLeague!.id, category ? { category } : undefined),
    enabled: !!activeLeague,
  });

  const filtered = players?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const statusColor = (s: string) => {
    switch (s) { case 'RETAINED': return 'info'; case 'SOLD': return 'success'; case 'UNSOLD': return 'error'; default: return 'default'; }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Players</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField size="small" placeholder="Search players..." value={search} onChange={e => setSearch(e.target.value)} sx={{ width: 300 }} />
        <ToggleButtonGroup size="small" value={category} exclusive onChange={(_, v) => setCategory(v)}>
          <ToggleButton value={null}>All</ToggleButton>
          <ToggleButton value="CRICKET">Cricket</ToggleButton>
          <ToggleButton value="OTHER">Other</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Team</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Base Price</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.playerNumber ?? '-'}</TableCell>
              <TableCell>
                {p.name} {p.isCaptain && <Chip label="C" size="small" color="warning" sx={{ ml: 1 }} />}
              </TableCell>
              <TableCell><Chip label={p.category} size="small" variant="outlined" /></TableCell>
              <TableCell>
                {p.teamName ? (
                  <Chip label={p.teamName} size="small" sx={{ bgcolor: p.teamColor, color: 'white' }} />
                ) : '-'}
              </TableCell>
              <TableCell><Chip label={p.status} size="small" color={statusColor(p.status) as any} /></TableCell>
              <TableCell>{p.basePrice > 0 ? `${p.basePrice} CR` : '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/PlayersPage.tsx
git commit -m "feat: add players directory page with search and category filter"
```

---

### Task 20: Live Auction Page

**Files:**
- Create: `frontend/src/pages/AuctionPage.tsx`

- [ ] **Step 1: Create AuctionPage**

```tsx
// frontend/src/pages/AuctionPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { Typography, Box, Card, CardContent, Button, Grid, Chip, LinearProgress } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLeagues } from '../api/leagues';
import { getTeams } from '../api/teams';
import * as auctionApi from '../api/auctions';
import { useSse } from '../hooks/useSse';
import { useAuth } from '../context/AuthContext';
import { AuctionEvent, Auction, Team } from '../types';

export default function AuctionPage() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = hasPermission('auction:START');
  const canBid = hasPermission('auction:BID');

  const { data: leagues } = useQuery({ queryKey: ['leagues'], queryFn: getLeagues });
  const activeLeague = leagues?.find(l => l.status !== 'COMPLETED') ?? leagues?.[0];

  const [auction, setAuction] = useState<Auction | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [timer, setTimer] = useState(0);
  const [bidLog, setBidLog] = useState<string[]>([]);

  // Fetch teams
  useQuery({
    queryKey: ['teams', activeLeague?.id],
    queryFn: async () => {
      const t = await getTeams(activeLeague!.id);
      setTeams(t);
      return t;
    },
    enabled: !!activeLeague,
  });

  // Fetch auction (find by getting league's auction)
  useEffect(() => {
    if (!activeLeague) return;
    // Try to get auction for this league - use auction id 1 as default for now
    auctionApi.getAuction(1).then(setAuction).catch(() => {});
  }, [activeLeague]);

  const handleEvent = useCallback((event: AuctionEvent) => {
    const d = event.data;
    switch (event.type) {
      case 'PLAYER_UP':
        setAuction(prev => prev ? { ...prev, currentPlayerName: d.name as string, currentBasePrice: d.basePrice as number, currentHighestBid: undefined, currentHighestBidTeam: undefined } : prev);
        setTimer(d.timer as number);
        setBidLog(prev => [`Player up: ${d.name}`, ...prev.slice(0, 49)]);
        break;
      case 'BID_PLACED':
        setAuction(prev => prev ? { ...prev, currentHighestBid: d.amount as number, currentHighestBidTeam: d.teamName as string } : prev);
        setTimer(d.timerReset as number);
        setBidLog(prev => [`${d.teamName} bid ${d.amount} CR`, ...prev.slice(0, 49)]);
        break;
      case 'PLAYER_SOLD':
        setBidLog(prev => [`SOLD! ${d.playerName} to ${d.teamName} for ${d.soldPrice} CR`, ...prev.slice(0, 49)]);
        setAuction(prev => prev ? { ...prev, currentPlayerName: undefined, currentBasePrice: undefined } : prev);
        queryClient.invalidateQueries({ queryKey: ['teams'] });
        break;
      case 'PLAYER_UNSOLD':
        setBidLog(prev => [`UNSOLD: ${d.name}`, ...prev.slice(0, 49)]);
        setAuction(prev => prev ? { ...prev, currentPlayerName: undefined } : prev);
        break;
      case 'BUDGET_UPDATED':
        setTeams(prev => prev.map(t => t.id === d.teamId ? { ...t, budget: d.budgetRemaining as number, budgetSpent: d.budgetSpent as number } : t));
        break;
      case 'AUCTION_PAUSED':
        setAuction(prev => prev ? { ...prev, status: 'PAUSED' } : prev);
        break;
      case 'AUCTION_RESUMED':
        setAuction(prev => prev ? { ...prev, status: 'LIVE' } : prev);
        break;
      case 'AUCTION_COMPLETED':
        setAuction(prev => prev ? { ...prev, status: 'COMPLETED' } : prev);
        break;
      case 'TIMER_TICK':
        setTimer(d.secondsRemaining as number);
        break;
    }
  }, [queryClient]);

  useSse(auction?.id ?? null, handleEvent);

  // Timer countdown
  useEffect(() => {
    if (timer <= 0 || auction?.status !== 'LIVE') return;
    const interval = setInterval(() => setTimer(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(interval);
  }, [timer, auction?.status]);

  const timerColor = timer > 15 ? 'success' : timer > 5 ? 'warning' : 'error';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h4">Live Auction</Typography>
        {auction && <Chip label={auction.status} color={auction.status === 'LIVE' ? 'error' : 'default'} />}
      </Box>

      <Grid container spacing={3}>
        {/* Current Player */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ minHeight: 300 }}>
            <CardContent>
              {auction?.currentPlayerName ? (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" gutterBottom>{auction.currentPlayerName}</Typography>
                  <Typography variant="h5" color="text.secondary">Base: {auction.currentBasePrice} CR</Typography>
                  {auction.currentHighestBid && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="h4" color="primary">{auction.currentHighestBid} CR</Typography>
                      <Typography color="text.secondary">by {auction.currentHighestBidTeam}</Typography>
                    </Box>
                  )}
                  <Box sx={{ mt: 3, mx: 'auto', maxWidth: 400 }}>
                    <Typography variant="h2" sx={{ color: timerColor === 'error' ? '#F44336' : timerColor === 'warning' ? '#f59e0b' : '#4CAF50' }}>
                      {timer}s
                    </Typography>
                    <LinearProgress variant="determinate" value={(timer / (auction.timerSeconds || 30)) * 100} color={timerColor as any} sx={{ height: 8, borderRadius: 4 }} />
                  </Box>
                  {canBid && auction.status === 'LIVE' && (
                    <Button variant="contained" size="large" color="primary" sx={{ mt: 3, px: 6, py: 2, fontSize: '1.2rem' }}
                      onClick={() => { /* find user's team and bid */ }}>
                      BID
                    </Button>
                  )}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 250 }}>
                  <Typography variant="h5" color="text.secondary">Waiting for next player...</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Bid Log */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ maxHeight: 400, overflow: 'auto' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Activity</Typography>
              {bidLog.map((log, i) => (
                <Typography key={i} variant="body2" sx={{ py: 0.5, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{log}</Typography>
              ))}
              {bidLog.length === 0 && <Typography color="text.secondary">No activity yet</Typography>}
            </CardContent>
          </Card>
        </Grid>

        {/* Team Budgets */}
        <Grid size={12}>
          <Typography variant="h6" gutterBottom>Team Purses</Typography>
          <Grid container spacing={2}>
            {teams.map((team) => (
              <Grid size={{ xs: 6, md: 2.4 }} key={team.id}>
                <Card sx={{ borderTop: `3px solid ${team.color}` }}>
                  <CardContent sx={{ textAlign: 'center', py: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: team.color }}>{team.shortName}</Typography>
                    <Typography variant="h6">{team.budget} CR</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/AuctionPage.tsx
git commit -m "feat: add live auction page with SSE, timer, bid log, and team purses"
```

---

### Task 21: Admin Page (League, Team, Player Management + Auction Controls)

**Files:**
- Create: `frontend/src/pages/AdminPage.tsx`

- [ ] **Step 1: Create AdminPage**

```tsx
// frontend/src/pages/AdminPage.tsx
import { useState } from 'react';
import { Typography, Box, Tabs, Tab, Card, CardContent, Button, Table, TableHead, TableRow, TableCell, TableBody, TextField, Grid, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLeagues, createLeague } from '../api/leagues';
import { getTeams } from '../api/teams';
import { getPlayers } from '../api/players';
import * as auctionApi from '../api/auctions';
import { League } from '../types';

export default function AdminPage() {
  const [tab, setTab] = useState(0);
  const queryClient = useQueryClient();

  const { data: leagues } = useQuery({ queryKey: ['leagues'], queryFn: getLeagues });
  const activeLeague = leagues?.find(l => l.status !== 'COMPLETED') ?? leagues?.[0];
  const { data: teams } = useQuery({
    queryKey: ['teams', activeLeague?.id],
    queryFn: () => getTeams(activeLeague!.id),
    enabled: !!activeLeague,
  });
  const { data: players } = useQuery({
    queryKey: ['allPlayers', activeLeague?.id],
    queryFn: () => getPlayers(activeLeague!.id),
    enabled: !!activeLeague,
  });

  // League creation
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [newLeague, setNewLeague] = useState({ name: '', season: '', teamBudget: 100, maxPlayersPerTeam: 35, bidIncrement: 0.5, timerSeconds: 30, maxRetentionsPerTeam: 5, retentionCost: 10 });
  const createLeagueMut = useMutation({
    mutationFn: () => createLeague(newLeague as any),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leagues'] }); setShowCreateLeague(false); },
  });

  // Auction controls
  const [auctionId, setAuctionId] = useState<number | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  const createAuctionMut = useMutation({ mutationFn: () => auctionApi.createAuction(activeLeague!.id), onSuccess: (a) => setAuctionId(a.id) });
  const startMut = useMutation({ mutationFn: () => auctionApi.startAuction(auctionId!) });
  const advanceMut = useMutation({ mutationFn: () => auctionApi.advanceToLive(auctionId!) });
  const putUpMut = useMutation({ mutationFn: () => auctionApi.putUpPlayer(auctionId!, Number(selectedPlayerId)) });
  const soldMut = useMutation({ mutationFn: () => auctionApi.soldPlayer(auctionId!) });
  const pauseMut = useMutation({ mutationFn: () => auctionApi.pauseAuction(auctionId!) });
  const resumeMut = useMutation({ mutationFn: () => auctionApi.resumeAuction(auctionId!) });
  const draftMut = useMutation({ mutationFn: () => auctionApi.switchToDraft(auctionId!) });
  const completeMut = useMutation({ mutationFn: () => auctionApi.completeAuction(auctionId!) });

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Admin Panel</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Leagues" />
        <Tab label="Teams" />
        <Tab label="Players" />
        <Tab label="Auction Control" />
      </Tabs>

      {/* Leagues Tab */}
      {tab === 0 && (
        <Box>
          <Button variant="contained" onClick={() => setShowCreateLeague(true)} sx={{ mb: 2 }}>Create League</Button>
          <Table>
            <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Season</TableCell><TableCell>Status</TableCell><TableCell>Budget</TableCell></TableRow></TableHead>
            <TableBody>
              {leagues?.map(l => (
                <TableRow key={l.id}><TableCell>{l.name}</TableCell><TableCell>{l.season}</TableCell><TableCell>{l.status}</TableCell><TableCell>{l.teamBudget} CR</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
          <Dialog open={showCreateLeague} onClose={() => setShowCreateLeague(false)}>
            <DialogTitle>Create League</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={6}><TextField fullWidth label="Name" value={newLeague.name} onChange={e => setNewLeague({ ...newLeague, name: e.target.value })} /></Grid>
                <Grid size={6}><TextField fullWidth label="Season" value={newLeague.season} onChange={e => setNewLeague({ ...newLeague, season: e.target.value })} /></Grid>
                <Grid size={6}><TextField fullWidth label="Team Budget" type="number" value={newLeague.teamBudget} onChange={e => setNewLeague({ ...newLeague, teamBudget: Number(e.target.value) })} /></Grid>
                <Grid size={6}><TextField fullWidth label="Bid Increment" type="number" value={newLeague.bidIncrement} onChange={e => setNewLeague({ ...newLeague, bidIncrement: Number(e.target.value) })} /></Grid>
                <Grid size={6}><TextField fullWidth label="Timer (seconds)" type="number" value={newLeague.timerSeconds} onChange={e => setNewLeague({ ...newLeague, timerSeconds: Number(e.target.value) })} /></Grid>
                <Grid size={6}><TextField fullWidth label="Max Players/Team" type="number" value={newLeague.maxPlayersPerTeam} onChange={e => setNewLeague({ ...newLeague, maxPlayersPerTeam: Number(e.target.value) })} /></Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowCreateLeague(false)}>Cancel</Button>
              <Button variant="contained" onClick={() => createLeagueMut.mutate()}>Create</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {/* Teams Tab */}
      {tab === 1 && (
        <Table>
          <TableHead><TableRow><TableCell>Team</TableCell><TableCell>Short</TableCell><TableCell>Color</TableCell><TableCell>Owner</TableCell><TableCell>Budget</TableCell></TableRow></TableHead>
          <TableBody>
            {teams?.map(t => (
              <TableRow key={t.id}>
                <TableCell sx={{ color: t.color }}>{t.name}</TableCell>
                <TableCell>{t.shortName}</TableCell>
                <TableCell><Box sx={{ width: 20, height: 20, bgcolor: t.color, borderRadius: '50%' }} /></TableCell>
                <TableCell>{t.ownerName ?? '-'}</TableCell>
                <TableCell>{t.budget} CR</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Players Tab */}
      {tab === 2 && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Total: {players?.length ?? 0} players</Typography>
          <Table size="small">
            <TableHead><TableRow><TableCell>#</TableCell><TableCell>Name</TableCell><TableCell>Category</TableCell><TableCell>Team</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
            <TableBody>
              {players?.map(p => (
                <TableRow key={p.id}><TableCell>{p.playerNumber ?? '-'}</TableCell><TableCell>{p.name}</TableCell><TableCell>{p.category}</TableCell><TableCell>{p.teamName ?? '-'}</TableCell><TableCell>{p.status}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Auction Control Tab */}
      {tab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Auction Controls</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <Button variant="contained" onClick={() => createAuctionMut.mutate()} disabled={!!auctionId}>Create Auction</Button>
              <Button variant="contained" color="success" onClick={() => startMut.mutate()} disabled={!auctionId}>Start (Retention)</Button>
              <Button variant="contained" onClick={() => advanceMut.mutate()} disabled={!auctionId}>Advance to Live</Button>
              <Button variant="contained" color="warning" onClick={() => pauseMut.mutate()} disabled={!auctionId}>Pause</Button>
              <Button variant="contained" color="success" onClick={() => resumeMut.mutate()} disabled={!auctionId}>Resume</Button>
              <Button variant="contained" onClick={() => draftMut.mutate()} disabled={!auctionId}>Switch to Draft</Button>
              <Button variant="contained" color="error" onClick={() => completeMut.mutate()} disabled={!auctionId}>Complete</Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField size="small" label="Player ID" value={selectedPlayerId} onChange={e => setSelectedPlayerId(e.target.value)} sx={{ width: 150 }} />
              <Button variant="contained" onClick={() => putUpMut.mutate()} disabled={!auctionId || !selectedPlayerId}>Put Up Player</Button>
              <Button variant="contained" color="secondary" onClick={() => soldMut.mutate()} disabled={!auctionId}>Mark Sold/Unsold</Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/AdminPage.tsx
git commit -m "feat: add admin page with league, team, player management and auction controls"
```

---

### Task 22: Final Wiring — Clean Up and Verify

**Files:**
- Modify: `frontend/src/App.css` (delete contents)
- Delete default Vite boilerplate files if present

- [ ] **Step 1: Clean up default Vite files**

Delete `frontend/src/App.css` contents, delete `frontend/src/index.css` contents (keep files but empty them), remove `frontend/src/assets/react.svg` if present.

- [ ] **Step 2: Verify frontend compiles**

```bash
cd /Users/siddarthreddy/FunApp/RPL/frontend && npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Verify backend compiles**

```bash
cd /Users/siddarthreddy/FunApp/RPL/backend && ./mvnw compile -q
```
Expected: BUILD SUCCESS

- [ ] **Step 4: Start both services and verify**

Terminal 1:
```bash
cd /Users/siddarthreddy/FunApp/RPL/backend && ./mvnw spring-boot:run
```

Terminal 2:
```bash
cd /Users/siddarthreddy/FunApp/RPL/frontend && npm run dev
```

Verify:
- Backend: `curl http://localhost:8080/api/leagues` returns league data
- Frontend: `http://localhost:3000` loads the dashboard
- Login with admin/admin123 works

- [ ] **Step 5: Final commit**

```bash
cd /Users/siddarthreddy/FunApp/RPL
git add -A
git commit -m "feat: complete RPL platform with frontend and backend wiring"
```

---

## Summary

| Sub-project | Tasks | What It Delivers |
|------------|-------|-----------------|
| 1: Backend Domain | Tasks 1-8 | League, Team, Player entities with CRUD APIs + seed data |
| 2: Backend Auction | Tasks 9-12 | Auction engine, bidding, retention, draft, SSE streaming |
| 3: Frontend Scaffold | Tasks 13-19 | React PWA with auth, routing, theme, directory pages |
| 4: Frontend Auction + Admin | Tasks 20-22 | Live auction page, admin controls, final wiring |
