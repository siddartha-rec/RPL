# Editable Retentions (Any Phase) — Design

**Date:** 2026-06-29
**Status:** Approved
**Area:** Auction Control — retention management

## Problem

Retentions are currently add-only and locked to the `RETENTION` auction phase.
Admins need to:

1. Select a player and retain them at an amount.
2. Edit the retention **amount** of an existing retention (in place, not remove + re-add).
3. Do all of this **while the retention phase is in progress** AND **after** it — including
   during the main auction and even after the auction is `COMPLETED`.

The full requirement (confirmed): **full add / edit / remove of retentions in any phase, with no
phase restriction.**

## Current State

- Backend `AuctionService.makeRetentionPick` and `removeRetention` both guard on
  `status == RETENTION` and reject otherwise.
- `removeRetention` (`DELETE /api/auctions/{id}/retention/{playerId}`) already exists and reverses
  all the mutations `makeRetentionPick` performs (refund budget, release player, delete DraftPick,
  delete RETAINED PlayerHistory, broadcast).
- There is no endpoint to change a retention amount in place.
- Frontend `RetentionPanel` / `RetentionLedger` only render during the retention phase
  (`AuctionControl.tsx`: `phase.isRetention && status !== 'NOT_STARTED'`), with an add form and a
  per-row remove (trash) button. Prices are read-only.

## Design

### Backend (`AuctionService` + `AuctionController`)

**1. New: edit amount in place**

- Endpoint: `PUT /api/auctions/{id}/retention/{playerId}` with body `{ "price": <number> }`.
- Service: `updateRetentionAmount(Long auctionId, Long playerId, BigDecimal newPrice)`.
- Logic:
  - Find the `RETENTION` `DraftPick` for `(auctionId, playerId)` via
    `findByAuctionIdAndPlayerIdAndPickType`; if absent → `BadRequestException`.
  - Load player; must be `RETAINED`, else `BadRequestException`.
  - Load team via `pick.getTeamId()`.
  - `delta = newPrice - pick.getCost()`.
  - Validate:
    - `newPrice >= 0`.
    - `team.getBudgetSpent() + delta <= team.getBudget()` (new amount fits remaining budget).
  - Apply:
    - `team.budgetSpent += delta`; save team.
    - `player.soldPrice = newPrice`; save player.
    - `pick.cost = newPrice`; save pick.
    - Latest RETAINED `PlayerHistory` row for this player in this league → `soldPrice = newPrice`; save.
  - Broadcast `PLAYER_RETENTION_UPDATED` event + `broadcastBudgetUpdate(team)`.
  - Audit `RETENTION_AMOUNT_UPDATED` with playerId, teamId, old/new amount, delta.
  - Return enriched `AuctionResponse`.

**2. Relax phase guards (full add/edit/remove anytime)**

- `removeRetention` — remove the `status == RETENTION` guard.
- `makeRetentionPick` — remove the `status == RETENTION` guard. Keep all other validations:
  max-retentions-per-team, budget sufficiency, player must be `AVAILABLE`.
  Restrict turn rotation: only call `advancePickTeam` when `status == RETENTION` (so admin adds
  during the main auction never rotate the round-robin pick order).
- `updateRetentionAmount` — no phase guard (editable in any phase, including `COMPLETED`).

### Frontend

**3. API** (`api/auctions.ts`)

- Add `updateRetention(id, playerId, price)` → `PUT /auctions/{id}/retention/{playerId}` body `{ price }`.
  (`removeRetention` already exists.)

**4. `RetentionLedger` row** — inline amount edit

- Each retained row gains a pencil (edit) button alongside the existing trash (remove) button.
- Clicking edit turns that row's price cell into a number input with save (check) and cancel (x)
  controls. Save calls `updateRetention(auctionId, p.id, newPrice)`.
- On success: invalidate `players` / `teams` / `auction-by-league`, refetch, exit edit mode.
- On error: show the backend message (e.g. insufficient budget) inline.

**5. `AuctionControl`** — surface editor in all phases

- Render the retention editor whenever the auction exists and `status !== 'NOT_STARTED'`, not only
  in the retention phase.
- Wrap it in a collapsible section ("Edit Retentions"): expanded by default when
  `phase.isRetention`, collapsed by default in main-auction / completed phases.
- Same `RetentionPanel` is used in all phases (full add/edit/remove everywhere).

## Behavior Notes (intended consequences)

- Removing a retained player mid-`LIVE` returns them to the `AVAILABLE` pool, after which they can
  be put up for auction.
- Editing amounts after `COMPLETED` retroactively adjusts team budgets and results figures.
- The add form's max-retentions-per-team disable still applies in every phase.
- All edits/removes/adds remain captured in the audit log.

## Out of Scope

- No undo / version history on edits beyond audit-log entries.
- No bulk edit of multiple retentions at once.

## Testing / Verification

- Backend compiles; frontend typechecks.
- Manual flow: retain a player → edit amount up and down (verify team budget delta) → attempt an
  edit over budget (verify rejection) → remove → re-add. Repeat during main-auction phase and after
  completion to confirm no phase blocks the operations.
