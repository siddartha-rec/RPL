# RPL — End-to-End Flows

Reference for every user-facing + system-facing flow in the platform. Each flow lists trigger, actors, backend endpoints, key tables touched, and side effects.

---

## 1. Auth — Login

**Trigger:** user submits username/password on `/login`.
**Steps:**
1. `POST /api/auth/login` → `AuthController` → `AuthService.login` → BCrypt verify against `users.password_hash`.
2. Returns JWT (`accessToken`) + refresh token.
3. Frontend stores token in axios interceptor (`api/client.ts`).

**Tables:** `users`, `permission_groups`, `permissions`.

---

## 2. Auth — Token refresh

**Trigger:** axios response interceptor catches 401.
**Steps:**
1. `POST /api/auth/refresh` with refresh token → returns fresh `accessToken`.
2. Original request retried.

---

## 3. CricHeroes — Tournament import (full)

**Trigger:** Admin → Leagues tab → "Import from CricHeroes" → paste tournament URL.
**Steps:**
1. (Optional pre-check) `POST /api/cricheroes/import/check` with URL → returns whether tournament already imported.
2. `POST /api/cricheroes/import/tournament` body `{tournamentUrl, leagueId?, seasonDisplayName?, overrideExisting?}` → returns `{jobId}` (HTTP 202).
3. `@Async` worker runs `CricheroesImportService.runTournamentImport`:
   1. `CricheroesScraperService.scrapeTournament(url)` — hits `/tournament/{id}/{slug}/matches/past-matches` + `/teams`, parses `__NEXT_DATA__` JSON.
   2. `upsertLeague`: find by `cricheroes_id` (any state); if found, revive (set `archived=false`) + update; else create new with status=COMPLETED, default budget=0.
   3. If `overrideExisting=true` → `purgeLeagueTournamentData(leagueId)` (see flow 10).
   4. For each cricheroes team id: `scrapeTeam` (`/team-profile/{id}/x/members`) → upsert Team `(cricheroes_id, league_id)` → upsert each Player same way; link `team_id`, set source=CRICHEROES, status=SOLD, soldPrice=0.
   5. For each match in tournament: skip if `matches.cricheroes_id` already exists; else `scrapeScorecard` (`/scorecard/{id}/{tslug}/{mslug}/scorecard`) → upsert Match → persist 2 Innings + per-player BattingPerformance + BowlingPerformance.
4. Frontend polls `GET /api/cricheroes/import/{jobId}` every 1.5s until status COMPLETED/FAILED.

**Throttle:** 1s between cricheroes HTTP fetches; retry on 429/503.
**Tables:** `leagues`, `teams`, `players`, `matches`, `innings`, `batting_performances`, `bowling_performances`.

---

## 4. CricHeroes — Granular import (single team / match)

**Trigger:** internal/manual recovery; not yet wired to UI.
**Endpoints:**
- `POST /api/cricheroes/import/team` body `{cricheroesTeamId, leagueId}` → upserts that team + roster only.
- `POST /api/cricheroes/import/match` body `{cricheroesMatchId, tournamentSlug?, matchSlug?, leagueId, force?}` → imports one scorecard. `force=true` wipes existing innings/perf for that match first.

---

## 5. League — Create (manual)

**Trigger:** Admin → Leagues tab → "Create League".
**Steps:**
1. `POST /api/leagues` body `{name, season, seasonDisplayName, teamBudget, maxPlayersPerTeam, ...}` → `LeagueController.create` → `LeagueService.create`.
2. Validates uniqueness (`existsBySeasonAndArchivedFalse`).
3. Inserts row, status=SETUP.

---

## 6. League — Update / Delete (archive)

- **Update:** `PUT /api/leagues/{id}` — fields editable.
- **Delete (archive):** `DELETE /api/leagues/{id}` → soft-delete (`@SQLDelete` flips `archived=true`). UI still shows confirm dialog requiring season string. Archived leagues hidden from `/api/leagues` list (filtered by `@Where(archived=false)`).

> Note: pre-archive era of imports may have left cross-league references. Override re-import (flow 10) handles them defensively.

---

## 7. Team — Create / Update / Archive

**Trigger:** Admin Teams tab.
- `POST /api/leagues/{leagueId}/teams` — create.
- `PUT /api/teams/{id}` — update.
- `DELETE /api/teams/{id}` — soft archive.
- `GET /api/leagues/{leagueId}/teams` — list active.

---

## 8. Player — Create / Update / Archive / Bulk import

- `POST /api/leagues/{leagueId}/players` — create one.
- `POST /api/leagues/{leagueId}/players/import` — CSV bulk import.
- `PUT /api/players/{id}` — update.
- `DELETE /api/players/{id}` — soft archive.
- `GET /api/leagues/{leagueId}/players` (full) / `/page` (paginated, filter by category/status/team/search).

**Player composite UNIQUE:** `(cricheroes_id, league_id)` — same cricheroes person can have one row per league.

---

## 9. Auction — Lifecycle

**State machine (Auction.status):** `NOT_STARTED → RETENTION → LIVE → DRAFT → COMPLETED`. Side branches: `PAUSED`, `ABANDONED`.

