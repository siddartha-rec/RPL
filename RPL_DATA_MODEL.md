# RPL — Data Model Reference

**Recykal Premier League (RPL)**
This document describes the entities the platform stores, how they relate to
each other, and the enums that drive their state. It is meant to be readable
by anyone — a PM should be able to follow the relationships, an engineer
should be able to map every field to code. Where a technical name matters,
it's mentioned in parentheses so the two audiences can meet in the middle.

The entities below are the Java/JPA classes under
`backend/src/main/java/com/rpl/auction/**/entity/`. Each one is also a
table in MySQL. Field names in this doc are the Java property names; the
column name only appears when it differs (e.g. `passwordHash` →
`password_hash`).

---

## 1. The Big Picture

At the centre of the system is a **League** (one season of RPL — e.g. "RPL
2025"). Everything else hangs off it: the **Teams** that compete, the
**Players** who get bought, and the **Auction** that runs the bidding.

Identity (who's logged in, what they're allowed to do) lives in its own
corner — **Users**, **Permission Groups**, **Permissions**, **Modules** —
and connects to the rest of the system only through the team owner field
and the audit log.

```
                          +----------------+
                          |    League      |   one row per season
                          |  (leagues)     |
                          +-------+--------+
                                  |
              +-------------------+-------------------+
              |                   |                   |
              v                   v                   v
        +-----------+       +-----------+       +-------------+
        |   Team    |<------|  Player   |       |   Auction   |
        | (teams)   |  team | (players) |       | (auctions)  |
        +-----+-----+  _id  +-----+-----+       +------+------+
              |                   |                    |
              | owner_id          | player_id          | auction_id
              v                   v                    v
        +-----------+       +----------------+   +-----------+
        |   User    |       | PlayerHistory  |   |    Bid    |
        | (users)   |       |(player_history)|   |  (bids)   |
        +-----+-----+       +----------------+   +-----------+
              |                                        ^
              | many-to-many                           |
              v                                        |
        +------------------+                    +-------------+
        | PermissionGroup  |                    | DraftPick   |
        |(permission_groups)|                   |(draft_picks)|
        +--------+---------+                    +-------------+
                 | many-to-many
                 v
        +--------------+        +-----------+
        | Permission   +------->|  Module   |
        |(permissions) |  many- |(modules)  |
        +--------------+  to-1  +-----------+

  Floating off the side, never owned by anything:

        +-----------+        +----------------+
        | AuditLog  |        |  RefreshToken  |
        |(audit_logs)|       |(refresh_tokens)|
        +-----------+        +----------------+
```

A **TeamStanding** row also exists per team-per-league, holding final-
ranking placeholder data (see section 4).

---

## 2. Core Domain Entities

These are the things the auction operates on: leagues, teams, and players.

### 2.1 League (`League.java`, table `leagues`)

**Purpose.** A league is one season of RPL (e.g. "Recykal Premier League"
season "2025"). It owns the rules — how big budgets are, how many players
each team must have, how long the bidding timer runs. Everything else in
the auction is scoped to a league.

**Key fields.**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `Long` | Primary key. |
| `name` | `String(100)`, not null | Display name, e.g. "Recykal Premier League". |
| `season` | `String(20)`, not null | Season label, e.g. "2025". |
| `status` | `LeagueStatus`, not null | Lifecycle — see enum below. Defaults to `SETUP`. |
| `teamBudget` | `BigDecimal(12,2)`, not null | Each team's purse for the auction (in CR). |
| `maxPlayersPerTeam` | `Integer`, not null | Hard cap on roster size. |
| `minPlayersPerTeam` | `Integer`, not null, default `15` | Lower bound used by the completion check. |
| `minWomenPerTeam` | `Integer`, not null, default `2` | Lower bound on female players per team. |
| `maxRetentionsPerTeam` | `Integer`, not null, default `0` | How many players a team can lock in before live bidding. |
| `retentionCost` | `BigDecimal(12,2)`, default `0` | Flat cost charged to a team per retention (if any). |
| `bidIncrement` | `BigDecimal(12,2)`, not null | The step size between consecutive bids (e.g. 0.5 CR). |
| `timerSeconds` | `Integer`, not null, default `30` | Countdown length per player on the live page. |
| `createdAt` / `updatedAt` | `Instant` | Audit timestamps. |

**Enum — `League.LeagueStatus`.**

| Value | Meaning |
| --- | --- |
| `SETUP` | The league is being configured. Teams and players can be added; the auction has not run yet. |
| `ACTIVE` | The auction is running or has run; the league is in-flight. |
| `COMPLETED` | The auction has been finalised and the league is closed. |

**Relationships.**

- **Has many Teams** (a `Team` row points at its league via `league_id`).
- **Has many Players** (a `Player` row points at its league via
  `league_id`).
- **Has one Auction** (the `auctions` table has a `league_id` column;
  there's no enforced uniqueness in the entity, but the application treats
  one league as having one auction).
- Note: `PermissionGroup` also has an optional `league_id` so that
  league-scoped roles ("Owner of the Tigers, RPL 2025") can exist
  alongside global roles.

---

### 2.2 Team (`Team.java`, table `teams`)

**Purpose.** A team belongs to a league, has an owner, a budget, a set of
identifying labels (name, short name, colour, logo), and gradually fills up
with players as the auction runs.

**Key fields.**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `Long` | Primary key. |
| `name` | `String(100)`, not null | Full team name. Unique within a league. |
| `shortName` (`short_name`) | `String(10)`, not null | Three-or-four-letter abbreviation, e.g. "TIG". |
| `color` | `String(7)` | CSS hex colour for branding (e.g. `#E63946`). |
| `logoUrl` (`logo_url`) | `String` | Pointer to the team crest. |
| `captainId` (`captain_id`) | `Long` | Soft reference to the captain `Player` — not a JPA foreign key, just a column. |
| `owner` | `User`, FK `owner_id` | Many-to-one to the user who owns this team. |
| `league` | `League`, FK `league_id`, not null | The league this team plays in. |
| `budget` | `BigDecimal(12,2)`, not null | Total purse this team starts with (typically copied from `League.teamBudget`). |
| `budgetSpent` (`budget_spent`) | `BigDecimal(12,2)`, default `0` | Running total of money committed to retentions, drafts, and won bids. |
| `createdAt` / `updatedAt` | `Instant` | Audit timestamps. |

**Constraints.** A unique constraint on `(name, league_id)` means two teams
in the same league can't share a name, but the same name can repeat across
seasons.

**Relationships.**

- **Belongs to a League** (`league_id`, eager-fetched lazily).
- **Belongs to a User as owner** (`owner_id`, optional — a team can exist
  without an owner record being attached).
- **Has many Players** (the `players` table has a `team_id` column).
- **Has many Bids** (a `Bid` carries a `team_id`).
- **Has many DraftPicks** (a `DraftPick` carries a `team_id`).
- **Has many PlayerHistory rows** (one per player acquired).
- **Has at most one TeamStanding per league** (uniqueness enforced).

**Ambiguity worth flagging.** `captainId` is a plain `Long` column, not a
JPA association — the application uses it like a foreign key but the
database does not enforce it. If a captain player is deleted, the column
can become a dangling reference.

---

### 2.3 Player (`Player.java`, table `players`)

**Purpose.** A player belongs to a league, optionally to a team, and moves
through a status lifecycle (`AVAILABLE → SOLD / RETAINED / UNSOLD`) as the
auction runs.

**Key fields.**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `Long` | Primary key. |
| `name` | `String(100)`, not null | Player's display name. |
| `playerNumber` (`player_number`) | `Integer` | Optional jersey / catalogue number. |
| `category` | `PlayerCategory`, not null | See enum. |
| `role` | `String(50)` | Free-text role (e.g. "All-rounder"). |
| `gender` | `Gender` | See enum. Used for the `minWomenPerTeam` check. |
| `basePrice` (`base_price`) | `BigDecimal(12,2)`, default `0` | Starting bid when this player goes up. |
| `team` | `Team`, FK `team_id` | The team that owns this player after sale; null while `AVAILABLE`. |
| `league` | `League`, FK `league_id`, not null | The league the player is registered in. |
| `status` | `PlayerStatus`, not null, default `AVAILABLE` | See enum. |
| `soldPrice` (`sold_price`) | `BigDecimal(12,2)` | What the team actually paid. Null until sold. |
| `isCaptain` (`is_captain`) | `Boolean`, default `false` | Marks designated captains. |
| `createdAt` / `updatedAt` | `Instant` | Audit timestamps. |

**Enums (all defined inside `Player`).**

- `PlayerCategory` — `CRICKET`, `OTHER`. Cricketers vs. non-cricket
  participants (e.g. for cultural events bundled into the league).
- `PlayerStatus` — `AVAILABLE`, `RETAINED`, `SOLD`, `UNSOLD`.
  - `AVAILABLE` — eligible to be auctioned; not yet on a team.
  - `RETAINED` — locked in by a team during retention phase, before live
    bidding starts.
  - `SOLD` — won at live auction by the team in `team_id` for `soldPrice`.
  - `UNSOLD` — went up at auction and got no bid (or was force-unsold).
- `Gender` — `MALE`, `FEMALE`, `OTHER`.

**Relationships.**

- **Belongs to a League** (`league_id`, required).
- **Belongs to a Team** (`team_id`, optional).
- **Has many Bids** (the `bids` table has a `player_id`).
- **Has at most one PlayerHistory per acquisition event** (history rows
  accrete over multiple seasons).

---

## 3. Auction Entities

These three tables drive the live event itself: the auction state machine,
the per-bid log, and the pre-auction draft/retention picks.

### 3.1 Auction (`Auction.java`, table `auctions`)

**Purpose.** A single auction, one per league, holds the live state — what
phase the auction is in, which player is currently up, what the highest bid
ID is, and which team's turn it is during draft mode.

**Key fields.**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `Long` | Primary key. |
| `leagueId` (`league_id`) | `Long`, not null | The league this auction belongs to. |
| `status` | `AuctionStatus`, not null, default `NOT_STARTED` | The state machine — see enum. |
| `currentPlayerId` (`current_player_id`) | `Long` | The player currently on the block. |
| `currentBasePrice` (`current_base_price`) | `BigDecimal(12,2)` | The starting bid for the current player. |
| `currentHighestBidId` (`current_highest_bid_id`) | `Long` | Pointer to the winning `Bid` row right now. |
| `timerSeconds` (`timer_seconds`) | `Integer`, default `30` | Active timer length (copied from league). |
| `currentPickTeamId` (`current_pick_team_id`) | `Long` | During `DRAFT` mode, the team whose turn it is to pick. |
| `createdAt` / `updatedAt` | `Instant` | Audit timestamps. |

**Enum — `Auction.AuctionStatus`.**

The state machine the engine implements:

| Value | Meaning |
| --- | --- |
| `NOT_STARTED` | The auction has been created but nothing has happened yet. |
| `RETENTION` | Retention phase. Teams are locking in players before live bidding. No bids are taken yet; `DraftPick` rows of type `RETENTION` are written. |
| `DRAFT` | Draft phase. Teams take turns making fixed-cost picks (`DraftPick` of type `DRAFT`). `currentPickTeamId` indicates whose turn it is. |
| `LIVE` | Live bidding is on. Players go up one at a time, `Bid` rows are recorded, the timer counts down. |
| `PAUSED` | Live bidding is suspended by the auctioneer. New bids are rejected; the timer is frozen. From here you go back to `LIVE` (resume) or to `COMPLETED` (end). |
| `COMPLETED` | The auction is finalised. No further changes accepted. Reaching this state requires either passing the completion check (every team has at least `minPlayersPerTeam` players including `minWomenPerTeam` women) or an explicit `?force=true` admin override that gets stamped in the audit log. |

The conventional happy-path sequence is
`NOT_STARTED → RETENTION → DRAFT → LIVE → COMPLETED`, with `PAUSED` as a
side-trip from `LIVE`. Phases can be skipped in practice (e.g. a league
with no retentions).

**Relationships.**

- **Belongs to a League** by `leagueId` (note: this is a plain `Long`, not
  a JPA association — the entity does not declare a `@ManyToOne` to
  `League`).
- **Has many Bids** by `auction_id`.
- **Has many DraftPicks** by `auction_id`.
- **References Player** by `currentPlayerId` (soft reference).
- **References Team** by `currentPickTeamId` (soft reference, used during
  draft).
- **References Bid** by `currentHighestBidId` (soft reference).

**Ambiguity worth flagging.** Almost every cross-entity pointer on
`Auction` is a plain `Long` column rather than a JPA relation. The engine
deliberately joins through IDs in service code rather than through entity
graph traversal, presumably for performance and to keep the live state
small.

---

### 3.2 Bid (`Bid.java`, table `bids`)

**Purpose.** One row per bid placed during live bidding. Bids are append-
only — the engine never updates a bid amount in place; the highest bid is
identified by `Auction.currentHighestBidId` and by the `isWinning` flag.

**Key fields.**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `Long` | Primary key. |
| `auctionId` (`auction_id`) | `Long`, not null | The auction this bid happened in. |
| `playerId` (`player_id`) | `Long`, not null | The player being bid on. |
| `teamId` (`team_id`) | `Long`, not null | The team that placed the bid. |
| `amount` | `BigDecimal(12,2)`, not null | Bid value (in CR). |
| `bidOrder` (`bid_order`) | `Integer`, not null | The sequence number within this player's bidding round. |
| `isWinning` (`is_winning`) | `Boolean`, not null, default `false` | True for the bid that ultimately won (set when the player is sold). |
| `createdAt` | `Instant` | Server-side timestamp on insert. |

**Bid lifecycle.**

1. A team places a bid. The engine validates (auction is `LIVE`, team can
   afford the new amount, team isn't already the highest bidder, amount
   equals previous bid + `League.bidIncrement`).
2. A new `Bid` row is inserted with `isWinning = false` and the next
   `bidOrder`.
3. `Auction.currentHighestBidId` is updated to point at this row.
4. The auction timer resets.
5. When the player is sold (timer expires or admin marks sold), the
   currently-pointed bid is updated: `isWinning = true`. The corresponding
   `Player` row gets `status = SOLD`, `team_id`, and `sold_price`. The
   winning team's `budgetSpent` increases. A `PlayerHistory` row is
   written with `acquisitionType = AUCTIONED`.
6. If the player goes unsold, no bid is marked winning and the `Player`
   moves to `UNSOLD`.

**Relationships.**

- **Belongs to an Auction** (`auction_id`).
- **Belongs to a Player** (`player_id`).
- **Belongs to a Team** (`team_id`).

All three are plain `Long` columns, again — no JPA associations on `Bid`.

---

### 3.3 DraftPick (`DraftPick.java`, table `draft_picks`)

**Purpose.** A pre-auction acquisition: either a retention (a team locking
in a player they already have) or a draft pick (a team using leftover
budget to claim a player before live bidding starts). Created during
`RETENTION` and `DRAFT` phases, never during `LIVE`.

**Key fields.**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `Long` | Primary key. |
| `auctionId` (`auction_id`) | `Long`, not null | The auction this pick belongs to. |
| `playerId` (`player_id`) | `Long`, not null | The player picked. |
| `teamId` (`team_id`) | `Long`, not null | The team doing the picking. |
| `roundNumber` (`round_number`) | `Integer`, not null | Which draft round this happened in (1, 2, 3...). |
| `pickOrder` (`pick_order`) | `Integer`, not null | The pick number within the round. |
| `pickType` (`pick_type`) | `PickType`, not null | See enum. |
| `cost` | `BigDecimal(12,2)` | What the team paid for this pick. May be `League.retentionCost` for retentions, or another flat figure for draft picks. |
| `createdAt` | `Instant` | Insert timestamp. |

**Enum — `DraftPick.PickType`.**

| Value | Meaning |
| --- | --- |
| `RETENTION` | The team kept a player from a previous season or a pre-assigned roster entry. Created during `Auction.status = RETENTION`. |
| `DRAFT` | The team picked a player during the draft phase. Created during `Auction.status = DRAFT`. |

**Relationships.**

- **Belongs to an Auction**, **Player**, and **Team** by ID columns.

---

## 4. History & Standings

These are the "what happened" tables — useful after the auction, for
reporting and cross-season views.

### 4.1 PlayerHistory (`PlayerHistory.java`, table `player_history`)

**Purpose.** One row per acquisition event. Tells you, for any player and
season, which team they ended up on and how (retained, drafted, or won at
live auction). Survives even after a league closes — good for "where did
Player X play in 2025?" lookups.

**Key fields.**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `Long` | Primary key. |
| `playerId` (`player_id`) | `Long`, not null | The player. |
| `leagueId` (`league_id`) | `Long`, not null | The season this acquisition happened in. |
| `teamId` (`team_id`) | `Long`, not null | The team that got them. |
| `acquisitionType` (`acquisition_type`) | `AcquisitionType`, not null | How they were acquired — see enum. |
| `soldPrice` (`sold_price`) | `BigDecimal(12,2)` | What the team paid. Always present for `AUCTIONED`; for `RETAINED` / `DRAFTED` it's the retention or draft cost (if any). |
| `createdAt` | `Instant` | When the acquisition was recorded. |

**Enum — `PlayerHistory.AcquisitionType`.**

| Value | Meaning |
| --- | --- |
| `RETAINED` | The player was kept by their team during the retention phase. |
| `AUCTIONED` | The player was sold at live auction. |
| `DRAFTED` | The player was claimed during the draft phase. |

**Relationships.** All foreign references are plain `Long` columns:
`player_id`, `league_id`, `team_id`. No JPA associations are declared.

---

### 4.2 TeamStanding (`TeamStanding.java`, table `team_standings`)

**Purpose.** A placeholder for end-of-season rankings. The structure is in
the database but the ranking logic itself is not yet implemented (this is
foreshadowed in `RPL_JOURNEY.md` as "team standings — placeholder for end-
of-season rankings").

**Key fields.**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `Long` | Primary key. |
| `teamId` (`team_id`) | `Long`, not null | The team being ranked. |
| `leagueId` (`league_id`) | `Long`, not null | The season this ranking applies to. |
| `rank` (column `rank_position`) | `Integer`, not null | Final position (1 = champion, 2 = runner-up, ...). |
| `points` | `Integer` | Points used to derive the rank. |
| `notes` | `String` | Free-text annotations. |
| `createdAt` / `updatedAt` | `Instant` | Audit timestamps. |

**Constraints.** Unique on `(team_id, league_id)` — a team has at most
one standing per league.

**Relationships.** Soft references only, by ID.

---

## 5. Identity & Access Entities

These are the tables behind login and the "who can do what" rules. They
sit independently from the auction domain — only `Team.owner` and
`AuditLog.user_id` cross the boundary.

### 5.1 User (`User.java`, table `users`)

**Purpose.** One row per human who can log in. A user has a username, a
password hash, an email, and a set of permission groups.

**Key fields.**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `Long` | Primary key. |
| `username` | `String(100)`, not null, unique | Login handle. |
| `passwordHash` (`password_hash`) | `String`, not null | bcrypt/scrypt hash; never the plaintext password. |
| `displayName` (`display_name`) | `String(100)` | Human-readable name shown in the UI. |
| `email` | `String(150)`, unique | Email address. |
| `isActive` (`is_active`) | `Boolean`, not null, default `true` | Soft-disable switch. Inactive users can't log in. |
| `permissionGroups` | `Set<PermissionGroup>` | Many-to-many through join table `user_groups (user_id, group_id)`. |
| `createdAt` / `updatedAt` | `Instant` | Audit timestamps. |

**Relationships.**

- **Has many PermissionGroups** (M:N via `user_groups`).
- **Owns Teams** — referenced from `Team.owner_id`.
- A default admin user is seeded on first boot so the system isn't locked
  out of itself.

---

### 5.2 Module (`Module.java`, table `modules`)

**Purpose.** A grouping of permissions, roughly corresponding to a feature
area (e.g. "auction", "league", "team"). Used so permissions can be named
in the form `module:ACTION` (e.g. `auction:BID`).

**Key fields.**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `Long` | Primary key. |
| `name` | `String(100)`, not null, unique | Module identifier (e.g. `auction`, `league`). |
| `description` | `String(255)` | Human-readable explanation. |
| `permissions` | `List<Permission>` | One-to-many; cascade all + orphan removal. |

**Relationships.** Has many Permissions.

---

### 5.3 Permission (`Permission.java`, table `permissions`)

**Purpose.** A single capability — the right to do one specific thing
inside one module. The flat string form is `module.name + ":" + name`,
e.g. `auction:BID`, `league:CREATE`, `team:DELETE`.

**Key fields.**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `Long` | Primary key. |
| `module` | `Module`, FK `module_id`, not null | The module this permission belongs to. |
| `name` | `String(100)`, not null | Action name (e.g. `BID`, `CREATE`, `DELETE`). |
| `description` | `String(255)` | Human-readable explanation. |

**Constraints.** Unique on `(module_id, name)` — within a module, each
action name is unique.

**Helper.** `toFlatString()` returns `"<module>:<name>"`, the form used in
JWT claims and in code that checks "has permission".

**Relationships.** Belongs to a Module. Belongs (M:N) to many
PermissionGroups via the join table `group_permissions`.

---

### 5.4 PermissionGroup (`PermissionGroup.java`, table `permission_groups`)

**Purpose.** A bundle of permissions assigned together — what most systems
call a "role". E.g. an "Admin" group holds dozens of permissions; a "Team
Owner" group holds only the bidding-related ones.

**Key fields.**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `Long` | Primary key. |
| `name` | `String(100)`, not null | Group name (e.g. "Admin", "Team Owner"). |
| `description` | `String(255)` | Human-readable explanation. |
| `leagueId` (`league_id`) | `Long`, optional | If set, the group is scoped to one league (e.g. "Owner of the Tigers, RPL 2025"). If null, the group is global. |
| `permissions` | `Set<Permission>` | M:N via `group_permissions (group_id, permission_id)`. |
| `createdAt` | `Instant` | Insert timestamp. |

**Constraints.** Unique on `(name, league_id)` — within a given league
scope (or globally, when `league_id` is null), names are unique.

**Relationships.**

- **Has many Permissions** (M:N).
- **Has many Users** (M:N, via `user_groups`).
- **Optionally belongs to a League** by `league_id` (soft reference, no
  JPA association).

---

### 5.5 RefreshToken (`RefreshToken.java`, table `refresh_tokens`)

**Purpose.** Tracks the long-lived refresh tokens issued at login so they
can be rotated and revoked. The access-token JWT itself is not stored
anywhere — only the refresh token is.

**Key fields.**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `Long` | Primary key. |
| `userId` (`user_id`) | `Long`, not null | The user this token was issued to. |
| `tokenHash` (`token_hash`) | `String`, not null, unique | Hashed token value (the raw token is only known to the client). |
| `expiresAt` (`expires_at`) | `Instant`, not null | When the token stops being valid. |
| `revoked` | `Boolean`, not null, default `false` | Set true on logout or when a newer token rotates this one out. |
| `createdAt` | `Instant` | Insert timestamp. |

**Relationships.** Soft reference to User by `user_id`.

---

## 6. Audit Log

### 6.1 AuditLog (`AuditLog.java`, table `audit_logs`)

**Purpose.** A write-only ledger of meaningful actions. Whoever did what,
when, against which entity, with whatever context details mattered. As
called out in the journey doc: "even if we never look at it during normal
operation, the moment something goes wrong on auction night, this is the
only thing that tells the truth."

**Key fields.**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `Long` | Primary key. |
| `userId` (`user_id`) | `Long` | The user who performed the action. May be null for system-driven events. |
| `action` | `String(100)`, not null | Action name (e.g. `LEAGUE_CREATE`, `BID_PLACE`, `AUCTION_PAUSE`, `AUCTION_COMPLETE`). |
| `entityType` (`entity_type`) | `String(50)` | The kind of entity affected (e.g. `Auction`, `Bid`, `Player`). |
| `entityId` (`entity_id`) | `Long` | The id of that entity. |
| `details` | `Map<String, Object>` stored as JSON | Free-form context. For example, completion-related logs include `forced: true` when the admin used Force Complete; bid logs may include `amount`, `previousBidId`, etc. |
| `ipAddress` (`ip_address`) | `String(45)` | The caller's IP (45 chars to fit IPv6). |
| `createdAt` | `Instant`, not updatable | When the action happened. |

**What gets recorded.** Per the journey doc, every meaningful action gets
a row: bid placement, sold/unsold, undo, pause, resume, completion (with
`forced: true` when overridden), league creation, team creation, login,
etc. The exact set is whatever the service layer chooses to log; the table
itself is permissive about action names.

**Relationships.** Soft reference to User by `user_id`. The `entityType`
+ `entityId` pair is a poor-man's polymorphic association — it doesn't
join to anything in the database, but it lets you find audit rows for
"this auction" or "this player" with a single indexed lookup.

---

## 7. Enum Quick Reference

Every enum in the data model, in one place:

| Enum | Defined on | Values | Purpose |
| --- | --- | --- | --- |
| `LeagueStatus` | `League.java` | `SETUP`, `ACTIVE`, `COMPLETED` | League lifecycle. |
| `AuctionStatus` | `Auction.java` | `NOT_STARTED`, `RETENTION`, `LIVE`, `PAUSED`, `DRAFT`, `COMPLETED` | The auction state machine. |
| `PlayerCategory` | `Player.java` | `CRICKET`, `OTHER` | Cricketer vs. non-cricket participant. |
| `PlayerStatus` | `Player.java` | `AVAILABLE`, `RETAINED`, `SOLD`, `UNSOLD` | Where a player is in the auction lifecycle. |
| `Gender` | `Player.java` | `MALE`, `FEMALE`, `OTHER` | Used by the `minWomenPerTeam` completion check. |
| `PickType` | `DraftPick.java` | `RETENTION`, `DRAFT` | How a pre-auction pick was made. |
| `AcquisitionType` | `PlayerHistory.java` | `RETAINED`, `AUCTIONED`, `DRAFTED` | How a team got a player, recorded after the fact. |

A note on overlap: `PlayerStatus.RETAINED`, `PickType.RETENTION`, and
`AcquisitionType.RETAINED` all describe the same real-world event from
three different angles — the player's status, the pick row written during
the retention phase, and the historical record of the acquisition.
Similarly for drafts and live-auction sales.

---

## 8. What's NOT In The Data Model (Yet)

Honest gaps and deliberate omissions, so a future engineer doesn't go
looking for tables that don't exist:

- **No `sys_config` table.** League-wide rules (minimum players per team,
  minimum women per team, default budget, default bid increment) live on
  the `League` row itself. The journey doc flags this as planned: "those
  should move into a `sys_config` table instead of being per-league
  overrides only." Until that lands, every league carries its own copy
  of these knobs and there is no system-wide default.

- **`minPlayersPerTeam` and `maxPlayersPerTeam` both live on League.** Min
  is 15 by default, max is required (no default) — both are per-league
  fields; there is no global cap.

- **No tiered bid increment table.** `League.bidIncrement` is a single
  flat number. The brief calls for tiered increments (e.g. +0.5 CR up to
  5 CR, +1 CR up to 10 CR) but they aren't modelled yet.

- **`Auction` cross-references are loose.** `leagueId`, `currentPlayerId`,
  `currentHighestBidId`, and `currentPickTeamId` are plain `Long` columns,
  not JPA associations. The database does not enforce referential
  integrity on them — the application layer does.

- **`Bid`, `DraftPick`, `PlayerHistory`, `TeamStanding`,
  `RefreshToken`, `AuditLog`** — all use plain `Long` ID columns instead
  of JPA `@ManyToOne` associations. Same caveat: integrity is enforced in
  application code, not by the database schema.

- **`Team.captainId` is a soft reference.** Plain `Long` column, no FK
  constraint to `players`. Deleting a player will not automatically clear
  this column.

- **`TeamStanding` is a stub.** The structure is there but nothing in the
  current codebase actively writes ranks or points; it's reserved for the
  end-of-season ranking feature.

- **No team-roster size column.** A team's player count is computed by
  counting `players WHERE team_id = ?`, not stored on the team. The
  completion check does this on demand.

- **No "auction event log" beyond `AuditLog`.** There isn't a separate
  table of "player N went up at time T" / "timer expired at time T" —
  those events live as audit log rows and as the `Bid` and `DraftPick`
  rows themselves. The `bid_order` field gives ordering within a player's
  bidding round, but there's no global event sequence number.

- **Gender on player creation.** The `Player.gender` column exists, but
  the journey doc notes that the Add/Edit Player modal does not yet
  accept it directly. The data model supports it; the form does not.

---

## 9. Reading Order If You Want To Go Deeper

For an engineer who wants to see how this data model actually gets used:

1. `League.java`, `Team.java`, `Player.java` — the simplest entities, get
   familiar with the field shapes first.
2. `Auction.java` and the `AuctionStatus` enum — understand the state
   machine before reading any service code.
3. `Bid.java` and `DraftPick.java` — see how acquisitions are written.
4. `AuctionService.java` (in the service layer, not covered here) —
   where these entities actually get manipulated.
5. `PlayerHistory.java` and `AuditLog.java` — the two append-only ledgers
   the system relies on for "what happened?" answers after the fact.
