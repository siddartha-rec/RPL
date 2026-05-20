# Admin · Auction Control — Redesign

**Date:** 2026-05-20
**Status:** Design approved, ready for implementation plan
**Scope:** Frontend-heavy. Reuses existing backend `Auction` entity. One small backend tweak: extend retention-pick endpoint to accept optional `price` + `teamId` (see §3.1).

---

## 1. Problem

Today `AuctionControlTab` (`frontend/src/pages/AdminPage.tsx:1937-2212`) is a flat dump of every lifecycle button regardless of phase:

- Create Auction · Start (Retention) · Advance to Live · Switch to Draft · Complete
- Pause · Resume
- Player picker + Put Up Player + Mark Sold (duplicates Live Auction page)

Admin can't tell *what to click next* or *what phase the season is in*. Player-flow controls duplicate the Live Auction page. No way to enter retention picks — RPL needs retention, but today retention isn't expressible through this UI.

User stated essence: admin should clearly **start the auction for a season**. Once live, controls (pause/stop) stay — but admin shouldn't be confused about state.

## 2. Goals

1. Make the current phase **obvious at a glance**.
2. Surface only the **state-relevant primary action** as a prominent CTA.
3. Add a first-class **Retention auction** flow (manual entry of retained players + retention prices per team).
4. Stop duplicating live-bid controls from the Live Auction page.
5. Keep backend changes at zero — reuse the existing `Auction` lifecycle.

## 3. Non-goals

- No new backend tables, migrations, or new endpoints.
- No changes to the Live Auction page (`AuctionPage.tsx`) beyond a deep-link entry.
- No new authorization model — existing admin permission checks stand.
- No mobile-specific layout; this is a desktop admin screen.

## 3.1 Allowed backend tweak

The existing `POST /api/auctions/{id}/retention/pick` endpoint is turn-based and uses a fixed `league.retentionCost`. The redesign needs admin-driven team selection + manual per-player price. The tweak is intentionally narrow:

- `PickRequest` gains two **optional** fields: `price: BigDecimal?` and `teamId: Long?`.
- `AuctionService.makeRetentionPick`:
  - If `teamId` is provided, use it (admin-pick mode) — skip the `currentPickTeamId` requirement.
  - If `price` is provided, use it for cost / player.soldPrice / budget deduction. Fall back to `league.retentionCost` when absent.
  - Validate `price >= 0` and `price <= team.budget - team.budgetSpent`.
- All existing callers continue to work (both fields optional, current turn-based + fixed-cost behaviour preserved when both null).

## 4. State machine

Backend `Auction.status` already exposes:

```
(none) → SETUP → RETENTION → LIVE ⇄ PAUSED → COMPLETED
                                  ↘ DRAFT
```

The redesign maps these statuses to a 3-step visual stepper:

| Step | Backend statuses covered |
|---|---|
| ① Retention | `SETUP`, `RETENTION` |
| ② Main Auction | `LIVE`, `PAUSED`, `DRAFT` |
| ③ Complete | `COMPLETED` |

Primary action per status:

| Status | Primary CTA | Endpoint | Secondary |
|---|---|---|---|
| _no auction record_ | **Create Auction** | `POST /leagues/{id}/auctions` | — |
| `SETUP` | **Start Retention** | `PUT /auctions/{id}/start` | — |
| `RETENTION` | **Lock & Advance to Main →** | `PUT /auctions/{id}/advance-to-live` | Reset Retention (clears retention picks for this auction) |
| `LIVE` | **Open Live Auction →** (deep link to `/auction`) | — | Pause · Complete |
| `PAUSED` | **Resume** | `PUT /auctions/{id}/resume` | Complete |
| `COMPLETED` | **View Results →** (deep link to results page) | — | — |

`DRAFT` status is treated as an alias of `LIVE` for stepper position (step ②); admins who want the draft branch use existing `switchToDraft` from the Live Auction page if needed. (Out of scope for this redesign.)

## 5. UI architecture

### 5.1 Page shell

