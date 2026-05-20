import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Grid from '@mui/material/Grid';
import {
  Box, Typography, CircularProgress, Alert, LinearProgress,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
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
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(10px)',
        border: '1px solid #eef2f7',
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
      {/* Header band — compact, inline like dashboard */}
      <Box
        sx={{
          height: 72,
          background: `linear-gradient(135deg, ${color} 0%, ${color}aa 60%, ${color}55 100%)`,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          px: 2.5,
          gap: 1.5,
          overflow: 'hidden',
        }}
      >
        {/* Watermark */}
        <Typography
          sx={{
            position: 'absolute',
            right: -5,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '70px',
            fontWeight: 900,
            color: 'rgba(255,255,255,0.22)',
            letterSpacing: '-3px',
            lineHeight: 1,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {team.shortName}
        </Typography>
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: '18px',
            color: '#fff',
            flex: 1,
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            letterSpacing: '-0.3px',
          }}
        >
          {team.name}
        </Typography>

      </Box>

      {/* Card body */}
      <Box sx={{ p: 2.5, pt: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Captain row */}
        {team.captainName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Box
              sx={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 900,
                color: '#fff',
                flexShrink: 0,
                boxShadow: '0 0 8px rgba(245,158,11,0.5)',
              }}
            >
              C
            </Box>
            <Typography sx={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
              {team.captainName}
            </Typography>
          </Box>
        )}

        {/* Stats 2x2 grid — centered like dashboard */}
        <Grid container spacing={1} sx={{ mb: 2 }}>
          {[
            { label: 'Budget', value: `${team.budget} CR`, col: '#94a3b8' },
            { label: 'Spent', value: `${team.budgetSpent} CR`, col: '#fbbf24' },
            { label: 'Left', value: `${remaining} CR`, col: remaining < 0 ? '#ef4444' : '#4ade80' },
            { label: 'Players', value: String(playerCount), col: color },
          ].map(({ label, value, col }) => (
            <Grid key={label} size={{ xs: 6 }}>
              <Box
                sx={{
                  background: '#f8fafc',
                  border: '1px solid #eef2f7',
                  borderRadius: '10px',
                  p: 1,
                  textAlign: 'center',
                }}
              >
                <Typography sx={{ fontSize: '10px', color: '#475569', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  {label}
                </Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 800, color: col, mt: 0.25, lineHeight: 1 }}>
                  {value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Budget bar */}
        <Box sx={{ mt: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography sx={{ fontSize: '10px', color: '#475569', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Budget Used
            </Typography>
            <Typography sx={{ fontSize: '12px', fontWeight: 800, color: budgetPct > 85 ? '#ef4444' : '#94a3b8' }}>
              {budgetPct.toFixed(0)}%
            </Typography>
          </Box>
          <Box sx={{ position: 'relative', height: 6, borderRadius: 4, bgcolor: '#e2e8f0', overflow: 'hidden' }}>
            <LinearProgress
              variant="determinate"
              value={budgetPct}
              sx={{
                position: 'absolute',
                inset: 0,
                height: '100%',
                bgcolor: 'transparent',
                '& .MuiLinearProgress-bar': {
                  background: budgetPct > 85
                    ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                    : `linear-gradient(90deg, ${color}, ${color}bb)`,
                  borderRadius: 4,
                  boxShadow: `0 0 8px ${color}40`,
                },
              }}
            />
          </Box>
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
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: '#b45309' }} size={32} />
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#b91c1c' }}>
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
                  background: '#ffffff',
                  borderRadius: '20px',
                  border: '1px dashed #e2e8f0',
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
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);

  const { data: leagues, isLoading, error } = useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: getLeagues,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress sx={{ color: '#b45309' }} size={40} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#b91c1c' }}>
        Failed to load leagues
      </Alert>
    );
  }

  const allLeagues = leagues ?? [];
  const selectedLeague = selectedLeagueId
    ? allLeagues.find(l => l.id === selectedLeagueId)
    : allLeagues.find(l => l.status !== 'COMPLETED') ?? allLeagues[0];

  return (
    <Box sx={{ animation: 'fadeIn 0.45s ease', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      {/* Page Hero */}
      <Box
        sx={{
          mb: 5,
          pb: 4,
          borderBottom: '1px solid #eef2f7',
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
                  color: '#b45309',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  alignSelf: 'center',
                }}
              >
                {selectedLeague?.name ?? 'RPL'}
              </Box>
            </Box>
            <Typography sx={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>
              All franchises competing in the Recykal Premier League
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }} />

          {/* Season filter */}
          {allLeagues.length > 0 && (
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
              {allLeagues.map(l => {
                const active = selectedLeague?.id === l.id;
                return (
                  <Box
                    key={l.id}
                    onClick={() => setSelectedLeagueId(l.id)}
                    sx={{
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
                            '&:hover': { color: '#94a3b8', background: '#eef2f7', border: '1px solid #eef2f7' },
                          }),
                    }}
                  >
                    {(l.seasonDisplayName || l.season)}
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>

      {!selectedLeague && (
        <Box
          sx={{
            textAlign: 'center',
            py: 12,
            color: '#475569',
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px dashed #e2e8f0',
          }}
        >
          <GroupsIcon sx={{ fontSize: 52, mb: 2, opacity: 0.2 }} />
          <Typography sx={{ fontSize: '16px', fontWeight: 600 }}>No leagues found.</Typography>
        </Box>
      )}

      {selectedLeague && (
        <LeagueTeams key={selectedLeague.id} league={selectedLeague} />
      )}
    </Box>
  );
}
