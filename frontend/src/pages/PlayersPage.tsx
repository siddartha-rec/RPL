import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, TextField, CircularProgress, Alert, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import StarIcon from '@mui/icons-material/Star';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import GroupsIcon from '@mui/icons-material/Groups';
import { getLeagues } from '../api/leagues';
import { getPlayersPaginated } from '../api/players';
import { getTeams } from '../api/teams';
import type { League, Player, Team, PageResponse } from '../types';

const PAGE_SIZE = 20;

function statusStyle(status: string): { gradient: string; color: string; label: string } {
  switch (status) {
    case 'RETAINED': return {
      gradient: 'linear-gradient(135deg, rgba(96,165,250,0.28), rgba(59,130,246,0.14))',
      color: '#60a5fa',
      label: 'Retained',
    };
    case 'SOLD': return {
      gradient: 'linear-gradient(135deg, rgba(74,222,128,0.28), rgba(34,197,94,0.14))',
      color: '#4ade80',
      label: 'Sold',
    };
    case 'UNSOLD': return {
      gradient: 'linear-gradient(135deg, rgba(239,68,68,0.28), rgba(220,38,38,0.14))',
      color: '#ef4444',
      label: 'Unsold',
    };
    default: return {
      gradient: 'linear-gradient(135deg, rgba(100,116,139,0.2), rgba(71,85,105,0.1))',
      color: '#94a3b8',
      label: status,
    };
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
    { label: 'All', value: 'ALL', icon: <StarIcon sx={{ fontSize: 14 }} /> },
    { label: 'Cricket', value: 'CRICKET', icon: <SportsCricketIcon sx={{ fontSize: 14 }} /> },
    { label: 'Other', value: 'OTHER', icon: <PersonIcon sx={{ fontSize: 14 }} /> },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        background: 'rgba(15,15,35,0.8)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        p: 0.5,
        gap: 0.4,
      }}
    >
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <Box
            key={opt.value}
            onClick={() => onChange(opt.value)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.7,
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
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(251,191,36,0.12))',
                    border: '1px solid rgba(245,158,11,0.45)',
                    color: '#f59e0b',
                    boxShadow: '0 2px 8px rgba(245,158,11,0.2)',
                  }
                : {
                    color: '#64748b',
                    border: '1px solid transparent',
                    '&:hover': {
                      color: '#94a3b8',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    },
                  }),
            }}
          >
            {opt.icon}
            {opt.label}
          </Box>
        );
      })}
    </Box>
  );
}

function TeamFilter({
  teams,
  value,
  onChange,
}: {
  teams: Team[];
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        background: 'rgba(15,15,35,0.8)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        p: 0.5,
        gap: 0.4,
        flexWrap: 'wrap',
      }}
    >
      {/* All Teams pill */}
      <Box
        onClick={() => onChange(null)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.7,
          px: 2,
          py: 0.9,
          borderRadius: '10px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 700,
          transition: 'all 0.2s ease',
          userSelect: 'none',
          ...(value === null
            ? {
                background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(251,191,36,0.12))',
                border: '1px solid rgba(245,158,11,0.45)',
                color: '#f59e0b',
                boxShadow: '0 2px 8px rgba(245,158,11,0.2)',
              }
            : {
                color: '#64748b',
                border: '1px solid transparent',
                '&:hover': {
                  color: '#94a3b8',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                },
              }),
        }}
      >
        <GroupsIcon sx={{ fontSize: 14 }} />
        All Teams
      </Box>

      {teams.map(team => {
        const active = value === team.id;
        const teamColor = team.color || '#888';
        return (
          <Box
            key={team.id}
            onClick={() => onChange(team.id)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.7,
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
                    background: `linear-gradient(135deg, ${teamColor}30, ${teamColor}18)`,
                    border: `1px solid ${teamColor}70`,
                    color: teamColor,
                    boxShadow: `0 2px 8px ${teamColor}30`,
                  }
                : {
                    color: '#64748b',
                    border: '1px solid transparent',
                    '&:hover': {
                      color: '#94a3b8',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    },
                  }),
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: teamColor,
                flexShrink: 0,
                boxShadow: active ? `0 0 6px ${teamColor}80` : 'none',
              }}
            />
            {team.shortName || team.name}
          </Box>
        );
      })}
    </Box>
  );
}

