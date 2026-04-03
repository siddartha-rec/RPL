import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, CircularProgress, Alert, Card, CardContent,
  Stack, LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import GavelIcon from '@mui/icons-material/Gavel';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  getLeagues, createLeague,
} from '../api/leagues';
import { getTeams } from '../api/teams';
import { getPlayers } from '../api/players';
import {
  getAuction, createAuction, startAuction, advanceToLive,
  pauseAuction, resumeAuction, switchToDraft, completeAuction,
  putUpPlayer, soldPlayer,
} from '../api/auctions';
import type { League, Team, Player, Auction } from '../types';

// ---- Custom Tabs ----
function CustomTabs({ value, onChange, tabs }: { value: number; onChange: (v: number) => void; tabs: { label: string; icon: React.ReactNode }[] }) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.5,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        p: 0.75,
        mb: 3,
        flexWrap: 'wrap',
      }}
    >
      {tabs.map((tab, i) => (
        <Box
          key={i}
          onClick={() => onChange(i)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 2,
            py: 1,
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'all 0.2s ease',
            ...(value === i
              ? {
                  background: 'rgba(245,158,11,0.2)',
                  border: '1px solid rgba(245,158,11,0.35)',
                  color: '#f59e0b',
                  boxShadow: '0 2px 12px rgba(245,158,11,0.15)',
                }
              : {
                  color: '#64748b',
                  border: '1px solid transparent',
                  '&:hover': { color: '#94a3b8', background: 'rgba(255,255,255,0.04)' },
                }),
          }}
        >
          {tab.icon}
          {tab.label}
        </Box>
      ))}
    </Box>
  );
}

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  if (value !== index) return null;
  return <Box sx={{ animation: 'fadeIn 0.3s ease' }}>{children}</Box>;
}

// ---- Styled Table ----
function StyledTable({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
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
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
          px: 2.5,
          py: 1.25,
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {columns.map(col => (
          <Typography
            key={col}
            sx={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px' }}
          >
            {col}
          </Typography>
        ))}
      </Box>
      {rows.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: '#475569' }}>
          <Typography sx={{ fontSize: '14px' }}>No data</Typography>
        </Box>
      ) : (
        rows.map((row, i) => (
          <Box
            key={i}
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
              px: 2.5,
              py: 1.5,
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
              transition: 'background 0.2s',
              '&:hover': { background: 'rgba(245,158,11,0.05)' },
              '&:last-child': { borderBottom: 'none' },
            }}
          >
            {row.map((cell, j) => (
              <Box key={j}>{cell}</Box>
            ))}
          </Box>
        ))
      )}
    </Box>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    SETUP: '#94a3b8',
    RETENTION: '#60a5fa',
    DRAFT: '#60a5fa',
    LIVE: '#ef4444',
    PAUSED: '#f59e0b',
    COMPLETED: '#4ade80',
  };
  const color = colorMap[status] ?? '#94a3b8';
  return (
    <Box
      sx={{
        display: 'inline-block',
        px: 1.2,
        py: 0.3,
        borderRadius: '20px',
        background: `${color}18`,
        border: `1px solid ${color}40`,
        fontSize: '11px',
        fontWeight: 700,
        color,
        letterSpacing: '0.3px',
      }}
    >
      {status}
    </Box>
  );
}

