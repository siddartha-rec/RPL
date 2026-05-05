import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { getTournaments } from '../api/tournaments';
import type { Tournament } from '../types';

export default function TournamentsPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery<Tournament[]>({
    queryKey: ['tournaments'],
    queryFn: getTournaments,
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: '#a78bfa' }} /></Box>;
  if (error) return <Alert severity="error" sx={{ borderRadius: '12px' }}>Failed to load tournaments</Alert>;

  const tournaments = data ?? [];

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease' }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            background: 'linear-gradient(135deg, #a78bfa 0%, #60a5fa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            mb: 0.5,
          }}
        >
          Tournaments
        </Typography>
        <Typography sx={{ color: '#64748b', fontSize: '14px' }}>
          {tournaments.length} tournament{tournaments.length === 1 ? '' : 's'} · pick one to see its seasons
        </Typography>
      </Box>

      {tournaments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: '#64748b' }}>
          <EmojiEventsIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
          <Typography>No tournaments yet</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
          {tournaments.map(t => (
            <Box
              key={t.id}
              onClick={() => navigate(`/tournaments/${t.id}`)}
              sx={{
                position: 'relative',
                cursor: 'pointer',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                p: 2.5,
                transition: 'all 0.2s ease',
                overflow: 'hidden',
                '&:hover': {
                  borderColor: 'rgba(167,139,250,0.55)',
                  boxShadow: '0 8px 24px rgba(167,139,250,0.18)',
                  transform: 'translateY(-2px)',
                },
                '&:hover .arrow': { transform: 'translateX(4px)', opacity: 1 },
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(167,139,250,0.12), transparent 70%)',
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, position: 'relative' }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(167,139,250,0.18), rgba(139,92,246,0.1))',
                    border: '1px solid rgba(167,139,250,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {t.logoUrl ? (
                    <img src={t.logoUrl} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <EmojiEventsIcon sx={{ color: '#8b5cf6', fontSize: 24 }} />
                  )}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>
                    {t.name}
                  </Typography>
                  <Typography sx={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', mt: 0.25 }}>
                    {t.slug}
                  </Typography>
                </Box>
                <ChevronRightIcon className="arrow" sx={{ color: '#a78bfa', opacity: 0.5, transition: 'all 0.2s' }} />
              </Box>

              <Box sx={{ display: 'inline-block', px: 1.2, py: 0.4, borderRadius: '20px',
                background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.35)',
                fontSize: '11px', fontWeight: 700, color: '#6d28d9', mb: 1.25 }}>
                {t.leagueCount} season{t.leagueCount === 1 ? '' : 's'}
              </Box>

              {t.description && (
                <Typography sx={{
                  fontSize: '13px',
                  color: '#64748b',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {t.description}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
