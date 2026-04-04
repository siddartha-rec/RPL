import { useQuery } from '@tanstack/react-query';
import Grid from '@mui/material/Grid';
import {
  Box, Typography, CircularProgress, Alert, LinearProgress,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PersonIcon from '@mui/icons-material/Person';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useNavigate } from 'react-router-dom';
import { getLeagues } from '../api/leagues';
import { getTeams } from '../api/teams';
import type { League, Team } from '../types';

function TeamCard({ team, index, onClick }: { team: Team; index: number; onClick: () => void }) {
  const color = team.color || '#888';
  const budgetPct = team.budget > 0 ? Math.min((team.budgetSpent / team.budget) * 100, 100) : 0;
  const remaining = team.budget - team.budgetSpent;
  const playerCount = team.playerCount ?? 0;

  return (
    <Box
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        background: 'rgba(15,15,35,0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '14px',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        animation: 'fadeIn 0.6s ease',
        animationDelay: `${index * 0.07}s`,
        animationFillMode: 'both',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 40px ${color}40`,
          border: `1px solid ${color}50`,
        },
      }}
    >
      {/* Gradient header — tall, dramatic */}
      <Box
        sx={{
          minHeight: 80,
          background: `linear-gradient(140deg, ${color} 0%, ${color}bb 45%, ${color}33 80%, rgba(15,15,35,0) 100%)`,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          px: 2.5,
          pb: 1.5,
          pt: 1.5,
        }}
      >
        {/* Short name watermark */}
        <Typography
          sx={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '56px',
            fontWeight: 900,
            color: 'rgba(255,255,255,0.09)',
            letterSpacing: '-3px',
            lineHeight: 1,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {team.shortName}
        </Typography>

        {/* Short name badge */}
        <Box
          sx={{
            display: 'inline-flex',
            alignSelf: 'flex-start',
            mb: 1,
            px: 1.2,
            py: 0.3,
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.2)',
            fontSize: '11px',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}
        >
          {team.shortName}
        </Box>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.15,
            textShadow: '0 2px 12px rgba(0,0,0,0.6)',
            letterSpacing: '-0.3px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {team.name}
        </Typography>
      </Box>

      {/* Card body */}
      <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Stats grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          {[
            { label: 'Budget', value: `${team.budget} CR`, accent: '#60a5fa' },
            { label: 'Spent', value: `${team.budgetSpent} CR`, accent: '#f59e0b' },
            { label: 'Left', value: `${remaining} CR`, accent: remaining < 0 ? '#ef4444' : '#4ade80' },
            { label: 'Players', value: String(playerCount), accent: '#a78bfa' },
          ].map(stat => (
            <Box
              key={stat.label}
              sx={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '8px',
                px: 1,
                py: 0.8,
              }}
            >
              <Typography sx={{ fontSize: '9px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.2 }}>
                {stat.label}
              </Typography>
              <Typography sx={{ fontSize: '13px', fontWeight: 800, color: stat.accent }}>
                {stat.value}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Captain row */}
        {team.captainName && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.8,
              px: 1.2,
              py: 0.5,
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.18)',
              borderRadius: '8px',
            }}
          >
            <EmojiEventsIcon sx={{ fontSize: 14, color: '#f59e0b', flexShrink: 0 }} />
            <Typography sx={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>Captain:</Typography>
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>
              {team.captainName}
            </Typography>
          </Box>
        )}

        {/* Budget utilization bar */}
        <Box sx={{ mt: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
            <Typography sx={{ fontSize: '10px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Budget Used
            </Typography>
            <Typography sx={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>
              {budgetPct.toFixed(0)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={budgetPct}
            sx={{
              height: 4,
              borderRadius: 4,
              bgcolor: 'rgba(255,255,255,0.06)',
              '& .MuiLinearProgress-bar': {
                background: budgetPct > 85
                  ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                  : `linear-gradient(90deg, ${color}, ${color}bb)`,
                borderRadius: 4,
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}

function LeagueTeams({ league }: { league: League }) {
  const navigate = useNavigate();
  const { data: teams, isLoading, error } = useQuery<Team[]>({
    queryKey: ['teams', league.id],
    queryFn: () => getTeams(league.id),
  });

  return (
    <Box sx={{ mb: 6 }}>
      {/* League section header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 3.5,
          pb: 2,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#475569',
              letterSpacing: '2.5px',
              textTransform: 'uppercase',
              mb: 0.25,
            }}
          >
            {league.name}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
          <CalendarTodayIcon sx={{ fontSize: 12, color: '#64748b' }} />
          <Box
            sx={{
              px: 1.5,
              py: 0.3,
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: '12px',
              fontWeight: 600,
              color: '#94a3b8',
            }}
          >
            Season {league.season}
          </Box>
        </Box>

        {teams && (
          <Box
            sx={{
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.28)',
              borderRadius: '20px',
              px: 1.5,
              py: 0.4,
              display: 'flex',
              alignItems: 'center',
              gap: 0.6,
            }}
          >
            <GroupsIcon sx={{ fontSize: 13, color: '#f59e0b' }} />
            <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#f59e0b' }}>
              {teams.length} {teams.length === 1 ? 'Team' : 'Teams'}
            </Typography>
          </Box>
        )}

        <Box sx={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: '#f59e0b' }} size={32} />
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
          Failed to load teams
        </Alert>
      )}
      {teams && (
        <Grid container spacing={3}>
          {teams.map((team, i) => (
            <Grid key={team.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <TeamCard team={team} index={i} onClick={() => navigate(`/teams/${team.id}`)} />
            </Grid>
          ))}
          {teams.length === 0 && (
            <Grid size={12}>
              <Box
                sx={{
                  textAlign: 'center',
                  py: 10,
                  color: '#475569',
                  background: 'rgba(15,15,35,0.5)',
                  borderRadius: '20px',
                  border: '1px dashed rgba(255,255,255,0.07)',
                }}
              >
                <GroupsIcon sx={{ fontSize: 44, mb: 1.5, opacity: 0.25 }} />
                <Typography sx={{ fontSize: '15px', fontWeight: 600 }}>No teams in this league yet.</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}

export default function TeamsPage() {
  const { data: leagues, isLoading, error } = useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: getLeagues,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress sx={{ color: '#f59e0b' }} size={40} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
        Failed to load leagues
      </Alert>
    );
  }

  const leagueList = leagues ?? [];
  const totalTeams = leagueList.reduce((sum, _) => sum, 0);

  return (
    <Box sx={{ animation: 'fadeIn 0.45s ease', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      {/* Page Hero */}
      <Box
        sx={{
          mb: 5,
          pb: 4,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 40%, #ffffff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-1px',
                  lineHeight: 1,
                }}
              >
                Teams
              </Typography>
              {/* Season badge */}
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: '10px',
                  background: 'rgba(245,158,11,0.15)',
                  border: '1px solid rgba(245,158,11,0.35)',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#f59e0b',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  alignSelf: 'center',
                }}
              >
                RPL 2025
              </Box>
            </Box>
            <Typography sx={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>
              All franchises competing in the Recykal Premier League
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }} />

          {/* Leagues & Teams counter */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box
              sx={{
                background: 'rgba(96,165,250,0.1)',
                border: '1px solid rgba(96,165,250,0.25)',
                borderRadius: '14px',
                px: 2,
                py: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <CalendarTodayIcon sx={{ fontSize: 15, color: '#60a5fa' }} />
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#60a5fa' }}>
                {leagueList.length} {leagueList.length === 1 ? 'League' : 'Leagues'}
              </Typography>
            </Box>
            <Box
              sx={{
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: '14px',
                px: 2,
                py: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <GroupsIcon sx={{ fontSize: 15, color: '#f59e0b' }} />
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b' }}>
                {totalTeams} Teams
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {leagueList.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 12,
            color: '#475569',
            background: 'rgba(15,15,35,0.5)',
            borderRadius: '20px',
            border: '1px dashed rgba(255,255,255,0.07)',
          }}
        >
          <GroupsIcon sx={{ fontSize: 52, mb: 2, opacity: 0.2 }} />
          <Typography sx={{ fontSize: '16px', fontWeight: 600 }}>No leagues found.</Typography>
        </Box>
      )}

      {leagueList.map(league => (
        <LeagueTeams key={league.id} league={league} />
      ))}
    </Box>
  );
}
