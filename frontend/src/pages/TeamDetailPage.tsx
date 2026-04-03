import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Chip, CircularProgress, Alert, LinearProgress,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PersonIcon from '@mui/icons-material/Person';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import { useParams } from 'react-router-dom';
import { getTeam } from '../api/teams';
import { getPlayers } from '../api/players';
import { getLeagues } from '../api/leagues';
import type { Team, Player, League } from '../types';

function statusStyle(status: string): { bg: string; color: string; label: string } {
  switch (status) {
    case 'RETAINED': return { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa', label: 'Retained' };
    case 'SOLD': return { bg: 'rgba(74,222,128,0.15)', color: '#4ade80', label: 'Sold' };
    case 'UNSOLD': return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Unsold' };
    default: return { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', label: status };
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
        py: 1.5,
        background: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        transition: 'background 0.2s',
        '&:hover': { background: `${teamColor}10` },
      }}
    >
      {/* Player number circle */}
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: player.playerNumber
            ? `linear-gradient(135deg, ${teamColor}40, ${teamColor}20)`
            : 'rgba(255,255,255,0.06)',
          border: `1px solid ${player.playerNumber ? teamColor + '50' : 'rgba(255,255,255,0.1)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 700,
          color: player.playerNumber ? teamColor : '#64748b',
          flexShrink: 0,
        }}
      >
        {player.playerNumber ?? '—'}
      </Box>

      {/* Name + captain badge */}
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>
            {player.name}
          </Typography>
          {player.isCaptain && (
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 900,
                color: '#fff',
                boxShadow: '0 2px 8px rgba(245,158,11,0.5)',
              }}
            >
              C
            </Box>
          )}
        </Box>
        {player.role && (
          <Typography sx={{ fontSize: '11px', color: '#64748b' }}>{player.role}</Typography>
        )}
      </Box>

      {/* Status chip */}
      <Box
        sx={{
          px: 1.5,
          py: 0.4,
          borderRadius: '20px',
          background: s.bg,
          border: `1px solid ${s.color}40`,
          fontSize: '11px',
          fontWeight: 700,
          color: s.color,
          letterSpacing: '0.3px',
        }}
      >
        {s.label}
      </Box>

      {/* Base price */}
      <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', minWidth: 60, textAlign: 'right' }}>
        ₹{(player.basePrice / 100000).toFixed(1)}L
      </Typography>
    </Box>
  );
}

function PlayerSection({ title, players, teamColor, icon }: { title: string; players: Player[]; teamColor: string; icon: React.ReactNode }) {
  if (players.length === 0) return null;
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box sx={{ color: teamColor }}>{icon}</Box>
        <Typography
          sx={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#64748b',
            letterSpacing: '2px',
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
            fontWeight: 700,
            color: teamColor,
          }}
        >
          {players.length}
        </Box>
        <Box sx={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
      </Box>

      {/* Table header */}
      <Box
        sx={{
          background: 'rgba(26,26,46,0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 2.5,
            py: 1,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', width: 32 }}>
            #
          </Typography>
          <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', flex: 1 }}>
            Player
          </Typography>
          <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Status
          </Typography>
          <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: 60, textAlign: 'right' }}>
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
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress sx={{ color: '#f59e0b' }} />
      </Box>
    );
  }

  if (teamError || !team) {
    return <Alert severity="error" sx={{ borderRadius: '12px' }}>Failed to load team</Alert>;
  }

  const color = team.color || '#888';
  const league = leagues?.find(l => l.id === team.leagueId);
  const cricketPlayers = (allPlayers ?? []).filter(p => p.category === 'CRICKET');
  const otherPlayers = (allPlayers ?? []).filter(p => p.category === 'OTHER');
  const remaining = team.budget - team.budgetSpent;
  const budgetPct = team.budget > 0 ? Math.min((team.budgetSpent / team.budget) * 100, 100) : 0;

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease' }}>
      {/* Hero Banner */}
      <Box
        sx={{
          borderRadius: '20px',
          overflow: 'hidden',
          mb: 3,
          position: 'relative',
          background: `linear-gradient(135deg, ${color} 0%, ${color}88 40%, rgba(26,26,46,0.95) 100%)`,
          border: `1px solid ${color}40`,
        }}
      >
        {/* Watermark */}
        <Typography
          sx={{
            position: 'absolute',
            right: -20,
            bottom: -20,
            fontSize: '140px',
            fontWeight: 900,
            color: 'rgba(255,255,255,0.06)',
            letterSpacing: '-4px',
            lineHeight: 1,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {team.shortName}
        </Typography>

        <Box sx={{ p: 3.5, position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                  {team.name}
                </Typography>
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.4,
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(4px)',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#fff',
                    letterSpacing: '1px',
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
                      background: 'rgba(0,0,0,0.3)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.8)',
                    }}
                  >
                    Season {league.season}
                  </Box>
                )}
              </Box>

              {team.captainName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmojiEventsIcon sx={{ fontSize: 18, color: '#fbbf24' }} />
                  <Typography sx={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                    Captain:
                  </Typography>
                  <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#fbbf24' }}>
                    {team.captainName}
                  </Typography>
                </Box>
              )}
              {team.ownerName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <PersonIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }} />
                  <Typography sx={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                    Owner: {team.ownerName}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Quick stat */}
            <Box
              sx={{
                background: 'rgba(0,0,0,0.3)',
                backdropFilter: 'blur(8px)',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.1)',
                px: 2.5,
                py: 2,
                textAlign: 'center',
                minWidth: 100,
              }}
            >
              <Typography sx={{ fontSize: '28px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                {(allPlayers ?? []).length}
              </Typography>
              <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Players
              </Typography>
            </Box>
          </Box>

          {/* Budget section */}
          <Box
            sx={{
              mt: 2.5,
              p: 2,
              background: 'rgba(0,0,0,0.25)',
              backdropFilter: 'blur(4px)',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', items: 'center', gap: 1 }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', mr: 0.5 }} />
                <Typography sx={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                  Spent ₹{(team.budgetSpent / 100000).toFixed(1)}L of ₹{(team.budget / 100000).toFixed(1)}L
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: remaining < 0 ? '#fca5a5' : '#86efac',
                }}
              >
                ₹{(remaining / 100000).toFixed(1)}L remaining
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={budgetPct}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'rgba(255,255,255,0.1)',
                '& .MuiLinearProgress-bar': {
                  background: budgetPct > 85
                    ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                    : 'linear-gradient(90deg, #4ade80, #22c55e)',
                  borderRadius: 4,
                },
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Budget breakdown cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Budget', value: `₹${(team.budget / 100000).toFixed(1)}L`, color: '#60a5fa' },
          { label: 'Spent', value: `₹${(team.budgetSpent / 100000).toFixed(1)}L`, color: '#f59e0b' },
          { label: 'Remaining', value: `₹${(remaining / 100000).toFixed(1)}L`, color: remaining < 0 ? '#ef4444' : '#4ade80' },
          { label: 'Total Players', value: (allPlayers ?? []).length, color: '#a78bfa' },
        ].map(stat => (
          <Box
            key={stat.label}
            sx={{
              flex: '1 1 120px',
              background: 'rgba(26,26,46,0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '14px',
              p: 2,
              textAlign: 'center',
            }}
          >
            <Typography sx={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}>
              {stat.label}
            </Typography>
            <Typography sx={{ fontSize: '20px', fontWeight: 800, color: stat.color }}>
              {stat.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Player sections */}
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

      {(allPlayers ?? []).length === 0 && (
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
          <PersonIcon sx={{ fontSize: 40, mb: 1, opacity: 0.3 }} />
          <Typography>No players assigned to this team yet.</Typography>
        </Box>
      )}
    </Box>
  );
}