```
┌── Page header ──────────────────────────────────────────────────┐
│  Auction Control                              [Season selector] │
│  Manage retention + main auction for {league}                   │
└─────────────────────────────────────────────────────────────────┘
┌── Stepper card ──────────────────────────────────────────────────┐
│  ①─────●─────②─────────③                                         │
│  Retention   Main Auction   Complete                             │
└─────────────────────────────────────────────────────────────────┘
┌── Phase header card (state-aware) ───────────────────────────────┐
│  [Icon]  Phase N of 2 · STATUS          [Primary CTA] [Secondary]│
└─────────────────────────────────────────────────────────────────┘
┌── Phase body ────────────────────────────────────────────────────┐
│   Retention two-pane    OR    Main stats + team progress         │
└─────────────────────────────────────────────────────────────────┘
```

Stepper nodes:
- Circle: pending (gray) · current (gradient + glow) · done (green ✓).
- Sub-label: short progress hint (e.g. `OPEN · 14/35 entered`, `● LIVE · 87 sold`, `locked · 23 retained`).
- Clickable only for current step or already-completed step. Future steps disabled with tooltip "Lock previous phase first".

### 5.2 Phase body — Retention (step ①)

Two-pane grid, **left 300px / right 1fr**:

**Left pane: Teams list**
- Header: "TEAMS · {n}".
- Row per team: color dot · team name · slot counter `{used}/{max}` (uses `League.maxRetentionsPerTeam`).
- Selected team highlighted with team color background.
- Below team name (when selected): "Spent {x} CR · {y} left".

**Right pane: Selected team's retention ledger**
- Pane header (team-color tinted): team name · `{used}/{max} slots · {spent} CR spent · {left} CR left`.
- Existing retentions table — columns: `# (jersey)`, `Player`, `Category badge`, `Price`, `✕ remove`.
- "+ Add Retention" form (dashed border): player autocomplete (filters by `status=AVAILABLE` + `leagueId`) · price input (CR) · Add button.
  - When player is picked, price field pre-fills with `player.basePrice` (overridable, floor = `League.retentionCost`).
  - On Add: call `POST /auctions/{id}/retention/pick` (existing endpoint `retentionPick`). Refresh ledger + budget.

**Primary CTA: "Lock & Advance to Main →"**
- Enabled when every team has between `0` and `maxRetentionsPerTeam` retentions and no team is over budget.
- Calls `advanceToLive`. On success, stepper advances to step ②.

**Secondary: "Reset Retention"** — only visible during `RETENTION`. Confirm modal; calls a (new — see §7) front-end-only loop that removes each retention via existing endpoints if available, otherwise hidden until backend supports bulk reset. **Default behaviour: hide if endpoint not present.**

### 5.3 Phase body — Main Auction (step ②)

Stacked sections:

**Stats strip** (4 cards across):
1. **SOLD** — count of players with `status=SOLD` in this league.
2. **REMAINING** — count of `status=AVAILABLE`.
3. **CURRENT BID** — `auction.currentHighestBid` + player name + team short code (live via SSE).
4. **UNSOLD** — count of `status=UNSOLD`.

**Team Progress grid** (responsive, 4 per row desktop / 2 mobile):
- Per team chip: color dot + short code · "{picks} picks · {budgetLeft} CR left" · validation badge.
- Badges:
  - `✓ valid` (green) — meets min players & women quota.
  - `⚠ need N more` (amber) — below `minPlayersPerTeam`.
  - `⚠ N/M women required` (pink) — below `minWomenPerTeam`.
- Reuses the same logic as the existing `CompletionCheck`.

**No player-flow controls here.** Put Up / Mark Sold / Bid stays exclusively on `AuctionPage`.

### 5.4 Phase body — Complete (step ③)

- Green checkmark hero card.
- Summary: total players sold, total spend, top buy, list of completed teams (link to `ResultsPage`).
- Primary CTA: **View Results →**.

## 6. State-aware behaviour summary

