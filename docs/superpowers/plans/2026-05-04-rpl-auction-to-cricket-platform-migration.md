# RPL Migration Plan: Auction Platform -> Cricket Product Platform

**Date:** 2026-05-04  
**Prepared for:** RPL codebase evolution toward CricHeroes/Cricbuzz-style product model  
**Scope:** Backend domain/API evolution, frontend information architecture, phased delivery plan

---

## 1. Objective

Transform the current auction-first platform into a cricket product platform aligned to this HLD:

- `Tournament/`
  - `Season / Leagues/`
    - `Matches/`
      - `Info / Summary`
      - `Commentary`
      - `Score card`
      - `Squads`
      - `Heroes`
      - `MVP`
      - `Gallery`
    - `Points table`
    - `Stats/`
      - `Batting/*`
      - `Bowling/*`
    - `Teams/Players/Stats`
    - `Gallery`
    - `Auction`

Auction should remain a bounded capability, not the top-level domain driver.

---

## 2. Current-State Assessment (as of 2026-05-04)

### 2.1 What is already strong

- Auction workflow is production-grade: lifecycle states, bidding controls, SSE stream, bid/sold/unsold flow.
- League/Team/Player CRUD exists and is integrated with auth + RBAC + audit.
- CricHeroes import pipeline exists (tournament/team/match import + progress tracking).

### 2.2 What exists but is not yet productized

- Match, Innings, BattingPerformance, BowlingPerformance entities are present in backend data layer.
- Imported scorecard data is persisted.
- Standings API exists but is manual-entry oriented.

### 2.3 What is missing for target HLD

- No explicit `Tournament` aggregate.
- No first-class match experience APIs for: summary, scorecard, squads, commentary, heroes, MVP, gallery.
- No leaderboard/stat APIs for batting and bowling categories in HLD.
- No frontend pages centered on match consumption and stats discovery.
- Limited automated tests for non-auth domains.

---

## 3. Domain Mapping: Current vs Target

### 3.1 Current top-level domain

- `League` is acting as both season container and tournament context.

### 3.2 Target top-level domain

- Introduce explicit hierarchy:
  - `Tournament` (brand/competition identity)
  - `Season` (time-bound edition)
  - `League` (optional subdivision if required by business)

### 3.3 Decision required

Pick one canonical model and enforce everywhere:

- Option A: `Tournament -> Season` (drop/rename League in product language)
- Option B: `Tournament -> Season -> League` (retain League as competition unit)

Until this decision is fixed, API design and UI nav will keep drifting.

---

## 4. Migration Principles

- Preserve existing auction behavior and APIs during transition.
- Add new read-heavy cricket APIs first; move UI after contract stability.
- Keep CricHeroes integration as an adapter/source connector, not as core business model.
- Add idempotent import/sync and backfill strategy before scale-up.
- Apply backward-compatible schema/API changes where possible.

---

## 5. Phased Execution Plan

## Phase 0: Foundation Decisions and Modeling

- [ ] Freeze canonical domain vocabulary (`Tournament`, `Season`, `League`).
- [ ] Publish target ERD and migration notes from current schema.
- [ ] Define API namespace strategy (`/api/tournaments/*`, `/api/seasons/*`, `/api/matches/*`, `/api/stats/*`).
- [ ] Define data ownership: imported vs curated vs computed fields.

## Phase 1: Data Model Evolution

- [ ] Add `Tournament` entity/table.
- [ ] Add `Season` entity/table with FK to `Tournament`.
- [ ] Re-scope current `League` to chosen model (retain, repurpose, or merge).
- [ ] Add `MatchMeta` fields for hero/MVP/result summary if not derivable.
- [ ] Add media entities for league/match galleries.
- [ ] Create migration scripts and backfill mappings for existing `leagues` rows.

## Phase 2: Match & Competition Read APIs

- [ ] `GET /.../matches` (by season/league; upcoming/live/completed filters).
- [ ] `GET /matches/{id}/summary`.
- [ ] `GET /matches/{id}/scorecard`.
- [ ] `GET /matches/{id}/squads`.
- [ ] `GET /matches/{id}/heroes` and `GET /matches/{id}/mvp`.
- [ ] `GET /.../points-table`.
- [ ] `GET /.../gallery` and `GET /matches/{id}/gallery`.

## Phase 3: Stats Engine + Leaderboards

- [ ] Build aggregation queries/materialized views for batting leaderboards:
  - Most Runs, Highest Score, Best Average, Best Strike Rate, Most 100s, Most 50s, Most 4s, Most 6s.
- [ ] Build aggregation queries/materialized views for bowling leaderboards:
  - Most Wickets, Best Average, Best Figures, Most 5W, Best Economy, Best Strike Rate.
- [ ] Expose read APIs under `/api/stats/batting/*` and `/api/stats/bowling/*`.
- [ ] Add consistency checks for innings-level and aggregate-level stats.

## Phase 4: Frontend Information Architecture Migration

- [ ] Introduce top navigation: Tournament -> Season/League.
- [ ] Add pages:
  - Matches hub
  - Match detail tabs (Summary, Scorecard, Squads, Heroes/MVP, Gallery)
  - Points table
  - Stats hub (Batting/Bowling leaderboards)
  - Team detail with player stats
- [ ] Keep existing Auction page under Season/League section as one module.
- [ ] Add graceful empty/loading/error states for imported competitions.

## Phase 5: Ingestion Hardening and Sync

- [ ] Convert one-shot import to managed sync jobs (incremental + reimport).
- [ ] Add source provenance + last-synced timestamps.
- [ ] Add duplicate detection and reconciliation rules for teams/players.
- [ ] Add operational dashboards for import failures and data quality.

## Phase 6: Quality, Security, and Release

- [ ] Add integration tests for match and stats APIs.
- [ ] Add contract tests for mobile/web consumers.
- [ ] Add performance tests for leaderboard and scorecard endpoints.
- [ ] Review RBAC for new read/write surfaces.
- [ ] Release by feature flags and route-level progressive rollout.

---

## 6. Backward Compatibility Strategy

- Keep all existing auction endpoints intact during Phases 0-4.
- Introduce new APIs in parallel; deprecate only after client migration.
- Maintain existing admin import UX while adding new discovery surfaces.

---

## 7. Key Risks and Mitigations

- Domain ambiguity (`League` vs `Season`):
  - Mitigation: finalize vocabulary before schema/API work.
- Import data inconsistency from external source:
  - Mitigation: provenance tracking + idempotent upserts + reconciliation rules.
- Query performance degradation for stats:
  - Mitigation: pre-aggregations/materialized views and indexed filters.
- Regression in auction flows while refactoring:
  - Mitigation: isolate auction bounded context and expand test coverage before migration.

---

## 8. Definition of Done (Program-Level)

- HLD nodes are represented as first-class APIs and frontend routes.
- Users can browse tournaments/seasons, matches, scorecards, points table, and leaderboards without admin tools.
- Auction remains functional as a submodule within season/league.
- Import/sync is reliable and observable.
- Test suite covers critical domain behaviors beyond authentication.

---

## 9. Immediate Next Sprint (Suggested)

- [ ] Finalize domain decision (`Tournament -> Season` vs `Tournament -> Season -> League`).
- [ ] Publish target ERD and migration SQL draft.
- [ ] Deliver first read API slice:
  - list matches
  - match summary
  - match scorecard
- [ ] Add frontend `Matches` page consuming above APIs.

