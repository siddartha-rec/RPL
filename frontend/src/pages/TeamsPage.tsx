import { useQuery } from '@tanstack/react-query';
import Grid from '@mui/material/Grid';
import {
  Box, Card, CardContent, Typography, CircularProgress, Alert, LinearProgress,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PersonIcon from '@mui/icons-material/Person';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useNavigate } from 'react-router-dom';
import { getLeagues } from '../api/leagues';
import { getTeams } from '../api/teams';
import type { League, Team } from '../types';

function TeamCard({ team, onClick }: { team: Team; onClick: () => void }) {
  const color = team.color || '#888';
  const budgetPct = team.budget > 0 ? Math.min((team.budgetSpent / team.budget) * 100, 100) : 0;
  const remaining = team.budget - team.budgetSpent;
  const playerCount = team.playerCount ?? 0;

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        background: 'rgba(26,26,46,0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '16px',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
        height: '100%',
        position: 'relative',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 16px 48px ${color}40`,
          border: `1px solid ${color}40`,
        },
      }}
    >
      {/* Gradient header area */}
      <Box
        sx={{
          height: 80,
          background: `linear-gradient(135deg, ${color} 0%, ${color}88 60%, ${color}22 100%)`,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          px: 2.5,
          gap: 2,
        }}
      >
        {/* Large watermark short name */}
        <Typography
          sx={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '52px',
            fontWeight: 900,
            color: 'rgba(255,255,255,0.12)',
            letterSpacing: '-1px',
            lineHeight: 1,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {team.shortName}
        </Typography>

        <Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.1, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
          >
            {team.name}
          </Typography>
          <Box
            sx={{
              display: 'inline-block',
              mt: 0.5,
              px: 1,
              py: 0.15,
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(4px)',
              fontSize: '11px',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.5px',
            }}
          >
            {team.shortName}
          </Box>
        </Box>
      </Box>

      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        {/* Stats grid */}
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {[
            { icon: <AccountBalanceWalletIcon sx={{ fontSize: 16 }} />, label: 'Budget', value: `₹${(team.budget / 100000).toFixed(1)}L`, color: '#60a5fa' },
            { icon: <AccountBalanceWalletIcon sx={{ fontSize: 16 }} />, label: 'Spent', value: `₹${(team.budgetSpent / 100000).toFixed(1)}L`, color: '#f59e0b' },
            { icon: <PersonIcon sx={{ fontSize: 16 }} />, label: 'Players', value: playerCount, color: '#4ade80' },
            { icon: <AccountBalanceWalletIcon sx={{ fontSize: 16 }} />, label: 'Remaining', value: `₹${(remaining / 100000).toFixed(1)}L`, color: remaining < 0 ? '#ef4444' : '#a78bfa' },
          ].map(stat => (
            <Grid key={stat.label} size={6}>
              <Box
                sx={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  p: 1.2,
                }}
              >
                <Typography sx={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.3 }}>
                  {stat.label}
                </Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 700, color: stat.color }}>
                  {stat.value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Captain */}
        {team.captainName && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 2,
              p: 1.2,
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: '10px',
            }}
          >
            <EmojiEventsIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
            <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>Captain:</Typography>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b' }}>{team.captainName}</Typography>
          </Box>
        )}

        {/* Budget bar */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Budget Used
            </Typography>
            <Typography sx={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
              {budgetPct.toFixed(0)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={budgetPct}
            sx={{
              height: 5,
              borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.06)',
              '& .MuiLinearProgress-bar': {
                background: budgetPct > 85
                  ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                  : `linear-gradient(90deg, ${color}, ${color}cc)`,
                borderRadius: 3,
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}

function LeagueTeams({ league }: { league: League }) {
  const navigate = useNavigate();
  const { data: teams, isLoading, error } = useQuery<Team[]>({
    queryKey: ['teams', league.id],
    queryFn: () => getTeams(league.id),
  });

  return (
    <Box sx={{ mb: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '2px', textTransform: 'uppercase' }}>
          {league.name}
        </Typography>
        <Box sx={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
        <Typography sx={{ fontSize: '12px', color: '#64748b', background: 'rgba(255,255,255,0.05)', px: 1.5, py: 0.5, borderRadius: '8px' }}>
          Season {league.season}
        </Typography>
        {teams && (
          <Box
            sx={{
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: '20px',
              px: 1.5,
              py: 0.25,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <GroupsIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>{teams.length}</Typography>
          </Box>
        )}
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#f59e0b' }} />
        </Box>
      )}
      {error && <Alert severity="error" sx={{ borderRadius: '12px' }}>Failed to load teams</Alert>}
      {teams && (
        <Grid container spacing={2.5}>
          {teams.map((team, i) => (
            <Grid
              key={team.id}
              size={{ xs: 12, sm: 6, md: 4 }}
              sx={{ animation: 'fadeIn 0.5s ease', animationDelay: `${i * 0.06}s`, animationFillMode: 'both' }}
            >
              <TeamCard team={team} onClick={() => navigate(`/teams/${team.id}`)} />
            </Grid>
          ))}
          {teams.length === 0 && (
            <Grid size={12}>
              <Box
                sx={{
                  textAlign: 'center',
                  py: 8,
                  color: '#64748b',
                  background: 'rgba(26,26,46,0.5)',
                  borderRadius: '16px',
                  border: '1px dashed rgba(255,255,255,0.08)',
                }}
              >
                <GroupsIcon sx={{ fontSize: 40, mb: 1, opacity: 0.3 }} />
                <Typography>No teams in this league.</Typography>
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
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress sx={{ color: '#f59e0b' }} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ borderRadius: '12px' }}>Failed to load leagues</Alert>;
  }

  const totalTeams = (leagues ?? []).reduce<number>((s, _) => s, 0);

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease' }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, mb: 4 }}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 0.5,
            }}
          >
            Teams
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: '14px' }}>
            All teams across active leagues
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Box
          sx={{
            background: 'rgba(96,165,250,0.15)',
            border: '1px solid rgba(96,165,250,0.3)',
            borderRadius: '20px',
            px: 2,
            py: 0.75,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <GroupsIcon sx={{ fontSize: 16, color: '#60a5fa' }} />
          <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#60a5fa' }}>
            {(leagues ?? []).length} League{(leagues ?? []).length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      </Box>

      {(leagues ?? []).length === 0 && (
        <Alert severity="info" sx={{ borderRadius: '12px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa' }}>
          No leagues found.
        </Alert>
      )}
      {(leagues ?? []).map(league => (
        <LeagueTeams key={league.id} league={league} />
      ))}
    </Box>
  );
}
