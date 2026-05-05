import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { getTournament, getTournamentLeagues } from '../api/tournaments';
import type { Tournament, League } from '../types';

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tid = Number(id);
  const navigate = useNavigate();

  const { data: tournament, isLoading: tLoading } = useQuery<Tournament>({
    queryKey: ['tournament', tid],
    queryFn: () => getTournament(tid),
    enabled: !!tid,
  });

  const { data: leagues, isLoading: lLoading, error } = useQuery<League[]>({
    queryKey: ['tournament-leagues', tid],
    queryFn: () => getTournamentLeagues(tid),
    enabled: !!tid,
  });

  if (tLoading || lLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: '#a78bfa' }} /></Box>;
  if (error || !tournament) return <Alert severity="error" sx={{ borderRadius: '12px' }}>Failed to load tournament</Alert>;

  const list = leagues ?? [];

  const enterLeague = (leagueId: number) => {
    navigate(`/tournaments/${tid}/leagues/${leagueId}`);
  };

  const statusColor = (s: string) => {
    const m: Record<string, string> = { SETUP: '#94a3b8', ACTIVE: '#4ade80', COMPLETED: '#60a5fa' };
    return m[s] ?? '#94a3b8';
  };

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/tournaments')}
        sx={{ mb: 2, color: '#64748b', borderRadius: '10px', '&:hover': { background: '#eef2f7' } }}
      >
        All tournaments
      </Button>

      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 2.5, mb: 4,
        background: 'linear-gradient(135deg, rgba(167,139,250,0.10), rgba(96,165,250,0.05))',
        border: '1px solid rgba(167,139,250,0.25)',
        borderRadius: '20px',
        p: 3,
      }}>
        <Box sx={{
          width: 72, height: 72, borderRadius: '18px',
          background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(167,139,250,0.4)',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {tournament.logoUrl ? (
            <img src={tournament.logoUrl} alt={tournament.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <EmojiEventsIcon sx={{ color: '#fff', fontSize: 36 }} />
          )}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b', mb: 0.25 }}>
            {tournament.name}
          </Typography>
          <Typography sx={{ fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace', mb: 0.75 }}>
            {tournament.slug}
          </Typography>
          {tournament.description && (
            <Typography sx={{ fontSize: '14px', color: '#475569' }}>{tournament.description}</Typography>
          )}
        </Box>
      </Box>

      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.2px', mb: 1.5 }}>
        Seasons / Leagues
      </Typography>

      {list.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: '#64748b',
          background: '#ffffff', border: '1px dashed #e2e8f0', borderRadius: '14px' }}>
          <SportsCricketIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
          <Typography>No seasons under this tournament yet</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
          {list.map(l => (
            <Box
              key={l.id}
              onClick={() => enterLeague(l.id)}
              sx={{
                cursor: 'pointer',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                p: 2.25,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'rgba(96,165,250,0.55)',
                  boxShadow: '0 6px 20px rgba(96,165,250,0.18)',
                  transform: 'translateY(-2px)',
                },
                '&:hover .arrow': { transform: 'translateX(4px)', opacity: 1 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SportsCricketIcon sx={{ color: '#0891b2', fontSize: 20, mr: 1 }} />
                <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', flex: 1 }}>
                  {l.seasonDisplayName || l.name}
                </Typography>
                <ChevronRightIcon className="arrow" sx={{ color: '#60a5fa', opacity: 0.5, transition: 'all 0.2s' }} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'inline-block', px: 1.1, py: 0.3, borderRadius: '20px',
                  background: `${statusColor(l.status)}15`, border: `1px solid ${statusColor(l.status)}40`,
                  fontSize: '10px', fontWeight: 700, color: statusColor(l.status), letterSpacing: '0.3px' }}>
                  {l.status}
                </Box>
                <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>
                  Season {l.season}
                </Typography>
                {l.cricheroesId && (
                  <Box sx={{ display: 'inline-block', px: 1, py: 0.25, borderRadius: '20px',
                    background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)',
                    fontSize: '10px', fontWeight: 600, color: '#7c3aed' }}>
                    CricHeroes
                  </Box>
                )}
              </Box>
              <Typography sx={{ fontSize: '12px', color: '#64748b', mt: 1.25 }}>
                Budget: {l.teamBudget} CR · Max players/team: {l.maxPlayersPerTeam}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
