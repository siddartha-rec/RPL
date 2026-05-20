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