**Endpoints:**
1. `POST /api/leagues/{leagueId}/auctions` — create auction (one per league).
2. `PUT /api/auctions/{id}/start` — move NOT_STARTED → RETENTION.
3. `POST /api/auctions/{id}/retention/pick` body `{playerId}` — capture retention pick (creates DraftPick + PlayerHistory).
4. `PUT /api/auctions/{id}/advance-to-live` — RETENTION → LIVE.
5. **Live bid loop** (per player):
   1. `PUT /api/auctions/{id}/next-player/{playerId}` — put player up.
   2. `POST /api/auctions/{id}/bid` body `{teamId}` — place bid (auto-increments by `league.bidIncrement`).
   3. `PUT /api/auctions/{id}/sold` — finalize sale to highest bidder.
   4. `PUT /api/auctions/{id}/unsold` — mark unsold.
   5. `PUT /api/auctions/{id}/undo-bid` — revert last bid.
6. `PUT /api/auctions/{id}/pause` / `/resume` — toggle PAUSED.
7. `PUT /api/auctions/{id}/switch-to-draft` — LIVE → DRAFT (for unsold/remaining players).
8. `POST /api/auctions/{id}/draft/pick` body `{playerId}` — current pick team selects.
9. `GET /api/auctions/{id}/completion-check` — pre-flight before complete (verifies min players per team etc.).
10. `PUT /api/auctions/{id}/complete?force=true` — DRAFT → COMPLETED.

**Streaming:** `GET /api/auctions/{id}/stream` (SSE) — live bid feed for spectators.

**Tables:** `auctions`, `bids`, `draft_picks`, `players`, `teams`, `team_standings`, `player_history`.

---

## 10. CricHeroes — Override / Re-import purge

**Trigger:** override flag in tournament import (flow 3) or manual via UI confirm.
**Order (FK-safe):**
1. Find league's matches → cascade delete: batting/bowling perf (by `innings_id`) → innings → matches.
2. Find league's auctions → delete: bids → draft_picks → auctions.
3. Delete `player_history`, `team_standings` by league_id.
4. **Cross-league legacy cleanup** (defensive, no-op for clean DBs):
   - Find this league's team_ids → delete cross-league innings referencing those teams (perf rows first) → delete cross-league matches → delete orphan players linked by `team_id`.
5. Delete batting/bowling perf by player_id (catches stale cross-league refs to our players).
6. Hard delete players + teams scoped to league_id.

**Why this order matters:** legacy DBs from before composite UNIQUE migration may have shared cricheroes_id rows pointing across leagues. Step 4–5 cleans residual FK refs.

---

## 11. UI — Dashboard

**Trigger:** user logs in, lands on `/`.
- Season selector (active league pills).
- Aggregates: total teams, total players, budget spent, recent auction events.
- Leaderboards: top spenders, captain list.

---

## 12. UI — Teams page

- Lists teams in selected season.
- Click team → `/teams/:id` detail (roster, budget, captain, recent buys).

---

## 13. UI — Players page

- Paginated, filterable (category, status, team, search).
- Edit/delete per row (admin role).

---

## 14. UI — Results page

- Match results from cricheroes import.
- Per-match scorecard view: innings totals, top performers.
- Filterable by season.

---

## 15. UI — History page

- Auction event log: who bid/sold/retained/drafted what when.
- Source: `audit_logs` + `player_history`.

---

## 16. Audit log

**Trigger:** every mutating service action (create/update/delete on leagues, teams, players, auctions, bids).
**Implementation:** AOP `@Audited` annotation → `AuditAspect` → write to `audit_logs` (entity_type, entity_id, action, user_id, details JSON, ip).
**Read:** `GET /api/audit-logs?entityType=&userId=` (paginated).

---

## 17. RBAC — Permission check

**Trigger:** any authenticated request hitting non-public endpoint.
1. `JwtAuthFilter` extracts user_id from token, loads user.
2. Spring Security checks granted authorities (joined from `permission_groups` → `permissions`).
3. Endpoints under `/api/auth/*` and `GET /api/leagues|/api/teams|/api/players` are public; rest require auth.

**Roles seeded:** Super Admin, League Admin (extensible).

---

## Schema cross-reference

```
leagues  ← teams ← players ← batting_perf
                      ↓        bowling_perf
                  team_standings   ↑
                                innings ← matches
auctions → bids                               ↓
        → draft_picks                         league_id
player_history → players, leagues
audit_logs (generic, no FK)
```

UNIQUE constraints:
- `leagues.cricheroes_id` — global UNIQUE
- `teams.(cricheroes_id, league_id)` — composite
- `teams.(name, league_id)` — composite
- `players.(cricheroes_id, league_id)` — composite
- `matches.cricheroes_id` — global UNIQUE
- `team_standings.(team_id, league_id)` — composite
- `innings.(match_id, innings_number)` — composite

Soft delete (`archived` boolean + `@Where(archived=false)`): League, Team, Player, Match, Auction.

---

## Pending / future flows

- Phase 2a: Stats pages (Most Runs, Best Bowling, etc.) — derived aggregations on `batting_performances` / `bowling_performances`.
- Phase 2a: Points table populator (compute W/L/Points from match results into `team_standings`).
- Phase 2b: Commentary (ball-by-ball) — new `overs` + `balls` tables.
- Phase 2b: Gallery — new `media` table.
- Phase 2c: Squads (per-match playing XI) — new `match_squad` join.
- Tournament parent entity (brand grouping over Leagues).
