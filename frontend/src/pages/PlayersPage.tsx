import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, TextField, CircularProgress, Alert, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import StarIcon from '@mui/icons-material/Star';
import { getLeagues } from '../api/leagues';
import { getPlayers } from '../api/players';
import type { League, Player } from '../types';

function statusStyle(status: string): { bg: string; color: string } {
  switch (status) {
    case 'RETAINED': return { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' };
    case 'SOLD': return { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' };
    case 'UNSOLD': return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' };
    default: return { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' };
  }
}

function CategoryToggle({
  value,
  onChange,
}: {
  value: 'ALL' | 'CRICKET' | 'OTHER';
  onChange: (v: 'ALL' | 'CRICKET' | 'OTHER') => void;
}) {
  const options: { label: string; value: 'ALL' | 'CRICKET' | 'OTHER'; icon: React.ReactNode }[] = [
    { label: 'All', value: 'ALL', icon: <StarIcon sx={{ fontSize: 15 }} /> },
    { label: 'Cricket', value: 'CRICKET', icon: <SportsCricketIcon sx={{ fontSize: 15 }} /> },
    { label: 'Other', value: 'OTHER', icon: <PersonIcon sx={{ fontSize: 15 }} /> },
  ];
  return (
    <Box
      sx={{
        display: 'flex',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        p: 0.5,
        gap: 0.5,
      }}
    >
      {options.map(opt => (
        <Box
          key={opt.value}
          onClick={() => onChange(opt.value)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.75,
            py: 0.75,
            borderRadius: '9px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'all 0.2s ease',
            ...(value === opt.value
              ? {
                  background: 'rgba(245,158,11,0.2)',
                  border: '1px solid rgba(245,158,11,0.4)',
                  color: '#f59e0b',
                }
              : {
                  color: '#64748b',
                  border: '1px solid transparent',
                  '&:hover': { color: '#94a3b8', background: 'rgba(255,255,255,0.04)' },
                }),
          }}
        >
          {opt.icon}
          {opt.label}
        </Box>
      ))}
    </Box>
  );
}

function PlayersTable({ players }: { players: Player[] }) {
  const columns = ['#', 'Name', 'Category', 'Team', 'Status', 'Base Price'];

  return (
    <Box
      sx={{
        background: 'rgba(26,26,46,0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      {/* Sticky Header */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr 120px 180px 120px 100px',
          alignItems: 'center',
          px: 2.5,
          py: 1.25,
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}
      >
        {columns.map(col => (
          <Typography
            key={col}
            sx={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              ...(col === 'Base Price' && { textAlign: 'right' }),
            }}
          >
            {col}
          </Typography>
        ))}
      </Box>

      {/* Rows */}
      {players.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: '#64748b' }}>
          <PersonIcon sx={{ fontSize: 40, mb: 1, opacity: 0.3 }} />
          <Typography>No players found</Typography>
        </Box>
      ) : (
        players.map((p, i) => {
          const s = statusStyle(p.status);
          return (
            <Box
              key={p.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 120px 180px 120px 100px',
                alignItems: 'center',
                px: 2.5,
                py: 1.25,
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                transition: 'background 0.2s',
                '&:hover': { background: 'rgba(245,158,11,0.06)' },
                '&:last-child': { borderBottom: 'none' },
              }}
            >
              {/* # */}
              <Typography sx={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                {p.playerNumber ?? '—'}
              </Typography>

              {/* Name */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>
                  {p.name}
                </Typography>
                {p.isCaptain && (
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
                      boxShadow: '0 2px 6px rgba(245,158,11,0.5)',
                      flexShrink: 0,
                    }}
                  >
                    C
                  </Box>
                )}
              </Box>

              {/* Category */}
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.2,
                  py: 0.4,
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  ...(p.category === 'CRICKET'
                    ? { background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }
                    : { background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }),
                }}
              >
                {p.category === 'CRICKET' ? <SportsCricketIcon sx={{ fontSize: 12 }} /> : <PersonIcon sx={{ fontSize: 12 }} />}
                {p.category === 'CRICKET' ? 'Cricket' : 'Other'}
              </Box>

              {/* Team */}
              {p.teamName ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: p.teamColor || '#888',
                      flexShrink: 0,
                      boxShadow: `0 0 6px ${p.teamColor || '#888'}80`,
                    }}
                  />
                  <Typography sx={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }} noWrap>
                    {p.teamName}
                  </Typography>
                </Box>
              ) : (
                <Typography sx={{ fontSize: '13px', color: '#475569' }}>—</Typography>
              )}

              {/* Status */}
              <Box
                sx={{
                  display: 'inline-flex',
                  px: 1.2,
                  py: 0.4,
                  borderRadius: '20px',
                  background: s.bg,
                  border: `1px solid ${s.color}40`,
                  fontSize: '11px',
                  fontWeight: 700,
                  color: s.color,
                  width: 'fit-content',
                }}
              >
                {p.status}
              </Box>

              {/* Base price */}
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', textAlign: 'right' }}>
                ₹{(p.basePrice / 100000).toFixed(1)}L
              </Typography>
            </Box>
          );
        })
      )}
    </Box>
  );
}

function AllPlayersContent() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'ALL' | 'CRICKET' | 'OTHER'>('ALL');

  const { data: leagues } = useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: getLeagues,
  });

  const league = useMemo(() => {
    if (!leagues || leagues.length === 0) return null;
    return leagues.find(l => l.status !== 'COMPLETED') ?? leagues[0];
  }, [leagues]);

  const { data: players, isLoading, error } = useQuery<Player[]>({
    queryKey: ['players', league?.id],
    queryFn: () => getPlayers(league!.id),
    enabled: !!league,
  });

  const filtered = useMemo(() => {
    let list = players ?? [];
    if (category !== 'ALL') list = list.filter(p => p.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [players, category, search]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#f59e0b' }} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ borderRadius: '12px' }}>Failed to load players</Alert>;
  }

  return (
    <Box>
      {/* Filter bar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Search players..."
          size="small"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#64748b', fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            minWidth: 260,
            '& .MuiOutlinedInput-root': {
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '12px',
              fontSize: '14px',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
              '&.Mui-focused fieldset': { borderColor: '#f59e0b' },
            },
          }}
        />
        <CategoryToggle value={category} onChange={setCategory} />
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: '20px',
              px: 1.5,
              py: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
            }}
          >
            <PersonIcon sx={{ fontSize: 15, color: '#f59e0b' }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b' }}>
              {filtered.length} player{filtered.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </Box>
      </Box>

      <PlayersTable players={filtered} />
    </Box>
  );
}

export default function PlayersPage() {
  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease' }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            background: 'linear-gradient(135deg, #4ade80 0%, #60a5fa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            mb: 0.5,
          }}
        >
          Players
        </Typography>
        <Typography sx={{ color: '#64748b', fontSize: '14px' }}>
          Browse and search all players in the league
        </Typography>
      </Box>
      <AllPlayersContent />
    </Box>
  );
}
