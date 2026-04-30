import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import { getLeagues } from '../api/leagues';
import { getTeams } from '../api/teams';
import { getStandings } from '../api/history';
import type { League, Team, TeamStanding } from '../types';

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE: { bg: 'rgba(74,222,128,0.15)', color: '#047857', label: 'Active' },
  SETUP: { bg: 'rgba(245,158,11,0.15)', color: '#b45309', label: 'Setup' },
  COMPLETED: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', label: 'Completed' },
};

function rankStyle(rank: number) {
  if (rank === 1) return { color: '#b45309', bg: 'linear-gradient(135deg, rgba(251,191,36,0.25), rgba(245,158,11,0.1))', border: 'rgba(251,191,36,0.45)' };
  if (rank === 2) return { color: '#475569', bg: 'linear-gradient(135deg, rgba(203,213,225,0.2), rgba(148,163,184,0.08))', border: 'rgba(203,213,225,0.35)' };
  if (rank === 3) return { color: '#fb923c', bg: 'linear-gradient(135deg, rgba(251,146,60,0.22), rgba(234,88,12,0.08))', border: 'rgba(251,146,60,0.4)' };
  return { color: '#64748b', bg: '#eef2f7', border: '#e2e8f0' };
}

function StandingsTable({ standings, teams }: { standings: TeamStanding[]; teams: Team[] }) {
  if (standings.length === 0) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 6,
          background: '#ffffff',
          border: '1px dashed #e2e8f0',
          borderRadius: '14px',
          color: '#475569',
        }}
      >
        <MilitaryTechIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1.5 }} />
        <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>No standings recorded for this season</Typography>
      </Box>
    );
  }

  const teamById = new Map(teams.map(t => [t.id, t]));
  const sorted = [...standings].sort((a, b) => a.rank - b.rank);

  return (
    <Box
      sx={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(10px)',
        border: '1px solid #eef2f7',
        borderRadius: '14px',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr 100px 1fr',
          alignItems: 'center',
          px: 2.5,
          py: 1.25,
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        {['Rank', 'Team', 'Points', 'Notes'].map(c => (
          <Typography
            key={c}
            sx={{
              fontSize: '10px',
              fontWeight: 800,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              ...(c === 'Rank' && { textAlign: 'center' }),
              ...(c === 'Points' && { textAlign: 'right' }),
            }}
          >
            {c}
          </Typography>
        ))}
      </Box>

      {sorted.map((s, i) => {
        const team = teamById.get(s.teamId);
        const teamColor = team?.color || '#888';
        const rs = rankStyle(s.rank);
        return (
          <Box
            key={s.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 100px 1fr',
              alignItems: 'center',
              px: 2.5,
              py: 1.4,
              borderBottom: '1px solid #eef2f7',
              background: i % 2 === 0 ? 'rgba(248,250,252,0.6)' : 'transparent',
              '&:last-child': { borderBottom: 'none' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '8px',
                  background: rs.bg,
                  border: `1px solid ${rs.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 900,
                  color: rs.color,
                }}
              >
                {s.rank}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, overflow: 'hidden' }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: teamColor,
                  boxShadow: `0 0 8px ${teamColor}90`,
                  flexShrink: 0,
                }}
              />
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }} noWrap>
                {s.teamName}
              </Typography>
            </Box>

            <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#b45309', textAlign: 'right' }}>
              {s.points ?? '—'}
            </Typography>

            <Typography sx={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }} noWrap>
              {s.notes || '—'}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

function SeasonHistoryCard({ league }: { league: League }) {
  const status = STATUS_STYLES[league.status] ?? STATUS_STYLES.SETUP;

  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ['teams', league.id],
    queryFn: () => getTeams(league.id),
  });

  const { data: standings, isLoading: standingsLoading, error } = useQuery<TeamStanding[]>({
    queryKey: ['standings', league.id],
    queryFn: () => getStandings(league.id),
  });

  const champion = useMemo(() => {
    if (!standings || standings.length === 0) return null;
    return [...standings].sort((a, b) => a.rank - b.rank)[0];
  }, [standings]);

  return (
    <Box
      sx={{
        background: '#ffffff',
        border: '1px solid #eef2f7',
        borderRadius: '18px',
        p: 3,
        mb: 3,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2.5 }}>
        <Typography sx={{ fontSize: '22px', fontWeight: 900, color: '#1e293b' }}>
          {league.name}
        </Typography>
        <Box
          sx={{
            px: 1.25,
            py: 0.4,
            borderRadius: '8px',
            background: 'rgba(167,139,250,0.15)',
            border: '1px solid rgba(167,139,250,0.3)',
          }}
        >
          <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#6d28d9', letterSpacing: '0.8px' }}>
            {league.season}
          </Typography>
        </Box>
        <Box
          sx={{
            px: 1.25,
            py: 0.4,
            borderRadius: '8px',
            background: status.bg,
            border: `1px solid ${status.color}45`,
          }}
        >
          <Typography sx={{ fontSize: '11px', fontWeight: 800, color: status.color, letterSpacing: '0.8px' }}>
            {status.label.toUpperCase()}
          </Typography>
        </Box>
        {champion && (
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <EmojiEventsIcon sx={{ fontSize: 18, color: '#b45309' }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#b45309' }}>
              Champion: {champion.teamName}
            </Typography>
          </Box>
        )}
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#b91c1c' }}
        >
          Failed to load standings
        </Alert>
      )}

      {(teamsLoading || standingsLoading) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#6d28d9' }} size={28} />
        </Box>
      )}

      {!teamsLoading && !standingsLoading && (
        <StandingsTable standings={standings ?? []} teams={teams ?? []} />
      )}
    </Box>
  );
}

export default function HistoryPage() {
  const { data: leagues, isLoading, error } = useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: getLeagues,
  });

  // Sort: completed first (most recent feels historical), then active, then setup
  const sorted = useMemo(() => {
    const order: Record<string, number> = { COMPLETED: 0, ACTIVE: 1, SETUP: 2 };
    return (leagues ?? []).slice().sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  }, [leagues]);

  return (
    <Box sx={{ animation: 'fadeIn 0.45s ease', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      <Box sx={{ mb: 4, pb: 3, borderBottom: '1px solid #eef2f7' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 900,
              background: 'linear-gradient(135deg, #a78bfa 0%, #60a5fa 60%, #4ade80 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-1px',
              lineHeight: 1,
            }}
          >
            Season History
          </Typography>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: '10px',
              background: 'rgba(167,139,250,0.12)',
              border: '1px solid rgba(167,139,250,0.28)',
              fontSize: '11px',
              fontWeight: 800,
              color: '#6d28d9',
              letterSpacing: '0.8px',
              alignSelf: 'center',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <HistoryIcon sx={{ fontSize: 13 }} />
            ARCHIVE
          </Box>
        </Box>
        <Typography sx={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>
          Past seasons and final standings across the Recykal Premier League
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

      {!isLoading && sorted.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: '12px' }}>
          No seasons created yet.
        </Alert>
      )}

      {sorted.map(l => (
        <SeasonHistoryCard key={l.id} league={l} />
      ))}
    </Box>
  );
}