// ---- Leagues Tab ----
function LeaguesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<League>>({
    name: '', season: '', teamBudget: 8000000, maxPlayersPerTeam: 15,
    maxRetentionsPerTeam: 3, retentionCost: 500000, bidIncrement: 100000, timerSeconds: 30,
  });

  const { data: leagues, isLoading, error } = useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: getLeagues,
  });

  const mutation = useMutation({
    mutationFn: (data: Partial<League>) => createLeague(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leagues'] });
      setOpen(false);
    },
  });

  const handleChange = (field: keyof League) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = ['teamBudget', 'maxPlayersPerTeam', 'maxRetentionsPerTeam', 'retentionCost', 'bidIncrement', 'timerSeconds'].includes(field)
      ? Number(e.target.value)
      : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: '#f59e0b' }} /></Box>;
  if (error) return <Alert severity="error" sx={{ borderRadius: '12px' }}>Failed to load leagues</Alert>;

  const rows = (leagues ?? []).map(l => [
    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{l.name}</Typography>,
    <Typography sx={{ fontSize: '13px', color: '#94a3b8' }}>{l.season}</Typography>,
    <StatusBadge status={l.status} />,
    <Typography sx={{ fontSize: '13px', color: '#94a3b8' }}>₹{(l.teamBudget / 100000).toFixed(1)}L</Typography>,
    <Typography sx={{ fontSize: '13px', color: '#94a3b8' }}>{l.maxPlayersPerTeam}</Typography>,
  ]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>
            Leagues
          </Typography>
          <Typography sx={{ fontSize: '12px', color: '#64748b' }}>
            {(leagues ?? []).length} league{(leagues ?? []).length !== 1 ? 's' : ''} total
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
          sx={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#fff',
            fontWeight: 700,
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
            '&:hover': { background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 6px 20px rgba(245,158,11,0.4)' },
          }}
        >
          Create League
        </Button>
      </Box>
      <StyledTable
        columns={['Name', 'Season', 'Status', 'Budget', 'Max Players']}
        rows={rows}
      />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(26,26,46,0.97)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#e2e8f0', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <SportsCricketIcon sx={{ color: '#f59e0b' }} />
            Create New League
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {[
              { label: 'League Name', field: 'name' as keyof League, type: 'text' },
              { label: 'Season', field: 'season' as keyof League, type: 'text' },
              { label: 'Team Budget (₹)', field: 'teamBudget' as keyof League, type: 'number' },
              { label: 'Max Players Per Team', field: 'maxPlayersPerTeam' as keyof League, type: 'number' },
              { label: 'Max Retentions', field: 'maxRetentionsPerTeam' as keyof League, type: 'number' },
              { label: 'Retention Cost (₹)', field: 'retentionCost' as keyof League, type: 'number' },
              { label: 'Bid Increment (₹)', field: 'bidIncrement' as keyof League, type: 'number' },
              { label: 'Timer (seconds)', field: 'timerSeconds' as keyof League, type: 'number' },
            ].map(({ label, field, type }) => (
              <TextField
                key={field}
                label={label}
                type={type}
                value={form[field] ?? ''}
                onChange={handleChange(field)}
                fullWidth
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '10px',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&.Mui-focused fieldset': { borderColor: '#f59e0b' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#f59e0b' },
                }}
              />
            ))}
          </Stack>
          {mutation.error && <Alert severity="error" sx={{ mt: 2, borderRadius: '10px' }}>Failed to create league</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={() => setOpen(false)}
            sx={{ color: '#64748b', borderRadius: '10px', '&:hover': { background: 'rgba(255,255,255,0.05)' } }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending}
            sx={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              fontWeight: 700,
              borderRadius: '10px',
              boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
              '&:hover': { background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' },
            }}
          >
            {mutation.isPending ? 'Creating...' : 'Create League'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ---- Teams Tab ----
function TeamsTab() {
  const { data: leagues } = useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: getLeagues,
  });

  const activeLeague = leagues?.find(l => l.status !== 'COMPLETED') ?? leagues?.[0];

  const { data: teams, isLoading, error } = useQuery<Team[]>({
    queryKey: ['teams', activeLeague?.id],
    queryFn: () => getTeams(activeLeague!.id),
    enabled: !!activeLeague,
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: '#f59e0b' }} /></Box>;
  if (error) return <Alert severity="error" sx={{ borderRadius: '12px' }}>Failed to load teams</Alert>;

  const rows = (teams ?? []).map(t => [
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: t.color || '#888', boxShadow: `0 0 6px ${t.color || '#888'}80`, flexShrink: 0 }} />
      <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{t.name}</Typography>
    </Box>,
    <Box
      sx={{
        display: 'inline-block',
        px: 1,
        py: 0.25,
        borderRadius: '6px',
        background: `${t.color || '#888'}25`,
        border: `1px solid ${t.color || '#888'}50`,
        fontSize: '11px',
        fontWeight: 700,
        color: t.color || '#888',
      }}
    >
      {t.shortName}
    </Box>,
    <Typography sx={{ fontSize: '13px', color: '#94a3b8' }}>{t.ownerName ?? '—'}</Typography>,
    <Typography sx={{ fontSize: '13px', color: '#60a5fa', fontWeight: 600 }}>₹{(t.budget / 100000).toFixed(1)}L</Typography>,
    <Box>
      <Typography sx={{ fontSize: '13px', color: '#f59e0b', fontWeight: 600 }}>₹{(t.budgetSpent / 100000).toFixed(1)}L</Typography>
      <LinearProgress
        variant="determinate"
        value={t.budget > 0 ? Math.min((t.budgetSpent / t.budget) * 100, 100) : 0}
        sx={{
          mt: 0.5,
          height: 3,
          borderRadius: 2,
          bgcolor: 'rgba(255,255,255,0.06)',
          '& .MuiLinearProgress-bar': {
            background: `linear-gradient(90deg, ${t.color || '#888'}, ${t.color || '#888'}cc)`,
            borderRadius: 2,
          },
        }}
      />
    </Box>,
  ]);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>Teams</Typography>
        <Typography sx={{ fontSize: '12px', color: '#64748b' }}>{(teams ?? []).length} teams in active league</Typography>
      </Box>
      <StyledTable
        columns={['Team', 'Code', 'Owner', 'Budget', 'Spent']}
        rows={rows}
      />
    </Box>
  );
}

