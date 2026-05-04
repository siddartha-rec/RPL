import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import StarIcon from '@mui/icons-material/Star';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import PersonIcon from '@mui/icons-material/Person';
import { getLeagues } from '../api/leagues';
import { getTeams } from '../api/teams';
import { getPlayers } from '../api/players';
import type { League, Team, Player } from '../types';

function SeasonPills({
  leagues,
  activeId,
  onChange,
}: {
  leagues: League[];
  activeId: number | null;
  onChange: (id: number) => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        background: 'rgba(255,255,255,0.92)',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        p: 0.5,
        gap: 0.4,
      }}
    >
      {leagues.map(l => {
        const active = activeId === l.id;
        return (
          <Box
            key={l.id}
            onClick={() => onChange(l.id)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 2,
              py: 0.9,
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              transition: 'all 0.2s ease',
              userSelect: 'none',
              ...(active
                ? {
                    background: 'linear-gradient(135deg, rgba(167,139,250,0.25), rgba(139,92,246,0.12))',
                    border: '1px solid rgba(167,139,250,0.45)',
                    color: '#6d28d9',
                    boxShadow: '0 2px 8px rgba(167,139,250,0.2)',
                  }
                : {
                    color: '#64748b',
                    border: '1px solid transparent',
                    '&:hover': {
                      color: '#94a3b8',
                      background: '#f8fafc',
                      border: '1px solid #eef2f7',
                    },
                  }),
            }}
          >
            {(l.seasonDisplayName || l.season)}
          </Box>
        );
      })}
    </Box>
  );
}