function PlayersTable({ players }: { players: Player[] }) {
  const columns = ['Name', 'Category', 'Team', 'Status', 'Base Price', 'Auction Price'];

  return (
    <Box
      sx={{
        background: 'rgba(15,15,35,0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '18px',
        overflow: 'hidden',
      }}
    >
      {/* Sticky dark header */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 130px 180px 120px 100px 110px',
          alignItems: 'center',
          px: 2.5,
          py: 1.4,
          background: 'rgba(8,8,24,0.9)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 2,
        }}
      >
        {columns.map(col => (
          <Typography
            key={col}
            sx={{
              fontSize: '10px',
              fontWeight: 800,
              color: '#334155',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              ...(col === 'Base Price' && { textAlign: 'right' }),
            }}
          >
            {col}
          </Typography>
        ))}
      </Box>

      {/* Rows */}
      {players.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, color: '#475569' }}>
          <PersonIcon sx={{ fontSize: 44, mb: 1.5, opacity: 0.25 }} />
          <Typography sx={{ fontSize: '15px', fontWeight: 600 }}>No players found</Typography>
        </Box>
      ) : (
        players.map((p, i) => {
          const s = statusStyle(p.status);
          const teamColor = p.teamColor || '#888';

          return (
            <Box
              key={p.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 130px 180px 120px 100px 110px',
                alignItems: 'center',
                px: 2.5,
                py: 1.4,
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: i % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'transparent',
                transition: 'background 0.2s ease',
                '&:hover': { background: 'rgba(245,158,11,0.07)' },
                '&:last-child': { borderBottom: 'none' },
              }}
            >
              {/* Name + captain badge */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }} noWrap>
                  {p.name}
                </Typography>
                {p.isCaptain && (
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '5px',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 900,
                      color: '#fff',
                      boxShadow: '0 2px 8px rgba(245,158,11,0.5)',
                      flexShrink: 0,
                    }}
                  >
                    C
                  </Box>
                )}
              </Box>

              {/* Category pill */}
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.2,
                  py: 0.45,
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  width: 'fit-content',
                  ...(p.category === 'CRICKET'
                    ? {
                        background: 'linear-gradient(135deg, rgba(96,165,250,0.2), rgba(59,130,246,0.1))',
                        color: '#60a5fa',
                        border: '1px solid rgba(96,165,250,0.3)',
                      }
                    : {
                        background: 'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(139,92,246,0.1))',
                        color: '#a78bfa',
                        border: '1px solid rgba(167,139,250,0.3)',
                      }),
                }}
              >
                {p.category === 'CRICKET'
                  ? <SportsCricketIcon sx={{ fontSize: 11 }} />
                  : <PersonIcon sx={{ fontSize: 11 }} />}
                {p.category === 'CRICKET' ? 'Cricket' : 'Other'}
              </Box>

              {/* Team with color dot */}
              {p.teamName ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
                  <Box
                    sx={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      bgcolor: teamColor,
                      flexShrink: 0,
                      boxShadow: `0 0 7px ${teamColor}90`,
                    }}
                  />
                  <Typography sx={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }} noWrap>
                    {p.teamName}
                  </Typography>
                </Box>
              ) : (
                <Typography sx={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>—</Typography>
              )}

              {/* Status chip with gradient */}
              <Box
                sx={{
                  display: 'inline-flex',
                  px: 1.3,
                  py: 0.45,
                  borderRadius: '20px',
                  background: s.gradient,
                  border: `1px solid ${s.color}45`,
                  fontSize: '11px',
                  fontWeight: 800,
                  color: s.color,
                  width: 'fit-content',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                }}
              >
                {s.label}
              </Box>

              {/* Base price */}
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textAlign: 'right' }}>
                {p.basePrice > 0 ? `${p.basePrice} CR` : '—'}
              </Typography>

              {/* Auction price */}
              <Typography sx={{ fontSize: '13px', fontWeight: 700, textAlign: 'right', color: p.soldPrice ? '#4ade80' : '#334155' }}>
                {p.soldPrice ? `${p.soldPrice} CR` : '—'}
              </Typography>
            </Box>
          );
        })
      )}
    </Box>
  );
}

