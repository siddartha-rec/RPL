import { useQuery } from '@tanstack/react-query';
import Grid from '@mui/material/Grid';
import {
  Box, Card, CardContent, Typography, Chip, CircularProgress, Alert, LinearProgress,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import { useNavigate } from 'react-router-dom';
import { getLeagues } from '../api/leagues';
import { getTeams } from '../api/teams';
import type { League, Team } from '../types';

function StatusChip({ status }: { status: string }) {
  const styleMap: Record<string, { bg: string; color: string; pulse?: boolean }> = {
    SETUP: { bg: 'rgba(100,116,139,0.2)', color: '#94a3b8' },
    RETENTION: { bg: 'rgba(96,165,250,0.2)', color: '#60a5fa' },
    DRAFT: { bg: 'rgba(96,165,250,0.2)', color: '#60a5fa' },
    LIVE: { bg: 'rgba(239,68,68,0.2)', color: '#ef4444', pulse: true },
    PAUSED: { bg: 'rgba(245,158,11,0.2)', color: '#f59e0b' },
    COMPLETED: { bg: 'rgba(74,222,128,0.2)', color: '#4ade80' },
  };
  const style = styleMap[status] ?? { bg: 'rgba(100,116,139,0.2)', color: '#94a3b8' };
  return (
    <Box
      component="span"
      sx={{
        px: 1.5,
        py: 0.5,
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.color}40`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        ...(style.pulse && { animation: 'pulse 2s infinite' }),
      }}
    >
      {status === 'LIVE' && (
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: '#ef4444',
            animation: 'pulse 1s infinite',
          }}
        />
      )}
      {status}
    </Box>
  );
}

function QuickStatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <Card
      sx={{
        background: 'rgba(26,26,46,0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '16px',
        transition: 'all 0.3s ease',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 32px ${color}30` },
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '12px',
            background: `${color}20`,
            border: `1px solid ${color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {label}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2 }}>
            {value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

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
        borderLeft: `4px solid ${color}`,
        transition: 'all 0.3s ease',
        overflow: 'hidden',
        position: 'relative',
        height: '100%',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 40px ${color}40`,
          borderColor: `${color}80`,
        },
      }}
    >
      {/* Top gradient overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 80,
          background: `linear-gradient(135deg, ${color}15 0%, transparent 100%)`,
          pointerEvents: 'none',
        }}
      />
      {/* Watermark short name */}
      <Typography
        sx={{
          position: 'absolute',
          bottom: -10,
          right: -10,
          fontSize: '80px',
          fontWeight: 900,
          color: `${color}08`,
          lineHeight: 1,
          letterSpacing: '-2px',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 0,
        }}
      >
        {team.shortName}
      </Typography>

      <CardContent sx={{ position: 'relative', zIndex: 1, p: 2.5, '&:last-child': { pb: 2.5 } }}>
        {/* Header row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2, mb: 0.5 }}>
              {team.name}
            </Typography>
            <Box
              sx={{
                display: 'inline-block',
                px: 1,
                py: 0.25,
                borderRadius: '8px',
                background: `${color}25`,
                border: `1px solid ${color}50`,
                color,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.5px',
              }}
            >
              {team.shortName}
            </Box>
          </Box>
          <Box
            sx={{
              background: `${color}20`,
              border: `1px solid ${color}40`,
              borderRadius: '10px',
              px: 1.5,
              py: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <PersonIcon sx={{ fontSize: 14, color }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color }}>{playerCount}</Typography>
          </Box>
        </Box>

        {/* Captain */}
        {team.captainName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Box
              sx={{
                width: 18,
                height: 18,
                borderRadius: '50%',
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
            <Typography sx={{ fontSize: '13px', color: '#94a3b8' }}>
              {team.captainName}
            </Typography>
          </Box>
        )}

        {/* Budget bar */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Budget
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
              ₹{(team.budgetSpent / 100000).toFixed(1)}L / ₹{(team.budget / 100000).toFixed(1)}L
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={budgetPct}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.08)',
              '& .MuiLinearProgress-bar': {
                background: budgetPct > 85 ? 'linear-gradient(90deg, #ef4444, #dc2626)' : `linear-gradient(90deg, ${color}, ${color}cc)`,
                borderRadius: 3,
              },
            }}
          />
          <Typography sx={{ fontSize: '11px', color: remaining < 0 ? '#ef4444' : '#4ade80', fontWeight: 600, mt: 0.5 }}>
            ₹{(remaining / 100000).toFixed(1)}L remaining
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function LeagueTeamsSection({ league }: { league: League }) {
  const navigate = useNavigate();
  const { data: teams, isLoading, error } = useQuery<Team[]>({
    queryKey: ['teams', league.id],
    queryFn: () => getTeams(league.id),
  });

  const totalPlayers = (teams ?? []).reduce((s, t) => s + (t.playerCount ?? 0), 0);
  const budgetPerTeam = (league.teamBudget / 100000).toFixed(1);

  return (
    <Box sx={{ mb: 5 }}>
      {/* League status card */}
      <Card
        sx={{
          background: 'rgba(26,26,46,0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          mb: 3,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.05) 0%, rgba(96,165,250,0.05) 100%)',
            pointerEvents: 'none',
          }}
        />
        <CardContent sx={{ position: 'relative', p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <SportsCricketIcon sx={{ color: '#f59e0b', fontSize: 28 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#e2e8f0', flex: 1 }}>
              {league.name}
            </Typography>
            <StatusChip status={league.status} />
            <Typography sx={{ fontSize: '13px', color: '#64748b', background: 'rgba(255,255,255,0.05)', px: 1.5, py: 0.5, borderRadius: '8px' }}>
              Season {league.season}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <QuickStatCard icon={<GroupsIcon />} label="Total Teams" value={(teams ?? []).length} color="#f59e0b" />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <QuickStatCard icon={<PersonIcon />} label="Total Players" value={totalPlayers} color="#60a5fa" />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <QuickStatCard icon={<AccountBalanceWalletIcon />} label="Budget / Team" value={`₹${budgetPerTeam}L`} color="#4ade80" />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <QuickStatCard icon={<SportsCricketIcon />} label="Auction Status" value={league.status} color="#a78bfa" />
        </Grid>
      </Grid>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#f59e0b' }} />
        </Box>
      )}
      {error && <Alert severity="error" sx={{ borderRadius: '12px' }}>Failed to load teams</Alert>}
      {teams && (
        <>
          <Typography
            sx={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#64748b',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              mb: 2,
            }}
          >
            Teams — {teams.length}
          </Typography>
          <Grid container spacing={2.5}>
            {teams.map((team, i) => (
              <Grid
                key={team.id}
                size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                sx={{ animation: 'fadeIn 0.5s ease', animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}
              >
                <TeamCard team={team} onClick={() => navigate(`/teams/${team.id}`)} />
              </Grid>
            ))}
            {teams.length === 0 && (
              <Grid size={12}>
                <Box sx={{ textAlign: 'center', py: 6, color: '#64748b' }}>
                  <Typography>No teams yet. Add teams in the Admin panel.</Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </>
      )}
    </Box>
  );
}

export default function DashboardPage() {
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

  const activeLeagues = leagues?.filter(l => l.status !== 'COMPLETED') ?? [];
  const displayLeagues = activeLeagues.length > 0 ? activeLeagues : (leagues ?? []).slice(0, 1);

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease' }}>
      {/* Welcome header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            background: 'linear-gradient(135deg, #f59e0b 0%, #60a5fa 60%, #a78bfa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            mb: 0.5,
          }}
        >
          RPL Dashboard
        </Typography>
        <Typography sx={{ color: '#64748b', fontSize: '15px' }}>
          Welcome back — here's the latest from your auction league
        </Typography>
      </Box>

      {displayLeagues.length === 0 && (
        <Alert
          severity="info"
          sx={{
            borderRadius: '12px',
            background: 'rgba(96,165,250,0.1)',
            border: '1px solid rgba(96,165,250,0.3)',
            color: '#60a5fa',
          }}
        >
          No leagues found. Create a league in the Admin panel.
        </Alert>
      )}
      {displayLeagues.map(league => (
        <LeagueTeamsSection key={league.id} league={league} />
      ))}
    </Box>
  );
}