// ---- Players Tab ----
function PlayersTab() {
  const { data: leagues } = useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: getLeagues,
  });

  const activeLeague = leagues?.find(l => l.status !== 'COMPLETED') ?? leagues?.[0];

  const { data: players, isLoading, error } = useQuery<Player[]>({
    queryKey: ['players', activeLeague?.id],
    queryFn: () => getPlayers(activeLeague!.id),
    enabled: !!activeLeague,
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: '#f59e0b' }} /></Box>;
  if (error) return <Alert severity="error" sx={{ borderRadius: '12px' }}>Failed to load players</Alert>;

  const statusColor = (s: string) => {
    const m: Record<string, string> = { RETAINED: '#60a5fa', SOLD: '#4ade80', UNSOLD: '#ef4444', AVAILABLE: '#94a3b8' };
    return m[s] ?? '#94a3b8';
  };

  const rows = (players ?? []).map(p => [
    <Typography sx={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{p.playerNumber ?? '—'}</Typography>,
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{p.name}</Typography>
      {p.isCaptain && (
        <Box sx={{ width: 16, height: 16, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 900, color: '#fff' }}>C</Box>
      )}
    </Box>,
    <Box sx={{ display: 'inline-block', px: 1.2, py: 0.3, borderRadius: '20px', background: p.category === 'CRICKET' ? 'rgba(96,165,250,0.12)' : 'rgba(167,139,250,0.12)', border: p.category === 'CRICKET' ? '1px solid rgba(96,165,250,0.25)' : '1px solid rgba(167,139,250,0.25)', fontSize: '11px', fontWeight: 700, color: p.category === 'CRICKET' ? '#60a5fa' : '#a78bfa' }}>
      {p.category}
    </Box>,
    <Box sx={{ display: 'inline-block', px: 1.2, py: 0.3, borderRadius: '20px', background: `${statusColor(p.status)}15`, border: `1px solid ${statusColor(p.status)}40`, fontSize: '11px', fontWeight: 700, color: statusColor(p.status) }}>
      {p.status}
    </Box>,
    p.teamName ? (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.teamColor || '#888', flexShrink: 0 }} />
        <Typography sx={{ fontSize: '13px', color: '#94a3b8' }}>{p.teamName}</Typography>
      </Box>
    ) : <Typography sx={{ fontSize: '13px', color: '#475569' }}>—</Typography>,
    <Typography sx={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>₹{(p.basePrice / 100000).toFixed(1)}L</Typography>,
  ]);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>Players</Typography>
        <Typography sx={{ fontSize: '12px', color: '#64748b' }}>{(players ?? []).length} players total</Typography>
      </Box>
      <StyledTable
        columns={['#', 'Name', 'Category', 'Status', 'Team', 'Base Price']}
        rows={rows}
      />
    </Box>
  );
}