function TeamResultCard({ team, players }: { team: Team; players: Player[] }) {
  const color = team.color || '#888';
  const totalSpent = players.reduce((sum, p) => sum + (p.soldPrice ?? 0), 0);
  const captain = players.find(p => p.isCaptain);
  const cricketCount = players.filter(p => p.category === 'CRICKET').length;
  const otherCount = players.filter(p => p.category === 'OTHER').length;

  const sorted = [...players].sort((a, b) => {
    if (a.isCaptain !== b.isCaptain) return a.isCaptain ? -1 : 1;
    return (b.soldPrice ?? 0) - (a.soldPrice ?? 0);
  });

  return (
    <Box
      sx={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(10px)',
        border: '1px solid #eef2f7',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      {/* Header band */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${color} 0%, ${color}aa 60%, ${color}44 100%)`,
          px: 2.5,
          py: 1.75,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          position: 'relative',
        }}
      >
        <Box>
          <Typography sx={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.7)', letterSpacing: '1.5px' }}>
            {team.shortName || team.name.toUpperCase()}
          </Typography>
          <Typography sx={{ fontSize: '20px', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
            {team.name}
          </Typography>
        </Box>
        <Box sx={{ ml: 'auto', textAlign: 'right' }}>
          <Typography sx={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '1px' }}>
            SPENT
          </Typography>
          <Typography sx={{ fontSize: '20px', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
            {totalSpent} CR
          </Typography>
        </Box>
      </Box>

      {/* Stats strip */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2.5,
          px: 2.5,
          py: 1.25,
          background: '#f8fafc',
          borderBottom: '1px solid #eef2f7',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <PersonIcon sx={{ fontSize: 14, color: '#64748b' }} />
          <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
            {players.length} players
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <SportsCricketIcon sx={{ fontSize: 14, color: '#1d4ed8' }} />
          <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8' }}>
            {cricketCount}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <PersonIcon sx={{ fontSize: 14, color: '#6d28d9' }} />
          <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#6d28d9' }}>
            {otherCount}
          </Typography>
        </Box>
        {captain && (
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <StarIcon sx={{ fontSize: 14, color: '#b45309' }} />
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#b45309' }}>
              {captain.name}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Players list */}
      {sorted.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5, color: '#475569' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>No players</Typography>
        </Box>
      ) : (
        sorted.map((p, i) => (
          <Box
            key={p.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: '24px 1fr 90px 90px',
              alignItems: 'center',
              gap: 1.5,
              px: 2.5,
              py: 1.1,
              borderBottom: '1px solid #eef2f7',
              background: i % 2 === 0 ? 'rgba(248,250,252,0.6)' : 'transparent',
              '&:last-child': { borderBottom: 'none' },
            }}
          >
            <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#475569', textAlign: 'right' }}>
              {i + 1}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }} noWrap>
                {p.name}
              </Typography>
              {p.isCaptain && (
                <Box
                  sx={{
                    width: 18,
                    height: 18,
                    borderRadius: '5px',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    fontWeight: 900,
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  C
                </Box>
              )}
            </Box>
            <Typography
              sx={{
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.6px',
                textAlign: 'right',
                color: p.status === 'RETAINED' ? '#60a5fa' : '#94a3b8',
              }}
            >
              {p.status === 'RETAINED' ? 'RETAINED' : p.category === 'CRICKET' ? 'CRICKET' : 'OTHER'}
            </Typography>
            <Typography
              sx={{
                fontSize: '13px',
                fontWeight: 800,
                textAlign: 'right',
                color: p.soldPrice ? '#4ade80' : '#475569',
              }}
            >
              {p.soldPrice ? `${p.soldPrice} CR` : '—'}
            </Typography>
          </Box>
        ))
      )}
    </Box>
  );
}

function UnsoldSection({ players }: { players: Player[] }) {
  if (players.length === 0) return null;

  return (
    <Box
      sx={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(239,68,68,0.18)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          background: 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(220,38,38,0.06))',
          borderBottom: '1px solid rgba(239,68,68,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#b91c1c', letterSpacing: '1.5px' }}>
          UNSOLD
        </Typography>
        <Typography sx={{ fontSize: '20px', fontWeight: 900, color: '#b91c1c', lineHeight: 1 }}>
          {players.length}
        </Typography>
        <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', ml: 1 }}>
          players went unsold
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 0,
        }}
      >
        {players.map(p => (
          <Box
            key={p.id}
            sx={{
              px: 2.5,
              py: 1.25,
              borderRight: '1px solid #eef2f7',
              borderBottom: '1px solid #eef2f7',
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
            }}
          >
            {p.category === 'CRICKET' ? (
              <SportsCricketIcon sx={{ fontSize: 14, color: '#475569' }} />
            ) : (
              <PersonIcon sx={{ fontSize: 14, color: '#475569' }} />
            )}
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', flex: 1 }} noWrap>
              {p.name}
            </Typography>
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
              {p.basePrice} CR
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function ResultsContent({ leagues }: { leagues: League[] }) {
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);

  // Default: most recently completed, otherwise first available
  useEffect(() => {
    if (selectedLeagueId !== null) return;
    const completed = leagues.find(l => l.status === 'COMPLETED');
    setSelectedLeagueId((completed ?? leagues[0])?.id ?? null);
  }, [leagues, selectedLeagueId]);

  const league = useMemo(
    () => leagues.find(l => l.id === selectedLeagueId) ?? null,
    [leagues, selectedLeagueId],
  );

  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ['teams', league?.id],
    queryFn: () => getTeams(league!.id),
    enabled: !!league,
  });

  const { data: players, isLoading: playersLoading, error } = useQuery<Player[]>({
    queryKey: ['players-all', league?.id],
    queryFn: () => getPlayers(league!.id),
    enabled: !!league,
  });

  const grouped = useMemo(() => {
    if (!teams || !players) return { byTeam: new Map<number, Player[]>(), unsold: [] as Player[] };
    const byTeam = new Map<number, Player[]>();
    teams.forEach(t => byTeam.set(t.id, []));
    const unsold: Player[] = [];
    players.forEach(p => {
      if (p.status === 'UNSOLD') {
        unsold.push(p);
      } else if (p.teamId && byTeam.has(p.teamId)) {
        byTeam.get(p.teamId)!.push(p);
      }
    });
    return { byTeam, unsold };
  }, [teams, players]);

  const totalSold = useMemo(
    () => (players ?? []).filter(p => p.status === 'SOLD' || p.status === 'RETAINED').length,
    [players],
  );

  const isLoading = teamsLoading || playersLoading;

  return (
    <Box>
      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <SeasonPills
          leagues={leagues}
          activeId={league?.id ?? null}
          onChange={id => setSelectedLeagueId(id)}
        />
        {league && (
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                background: 'rgba(74,222,128,0.1)',
                border: '1px solid rgba(74,222,128,0.28)',
                borderRadius: '12px',
                px: 1.75,
                py: 0.75,
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#047857', letterSpacing: '1px' }}>
                {totalSold} ACQUIRED
              </Typography>
            </Box>
            <Box
              sx={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.28)',
                borderRadius: '12px',
                px: 1.75,
                py: 0.75,
              }}
            >
              <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#b91c1c', letterSpacing: '1px' }}>
                {grouped.unsold.length} UNSOLD
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#b91c1c' }}
        >
          Failed to load results
        </Alert>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress sx={{ color: '#6d28d9' }} size={36} />
        </Box>
      )}

      {!isLoading && teams && players && (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
              gap: 2.5,
              mb: 3,
            }}
          >
            {teams.map(t => (
              <TeamResultCard key={t.id} team={t} players={grouped.byTeam.get(t.id) ?? []} />
            ))}
          </Box>

          <UnsoldSection players={grouped.unsold} />
        </>
      )}
    </Box>
  );
}

export default function ResultsPage() {
  const { data: leagues, isLoading, error } = useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: getLeagues,
  });

  return (
    <Box sx={{ animation: 'fadeIn 0.45s ease', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      {/* Page header */}
      <Box sx={{ mb: 4, pb: 3, borderBottom: '1px solid #eef2f7' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 900,
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 60%, #b45309 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-1px',
              lineHeight: 1,
            }}
          >
            Auction Results
          </Typography>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: '10px',
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.28)',
              fontSize: '11px',
              fontWeight: 800,
              color: '#b45309',
              letterSpacing: '0.8px',
              alignSelf: 'center',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <EmojiEventsIcon sx={{ fontSize: 13 }} />
            FINAL ROSTERS
          </Box>
        </Box>
        <Typography sx={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>
          Final squads, sold prices, and unsold players for the selected season
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ borderRadius: '12px' }}>
          Failed to load seasons
        </Alert>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress sx={{ color: '#6d28d9' }} size={36} />
        </Box>
      )}

      {leagues && leagues.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: '12px' }}>
          No seasons created yet.
        </Alert>
      )}

      {leagues && leagues.length > 0 && <ResultsContent leagues={leagues} />}
    </Box>
  );
}