```
no auction        →  show "Create Auction" inside stepper-less placeholder
SETUP             →  stepper ① · phase body shows "Click Start Retention to open"
RETENTION         →  stepper ① · two-pane retention UI
LIVE / PAUSED     →  stepper ② · main stats + team progress
DRAFT             →  stepper ② · same as LIVE (no special UI; existing flow)
COMPLETED         →  stepper ③ · summary card
```

Stepper progress sub-labels recompute on every SSE event so admin sees counters tick live without leaving the page.

## 7. Components to add / change

All under `frontend/src/pages/AdminPage.tsx` (or extracted to `frontend/src/components/auction-control/` if file grows past ~2500 lines):

| Component | Type | Notes |
|---|---|---|
| `AuctionControlTab` | rewrite | Becomes a thin shell that picks the active phase body. |
| `AuctionStepper` | new | 3-node horizontal stepper. Props: `status`, `retentionStats`, `mainStats`, `onStepClick`. |
| `PhaseHeaderCard` | new | State-aware CTA strip. Props: `phase`, `status`, `onAction`. |
| `RetentionPanel` | new | Two-pane retention UI. Owns team-selection state. |
| `RetentionTeamList` | new | Left pane. |
| `RetentionLedger` | new | Right pane (table + add form). |
| `MainAuctionPanel` | new | Stats strip + team progress. |
| `CompletePanel` | new | Summary card. |

Extraction trigger: when `AdminPage.tsx` would exceed ~2500 lines (currently 2257), move auction-control components into `frontend/src/components/auction-control/`.

## 8. API surface

All existing endpoints in `frontend/src/api/auctions.ts`:

- `createAuction`, `startAuction`, `advanceToLive`, `pauseAuction`, `resumeAuction`, `completeAuction`, `getAuctionByLeague`, `getCompletionCheck`.

**Modified:** `retentionPick(auctionId, playerId, opts?)` — adds optional `{ price, teamId }` second-arg object. Wire format: `POST /api/auctions/{id}/retention/pick` body `{ playerId, price?, teamId? }`.

Removed from this screen (still used by Live Auction page): `putUpPlayer`, `soldPlayer`, `markUnsold`, `undoBid`, `placeBid`, `switchToDraft`.

No new endpoints, no new routes.

## 9. Validation / errors

- Inline errors per pane (retention add failure stays in the right pane).
- Page-level `Alert` for lifecycle action failures (existing pattern preserved).
- `Lock & Advance` disabled with tooltip when any team is over `maxRetentionsPerTeam` or over budget; clicking still shows a confirm modal listing affected teams when retentions are below `min` (if a min retention setting exists; otherwise no warning).
- `Complete` uses existing `CompletionCheck` + Force Complete affordance (already implemented in `AuctionPage`; surface the same affordance here).

## 10. Edge cases

- **Switching seasons** mid-edit: clear selected team + inline errors. Auction query refetches.
- **Mid-LIVE arrival with no retentions** (legacy data): stepper shows ① empty + ② LIVE. No error; admin can still operate ②.
- **No teams in league**: retention panel shows empty-state with link to Admin · Teams.
- **No players in league**: retention add form shows empty-state with link to Admin · Players (Import).
- **`DRAFT` status**: stepper sits on ②; phase header reads "DRAFT" with `Open Live Auction →` as primary CTA.
- **Stepper click to past phase**: read-only view (existing retentions table, no add form). Editing locked once auction is past `RETENTION`.

## 11. Out of scope

- Backend changes (no new tables, endpoints, statuses).
- Draft (snake) phase UI — existing flow on Live Auction page is untouched.
- Mobile-optimised layout — desktop admin only.
- Bulk reset of retentions (depends on a backend endpoint that does not exist today; "Reset Retention" stays hidden until backend supports it).
- Audit log of retention edits (existing audit log captures these via existing endpoints).

## 12. Open questions

None at design time. All clarifications resolved during brainstorming:
- Two auctions per season: ✅ retention + main.
- Retention mechanic: ✅ manual entry of retained players + price per team.
- Layout: ✅ timeline / stepper.
- Retention UX: ✅ two-pane (teams left, picker right).
- Backend approach: ✅ reuse existing Auction entity, no migration.