function PaginationControls({
  page,
  totalPages,
  totalElements,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  totalElements: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const start = totalElements === 0 ? 0 : page * PAGE_SIZE + 1;
  const end = Math.min((page + 1) * PAGE_SIZE, totalElements);

  const btnBase = {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    px: 2,
    py: 1,
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    userSelect: 'none' as const,
    transition: 'all 0.2s ease',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(15,15,35,0.8)',
    backdropFilter: 'blur(10px)',
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mt: 2.5,
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      {/* Showing X-Y of Z */}
      <Typography sx={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
        {totalElements === 0
          ? 'No players found'
          : `Showing ${start}–${end} of ${totalElements} players`}
      </Typography>

      {/* Prev / page indicator / Next */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          onClick={page === 0 ? undefined : onPrev}
          sx={{
            ...btnBase,
            color: page === 0 ? '#334155' : '#94a3b8',
            cursor: page === 0 ? 'not-allowed' : 'pointer',
            opacity: page === 0 ? 0.45 : 1,
            '&:hover': page === 0 ? {} : {
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#e2e8f0',
            },
          }}
        >
          <ChevronLeftIcon sx={{ fontSize: 16 }} />
          Prev
        </Box>

        <Box
          sx={{
            px: 2,
            py: 1,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.1))',
            border: '1px solid rgba(245,158,11,0.4)',
            fontSize: '13px',
            fontWeight: 800,
            color: '#f59e0b',
            whiteSpace: 'nowrap',
          }}
        >
          Page {page + 1} of {Math.max(totalPages, 1)}
        </Box>

        <Box
          onClick={page >= totalPages - 1 ? undefined : onNext}
          sx={{
            ...btnBase,
            color: page >= totalPages - 1 ? '#334155' : '#94a3b8',
            cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
            opacity: page >= totalPages - 1 ? 0.45 : 1,
            '&:hover': page >= totalPages - 1 ? {} : {
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#e2e8f0',
            },
          }}
        >
          Next
          <ChevronRightIcon sx={{ fontSize: 16 }} />
        </Box>
      </Box>
    </Box>
  );
}

function AllPlayersContent() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<'ALL' | 'CRICKET' | 'OTHER'>('ALL');
  const [teamId, setTeamId] = useState<number | null>(null);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);

  // Debounce search input 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when any filter changes
  useEffect(() => { setPage(0); }, [debouncedSearch, category, teamId, selectedLeagueId]);

  const { data: leagues } = useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: getLeagues,
  });

  const league = useMemo(() => {
    if (!leagues || leagues.length === 0) return null;
    if (selectedLeagueId) return leagues.find(l => l.id === selectedLeagueId) ?? leagues[0];
    return leagues.find(l => l.status !== 'COMPLETED') ?? leagues[0];
  }, [leagues, selectedLeagueId]);

  const { data: teams } = useQuery<Team[]>({
    queryKey: ['teams', league?.id],
    queryFn: () => getTeams(league!.id),
    enabled: !!league,
  });

  const { data: pageData, isLoading, error } = useQuery<PageResponse<Player>>({
    queryKey: ['players', league?.id, page, PAGE_SIZE, debouncedSearch, category, teamId],
    queryFn: () =>
      getPlayersPaginated(league!.id, {
        page,
        size: PAGE_SIZE,
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
        ...(category !== 'ALL' ? { category } : {}),
        ...(teamId !== null ? { teamId } : {}),
      }),
    enabled: !!league,
    placeholderData: prev => prev,
  });

  const players = pageData?.content ?? [];
  const totalElements = pageData?.totalElements ?? 0;
  const totalPages = pageData?.totalPages ?? 0;

  if (isLoading && !pageData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: '#f59e0b' }} size={36} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
        Failed to load players
      </Alert>
    );
  }

  return (
    <Box>
      {/* Filter bar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search bar */}
        <TextField
          placeholder="Search players by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#475569', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            minWidth: 300,
            '& .MuiOutlinedInput-root': {
              background: 'rgba(15,15,35,0.8)',
              backdropFilter: 'blur(10px)',
              borderRadius: '14px',
              fontSize: '14px',
              height: 46,
              '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
              '&.Mui-focused fieldset': { borderColor: '#f59e0b', borderWidth: '1.5px' },
            },
            '& .MuiInputBase-input': {
              color: '#e2e8f0',
              '&::placeholder': { color: '#475569', opacity: 1 },
            },
          }}
        />

        {/* Category filter pills */}
        <CategoryToggle value={category} onChange={v => setCategory(v)} />

        {/* Season filter pills */}
        {leagues && leagues.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              background: 'rgba(15,15,35,0.8)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              p: 0.5,
              gap: 0.4,
            }}
          >
            {leagues.map(l => {
              const active = league?.id === l.id;
              return (
                <Box
                  key={l.id}
                  onClick={() => { setSelectedLeagueId(l.id); setTeamId(null); }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
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
                          color: '#a78bfa',
                          boxShadow: '0 2px 8px rgba(167,139,250,0.2)',
                        }
                      : {
                          color: '#64748b',
                          border: '1px solid transparent',
                          '&:hover': { color: '#94a3b8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' },
                        }),
                  }}
                >
                  {l.season}
                </Box>
              );
            })}
          </Box>
        )}

        {/* Count badge */}
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.28)',
              borderRadius: '14px',
              px: 2,
              py: 0.9,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
            }}
          >
            <PersonIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#f59e0b' }}>
              {totalElements} {totalElements === 1 ? 'player' : 'players'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Team filter row */}
      {teams && teams.length > 0 && (
        <Box sx={{ mb: 3.5 }}>
          <TeamFilter teams={teams} value={teamId} onChange={id => setTeamId(id)} />
        </Box>
      )}

      {/* Loading overlay while paginating */}
      <Box sx={{ position: 'relative' }}>
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '18px',
              background: 'rgba(5,5,20,0.55)',
              backdropFilter: 'blur(3px)',
            }}
          >
            <CircularProgress sx={{ color: '#f59e0b' }} size={32} />
          </Box>
        )}
        <PlayersTable players={players} />
      </Box>

      {/* Pagination controls */}
      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        onPrev={() => setPage(p => Math.max(0, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages - 1, p + 1))}
      />
    </Box>
  );
}

export default function PlayersPage() {
  return (
    <Box sx={{ animation: 'fadeIn 0.45s ease', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      {/* Page header */}
      <Box
        sx={{
          mb: 4,
          pb: 3,
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
                  background: 'linear-gradient(135deg, #4ade80 0%, #60a5fa 60%, #a78bfa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-1px',
                  lineHeight: 1,
                }}
              >
                Players
              </Typography>
              {/* Count badge in header */}
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: '10px',
                  background: 'rgba(74,222,128,0.12)',
                  border: '1px solid rgba(74,222,128,0.28)',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#4ade80',
                  letterSpacing: '0.8px',
                  alignSelf: 'center',
                }}
              >
                DIRECTORY
              </Box>
            </Box>
            <Typography sx={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>
              Browse, filter, and search all players across the Recykal Premier League
            </Typography>
          </Box>
        </Box>
      </Box>

      <AllPlayersContent />
    </Box>
  );
}
