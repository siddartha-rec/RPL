import { useQuery } from '@tanstack/react-query';
import Grid from '@mui/material/Grid';
import {
  Box, Typography, CircularProgress, Alert, LinearProgress,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PersonIcon from '@mui/icons-material/Person';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import GroupsIcon from '@mui/icons-material/Groups';
import { useParams } from 'react-router-dom';
import { getTeam } from '../api/teams';
import { getPlayers } from '../api/players';
import { getLeagues } from '../api/leagues';
import type { Team, Player, League } from '../types';

function statusStyle(status: string): { bg: string; gradient: string; color: string; label: string } {
  switch (status) {
    case 'RETAINED': return {
      bg: 'rgba(96,165,250,0.12)',
      gradient: 'linear-gradient(135deg, rgba(96,165,250,0.25), rgba(59,130,246,0.12))',
      color: '#60a5fa',
      label: 'Retained',
    };
    case 'SOLD': return {
      bg: 'rgba(74,222,128,0.12)',
      gradient: 'linear-gradient(135deg, rgba(74,222,128,0.25), rgba(34,197,94,0.12))',
      color: '#4ade80',
      label: 'Sold',
    };
    case 'UNSOLD': return {
      bg: 'rgba(239,68,68,0.12)',
      gradient: 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(220,38,38,0.12))',
      color: '#ef4444',
      label: 'Unsold',
    };
    default: return {
      bg: 'rgba(100,116,139,0.12)',
      gradient: 'linear-gradient(135deg, rgba(100,116,139,0.2), rgba(71,85,105,0.1))',
      color: '#94a3b8',
      label: status,
    };
  }
}

