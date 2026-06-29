# Editable Retentions (Any Phase) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins add, edit (amount in place), and remove retentions in any auction phase — including main auction and after completion.

**Architecture:** Add an in-place amount-edit endpoint to `AuctionService`, drop the `RETENTION`-phase guards on the add/remove/edit paths, and surface the retention editor in all phases via a collapsible section. Each retention mutation adjusts the team budget by the delta and keeps `Player`, `DraftPick`, and `PlayerHistory` consistent.

**Tech Stack:** Spring Boot (Java), React + TypeScript, MUI, TanStack Query.

## Global Constraints

- Auction status enum: `NOT_STARTED, RETENTION, LIVE, PAUSED, DRAFT, COMPLETED` (backend `Auction.AuctionStatus`). League status (`SETUP/ACTIVE/COMPLETED`) is a different entity — do not confuse.
- Money fields are `java.math.BigDecimal` on backend, `number` (CR) on frontend.
- Retention `DraftPick` has `pickType == RETENTION`; one per `(auctionId, playerId)`.
- No new test framework: backend has no `AuctionService` test harness, frontend has no test runner. Verify via `tsc --noEmit`, backend `compile`, and manual smoke flow.
- Follow existing service style: `getAuctionOrThrow`, `BadRequestException`, `broadcastEvent`, `broadcastBudgetUpdate`, `audit(...)`, `enrichAuctionResponse`.

---

### Task 1: Backend — edit-amount endpoint + relax phase guards

**Files:**
- Modify: `backend/src/main/java/com/rpl/auction/auction/service/AuctionService.java`
- Modify: `backend/src/main/java/com/rpl/auction/auction/controller/AuctionController.java`
- (Already done in prior work: `DraftPickRepository.findByAuctionIdAndPlayerIdAndPickType`, `removeRetention`, `DELETE` endpoint.)

**Interfaces:**
- Consumes: `draftPickRepository.findByAuctionIdAndPlayerIdAndPickType(auctionId, playerId, DraftPick.PickType.RETENTION)`, `teamRepository`, `playerRepository`, `playerHistoryRepository.findByPlayerIdOrderByCreatedAtDesc(playerId)`.
- Produces: `AuctionResponse updateRetentionAmount(Long auctionId, Long playerId, BigDecimal newPrice)`; HTTP `PUT /api/auctions/{id}/retention/{playerId}` body `{ "price": <number> }`.

- [ ] **Step 1: Relax the add guard** — in `makeRetentionPick`, remove the `if (auction.getStatus() != RETENTION) throw ...` check. Keep max-retentions, budget, and player-`AVAILABLE` checks. Change the rotation block from `if (request.getTeamId() == null)` to `if (request.getTeamId() == null && auction.getStatus() == Auction.AuctionStatus.RETENTION)` so main-auction adds never rotate pick order.

- [ ] **Step 2: Relax the remove guard** — in `removeRetention`, remove the `if (auction.getStatus() != RETENTION) throw ...` check (keep the "no retention found" and "player not RETAINED" checks).

- [ ] **Step 3: Add `updateRetentionAmount`** — insert after `removeRetention`:

