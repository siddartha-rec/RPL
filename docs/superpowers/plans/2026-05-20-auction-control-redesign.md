# Auction Control Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace flat-button `AuctionControlTab` with a state-aware stepper UI that surfaces only the relevant primary action per phase, adds a first-class Retention auction (two-pane manual entry with per-player price), and stops duplicating live-bid controls from the Live Auction page.

**Architecture:** Frontend extraction — pull the existing inline `AuctionControlTab` (`frontend/src/pages/AdminPage.tsx:1937-2212`) into a new `frontend/src/components/auction-control/` module with 8 focused components driven by `auction.status`. One narrow backend tweak: `PickRequest` gets optional `price` and `teamId` so the same `/retention/pick` endpoint serves admin-driven manual retention. All other lifecycle endpoints (`startAuction`, `advanceToLive`, `pauseAuction`, `resumeAuction`, `completeAuction`) reused as-is.

**Tech Stack:** Frontend — React 19 + TypeScript 5.9 + Vite + MUI v7 + TanStack Query v5. Backend — Spring Boot + Lombok + Jakarta Bean Validation + BigDecimal money. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-20-auction-control-redesign-design.md`

**Verification model:** This repo has no frontend test framework and no auction-service unit tests today. Per the YAGNI principle and to avoid scope creep, each task ends with `tsc -b` (frontend) or `mvn -q -DskipTests compile` (backend) + commit. Manual browser walkthrough + curl smoke tests at the end. If you set up Vitest, that's a separate plan.

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `backend/.../auction/dto/PickRequest.java` | modify | Add optional `price`, `teamId` |
| `backend/.../auction/service/AuctionService.java` | modify | `makeRetentionPick` uses overrides when present |
| `frontend/src/api/auctions.ts` | modify | `retentionPick` accepts opts object |
| `frontend/src/components/auction-control/index.ts` | create | Barrel export |
| `frontend/src/components/auction-control/types.ts` | create | Shared local types (phase enum, props) |
| `frontend/src/components/auction-control/AuctionStepper.tsx` | create | 3-node horizontal stepper |
| `frontend/src/components/auction-control/PhaseHeaderCard.tsx` | create | State-aware CTA strip |
| `frontend/src/components/auction-control/RetentionTeamList.tsx` | create | Left pane of retention |
| `frontend/src/components/auction-control/RetentionLedger.tsx` | create | Right pane (table + add form) |
| `frontend/src/components/auction-control/RetentionPanel.tsx` | create | Composes team list + ledger |
| `frontend/src/components/auction-control/MainAuctionPanel.tsx` | create | Stats strip + team progress |
| `frontend/src/components/auction-control/CompletePanel.tsx` | create | Done state summary |
| `frontend/src/components/auction-control/AuctionControl.tsx` | create | Top-level shell, state-aware |
| `frontend/src/pages/AdminPage.tsx` | modify | Replace inline `AuctionControlTab` body with `<AuctionControl />` |

---

## Task 1: Backend — extend `PickRequest` with optional `price` + `teamId`

**Files:**
- Modify: `backend/src/main/java/com/rpl/auction/auction/dto/PickRequest.java`

- [ ] **Step 1: Read current file**

Run: `cat backend/src/main/java/com/rpl/auction/auction/dto/PickRequest.java`
Expected: shows class with single `@NotNull private Long playerId;`.

- [ ] **Step 2: Replace file contents**

Write the file with this exact content:

```java
package com.rpl.auction.auction.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class PickRequest {
    @NotNull
    private Long playerId;

    /**
     * Optional. When present, admin overrides the per-player retention price
     * instead of using league.retentionCost. Must be >= 0 and within team budget.
     * Ignored by draft pick.
     */
    @PositiveOrZero
    private BigDecimal price;

    /**
     * Optional. When present, admin picks for this team directly, bypassing the
     * round-robin `currentPickTeamId`. Ignored by draft pick.
     */
    private Long teamId;
}
```

- [ ] **Step 3: Compile**

Run: `cd backend && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/rpl/auction/auction/dto/PickRequest.java
git commit -m "feat(auction): add optional price + teamId to PickRequest"
```

---

## Task 2: Backend — `makeRetentionPick` honours overrides

**Files:**
- Modify: `backend/src/main/java/com/rpl/auction/auction/service/AuctionService.java` (method `makeRetentionPick`, starts around line 478)

- [ ] **Step 1: Read the current method**

Run: `sed -n '478,565p' backend/src/main/java/com/rpl/auction/auction/service/AuctionService.java`
Expected: shows the existing `makeRetentionPick` method.

- [ ] **Step 2: Replace the method body**

Replace the whole `makeRetentionPick` method (from `@Transactional` line above it through the closing `}` of the method, BEFORE the next `@Transactional` or method) with:

```java
    @Transactional
    public AuctionResponse makeRetentionPick(Long auctionId, PickRequest request) {
        Auction auction = getAuctionOrThrow(auctionId);
        if (auction.getStatus() != Auction.AuctionStatus.RETENTION) {
            throw new BadRequestException("Auction must be in RETENTION status. Current: " + auction.getStatus());
        }

        // Admin-pick mode: request.teamId overrides the round-robin currentPickTeamId.
        final Long pickTeamId;
        if (request.getTeamId() != null) {
            pickTeamId = request.getTeamId();
        } else if (auction.getCurrentPickTeamId() != null) {
            pickTeamId = auction.getCurrentPickTeamId();
        } else {
            throw new BadRequestException("No team selected. Provide teamId or set currentPickTeamId.");
        }

        final Long retentionLeagueId = auction.getLeagueId();
        League league = leagueRepository.findById(retentionLeagueId)
                .orElseThrow(() -> new ResourceNotFoundException("League", retentionLeagueId));

        Team team = teamRepository.findById(pickTeamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", pickTeamId));

        if (!team.getLeagueId().equals(retentionLeagueId)) {
            throw new BadRequestException("Team " + pickTeamId + " does not belong to league " + retentionLeagueId);
        }

        long retentionCount = draftPickRepository.countByAuctionIdAndTeamIdAndPickType(
                auctionId, team.getId(), DraftPick.PickType.RETENTION);
        if (retentionCount >= league.getMaxRetentionsPerTeam()) {
            throw new BadRequestException("Team has reached the maximum number of retentions: " + league.getMaxRetentionsPerTeam());
        }

        Player player = playerRepository.findById(request.getPlayerId())
                .orElseThrow(() -> new ResourceNotFoundException("Player", request.getPlayerId()));

        if (player.getStatus() != Player.PlayerStatus.AVAILABLE) {
            throw new BadRequestException("Player " + request.getPlayerId() + " is not AVAILABLE. Current: " + player.getStatus());
        }

        // Price: request override OR league.retentionCost.
        BigDecimal retentionCost = request.getPrice() != null ? request.getPrice() : league.getRetentionCost();
        if (retentionCost.signum() < 0) {
            throw new BadRequestException("Retention price must be >= 0");
        }
        BigDecimal availableBudget = team.getBudget().subtract(team.getBudgetSpent());
        if (retentionCost.compareTo(availableBudget) > 0) {
            throw new BadRequestException("Insufficient budget for retention. Cost: " + retentionCost + ", Available: " + availableBudget);
        }

        long totalPicks = draftPickRepository.findByAuctionIdOrderByPickOrderAsc(auctionId).size();
        int pickOrder = (int) totalPicks + 1;
        int roundNumber = (int) (retentionCount + 1);

        DraftPick pick = DraftPick.builder()
                .auctionId(auctionId)
                .playerId(request.getPlayerId())
                .teamId(team.getId())
                .roundNumber(roundNumber)
                .pickOrder(pickOrder)
                .pickType(DraftPick.PickType.RETENTION)
                .cost(retentionCost)
                .build();
        draftPickRepository.save(pick);

        player.setStatus(Player.PlayerStatus.RETAINED);
        player.setSoldPrice(retentionCost);
        player.setTeam(team);
        playerRepository.save(player);

        team.setBudgetSpent(team.getBudgetSpent().add(retentionCost));
        teamRepository.save(team);

        PlayerHistory history = PlayerHistory.builder()
                .playerId(request.getPlayerId())
                .leagueId(auction.getLeagueId())
                .teamId(team.getId())
                .acquisitionType(PlayerHistory.AcquisitionType.RETAINED)
                .soldPrice(retentionCost)
                .build();
        playerHistoryRepository.save(history);

        broadcastEvent(auctionId, "PLAYER_RETAINED", Map.of(
                "playerId", request.getPlayerId(),
                "playerName", player.getName(),
                "teamId", team.getId(),
                "teamName", team.getName(),
                "cost", retentionCost
        ));

        return enrichAuctionResponse(AuctionResponse.from(auction), auction);
    }
```

Key changes vs original: (a) `pickTeamId` resolved from request or auction state; (b) team-league sanity check; (c) `retentionCost` resolved from request override or league default; (d) `player.soldPrice = retentionCost` (was hardcoded to `league.getRetentionCost()`).

If the original method had additional trailing code (return/closing brace nuances), keep the original closing brace and re-check with `mvn compile` afterwards.

- [ ] **Step 3: Compile**

Run: `cd backend && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS.

- [ ] **Step 4: Smoke-test the existing turn-based path still works**

Pre-condition: have an auction in RETENTION with `currentPickTeamId` set. If not available locally, skip and rely on the manual-pick smoke test in step 5.

Run (replace `{token}`, `{auctionId}`, `{playerId}` with real values):

```bash
curl -X POST "http://localhost:8080/api/auctions/{auctionId}/retention/pick" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"playerId": {playerId}}'
```

Expected: HTTP 200, response data `auction` with status `RETENTION`. Player now `RETAINED`. Budget deducted by `league.retentionCost`.

- [ ] **Step 5: Smoke-test the new override path**

Run:

```bash
curl -X POST "http://localhost:8080/api/auctions/{auctionId}/retention/pick" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"playerId": {playerId}, "teamId": {teamId}, "price": 7.5}'
```

Expected: HTTP 200, player retained to `teamId`, `soldPrice` = `7.5`, team `budgetSpent` increased by `7.5`. Works even with no `currentPickTeamId` set on the auction.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/rpl/auction/auction/service/AuctionService.java
git commit -m "feat(auction): retention pick honours optional price + teamId overrides"
```

---

## Task 3: Frontend — extend `retentionPick` client signature

**Files:**
- Modify: `frontend/src/api/auctions.ts`

- [ ] **Step 1: Read current file**

Run: `cat frontend/src/api/auctions.ts`
Expected: shows current exports including `retentionPick = (id, playerId) => ...`.

- [ ] **Step 2: Replace `retentionPick` line**

Find:

```ts
export const retentionPick = (id: number, playerId: number) => api.post(`/auctions/${id}/retention/pick`, { playerId }).then(r => r.data.data);
```

Replace with:

```ts
export interface RetentionPickOpts { teamId?: number; price?: number; }
export const retentionPick = (id: number, playerId: number, opts: RetentionPickOpts = {}) =>
  api.post(`/auctions/${id}/retention/pick`, { playerId, ...opts }).then(r => r.data.data);
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc -b`
Expected: no errors. (Existing callers pass two positional args; third is optional.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/auctions.ts
git commit -m "feat(api): retentionPick accepts optional teamId + price"
```

---

## Task 4: Frontend — create `auction-control` directory + shared types

**Files:**
- Create: `frontend/src/components/auction-control/types.ts`
- Create: `frontend/src/components/auction-control/index.ts`

- [ ] **Step 1: Ensure directory exists**

Run: `mkdir -p frontend/src/components/auction-control`
Expected: no output.

- [ ] **Step 2: Write `types.ts`**

```ts
import type { Auction, League, Team, Player } from '../../types';

export type AuctionPhase = 'retention' | 'main' | 'complete';

export interface PhaseDerivation {
  phase: AuctionPhase;
  stepIndex: 0 | 1 | 2;
  isRetention: boolean;
  isMain: boolean;
  isComplete: boolean;
}

export function derivePhase(status: string | undefined): PhaseDerivation {
  if (status === 'COMPLETED') {
    return { phase: 'complete', stepIndex: 2, isRetention: false, isMain: false, isComplete: true };
  }
  if (status === 'LIVE' || status === 'PAUSED' || status === 'DRAFT') {
    return { phase: 'main', stepIndex: 1, isRetention: false, isMain: true, isComplete: false };
  }
  return { phase: 'retention', stepIndex: 0, isRetention: true, isMain: false, isComplete: false };
}

export interface AuctionControlContext {
  auction: Auction | null;
  league: League;
  teams: Team[];
  availablePlayers: Player[];
  retainedPlayers: Player[];
  refetch: () => void;
}
```

- [ ] **Step 3: Write `index.ts` (temporary — full version lands in Task 12)**

```ts
export * from './types';
```

Reason: `AuctionControl.tsx` does not exist yet; re-exporting it now would fail the type-check. Task 12 replaces this file with the full barrel.

- [ ] **Step 4: Type-check**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/auction-control/types.ts frontend/src/components/auction-control/index.ts
git commit -m "feat(auction-control): scaffold module with phase derivation types"
```

---

## Task 5: `AuctionStepper` component

**Files:**
- Create: `frontend/src/components/auction-control/AuctionStepper.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { Box, Typography } from '@mui/material';
import type { PhaseDerivation } from './types';

interface StepperLabel {
  title: string;
  sub: string;
  done: boolean;
  current: boolean;
}

interface AuctionStepperProps {
  phase: PhaseDerivation;
  retentionCount: number;
  retentionTotal: number;
  mainSoldCount: number;
  onStepClick?: (index: 0 | 1 | 2) => void;
}

export default function AuctionStepper({
  phase, retentionCount, retentionTotal, mainSoldCount, onStepClick,
}: AuctionStepperProps) {
  const steps: StepperLabel[] = [
    {
      title: 'RETENTION',
      sub: phase.isRetention
        ? `OPEN · ${retentionCount}/${retentionTotal} entered`
        : phase.stepIndex > 0
        ? `locked · ${retentionCount} retained`
        : 'not started',
      done: phase.stepIndex > 0,
      current: phase.isRetention,
    },
    {
      title: 'MAIN AUCTION',
      sub: phase.isMain ? `● LIVE · ${mainSoldCount} sold` : phase.stepIndex > 1 ? 'completed' : 'waiting',
      done: phase.stepIndex > 1,
      current: phase.isMain,
    },
    {
      title: 'COMPLETE',
      sub: phase.isComplete ? 'auction completed' : '—',
      done: phase.isComplete,
      current: phase.isComplete,
    },
  ];

  return (
    <Box
      sx={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        p: 2.25,
        mb: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {steps.map((s, i) => {
          const idx = i as 0 | 1 | 2;
          const node = s.done ? (
            <Box sx={nodeStyle('#4ade80', '#fff')}>✓</Box>
          ) : s.current ? (
            <Box sx={nodeStyle('linear-gradient(135deg,#ef4444,#b91c1c)', '#fff', true)}>●</Box>
          ) : (
            <Box sx={nodeStyle('#e2e8f0', '#94a3b8')}>{i + 1}</Box>
          );
          const labelColor = s.done ? '#16a34a' : s.current ? '#b91c1c' : '#94a3b8';
          return (
            <>
              <Box
                key={s.title}
                onClick={() => onStepClick?.(idx)}
                sx={{ flex: 1, textAlign: 'center', cursor: onStepClick ? 'pointer' : 'default' }}
              >
                {node}
                <Typography sx={{ fontSize: '11px', fontWeight: 800, color: labelColor, mt: 0.75, letterSpacing: '0.8px' }}>
                  {s.title}
                </Typography>
                <Typography sx={{ fontSize: '10px', fontWeight: 700, color: labelColor, opacity: 0.85 }}>
                  {s.sub}
                </Typography>
              </Box>
              {i < steps.length - 1 && (
                <Box
                  key={`bar-${i}`}
                  sx={{
                    flex: 2,
                    height: 3,
                    background: steps[i].done
                      ? '#4ade80'
                      : steps[i].current
                      ? 'linear-gradient(90deg,#ef4444 0%,#ef4444 65%,#e2e8f0 65%)'
                      : '#e2e8f0',
                  }}
                />
              )}
            </>
          );
        })}
      </Box>
    </Box>
  );
}

function nodeStyle(bg: string, color: string, glow = false) {
  return {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: bg,
    color,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 800,
    boxShadow: glow ? '0 0 16px rgba(239,68,68,0.45)' : 'none',
  };
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/auction-control/AuctionStepper.tsx
git commit -m "feat(auction-control): add AuctionStepper component"
```

---

## Task 6: `PhaseHeaderCard` component

**Files:**
- Create: `frontend/src/components/auction-control/PhaseHeaderCard.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { Box, Button, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export interface PhaseAction {
  label: string;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  icon?: ReactNode;
}

interface PhaseHeaderCardProps {
  icon: ReactNode;
  label: string;
  title: string;
  subtitle?: string;
  tone: 'neutral' | 'blue' | 'live' | 'success';
  actions: PhaseAction[];
}

const tones = {
  neutral: { bg: '#ffffff', border: '#e2e8f0', accent: '#475569' },
  blue:    { bg: 'linear-gradient(135deg,rgba(96,165,250,0.06),rgba(96,165,250,0.02))', border: 'rgba(96,165,250,0.3)', accent: '#1d4ed8' },
  live:    { bg: 'linear-gradient(135deg,rgba(239,68,68,0.06),rgba(239,68,68,0.02))', border: 'rgba(239,68,68,0.3)', accent: '#b91c1c' },
  success: { bg: 'linear-gradient(135deg,rgba(74,222,128,0.06),rgba(74,222,128,0.02))', border: 'rgba(74,222,128,0.3)', accent: '#16a34a' },
};

export default function PhaseHeaderCard({ icon, label, title, subtitle, tone, actions }: PhaseHeaderCardProps) {
  const t = tones[tone];
  return (
    <Box
      sx={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: '16px',
        p: 2,
        mb: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: '12px', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          {icon}
        </Box>
        <Box>
          <Typography sx={{ fontSize: '10px', color: t.accent, fontWeight: 800, letterSpacing: '1.5px' }}>{label}</Typography>
          <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>{title}</Typography>
          {subtitle && <Typography sx={{ fontSize: '12px', color: '#64748b' }}>{subtitle}</Typography>}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {actions.map((a, i) => (
          <Button
            key={i}
            onClick={a.onClick}
            disabled={a.disabled}
            startIcon={a.icon}
            sx={buttonSx(a.variant)}
          >
            {a.label}
          </Button>
        ))}
      </Box>
    </Box>
  );
}

function buttonSx(variant: PhaseAction['variant']) {
  const base = { fontWeight: 800, fontSize: '13px', borderRadius: '10px', px: 2, py: 1, textTransform: 'none' as const };
  if (variant === 'primary') {
    return { ...base, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#fff',
      '&:hover': { background: 'linear-gradient(135deg,#60a5fa,#3b82f6)' },
      '&:disabled': { background: '#e2e8f0', color: '#94a3b8' } };
  }
  if (variant === 'danger') {
    return { ...base, background: 'linear-gradient(135deg,#6d28d9,#4c1d95)', color: '#fff',
      '&:hover': { background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' },
      '&:disabled': { background: '#e2e8f0', color: '#94a3b8' } };
  }
  return { ...base, background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1',
    '&:hover': { background: '#f1f5f9' },
    '&:disabled': { color: '#94a3b8', borderColor: '#e2e8f0' } };
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/auction-control/PhaseHeaderCard.tsx
git commit -m "feat(auction-control): add PhaseHeaderCard component"
```

---

## Task 7: `RetentionTeamList` component

**Files:**
- Create: `frontend/src/components/auction-control/RetentionTeamList.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { Box, Typography } from '@mui/material';
import type { Team } from '../../types';

export interface TeamRetentionStat {
  used: number;
  spent: number;
}

interface RetentionTeamListProps {
  teams: Team[];
  selectedTeamId: number | null;
  onSelect: (teamId: number) => void;
  maxRetentions: number;
  statsByTeam: Record<number, TeamRetentionStat>;
}

export default function RetentionTeamList({ teams, selectedTeamId, onSelect, maxRetentions, statsByTeam }: RetentionTeamListProps) {
  return (
    <Box sx={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
      <Box sx={{ px: 1.75, py: 1.25, background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
        <Typography sx={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1px' }}>
          TEAMS · {teams.length}
        </Typography>
      </Box>
      <Box sx={{ p: 0.75, maxHeight: 520, overflowY: 'auto' }}>
        {teams.length === 0 && (
          <Typography sx={{ p: 2, fontSize: '12px', color: '#94a3b8' }}>
            No teams in this league. Add teams under Admin · Teams first.
          </Typography>
        )}
        {teams.map(team => {
          const selected = team.id === selectedTeamId;
          const stat = statsByTeam[team.id] ?? { used: 0, spent: 0 };
          const full = stat.used >= maxRetentions;
          const remaining = team.budget - team.budgetSpent;
          const dotColor = team.color || '#94a3b8';

          return (
            <Box
              key={team.id}
              onClick={() => onSelect(team.id)}
              sx={{
                p: 1.25,
                borderRadius: '10px',
                cursor: 'pointer',
                mb: 0.5,
                border: selected ? `1.5px solid ${dotColor}` : '1.5px solid transparent',
                background: selected ? `${dotColor}18` : 'transparent',
                '&:hover': { background: selected ? `${dotColor}22` : '#f8fafc' },
                transition: 'all 0.15s ease',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: dotColor }} />
                  <Typography sx={{ fontSize: '13px', fontWeight: selected ? 800 : 700, color: selected ? '#1e293b' : '#475569' }}>
                    {team.name}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '10px', fontWeight: 800, color: full ? '#16a34a' : '#94a3b8' }}>
                  {stat.used}/{maxRetentions}{full ? ' ✓' : ''}
                </Typography>
              </Box>
              {selected && (
                <Typography sx={{ fontSize: '10px', color: '#475569', mt: 0.25, ml: 2.25 }}>
                  Spent {stat.spent} CR · {remaining} left
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/auction-control/RetentionTeamList.tsx
git commit -m "feat(auction-control): add RetentionTeamList component"
```

---

## Task 8: `RetentionLedger` component

**Files:**
- Create: `frontend/src/components/auction-control/RetentionLedger.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Button, TextField, Alert } from '@mui/material';
import type { Team, Player, League } from '../../types';
import { retentionPick } from '../../api/auctions';

interface RetentionLedgerProps {
  auctionId: number;
  league: League;
  team: Team | null;
  retainedForTeam: Player[];
  availablePlayers: Player[];
  refetch: () => void;
}

export default function RetentionLedger({ auctionId, league, team, retainedForTeam, availablePlayers, refetch }: RetentionLedgerProps) {
  const qc = useQueryClient();
  const [playerId, setPlayerId] = useState<number | ''>('');
  const [price, setPrice] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const usedSlots = retainedForTeam.length;
  const spent = retainedForTeam.reduce((s, p) => s + (p.soldPrice ?? 0), 0);
  const remainingBudget = team ? team.budget - team.budgetSpent : 0;

  const addMut = useMutation({
    mutationFn: () => retentionPick(auctionId, Number(playerId), {
      teamId: team!.id,
      price: price === '' ? undefined : Number(price),
    }),
    onSuccess: () => {
      setPlayerId('');
      setPrice('');
      setError(null);
      qc.invalidateQueries({ queryKey: ['players'] });
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['auction-by-league'] });
      refetch();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setError(e?.response?.data?.message ?? 'Failed to add retention'),
  });

  const selectablePlayers = useMemo(
    () => availablePlayers.filter(p => p.status === 'AVAILABLE'),
    [availablePlayers]
  );

  function onPlayerChange(id: number | '') {
    setPlayerId(id);
    setError(null);
    if (id !== '' && price === '') {
      const p = availablePlayers.find(pl => pl.id === id);
      if (p) setPrice(String(p.basePrice ?? league.retentionCost));
    }
  }

  if (!team) {
    return (
      <Box sx={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', p: 4, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '13px', color: '#94a3b8' }}>
          Select a team on the left to manage its retentions.
        </Typography>
      </Box>
    );
  }

  const dotColor = team.color || '#94a3b8';
  return (
    <Box sx={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
      <Box sx={{ px: 1.75, py: 1.25, background: `${dotColor}15`, borderBottom: `1px solid ${dotColor}33` }}>
        <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
          {team.name} · Retentions
        </Typography>
        <Typography sx={{ fontSize: '11px', color: '#475569' }}>
          {usedSlots}/{league.maxRetentionsPerTeam} slots · {spent} CR spent · {remainingBudget} CR left
        </Typography>
      </Box>

      <Box sx={{ p: 1.75 }}>
        {retainedForTeam.length > 0 ? (
          <Box sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', mb: 1.5, overflow: 'hidden' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '50px 1fr 90px 90px', p: 1, background: '#f8fafc', fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '0.5px' }}>
              <div>#</div><div>PLAYER</div><div>CATEGORY</div><div>PRICE</div>
            </Box>
            {retainedForTeam.map(p => (
              <Box key={p.id} sx={{ display: 'grid', gridTemplateColumns: '50px 1fr 90px 90px', p: 1.2, alignItems: 'center', borderTop: '1px solid #f1f5f9' }}>
                <Typography sx={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{p.playerNumber ? `#${p.playerNumber}` : '—'}</Typography>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{p.name}</Typography>
                <Box>
                  <Box sx={{ display: 'inline-block', px: 0.75, py: 0.2, borderRadius: '6px', background: '#dbeafe', color: '#1d4ed8', fontSize: '10px', fontWeight: 800 }}>
                    {p.category}
                  </Box>
                </Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#b45309' }}>{p.soldPrice ?? '—'} CR</Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography sx={{ fontSize: '12px', color: '#94a3b8', mb: 1.5 }}>
            No retentions yet for this team.
          </Typography>
        )}

        <Box sx={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '10px', p: 1.5 }}>
          <Typography sx={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1px', mb: 1 }}>
            + ADD RETENTION
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 110px', gap: 1 }}>
            <TextField
              select
              size="small"
              SelectProps={{ native: true }}
              value={playerId}
              onChange={e => onPlayerChange(e.target.value === '' ? '' : Number(e.target.value))}
              sx={textFieldSx}
            >
              <option value="">— Choose player ({selectablePlayers.length} available) —</option>
              {selectablePlayers.slice(0, 500).map(p => (
                <option key={p.id} value={p.id}>
                  {p.playerNumber ? `#${p.playerNumber} ` : ''}{p.name} · base {p.basePrice} CR
                </option>
              ))}
            </TextField>
            <TextField
              size="small"
              type="number"
              placeholder="Price (CR)"
              value={price}
              onChange={e => setPrice(e.target.value)}
              sx={textFieldSx}
            />
            <Button
              variant="contained"
              disabled={!playerId || price === '' || addMut.isPending || usedSlots >= league.maxRetentionsPerTeam}
              onClick={() => addMut.mutate()}
              sx={{
                background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                color: '#fff', fontWeight: 800, borderRadius: '10px',
                '&:hover': { background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' },
                '&.Mui-disabled': { background: '#e2e8f0', color: '#94a3b8' },
              }}
            >
              {addMut.isPending ? 'Adding…' : 'Add'}
            </Button>
          </Box>
          <Typography sx={{ fontSize: '10px', color: '#94a3b8', mt: 0.75 }}>
            Base price pre-filled when player selected. Floor: {league.retentionCost} CR.
          </Typography>
          {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 1, borderRadius: '8px', fontSize: '12px' }}>{error}</Alert>}
        </Box>
      </Box>
    </Box>
  );
}

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    background: '#fff',
    borderRadius: '8px',
    fontSize: '12px',
    '&.Mui-focused fieldset': { borderColor: '#f59e0b' },
  },
};
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/auction-control/RetentionLedger.tsx
git commit -m "feat(auction-control): add RetentionLedger with manual price entry"
```

---

## Task 9: `RetentionPanel` component (composes Task 7 + Task 8)

**Files:**
- Create: `frontend/src/components/auction-control/RetentionPanel.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import RetentionTeamList, { type TeamRetentionStat } from './RetentionTeamList';
import RetentionLedger from './RetentionLedger';
import type { AuctionControlContext } from './types';

interface RetentionPanelProps {
  ctx: AuctionControlContext;
}

export default function RetentionPanel({ ctx }: RetentionPanelProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(ctx.teams[0]?.id ?? null);

  const retainedByTeam = useMemo(() => {
    const map: Record<number, typeof ctx.retainedPlayers> = {};
    ctx.retainedPlayers.forEach(p => {
      if (p.teamId == null) return;
      (map[p.teamId] ??= []).push(p);
    });
    return map;
  }, [ctx.retainedPlayers]);

  const statsByTeam = useMemo(() => {
    const out: Record<number, TeamRetentionStat> = {};
    for (const t of ctx.teams) {
      const list = retainedByTeam[t.id] ?? [];
      out[t.id] = {
        used: list.length,
        spent: list.reduce((s, p) => s + (p.soldPrice ?? 0), 0),
      };
    }
    return out;
  }, [ctx.teams, retainedByTeam]);

  const selectedTeam = ctx.teams.find(t => t.id === selectedTeamId) ?? null;
  const retainedForSelected = selectedTeam ? retainedByTeam[selectedTeam.id] ?? [] : [];

  if (!ctx.auction) return null;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px 1fr' }, gap: 1.5 }}>
      <RetentionTeamList
        teams={ctx.teams}
        selectedTeamId={selectedTeamId}
        onSelect={setSelectedTeamId}
        maxRetentions={ctx.league.maxRetentionsPerTeam}
        statsByTeam={statsByTeam}
      />
      <RetentionLedger
        auctionId={ctx.auction.id}
        league={ctx.league}
        team={selectedTeam}
        retainedForTeam={retainedForSelected}
        availablePlayers={ctx.availablePlayers}
        refetch={ctx.refetch}
      />
    </Box>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/auction-control/RetentionPanel.tsx
git commit -m "feat(auction-control): add RetentionPanel composing team list + ledger"
```

---

## Task 10: `MainAuctionPanel` component

**Files:**
- Create: `frontend/src/components/auction-control/MainAuctionPanel.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, LinearProgress } from '@mui/material';
import type { AuctionControlContext } from './types';
import { getCompletionCheck } from '../../api/auctions';
import type { CompletionCheck } from '../../types';

interface MainAuctionPanelProps {
  ctx: AuctionControlContext;
}

export default function MainAuctionPanel({ ctx }: MainAuctionPanelProps) {
  const { auction, teams, availablePlayers, retainedPlayers } = ctx;

  const { data: completion } = useQuery<CompletionCheck>({
    queryKey: ['completion-check', auction?.id],
    queryFn: () => getCompletionCheck(auction!.id),
    enabled: !!auction,
  });

  if (!auction) return null;

  const soldCount = availablePlayers.filter(p => p.status === 'SOLD').length;
  const unsoldCount = availablePlayers.filter(p => p.status === 'UNSOLD').length;
  const remainingCount = availablePlayers.filter(p => p.status === 'AVAILABLE').length;
  const totalCount = availablePlayers.length + retainedPlayers.length;

  const shortPlayersByTeam = new Map(completion?.shortPlayers?.map(s => [s.teamId, s]) ?? []);
  const shortWomenByTeam = new Map(completion?.shortWomen?.map(s => [s.teamId, s]) ?? []);

  return (
    <Box>
      {/* Stats strip */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 1.5 }}>
        <StatCard label="SOLD" value={soldCount} sub={`of ${totalCount} players`} color="#16a34a" />
        <StatCard label="REMAINING" value={remainingCount} sub="in pool" color="#1e293b" />
        <StatCard
          label="CURRENT BID"
          value={auction.currentHighestBid != null ? `${auction.currentHighestBid} CR` : '—'}
          sub={auction.currentPlayerName ?? 'no player up'}
          color="#b45309"
        />
        <StatCard label="UNSOLD" value={unsoldCount} sub="can re-pool" color="#ef4444" />
      </Box>

      {/* Team progress */}
      <Box sx={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', p: 1.75 }}>
        <Typography sx={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1.5px', mb: 1.25 }}>
          TEAM PROGRESS · MIN {completion?.minPlayersPerTeam ?? '—'} · WOMEN {completion?.minWomenPerTeam ?? '—'}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 1 }}>
          {teams.map(team => {
            const picks = (team.playerCount ?? 0);
            const remainingBudget = team.budget - team.budgetSpent;
            const usedPct = team.budget > 0 ? (team.budgetSpent / team.budget) * 100 : 0;
            const shortPlayers = shortPlayersByTeam.get(team.id);
            const shortWomen = shortWomenByTeam.get(team.id);
            const dot = team.color || '#94a3b8';

            return (
              <Box
                key={team.id}
                sx={{
                  p: 1.25,
                  borderRadius: '10px',
                  border: shortPlayers || shortWomen ? '1px solid #fde68a' : '1px solid #e2e8f0',
                  background: shortPlayers || shortWomen ? '#fef3c7' : '#fff',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
                  <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>
                    {team.shortName || team.name}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
                  {picks} picks · {remainingBudget} CR left
                </Typography>
                <LinearProgress variant="determinate" value={Math.min(usedPct, 100)} sx={{ mt: 0.5, height: 3, borderRadius: 2, bgcolor: '#eef2f7',
                  '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${dot}, ${dot}bb)` } }} />
                {shortPlayers && (
                  <Typography sx={{ fontSize: '10px', color: '#b45309', mt: 0.5 }}>
                    ⚠ need {shortPlayers.missing} more
                  </Typography>
                )}
                {shortWomen && (
                  <Typography sx={{ fontSize: '10px', color: '#9d174d', mt: 0.25 }}>
                    ⚠ {shortWomen.current}/{shortWomen.required} women required
                  </Typography>
                )}
                {!shortPlayers && !shortWomen && (
                  <Typography sx={{ fontSize: '10px', color: '#16a34a', mt: 0.5 }}>
                    ✓ valid
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <Box sx={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', p: 1.75 }}>
      <Typography sx={{ fontSize: '10px', color: '#64748b', fontWeight: 800, letterSpacing: '1px' }}>{label}</Typography>
      <Typography sx={{ fontSize: '24px', fontWeight: 900, color, mt: 0.25 }}>{value}</Typography>
      <Typography sx={{ fontSize: '11px', color: '#94a3b8' }}>{sub}</Typography>
    </Box>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/auction-control/MainAuctionPanel.tsx
git commit -m "feat(auction-control): add MainAuctionPanel with stats + team progress"
```

---

## Task 11: `CompletePanel` component

**Files:**
- Create: `frontend/src/components/auction-control/CompletePanel.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { AuctionControlContext } from './types';

interface CompletePanelProps {
  ctx: AuctionControlContext;
}

export default function CompletePanel({ ctx }: CompletePanelProps) {
  const navigate = useNavigate();
  const sold = ctx.availablePlayers.filter(p => p.status === 'SOLD');
  const totalSpend = sold.reduce((s, p) => s + (p.soldPrice ?? 0), 0);
  const topBuy = sold.reduce<typeof sold[number] | null>(
    (best, p) => (!best || (p.soldPrice ?? 0) > (best.soldPrice ?? 0)) ? p : best,
    null,
  );

  return (
    <Box sx={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', p: 3.5, textAlign: 'center' }}>
      <CheckCircleIcon sx={{ fontSize: 64, color: '#4ade80', mb: 1.5 }} />
      <Typography sx={{ fontSize: '22px', fontWeight: 900, color: '#1e293b', mb: 0.5 }}>
        Auction Completed
      </Typography>
      <Typography sx={{ fontSize: '13px', color: '#64748b', mb: 3 }}>
        {ctx.league.name} · {ctx.league.seasonDisplayName || ctx.league.season}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: '10px', color: '#475569', fontWeight: 800, letterSpacing: '1px' }}>PLAYERS SOLD</Typography>
          <Typography sx={{ fontSize: '24px', fontWeight: 900, color: '#1e293b' }}>{sold.length}</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '10px', color: '#475569', fontWeight: 800, letterSpacing: '1px' }}>TOTAL SPEND</Typography>
          <Typography sx={{ fontSize: '24px', fontWeight: 900, color: '#b45309' }}>{totalSpend} CR</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '10px', color: '#475569', fontWeight: 800, letterSpacing: '1px' }}>TOP BUY</Typography>
          <Typography sx={{ fontSize: '16px', fontWeight: 900, color: '#16a34a' }}>
            {topBuy ? `${topBuy.name} (${topBuy.soldPrice} CR)` : '—'}
          </Typography>
        </Box>
      </Box>

      <Button
        variant="contained"
        onClick={() => navigate('/results')}
        sx={{
          background: 'linear-gradient(135deg,#4ade80,#16a34a)',
          fontWeight: 800,
          borderRadius: '10px',
          '&:hover': { background: 'linear-gradient(135deg,#86efac,#22c55e)' },
        }}
      >
        View Results →
      </Button>
    </Box>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc -b`
Expected: no errors. If the project uses a different results route, adjust `navigate('/results')` to match.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/auction-control/CompletePanel.tsx
git commit -m "feat(auction-control): add CompletePanel summary"
```

---

## Task 12: `AuctionControl` top-level shell

**Files:**
- Create: `frontend/src/components/auction-control/AuctionControl.tsx`
- Modify: `frontend/src/components/auction-control/index.ts`

- [ ] **Step 1: Write `AuctionControl.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import GavelIcon from '@mui/icons-material/Gavel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { getLeagues } from '../../api/leagues';
import { getTeams } from '../../api/teams';
import { getPlayers } from '../../api/players';
import {
  getAuctionByLeague, createAuction, startAuction, advanceToLive,
  pauseAuction, resumeAuction, completeAuction,
} from '../../api/auctions';
import type { League, Team, Player, Auction } from '../../types';
import { derivePhase, type AuctionControlContext } from './types';
import AuctionStepper from './AuctionStepper';
import PhaseHeaderCard, { type PhaseAction } from './PhaseHeaderCard';
import RetentionPanel from './RetentionPanel';
import MainAuctionPanel from './MainAuctionPanel';
import CompletePanel from './CompletePanel';

interface AuctionControlProps {
  selectedLeagueId: number | null;
}

export default function AuctionControl({ selectedLeagueId }: AuctionControlProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data: leagues } = useQuery<League[]>({ queryKey: ['leagues'], queryFn: getLeagues });
  const league = leagues?.find(l => l.id === selectedLeagueId) ?? null;

  const { data: auction, isLoading: auctionLoading, refetch } = useQuery<Auction | null>({
    queryKey: ['auction-by-league', league?.id],
    queryFn: () => getAuctionByLeague(league!.id).catch(() => null),
    enabled: !!league,
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['teams', league?.id],
    queryFn: () => getTeams(league!.id),
    enabled: !!league,
  });

  const { data: allPlayers = [] } = useQuery<Player[]>({
    queryKey: ['players', league?.id],
    queryFn: () => getPlayers(league!.id),
    enabled: !!league,
  });

  const phase = derivePhase(auction?.status);

  const retainedPlayers = useMemo(() => allPlayers.filter(p => p.status === 'RETAINED'), [allPlayers]);
  const availablePlayers = useMemo(() => allPlayers.filter(p => p.status !== 'RETAINED'), [allPlayers]);

  const ctx: AuctionControlContext | null = league && {
    auction: auction ?? null,
    league,
    teams,
    availablePlayers,
    retainedPlayers,
    refetch,
  };

  useEffect(() => {
    setActionError(null);
    setActionSuccess(null);
  }, [selectedLeagueId]);

  const lifecycleMut = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: (_d, _v, _ctx) => {
      refetch();
      qc.invalidateQueries({ queryKey: ['auction-by-league'] });
      qc.invalidateQueries({ queryKey: ['players'] });
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setActionError(e?.response?.data?.message ?? 'Action failed'),
  });

  function runAction(label: string, fn: () => Promise<unknown>) {
    setActionError(null);
    setActionSuccess(null);
    lifecycleMut.mutate(fn, {
      onSuccess: () => setActionSuccess(`${label} ✓`),
    });
  }

  if (!league) {
    return (
      <Alert severity="info" sx={{ borderRadius: '12px' }}>
        Select a season from the picker to manage its auction.
      </Alert>
    );
  }

  if (auctionLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: '#b45309' }} /></Box>;
  }

  // No auction record yet
  if (!auction) {
    return (
      <Box>
        {actionError && <Alert severity="error" onClose={() => setActionError(null)} sx={{ borderRadius: '12px', mb: 2 }}>{actionError}</Alert>}
        {actionSuccess && <Alert severity="success" onClose={() => setActionSuccess(null)} sx={{ borderRadius: '12px', mb: 2 }}>{actionSuccess}</Alert>}
        <PhaseHeaderCard
          icon={<AddIcon />}
          label="NO AUCTION YET"
          title="Create the auction for this season"
          subtitle={`${league.name} — auction record will be initialised in SETUP status.`}
          tone="neutral"
          actions={[
            {
              label: 'Create Auction',
              icon: <AddIcon />,
              variant: 'primary',
              onClick: () => runAction('Auction created', () => createAuction(league.id)),
              disabled: lifecycleMut.isPending,
            },
          ]}
        />
      </Box>
    );
  }

  const headerByPhase = (): { icon: JSX.Element; label: string; title: string; subtitle: string; tone: 'neutral' | 'blue' | 'live' | 'success'; actions: PhaseAction[] } => {
    if (auction.status === 'SETUP') {
      return {
        icon: <PlayArrowIcon />,
        label: 'PHASE 1 OF 2 · SETUP',
        title: 'Retention Auction',
        subtitle: 'Click Start Retention to open manual retention entry.',
        tone: 'blue',
        actions: [{
          label: 'Start Retention',
          icon: <PlayArrowIcon />,
          variant: 'primary',
          onClick: () => runAction('Retention started', () => startAuction(auction.id)),
          disabled: lifecycleMut.isPending,
        }],
      };
    }
    if (auction.status === 'RETENTION') {
      return {
        icon: <CheckCircleIcon />,
        label: 'PHASE 1 OF 2 · OPEN',
        title: 'Retention Auction · Manual bid entry',
        subtitle: 'Enter retained players + retention price per team. Lock when done.',
        tone: 'blue',
        actions: [{
          label: 'Lock & Advance to Main →',
          variant: 'primary',
          onClick: () => runAction('Advanced to main', () => advanceToLive(auction.id)),
          disabled: lifecycleMut.isPending,
        }],
      };
    }
    if (auction.status === 'LIVE' || auction.status === 'DRAFT') {
      return {
        icon: <GavelIcon />,
        label: `PHASE 2 OF 2 · ${auction.status}`,
        title: 'Main Auction',
        subtitle: 'Bidding underway on Live Auction page.',
        tone: 'live',
        actions: [
          {
            label: 'Open Live Auction →',
            variant: 'primary',
            onClick: () => navigate('/auction'),
          },
          {
            label: 'Pause',
            icon: <PauseIcon />,
            variant: 'secondary',
            onClick: () => runAction('Paused', () => pauseAuction(auction.id)),
            disabled: lifecycleMut.isPending,
          },
          {
            label: 'Complete Auction',
            variant: 'danger',
            onClick: () => {
              if (window.confirm('Complete this auction? This is final.')) {
                runAction('Completed', () => completeAuction(auction.id));
              }
            },
            disabled: lifecycleMut.isPending,
          },
        ],
      };
    }
    if (auction.status === 'PAUSED') {
      return {
        icon: <PauseIcon />,
        label: 'PHASE 2 OF 2 · PAUSED',
        title: 'Main Auction · Paused',
        subtitle: 'Resume to continue bidding.',
        tone: 'neutral',
        actions: [
          {
            label: 'Resume',
            icon: <PlayArrowIcon />,
            variant: 'primary',
            onClick: () => runAction('Resumed', () => resumeAuction(auction.id)),
            disabled: lifecycleMut.isPending,
          },
          {
            label: 'Complete Auction',
            variant: 'danger',
            onClick: () => {
              if (window.confirm('Complete this auction? This is final.')) {
                runAction('Completed', () => completeAuction(auction.id));
              }
            },
            disabled: lifecycleMut.isPending,
          },
        ],
      };
    }
    // COMPLETED
    return {
      icon: <CheckCircleIcon />,
      label: 'DONE',
      title: 'Auction Completed',
      subtitle: 'View team rosters and results.',
      tone: 'success',
      actions: [{
        label: 'View Results →',
        variant: 'primary',
        onClick: () => navigate('/results'),
      }],
    };
  };

  const header = headerByPhase();

  return (
    <Box>
      {actionError && <Alert severity="error" onClose={() => setActionError(null)} sx={{ borderRadius: '12px', mb: 2 }}>{actionError}</Alert>}
      {actionSuccess && <Alert severity="success" onClose={() => setActionSuccess(null)} sx={{ borderRadius: '12px', mb: 2 }}>{actionSuccess}</Alert>}

      <AuctionStepper
        phase={phase}
        retentionCount={retainedPlayers.length}
        retentionTotal={teams.length * league.maxRetentionsPerTeam}
        mainSoldCount={availablePlayers.filter(p => p.status === 'SOLD').length}
      />

      <PhaseHeaderCard
        icon={header.icon}
        label={header.label}
        title={header.title}
        subtitle={header.subtitle}
        tone={header.tone}
        actions={header.actions}
      />

      {ctx && phase.isRetention && auction.status !== 'SETUP' && <RetentionPanel ctx={ctx} />}
      {ctx && phase.isMain && <MainAuctionPanel ctx={ctx} />}
      {ctx && phase.isComplete && <CompletePanel ctx={ctx} />}
    </Box>
  );
}
```

- [ ] **Step 2: Update `index.ts` to re-export the default**

Final `index.ts`:

```ts
export { default as AuctionControl } from './AuctionControl';
export * from './types';
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc -b`
Expected: no errors. If `JSX.Element` is flagged, replace its usage with `ReactElement` from `react` (React 19 deprecates the global `JSX` namespace alias depending on tsconfig).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/auction-control/AuctionControl.tsx frontend/src/components/auction-control/index.ts
git commit -m "feat(auction-control): add AuctionControl top-level shell"
```

---

## Task 13: Wire `AuctionControl` into `AdminPage.tsx`

**Files:**
- Modify: `frontend/src/pages/AdminPage.tsx` (replace body of `AuctionControlTab` starting at line 1937 through line 2212)

- [ ] **Step 1: Add the import**

At the top of `frontend/src/pages/AdminPage.tsx`, just after the `import type { League, Team, Player, Auction } from '../types';` line, add:

```ts
import { AuctionControl } from '../components/auction-control';
```

- [ ] **Step 2: Replace `AuctionControlTab` body**

Find the existing function declaration:

```tsx
// ---- Auction Control Tab ----
function AuctionControlTab() {
  // ... ~275 lines of state, queries, mutations, JSX ...
}
```

Replace the entire function (everything from `// ---- Auction Control Tab ----` through the closing `}` of `AuctionControlTab`, before `// ---- Main AdminPage ----`) with:

```tsx
// ---- Auction Control Tab ----
function AuctionControlTab() {
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const { data: leagues } = useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: getLeagues,
  });

  const sortedLeagues = (leagues ?? []).slice().sort((a, b) => (b.season ?? '').localeCompare(a.season ?? ''));

  useEffect(() => {
    if (selectedLeagueId === null && sortedLeagues.length > 0) {
      const def = sortedLeagues.find(l => l.status !== 'COMPLETED') ?? sortedLeagues[0];
      setSelectedLeagueId(def.id);
    }
  }, [sortedLeagues, selectedLeagueId]);

  if (sortedLeagues.length === 0) {
    return <Alert severity="warning" sx={{ borderRadius: '12px' }}>No leagues found. Create a league first.</Alert>;
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Auction Control</Typography>
          <Typography sx={{ fontSize: '12px', color: '#64748b' }}>
            Manage retention + main auction lifecycle
          </Typography>
        </Box>
        <SeasonSelector
          leagues={sortedLeagues}
          activeId={selectedLeagueId}
          onChange={setSelectedLeagueId}
        />
      </Box>

      <AuctionControl selectedLeagueId={selectedLeagueId} />
    </Box>
  );
}
```

- [ ] **Step 3: Clean up unused imports at top of `AdminPage.tsx`**

Run: `cd frontend && npm run lint`

Expected: ESLint flags unused imports. For each unused name listed, remove only that name from its `import { ... }` line. Candidates to look out for (verify with lint output before deleting — other tabs in the same file may still use them):

- From `@mui/icons-material/*`: `PlayArrowIcon`, `PauseIcon`, `StopIcon`, `SkipNextIcon`. **Keep** `CheckCircleIcon` only if no other tab uses it; **keep** `PersonIcon`, `EditIcon`, `DeleteOutlineIcon`, `GroupsIcon`, `EmojiEventsIcon`, `SportsCricketIcon`, `GavelIcon`, `AddIcon`, `UploadFileIcon`, `SearchIcon`, `ChevronLeftIcon`, `ChevronRightIcon`, `CloudDownloadIcon` since other tabs reference them.
- From `../api/auctions`: `createAuction`, `startAuction`, `advanceToLive`, `pauseAuction`, `resumeAuction`, `switchToDraft`, `completeAuction`, `putUpPlayer`, `soldPlayer`.
- From `../types`: keep `League`, `Team`, `Player` (other tabs use them); remove `Auction` if grep shows no remaining usage.
- From `@mui/material`: `LinearProgress` and `InputAdornment` may now be unused — check with grep before removing.

After each removal, re-run `npm run lint` until it reports no errors.

- [ ] **Step 4a: Re-run lint to confirm clean**

Run: `cd frontend && npm run lint`
Expected: no errors.

- [ ] **Step 4b: Final type-check + build**

Run: `cd frontend && npm run build`
Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/AdminPage.tsx
git commit -m "feat(admin): wire new AuctionControl shell into AuctionControlTab"
```

Renumber: the previous "Step 4" became "Step 4a" / "Step 4b". This commit stays as the final step.

---

## Task 14: Manual verification + final commit

**Files:** none (verification only)

- [ ] **Step 1: Start backend**

Run: `cd backend && mvn spring-boot:run`
Expected: app listens on port 8080.

- [ ] **Step 2: Start frontend**

Run: `cd frontend && npm run dev`
Expected: Vite dev server listens (typically on :5173).

- [ ] **Step 3: Walk through every phase**

In the browser:

1. **No auction yet** — open Admin → Auction Control for a league that has no auction record. Expect: only "Create Auction" button visible. Click it.
2. **SETUP** — after create, expect "Start Retention" primary button. Click it.
3. **RETENTION** — expect stepper on ①, two-pane retention UI visible. Pick a team on the left, add a player + custom price on the right. Verify it lands in the ledger with the typed price. Try a price above team budget — expect inline error from backend.
4. **Lock & Advance to Main →** — click. Stepper should jump to ②.
5. **LIVE** — expect stats strip + team progress grid. "Open Live Auction →" deep-links to `/auction`. Pause toggles to PAUSED state with Resume button. Complete prompts confirm and finishes.
6. **COMPLETED** — stepper on ③. Summary card with totals + View Results button.

- [ ] **Step 4: Stop servers**

`Ctrl-C` on both.

- [ ] **Step 5: Squash-merge-ready commit log check**

Run: `git log --oneline origin/main..HEAD`
Expected: clean linear history of the 13 task commits above.

- [ ] **Step 6: Done — no extra commit needed**

If any small fixes were made during walkthrough, commit them with a clear message before considering the task complete.

---

## Notes for the implementer

- **Status reactivity**: Whenever a lifecycle action mutates the auction, invalidate `['auction-by-league']`, `['players']`, and `['teams']`. The stepper sub-labels recompute from those queries.
- **SSE**: The existing SSE wiring on the Live Auction page keeps `auction` fresh there. Admin > Auction Control intentionally relies on react-query refetch on mutation success — it does NOT subscribe to SSE. If you want live stats here too, that's a follow-up.
- **DRAFT status**: Treated as a synonym for `LIVE` for stepper position and header. No DRAFT-specific UI in this redesign (out of scope per spec §11).
- **Reset Retention**: Hidden in this plan — backend has no bulk-reset endpoint and the spec said to hide until one exists.
- **Force Complete**: This redesign deliberately uses a simple `window.confirm`. The richer roster-shortfall affordance already exists on `AuctionPage`; if you want to lift it into Admin > Auction Control too, do it in a follow-up PR.
- **Stepper click navigation**: Out of scope for v1. The spec §5.1 mentions click-to-focus past/current phases, but the phase body is currently driven solely by `auction.status`. Implementing click-override needs extra local state and a "go back to retention even though we're LIVE" UX decision. Defer to follow-up.
