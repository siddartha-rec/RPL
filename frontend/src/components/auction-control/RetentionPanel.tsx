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