```java
@Transactional
public AuctionResponse updateRetentionAmount(Long auctionId, Long playerId, BigDecimal newPrice) {
    Auction auction = getAuctionOrThrow(auctionId);

    if (newPrice == null || newPrice.signum() < 0) {
        throw new BadRequestException("Retention price must be >= 0");
    }

    DraftPick pick = draftPickRepository
            .findByAuctionIdAndPlayerIdAndPickType(auctionId, playerId, DraftPick.PickType.RETENTION)
            .orElseThrow(() -> new BadRequestException("No retention found for player " + playerId + " in this auction"));

    Player player = playerRepository.findById(playerId)
            .orElseThrow(() -> new ResourceNotFoundException("Player", playerId));
    if (player.getStatus() != Player.PlayerStatus.RETAINED) {
        throw new BadRequestException("Player " + playerId + " is not RETAINED. Current: " + player.getStatus());
    }

    Team team = teamRepository.findById(pick.getTeamId())
            .orElseThrow(() -> new ResourceNotFoundException("Team", pick.getTeamId()));

    BigDecimal oldPrice = pick.getCost();
    BigDecimal delta = newPrice.subtract(oldPrice);
    BigDecimal newSpent = team.getBudgetSpent().add(delta);
    if (newSpent.compareTo(team.getBudget()) > 0) {
        throw new BadRequestException("New retention amount exceeds team budget. Budget: "
                + team.getBudget() + ", would spend: " + newSpent);
    }

    team.setBudgetSpent(newSpent);
    teamRepository.save(team);

    player.setSoldPrice(newPrice);
    playerRepository.save(player);

    pick.setCost(newPrice);
    draftPickRepository.save(pick);

    playerHistoryRepository.findByPlayerIdOrderByCreatedAtDesc(playerId).stream()
            .filter(h -> h.getAcquisitionType() == PlayerHistory.AcquisitionType.RETAINED
                    && h.getLeagueId().equals(auction.getLeagueId()))
            .findFirst()
            .ifPresent(h -> { h.setSoldPrice(newPrice); playerHistoryRepository.save(h); });

    broadcastEvent(auctionId, "PLAYER_RETENTION_UPDATED", Map.of(
            "playerId", playerId,
            "playerName", player.getName(),
            "teamId", team.getId(),
            "teamName", team.getName(),
            "oldPrice", oldPrice,
            "newPrice", newPrice
    ));
    broadcastBudgetUpdate(auctionId, team);
    audit("RETENTION_AMOUNT_UPDATED", auctionId, Map.of(
            "playerId", playerId,
            "playerName", player.getName(),
            "teamId", team.getId(),
            "oldPrice", oldPrice,
            "newPrice", newPrice));

    return enrichAuctionResponse(AuctionResponse.from(auction), auction);
}
```

Confirm `PlayerHistory.setSoldPrice(BigDecimal)` exists (entity uses `@Setter`); `DraftPick.setCost`, `Player.setSoldPrice` likewise.

- [ ] **Step 4: Add the controller endpoint** — in `AuctionController`, next to `removeRetention`:

```java
@PutMapping("/api/auctions/{id}/retention/{playerId}")
public ResponseEntity<ApiResponse<AuctionResponse>> updateRetention(
        @PathVariable Long id,
        @PathVariable Long playerId,
        @RequestBody UpdateRetentionRequest request) {
    return ResponseEntity.ok(ApiResponse.success(
            auctionService.updateRetentionAmount(id, playerId, request.getPrice()), "Retention amount updated"));
}
```

Create DTO `backend/src/main/java/com/rpl/auction/auction/dto/UpdateRetentionRequest.java`:

```java
package com.rpl.auction.auction.dto;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class UpdateRetentionRequest {
    private BigDecimal price;
}
```

- [ ] **Step 5: Compile**

Run: `cd backend && (test -f ./mvnw && ./mvnw -q compile -DskipTests || mvn -q compile -DskipTests)`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/rpl/auction/auction/service/AuctionService.java \
        backend/src/main/java/com/rpl/auction/auction/controller/AuctionController.java \
        backend/src/main/java/com/rpl/auction/auction/dto/UpdateRetentionRequest.java
git commit -m "feat(auction): edit retention amount + allow retention add/edit/remove in any phase"
```

---

### Task 2: Frontend — edit API + inline amount edit + all-phase editor

**Files:**
- Modify: `frontend/src/api/auctions.ts`
- Modify: `frontend/src/components/auction-control/RetentionLedger.tsx`
- Modify: `frontend/src/components/auction-control/AuctionControl.tsx`

**Interfaces:**
- Consumes: `updateRetention(id, playerId, price)` from `api/auctions`.
- Produces: collapsible retention editor visible in all phases (auction exists, status ≠ `NOT_STARTED`).

- [ ] **Step 1: Add the API fn** — in `api/auctions.ts`, after `removeRetention`:

```ts
export const updateRetention = (id: number, playerId: number, price: number) =>
  api.put<ApiResponse<Auction>>(`/auctions/${id}/retention/${playerId}`, { price }).then(r => r.data.data);