function PlayerRow({ player, index, teamColor }: { player: Player; index: number; teamColor: string }) {
  const s = statusStyle(player.status);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2.5,
        py: 1.6,
        background: index % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        borderLeft: '3px solid transparent',
        transition: 'all 0.2s ease',
        '&:hover': {
          background: `${teamColor}12`,
          borderLeft: `3px solid ${teamColor}`,
        },
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      {/* Numbered circle */}
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${teamColor}50, ${teamColor}28)`,
          border: `1.5px solid ${teamColor}55`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          fontWeight: 800,
          color: teamColor,
          flexShrink: 0,
        }}
      >
        {index + 1}
      </Box>

      {/* Name + badges */}
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>
            {player.name}
          </Typography>
          {player.isCaptain && (
            <Box
              sx={{
                width: 22,
                height: 22,
                borderRadius: '5px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 900,
                color: '#fff',
                boxShadow: '0 2px 8px rgba(245,158,11,0.55)',
                letterSpacing: '0.3px',
              }}
            >
              C
            </Box>
          )}
        </Box>
        {player.role && (
          <Typography sx={{ fontSize: '11px', color: '#475569', mt: 0.1 }}>{player.role}</Typography>
        )}
      </Box>

      {/* Status chip */}
      <Box
        sx={{
          px: 1.6,
          py: 0.45,
          borderRadius: '20px',
          background: s.gradient,
          border: `1px solid ${s.color}40`,
          fontSize: '11px',
          fontWeight: 800,
          color: s.color,
          letterSpacing: '0.4px',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        {s.label}
      </Box>

      {/* Base price */}
      <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', minWidth: 64, textAlign: 'right', flexShrink: 0 }}>
        {player.basePrice} CR
      </Typography>
    </Box>
  );
}

function PlayerSection({
  title,
  players,
  teamColor,
  icon,
}: {
  title: string;
  players: Player[];
  teamColor: string;
  icon: React.ReactNode;
}) {
  if (players.length === 0) return null;

  return (
    <Box sx={{ mb: 4 }}>
      {/* Section header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box sx={{ color: teamColor, display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Typography
          sx={{
            fontSize: '12px',
            fontWeight: 800,
            color: '#64748b',
            letterSpacing: '2.5px',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </Typography>
        <Box
          sx={{
            background: `${teamColor}20`,
            border: `1px solid ${teamColor}40`,
            borderRadius: '20px',
            px: 1.2,
            py: 0.2,
            fontSize: '11px',
            fontWeight: 800,
            color: teamColor,
          }}
        >
          {players.length}
        </Box>
        <Box sx={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
      </Box>

      {/* Table */}
      <Box
        sx={{
          background: 'rgba(15,15,35,0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '18px',
          overflow: 'hidden',
        }}
      >
        {/* Table column header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 2.5,
            py: 1.1,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.025)',
          }}
        >
          <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.6px', width: 36 }}>
            #
          </Typography>
          <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.6px', flex: 1 }}>
            Player
          </Typography>
          <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Status
          </Typography>
          <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.6px', minWidth: 64, textAlign: 'right' }}>
            Base Price
          </Typography>
        </Box>

        {players.map((p, i) => (
          <PlayerRow key={p.id} player={p} index={i} teamColor={teamColor} />
        ))}
      </Box>
    </Box>
  );
}

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const teamId = Number(id);

  const { data: team, isLoading: teamLoading, error: teamError } = useQuery<Team>({
    queryKey: ['team', teamId],
    queryFn: () => getTeam(teamId),
    enabled: !!teamId,
  });

  const { data: leagues } = useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: getLeagues,
    enabled: !!team,
  });

  const leagueId = team?.leagueId;

  const { data: allPlayers, isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: ['players', leagueId, teamId],
    queryFn: () => getPlayers(leagueId!, { teamId }),
    enabled: !!leagueId,
  });

  if (teamLoading || playersLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress sx={{ color: '#f59e0b' }} size={40} />
      </Box>
    );
  }

  if (teamError || !team) {
    return (
      <Alert severity="error" sx={{ borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
        Failed to load team
      </Alert>
    );
  }

  const color = team.color || '#888';
  const league = leagues?.find(l => l.id === team.leagueId);
  const cricketPlayers = (allPlayers ?? []).filter(p => p.category === 'CRICKET');
  const otherPlayers = (allPlayers ?? []).filter(p => p.category === 'OTHER');
  const remaining = team.budget - team.budgetSpent;
  const budgetPct = team.budget > 0 ? Math.min((team.budgetSpent / team.budget) * 100, 100) : 0;
  const totalPlayers = (allPlayers ?? []).length;

  return (
    <Box sx={{ animation: 'fadeIn 0.45s ease', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>

      {/* ─── Full-width Hero Banner ─── */}
      <Box
        sx={{
          borderRadius: '24px',
          overflow: 'hidden',
          mb: 3.5,
          position: 'relative',
          background: `linear-gradient(140deg, ${color} 0%, ${color}cc 30%, ${color}55 60%, rgba(15,15,35,0.95) 100%)`,
          border: `1px solid ${color}50`,
          boxShadow: `0 20px 60px ${color}30`,
          minHeight: 220,
        }}
      >
        {/* Background watermark */}
        <Typography
          sx={{
            position: 'absolute',
            right: -10,
            bottom: -30,
            fontSize: '160px',
            fontWeight: 900,
            color: 'rgba(255,255,255,0.055)',
            letterSpacing: '-6px',
            lineHeight: 1,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {team.shortName}
        </Typography>

        <Box sx={{ p: 4, position: 'relative', zIndex: 1 }}>
          {/* Top row: name + badges */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5, flexWrap: 'wrap', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.2, flexWrap: 'wrap' }}>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 900,
                    color: '#fff',
                    textShadow: '0 4px 16px rgba(0,0,0,0.5)',
                    letterSpacing: '-1px',
                    lineHeight: 1,
                  }}
                >
                  {team.name}
                </Typography>
                {/* Short name badge */}
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.4,
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255,255,255,0.22)',
                    fontSize: '13px',
                    fontWeight: 900,
                    color: '#fff',
                    letterSpacing: '1.5px',
                  }}
                >
                  {team.shortName}
                </Box>
                {league && (
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.4,
                      borderRadius: '10px',
                      background: 'rgba(0,0,0,0.28)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.75)',
                    }}
                  >
                    Season {league.season}
                  </Box>
                )}
              </Box>

              {/* Captain */}
              {team.captainName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                  <EmojiEventsIcon sx={{ fontSize: 18, color: '#fbbf24' }} />
                  <Typography sx={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Captain</Typography>
                  <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#fbbf24' }}>
                    {team.captainName}
                  </Typography>
                </Box>
              )}

              {/* Owner */}
              {team.ownerName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <PersonIcon sx={{ fontSize: 15, color: 'rgba(255,255,255,0.5)' }} />
                  <Typography sx={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
                    Owner: {team.ownerName}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Player count bubble */}
            <Box
              sx={{
                background: 'rgba(0,0,0,0.32)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.12)',
                px: 3,
                py: 2,
                textAlign: 'center',
                minWidth: 90,
                flexShrink: 0,
              }}
            >
              <Typography sx={{ fontSize: '36px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                {totalPlayers}
              </Typography>
              <Typography sx={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', mt: 0.5 }}>
                Players
              </Typography>
            </Box>
          </Box>

          {/* Budget progress bar inside banner */}
          <Box
            sx={{
              p: 2.2,
              background: 'rgba(0,0,0,0.28)',
              backdropFilter: 'blur(6px)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 0.75 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 15, color: 'rgba(255,255,255,0.55)' }} />
                <Typography sx={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
                  Spent {team.budgetSpent} CR of {team.budget} CR
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: remaining < 0 ? '#fca5a5' : '#86efac',
                }}
              >
                {remaining} CR remaining
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={budgetPct}
              sx={{
                height: 10,
                borderRadius: 6,
                bgcolor: 'rgba(255,255,255,0.1)',
                '& .MuiLinearProgress-bar': {
                  background: budgetPct > 85
                    ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                    : 'linear-gradient(90deg, #4ade80, #22c55e)',
                  borderRadius: 6,
                },
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.75 }}>
              <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                {budgetPct.toFixed(0)}% utilized
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ─── Stats Summary Row ─── */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { label: 'Total Budget', value: `${team.budget} CR`, accent: '#60a5fa', icon: <AccountBalanceWalletIcon sx={{ fontSize: 16 }} /> },
          { label: 'Spent', value: `${team.budgetSpent} CR`, accent: '#f59e0b', icon: <AccountBalanceWalletIcon sx={{ fontSize: 16 }} /> },
          { label: 'Remaining', value: `${remaining} CR`, accent: remaining < 0 ? '#ef4444' : '#4ade80', icon: <AccountBalanceWalletIcon sx={{ fontSize: 16 }} /> },
          { label: 'Total Players', value: String(totalPlayers), accent: '#a78bfa', icon: <GroupsIcon sx={{ fontSize: 16 }} /> },
        ].map(stat => (
          <Grid key={stat.label} size={{ xs: 6, sm: 3 }}>
            <Box
              sx={{
                background: 'rgba(15,15,35,0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                p: 2,
                textAlign: 'center',
                transition: 'transform 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)' },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5, color: stat.accent, opacity: 0.7 }}>
                {stat.icon}
              </Box>
              <Typography sx={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', mb: 0.5 }}>
                {stat.label}
              </Typography>
              <Typography sx={{ fontSize: '22px', fontWeight: 900, color: stat.accent, letterSpacing: '-0.5px' }}>
                {stat.value}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* ─── Roster Sections ─── */}
      <PlayerSection
        title="Cricket Squad"
        players={cricketPlayers}
        teamColor={color}
        icon={<SportsCricketIcon sx={{ fontSize: 18 }} />}
      />
      <PlayerSection
        title="Other Players"
        players={otherPlayers}
        teamColor={color}
        icon={<PersonIcon sx={{ fontSize: 18 }} />}
      />

      {totalPlayers === 0 && (
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
          <PersonIcon sx={{ fontSize: 44, mb: 1.5, opacity: 0.25 }} />
          <Typography sx={{ fontSize: '15px', fontWeight: 600 }}>No players assigned to this team yet.</Typography>
        </Box>
      )}
    </Box>
  );
}