// ---- Auction Control Tab ----
function AuctionControlTab() {
  const qc = useQueryClient();
  const [auctionId, setAuctionId] = useState(1);
  const [playerIdInput, setPlayerIdInput] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const { data: leagues } = useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: getLeagues,
  });

  const activeLeague = leagues?.find(l => l.status !== 'COMPLETED') ?? leagues?.[0];

  const { data: auction, isLoading, refetch } = useQuery<Auction>({
    queryKey: ['auction', auctionId],
    queryFn: () => getAuction(auctionId),
    retry: false,
    enabled: !!auctionId,
  });

  const doMutation = (fn: () => Promise<unknown>, successMsg: string) => {
    setActionError('');
    setActionSuccess('');
    fn()
      .then(() => {
        setActionSuccess(successMsg);
        refetch();
        qc.invalidateQueries({ queryKey: ['auction'] });
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Action failed';
        setActionError(msg);
      });
  };

  const createMutation = useMutation({
    mutationFn: () => createAuction(activeLeague!.id),
    onSuccess: (data: Auction) => {
      setAuctionId(data.id);
      setActionSuccess(`Auction created with id ${data.id}`);
      qc.invalidateQueries({ queryKey: ['auction'] });
    },
    onError: () => setActionError('Failed to create auction'),
  });

  if (!activeLeague) {
    return <Alert severity="warning" sx={{ borderRadius: '12px' }}>No active league found. Create a league first.</Alert>;
  }

  const auctionStatusColor = (s: string) => {
    const m: Record<string, string> = { LIVE: '#ef4444', PAUSED: '#f59e0b', COMPLETED: '#4ade80', RETENTION: '#60a5fa', DRAFT: '#60a5fa' };
    return m[s] ?? '#94a3b8';
  };

  function ActionButton({
    label, icon, onClick, disabled, color, variant = 'contained',
  }: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    color: string;
    variant?: 'contained' | 'outlined';
  }) {
    return (
      <Button
        variant={variant}
        onClick={onClick}
        disabled={disabled}
        startIcon={icon}
        sx={{
          fontWeight: 700,
          fontSize: '12px',
          borderRadius: '10px',
          px: 2,
          py: 1,
          ...(variant === 'contained'
            ? {
                background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                color: '#fff',
                boxShadow: `0 3px 12px ${color}40`,
                border: 'none',
                '&:hover': { background: `linear-gradient(135deg, ${color}ee, ${color})`, boxShadow: `0 5px 16px ${color}50` },
                '&:disabled': { background: 'rgba(255,255,255,0.08)', color: '#475569', boxShadow: 'none' },
              }
            : {
                border: `1px solid ${color}50`,
                color,
                '&:hover': { background: `${color}15`, borderColor: color },
                '&:disabled': { borderColor: 'rgba(255,255,255,0.1)', color: '#475569' },
              }),
          transition: 'all 0.2s ease',
        }}
      >
        {label}
      </Button>
    );
  }

  function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <Box
        sx={{
          background: 'rgba(26,26,46,0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          mb: 2,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {title}
          </Typography>
        </Box>
        <Box sx={{ p: 2.5 }}>{children}</Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>Auction Control</Typography>
        <Typography sx={{ fontSize: '12px', color: '#64748b' }}>Manage auction lifecycle and player flow</Typography>
      </Box>

      {actionError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setActionError('')}>
          {actionError}
        </Alert>
      )}
      {actionSuccess && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setActionSuccess('')}>
          {actionSuccess}
        </Alert>
      )}

      {/* Status indicator */}
      <SectionCard title="Auction Status">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Auction ID:</Typography>
            <TextField
              type="number"
              size="small"
              value={auctionId}
              onChange={e => setAuctionId(Number(e.target.value))}
              sx={{
                width: 90,
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                  '&.Mui-focused fieldset': { borderColor: '#f59e0b' },
                },
              }}
            />
            {isLoading && <CircularProgress size={16} sx={{ color: '#f59e0b' }} />}
          </Box>
          {auction && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 0.75,
                borderRadius: '12px',
                background: `${auctionStatusColor(auction.status)}15`,
                border: `1px solid ${auctionStatusColor(auction.status)}40`,
              }}
            >
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: auctionStatusColor(auction.status), ...(auction.status === 'LIVE' && { animation: 'pulse 1s infinite' }) }} />
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: auctionStatusColor(auction.status) }}>
                {auction.status}
              </Typography>
            </Box>
          )}
        </Box>
      </SectionCard>

      {/* Lifecycle controls */}
      <SectionCard title="Lifecycle Controls">
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <ActionButton label="Create Auction" icon={<AddIcon sx={{ fontSize: 16 }} />} onClick={() => createMutation.mutate()} disabled={createMutation.isPending} color="#6366f1" />
          <ActionButton label="Start (Retention)" icon={<PlayArrowIcon sx={{ fontSize: 16 }} />} onClick={() => doMutation(() => startAuction(auctionId), 'Auction started')} disabled={!auction} color="#60a5fa" variant="outlined" />
          <ActionButton label="Advance to Live" icon={<SkipNextIcon sx={{ fontSize: 16 }} />} onClick={() => doMutation(() => advanceToLive(auctionId), 'Advanced to live')} disabled={!auction} color="#4ade80" />
          <ActionButton label="Switch to Draft" onClick={() => doMutation(() => switchToDraft(auctionId), 'Switched to draft')} disabled={!auction} color="#a78bfa" variant="outlined" />
          <ActionButton label="Complete" icon={<StopIcon sx={{ fontSize: 16 }} />} onClick={() => doMutation(() => completeAuction(auctionId), 'Completed')} disabled={!auction} color="#ef4444" />
        </Stack>
      </SectionCard>

      {/* Pause / Resume */}
      <SectionCard title="Pause / Resume">
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <ActionButton label="Pause" icon={<PauseIcon sx={{ fontSize: 16 }} />} onClick={() => doMutation(() => pauseAuction(auctionId), 'Paused')} disabled={!auction} color="#f59e0b" />
          <ActionButton label="Resume" icon={<PlayArrowIcon sx={{ fontSize: 16 }} />} onClick={() => doMutation(() => resumeAuction(auctionId), 'Resumed')} disabled={!auction} color="#4ade80" />
        </Stack>
      </SectionCard>

      {/* Player controls */}
      <SectionCard title="Player Control">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            label="Player ID"
            type="number"
            size="small"
            value={playerIdInput}
            onChange={e => setPlayerIdInput(e.target.value)}
            sx={{
              width: 120,
              '& .MuiOutlinedInput-root': {
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '10px',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                '&.Mui-focused fieldset': { borderColor: '#f59e0b' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#f59e0b' },
            }}
          />
          <ActionButton
            label="Put Up Player"
            icon={<PersonIcon sx={{ fontSize: 16 }} />}
            onClick={() => doMutation(() => putUpPlayer(auctionId, Number(playerIdInput)), `Player ${playerIdInput} put up`)}
            disabled={!auction || !playerIdInput}
            color="#60a5fa"
          />
          <ActionButton
            label="Mark Sold"
            icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
            onClick={() => doMutation(() => soldPlayer(auctionId), 'Marked sold')}
            disabled={!auction}
            color="#4ade80"
          />
        </Box>
      </SectionCard>
    </Box>
  );
}

// ---- Main AdminPage ----
export default function AdminPage() {
  const [tab, setTab] = useState(0);

  const tabs = [
    { label: 'Leagues', icon: <SportsCricketIcon sx={{ fontSize: 16 }} /> },
    { label: 'Teams', icon: <GroupsIcon sx={{ fontSize: 16 }} /> },
    { label: 'Players', icon: <PersonIcon sx={{ fontSize: 16 }} /> },
    { label: 'Auction Control', icon: <GavelIcon sx={{ fontSize: 16 }} /> },
  ];

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
          Admin
        </Typography>
        <Typography sx={{ color: '#64748b', fontSize: '14px' }}>
          Manage leagues, teams, players, and auction settings
        </Typography>
      </Box>

      <CustomTabs value={tab} onChange={setTab} tabs={tabs} />

      <TabPanel value={tab} index={0}><LeaguesTab /></TabPanel>
      <TabPanel value={tab} index={1}><TeamsTab /></TabPanel>
      <TabPanel value={tab} index={2}><PlayersTab /></TabPanel>
      <TabPanel value={tab} index={3}><AuctionControlTab /></TabPanel>
    </Box>
  );
}