```

- [ ] **Step 2: Inline amount edit in `RetentionLedger`** — add `EditOutlined`/`Check`/`Close` imports and `updateRetention` import. Add state `const [editId, setEditId] = useState<number | null>(null); const [editPrice, setEditPrice] = useState('');` and a mutation:

```tsx
const editMut = useMutation({
  mutationFn: ({ playerId, price }: { playerId: number; price: number }) =>
    updateRetention(auctionId, playerId, price),
  onSuccess: () => {
    setEditId(null);
    setError(null);
    qc.invalidateQueries({ queryKey: ['players'] });
    qc.invalidateQueries({ queryKey: ['teams'] });
    qc.invalidateQueries({ queryKey: ['auction-by-league'] });
    refetch();
  },
  onError: (e: { response?: { data?: { message?: string } } }) =>
    setError(e?.response?.data?.message ?? 'Failed to update amount'),
});
```

In the retained-row map, the price cell renders a number input when `editId === p.id` (value `editPrice`, save button calls `editMut.mutate({ playerId: p.id, price: Number(editPrice) })`, cancel sets `editId` to null); otherwise the read-only price text plus a pencil `IconButton` that does `setEditId(p.id); setEditPrice(String(p.soldPrice ?? ''))`. Keep the existing trash button. Widen the row/header grid to fit the extra action (e.g. `'50px 1fr 90px 90px 76px'`).

- [ ] **Step 3: All-phase collapsible editor in `AuctionControl`** — replace the retention render guard (currently `phase.isRetention && auction.status !== 'NOT_STARTED'`) so the editor shows in every phase once started. Wrap `RetentionPanel` in MUI `Accordion` (import from `@mui/material`), `defaultExpanded={phase.isRetention}`, titled "Edit Retentions":

```tsx
{ctx && auction.status !== 'NOT_STARTED' && (
  <Accordion defaultExpanded={phase.isRetention} sx={{ mt: 1.5, borderRadius: '12px', '&:before': { display: 'none' } }} disableGutters>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>Edit Retentions</Typography>
    </AccordionSummary>
    <AccordionDetails sx={{ p: 0 }}>
      <RetentionPanel key={ctx.league.id} ctx={ctx} />
    </AccordionDetails>
  </Accordion>
)}
```

Remove the old standalone `{ctx && phase.isRetention && auction.status !== 'SETUP' ...}` retention line. Keep the `MainAuctionPanel` and `CompletePanel` lines. Add imports for `Accordion, AccordionSummary, AccordionDetails, Typography` and `ExpandMoreIcon`.

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/auctions.ts \
        frontend/src/components/auction-control/RetentionLedger.tsx \
        frontend/src/components/auction-control/AuctionControl.tsx
git commit -m "feat(auction-control): inline retention amount edit + all-phase retention editor"
```

---

### Task 3: Manual smoke verification

**Files:** none (verification only).

- [ ] **Step 1:** Start backend + frontend. Login admin. Auction Control → select season → Start Retention.
- [ ] **Step 2:** Add a retention. Edit its amount up, then down — confirm the team "CR spent / CR left" figures move by the delta each time.
- [ ] **Step 3:** Try to edit to an amount above the team budget — confirm inline rejection ("exceeds team budget").
- [ ] **Step 4:** Remove the retention — confirm player returns to the available dropdown and budget is refunded.
- [ ] **Step 5:** Advance to main auction. Open the "Edit Retentions" accordion — confirm add/edit/remove all still work. Repeat one edit after Complete Auction.

---

## Self-Review

- **Spec coverage:** edit-amount endpoint (Task 1.3–1.4) ✓; relax add guard + rotation (1.1) ✓; relax remove guard (1.2) ✓; frontend api (2.1) ✓; inline row edit (2.2) ✓; all-phase collapsible (2.3) ✓; behavior notes are emergent from dropping guards ✓; manual verification (Task 3) ✓.
- **Placeholders:** none — all code shown.
- **Type consistency:** `updateRetentionAmount(Long, Long, BigDecimal)` ↔ controller passes `request.getPrice()` (BigDecimal) ✓; frontend `updateRetention(id, playerId, price:number)` ↔ body `{ price }` ↔ `UpdateRetentionRequest.price` (BigDecimal) ✓; `editMut.mutate({ playerId, price })` matches mutationFn arg shape ✓.
