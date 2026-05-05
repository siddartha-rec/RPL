import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, CircularProgress, Alert, Card, CardContent,
  Stack, LinearProgress, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
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
  getLeagues, createLeague, updateLeague, deleteLeague,
} from '../api/leagues';
import { importTournament, getImportProgress, checkTournamentImport } from '../api/cricheroes';
import type { ImportProgress as CHProgress, TournamentImportCheck } from '../api/cricheroes';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { getTeams } from '../api/teams';
import { getPlayers, createPlayer, updatePlayer, deletePlayer, importPlayers, getPlayersPaginated } from '../api/players';
import type { PageResponse } from '../types';
import {
  getAuctionByLeague, createAuction, startAuction, advanceToLive,
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
        background: '#f1f5f9',
        border: '1px solid #e2e8f0',
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
                  color: '#b45309',
                  boxShadow: '0 2px 12px rgba(245,158,11,0.15)',
                }
              : {
                  color: '#64748b',
                  border: '1px solid transparent',
                  '&:hover': { color: '#94a3b8', background: '#f1f5f9' },
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
function StyledTable({ columns, rows, columnTemplate }: { columns: string[]; rows: React.ReactNode[][]; columnTemplate?: string }) {
  const template = columnTemplate ?? `repeat(${columns.length}, 1fr)`;
  return (
    <Box
      sx={{
        background: '#ffffff',
        backdropFilter: 'blur(10px)',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: template,
          px: 2.5,
          py: 1.25,
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
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
              gridTemplateColumns: template,
              px: 2.5,
              py: 1.5,
              alignItems: 'center',
              borderBottom: '1px solid #f1f5f9',
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
  const [editing, setEditing] = useState<League | null>(null);
  const [editForm, setEditForm] = useState<Partial<League>>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<League | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importLeagueId, setImportLeagueId] = useState<number | ''>('');
  const [importSeasonDisplayName, setImportSeasonDisplayName] = useState('');
  const [importCheck, setImportCheck] = useState<TournamentImportCheck | null>(null);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [importStartError, setImportStartError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<League>>({
    name: '', season: '', seasonDisplayName: '', teamBudget: 100, maxPlayersPerTeam: 35,
    maxRetentionsPerTeam: 5, retentionCost: 10, bidIncrement: 0.5, timerSeconds: 30,
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

  const deleteMut = useMutation({
    mutationFn: () => deleteLeague(deleting!.id),
    onSuccess: () => {
      qc.invalidateQueries();
      setDeleting(null);
      setConfirmText('');
    },
  });

  const editMut = useMutation({
    mutationFn: () => updateLeague(editing!.id, editForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leagues'] });
      setEditing(null);
      setEditForm({});
      setEditError(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setEditError(e?.response?.data?.message ?? 'Failed to update league'),
  });

  const openEdit = (l: League) => {
    setEditForm({
      name: l.name,
      season: l.season,
      seasonDisplayName: l.seasonDisplayName ?? '',
      teamBudget: l.teamBudget,
      maxPlayersPerTeam: l.maxPlayersPerTeam,
      maxRetentionsPerTeam: l.maxRetentionsPerTeam,
      retentionCost: l.retentionCost,
      bidIncrement: l.bidIncrement,
      timerSeconds: l.timerSeconds,
    });
    setEditError(null);
    setEditing(l);
  };

  const closeEdit = () => {
    if (editMut.isPending) return;
    setEditing(null);
    setEditForm({});
    setEditError(null);
    editMut.reset();
  };

  const handleEditChange = (field: keyof League) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = ['teamBudget', 'maxPlayersPerTeam', 'maxRetentionsPerTeam', 'retentionCost', 'bidIncrement', 'timerSeconds'].includes(field)
      ? Number(e.target.value)
      : e.target.value;
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const startImportMut = useMutation({
    mutationFn: (overrideExisting: boolean) => importTournament(
      importUrl.trim(),
      importLeagueId === '' ? undefined : Number(importLeagueId),
      importSeasonDisplayName.trim() || undefined,
      overrideExisting,
    ),
    onSuccess: (d) => {
      setImportJobId(d.jobId);
      setImportStartError(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setImportStartError(e?.response?.data?.message ?? 'Failed to start import'),
  });

  const { data: importProgress } = useQuery<CHProgress>({
    queryKey: ['cricheroes-import', importJobId],
    queryFn: () => getImportProgress(importJobId!),
    enabled: !!importJobId,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === 'COMPLETED' || s === 'FAILED' ? false : 1500;
    },
  });

  useEffect(() => {
    if (importProgress?.status === 'COMPLETED' || importProgress?.status === 'FAILED') {
      qc.invalidateQueries();
    }
  }, [importProgress?.status, qc]);

  const closeImport = () => {
    if (importJobId && importProgress && (importProgress.status === 'PENDING' || importProgress.status === 'RUNNING')) return;
    setImportOpen(false);
    setImportUrl('');
    setImportLeagueId('');
    setImportSeasonDisplayName('');
    setImportCheck(null);
    setImportJobId(null);
    setImportStartError(null);
    startImportMut.reset();
  };

  const handleStartImport = async () => {
    try {
      const check = await checkTournamentImport(importUrl.trim());
      if (check.exists) {
        setImportCheck(check);
        return;
      }
      startImportMut.mutate(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setImportStartError(err?.response?.data?.message ?? 'Failed to check tournament');
    }
  };

  const handleChange = (field: keyof League) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = ['teamBudget', 'maxPlayersPerTeam', 'maxRetentionsPerTeam', 'retentionCost', 'bidIncrement', 'timerSeconds'].includes(field)
      ? Number(e.target.value)
      : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const closeDelete = () => {
    if (deleteMut.isPending) return;
    setDeleting(null);
    setConfirmText('');
    deleteMut.reset();
  };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: '#b45309' }} /></Box>;
  if (error) return <Alert severity="error" sx={{ borderRadius: '12px' }}>Failed to load leagues</Alert>;

  const deleteBtnSx = {
    minWidth: 32, width: 32, height: 32, p: 0,
    color: '#ef4444', borderRadius: '8px',
    background: '#ef444410',
    border: '1px solid #ef444430',
    '&:hover': { background: '#ef444420', borderColor: '#ef444455' },
  };
  const editBtnSx = {
    minWidth: 32, width: 32, height: 32, p: 0,
    color: '#60a5fa', borderRadius: '8px',
    background: '#60a5fa10',
    border: '1px solid #60a5fa30',
    '&:hover': { background: '#60a5fa20', borderColor: '#60a5fa55' },
  };

  const rows = (leagues ?? []).map(l => [
    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{l.name}</Typography>,
    <Typography sx={{ fontSize: '13px', color: '#94a3b8' }}>{(l.seasonDisplayName || l.season)}</Typography>,
    <StatusBadge status={l.status} />,
    <Typography sx={{ fontSize: '13px', color: '#94a3b8' }}>{l.teamBudget} CR</Typography>,
    <Typography sx={{ fontSize: '13px', color: '#94a3b8' }}>{l.maxPlayersPerTeam}</Typography>,
    <Box sx={{ display: 'flex', gap: 0.75 }}>
      <Button onClick={() => openEdit(l)} sx={editBtnSx} title="Edit league"><EditIcon sx={{ fontSize: 16 }} /></Button>
      <Button onClick={() => setDeleting(l)} sx={deleteBtnSx} title="Delete league"><DeleteOutlineIcon sx={{ fontSize: 16 }} /></Button>
    </Box>,
  ]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
            Leagues
          </Typography>
          <Typography sx={{ fontSize: '12px', color: '#64748b' }}>
            {(leagues ?? []).length} league{(leagues ?? []).length !== 1 ? 's' : ''} total
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<CloudDownloadIcon />}
          onClick={() => setImportOpen(true)}
          sx={{
            color: '#6d28d9',
            borderColor: 'rgba(167,139,250,0.4)',
            borderRadius: '12px',
            fontWeight: 700,
            '&:hover': { borderColor: '#a78bfa', background: 'rgba(167,139,250,0.08)' },
          }}
        >
          Import from CricHeroes
        </Button>
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
      </Box>
      <StyledTable
        columns={['Name', 'Season', 'Status', 'Budget', 'Max Players', 'Actions']}
        columnTemplate="1.5fr 1fr 1fr 1fr 1fr 96px"
        rows={rows}
      />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: '#ffffff',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#1e293b', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <SportsCricketIcon sx={{ color: '#b45309' }} />
            Create New League
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {[
              { label: 'League Name', field: 'name' as keyof League, type: 'text' },
              { label: 'Season', field: 'season' as keyof League, type: 'text' },
              { label: 'Season Display Name', field: 'seasonDisplayName' as keyof League, type: 'text' },
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
                    background: '#f1f5f9',
                    borderRadius: '10px',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&.Mui-focused fieldset': { borderColor: '#f59e0b' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#b45309' },
                }}
              />
            ))}
          </Stack>
          {mutation.error && <Alert severity="error" sx={{ mt: 2, borderRadius: '10px' }}>Failed to create league</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={() => setOpen(false)}
            sx={{ color: '#64748b', borderRadius: '10px', '&:hover': { background: '#eef2f7' } }}
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

      <Dialog
        open={!!editing}
        onClose={closeEdit}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: '#ffffff',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#1e293b', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <EditIcon sx={{ color: '#60a5fa' }} />
            Edit League
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {[
              { label: 'League Name', field: 'name' as keyof League, type: 'text' },
              { label: 'Season', field: 'season' as keyof League, type: 'text' },
              { label: 'Season Display Name', field: 'seasonDisplayName' as keyof League, type: 'text' },
              { label: 'Team Budget (CR)', field: 'teamBudget' as keyof League, type: 'number' },
              { label: 'Max Players Per Team', field: 'maxPlayersPerTeam' as keyof League, type: 'number' },
              { label: 'Max Retentions', field: 'maxRetentionsPerTeam' as keyof League, type: 'number' },
              { label: 'Retention Cost (CR)', field: 'retentionCost' as keyof League, type: 'number' },
              { label: 'Bid Increment (CR)', field: 'bidIncrement' as keyof League, type: 'number' },
              { label: 'Timer (seconds)', field: 'timerSeconds' as keyof League, type: 'number' },
            ].map(({ label, field, type }) => (
              <TextField
                key={field}
                label={label}
                type={type}
                value={editForm[field] ?? ''}
                onChange={handleEditChange(field)}
                fullWidth
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: '#f1f5f9',
                    borderRadius: '10px',
                    '&.Mui-focused fieldset': { borderColor: '#60a5fa' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' },
                }}
              />
            ))}
          </Stack>
          {editError && <Alert severity="error" sx={{ mt: 2, borderRadius: '10px' }}>{editError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={closeEdit} disabled={editMut.isPending} sx={{ color: '#64748b', borderRadius: '10px' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => editMut.mutate()}
            disabled={editMut.isPending || !editForm.name}
            sx={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              fontWeight: 700,
              borderRadius: '10px',
              '&:hover': { background: 'linear-gradient(135deg, #60a5fa, #3b82f6)' },
              '&.Mui-disabled': { background: '#e2e8f0', color: '#94a3b8' },
            }}
          >
            {editMut.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!deleting}
        onClose={closeDelete}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: '#ffffff',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '18px',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#b91c1c' }}>Delete league?</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ borderRadius: '10px', mb: 2 }}>
            This permanently wipes <b>{deleting?.name}</b> ({(deleting?.seasonDisplayName || deleting?.season)}) and all its data: teams, players, auctions, bids, draft picks, history, standings. Cannot be undone.
          </Alert>
          <Typography sx={{ color: '#475569', fontSize: '13px', mb: 1 }}>
            Type the season <b style={{ color: '#1e293b' }}>{(deleting?.seasonDisplayName || deleting?.season)}</b> to confirm.
          </Typography>
          <TextField
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            fullWidth
            size="small"
            autoFocus
            placeholder={(deleting?.seasonDisplayName || deleting?.season) ?? ''}
            sx={{
              '& .MuiOutlinedInput-root': {
                background: '#f1f5f9',
                borderRadius: '10px',
                '&.Mui-focused fieldset': { borderColor: '#ef4444' },
              },
            }}
          />
          {deleteMut.error && <Alert severity="error" sx={{ mt: 2, borderRadius: '10px' }}>Failed to delete league</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={closeDelete} disabled={deleteMut.isPending} sx={{ color: '#64748b', borderRadius: '10px' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => deleteMut.mutate()}
            disabled={deleteMut.isPending || confirmText !== ((deleting?.seasonDisplayName || deleting?.season) ?? '')}
            sx={{
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              fontWeight: 700,
              borderRadius: '10px',
              '&:hover': { background: 'linear-gradient(135deg, #fca5a5, #dc2626)' },
              '&.Mui-disabled': { background: '#e2e8f0', color: '#94a3b8' },
            }}
          >
            {deleteMut.isPending ? 'Deleting...' : 'Delete league'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={importOpen}
        onClose={closeImport}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: '#ffffff',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(167,139,250,0.25)',
            borderRadius: '20px',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#1e293b', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CloudDownloadIcon sx={{ color: '#6d28d9' }} />
            Import from CricHeroes
          </Box>
        </DialogTitle>
        <DialogContent>
          {!importJobId ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography sx={{ fontSize: '13px', color: '#64748b' }}>
                Paste a CricHeroes tournament URL. Pulls teams, players, matches and per-player stats.
              </Typography>
              <TextField
                label="Tournament URL"
                placeholder="https://cricheroes.com/tournament/1611803/recykal-premier-league-2025/matches/past-matches"
                value={importUrl}
                onChange={e => {
                  setImportUrl(e.target.value);
                  setImportCheck(null);
                }}
                fullWidth
                size="small"
                autoFocus
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: '#f1f5f9',
                    borderRadius: '10px',
                    '&.Mui-focused fieldset': { borderColor: '#a78bfa' },
                  },
                }}
              />
              <TextField
                select
                label="Attach to existing league (optional)"
                value={importLeagueId}
                onChange={e => {
                  setImportLeagueId(e.target.value === '' ? '' : Number(e.target.value));
                  setImportCheck(null);
                }}
                fullWidth
                size="small"
                SelectProps={{ native: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: '#f1f5f9',
                    borderRadius: '10px',
                  },
                }}
              >
                <option value="">— Create new league from tournament —</option>
                {(leagues ?? []).map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({(l.seasonDisplayName || l.season)})</option>
                ))}
              </TextField>
              <TextField
                label="Season Display Name (optional)"
                placeholder="e.g. Recykal Premier League 2025"
                value={importSeasonDisplayName}
                onChange={e => {
                  setImportSeasonDisplayName(e.target.value);
                  setImportCheck(null);
                }}
                fullWidth
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: '#f1f5f9',
                    borderRadius: '10px',
                    '&.Mui-focused fieldset': { borderColor: '#a78bfa' },
                  },
                }}
              />
              {importCheck?.exists && (
                <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                  Tournament already exists in league{' '}
                  <b>{importCheck.leagueName}</b>{' '}
                  ({importCheck.seasonDisplayName || importCheck.season}).
                  Choose <b>Skip</b> or <b>Override</b>.
                </Alert>
              )}
              {importStartError && (
                <Alert severity="error" sx={{ borderRadius: '10px' }}>{importStartError}</Alert>
              )}
            </Stack>
          ) : (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {(importProgress?.status === 'PENDING' || importProgress?.status === 'RUNNING') &&
                  <CircularProgress size={14} sx={{ color: '#a78bfa' }} />}
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  {importProgress?.currentStep ?? 'Starting...'}
                </Typography>
                <Box sx={{ ml: 'auto', px: 1.2, py: 0.3, borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                  background: importProgress?.status === 'COMPLETED' ? 'rgba(74,222,128,0.15)'
                    : importProgress?.status === 'FAILED' ? 'rgba(239,68,68,0.15)'
                    : 'rgba(167,139,250,0.15)',
                  color: importProgress?.status === 'COMPLETED' ? '#16a34a'
                    : importProgress?.status === 'FAILED' ? '#dc2626'
                    : '#6d28d9' }}>
                  {importProgress?.status ?? 'PENDING'}
                </Box>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: '#64748b', mb: 0.5 }}>
                  Teams: {importProgress?.teamsDone ?? 0} / {importProgress?.teamsTotal ?? 0}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={importProgress?.teamsTotal ? (importProgress.teamsDone / importProgress.teamsTotal) * 100 : 0}
                  sx={{ height: 6, borderRadius: 3, bgcolor: '#eef2f7',
                    '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #a78bfa, #8b5cf6)' } }}
                />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: '#64748b', mb: 0.5 }}>
                  Matches: {importProgress?.matchesDone ?? 0} / {importProgress?.matchesTotal ?? 0}
                  {importProgress?.matchesSkipped ? ` (${importProgress.matchesSkipped} skipped)` : ''}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={importProgress?.matchesTotal ? (importProgress.matchesDone / importProgress.matchesTotal) * 100 : 0}
                  sx={{ height: 6, borderRadius: 3, bgcolor: '#eef2f7',
                    '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #60a5fa, #3b82f6)' } }}
                />
              </Box>
              {importProgress?.errorMessage && (
                <Alert severity="error" sx={{ borderRadius: '10px' }}>{importProgress.errorMessage}</Alert>
              )}
              {(importProgress?.warnings?.length ?? 0) > 0 && (
                <Alert severity="warning" sx={{ borderRadius: '10px', maxHeight: 140, overflow: 'auto' }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700, mb: 0.5 }}>
                    {importProgress!.warnings.length} warning{importProgress!.warnings.length > 1 ? 's' : ''}
                  </Typography>
                  {importProgress!.warnings.map((w, i) => (
                    <Typography key={i} sx={{ fontSize: '11px', fontFamily: 'monospace' }}>{w}</Typography>
                  ))}
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          {!importJobId ? (
            <>
              <Button onClick={closeImport} sx={{ color: '#64748b', borderRadius: '10px' }}>Cancel</Button>
              {!importCheck?.exists && (
                <Button
                  variant="contained"
                  onClick={handleStartImport}
                  disabled={!importUrl.trim() || startImportMut.isPending}
                  sx={{
                    background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
                    fontWeight: 700,
                    borderRadius: '10px',
                    '&:hover': { background: 'linear-gradient(135deg, #c4b5fd, #a78bfa)' },
                    '&.Mui-disabled': { background: '#e2e8f0', color: '#94a3b8' },
                  }}
                >
                  {startImportMut.isPending ? 'Starting...' : 'Start Import'}
                </Button>
              )}
              {importCheck?.exists && (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => setImportCheck(null)}
                    sx={{ borderRadius: '10px' }}
                  >
                    Skip
                  </Button>
                  <Button
                    variant="contained"
                    color="warning"
                    onClick={() => startImportMut.mutate(true)}
                    disabled={startImportMut.isPending}
                    sx={{ borderRadius: '10px', fontWeight: 700 }}
                  >
                    {startImportMut.isPending ? 'Overriding...' : 'Override & Re-import'}
                  </Button>
                </>
              )}
            </>
          ) : (
            <Button
              onClick={closeImport}
              disabled={importProgress?.status === 'PENDING' || importProgress?.status === 'RUNNING'}
              sx={{ color: '#64748b', borderRadius: '10px' }}
            >
              {importProgress?.status === 'COMPLETED' || importProgress?.status === 'FAILED' ? 'Close' : 'Running...'}
            </Button>
          )}
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

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: '#b45309' }} /></Box>;
  if (error) return <Alert severity="error" sx={{ borderRadius: '12px' }}>Failed to load teams</Alert>;

  const rows = (teams ?? []).map(t => [
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: t.color || '#888', boxShadow: `0 0 6px ${t.color || '#888'}80`, flexShrink: 0 }} />
      <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{t.name}</Typography>
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
    <Typography sx={{ fontSize: '13px', color: '#1d4ed8', fontWeight: 600 }}>{t.budget} CR</Typography>,
    <Box>
      <Typography sx={{ fontSize: '13px', color: '#b45309', fontWeight: 600 }}>{t.budgetSpent} CR</Typography>
      <LinearProgress
        variant="determinate"
        value={t.budget > 0 ? Math.min((t.budgetSpent / t.budget) * 100, 100) : 0}
        sx={{
          mt: 0.5,
          height: 3,
          borderRadius: 2,
          bgcolor: '#eef2f7',
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
        <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Teams</Typography>
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
interface PlayerFormState {
  name: string;
  playerNumber: string;
  category: 'CRICKET' | 'OTHER';
  role: string;
  basePrice: string;
}

const EMPTY_PLAYER_FORM: PlayerFormState = {
  name: '', playerNumber: '', category: 'CRICKET', role: '', basePrice: '0',
};

function formToPayload(form: PlayerFormState): Partial<Player> {
  return {
    name: form.name.trim(),
    playerNumber: form.playerNumber.trim() ? Number(form.playerNumber) : undefined,
    category: form.category,
    role: form.role.trim() || undefined,
    basePrice: Number(form.basePrice) || 0,
  };
}

function playerToForm(p: Player): PlayerFormState {
  return {
    name: p.name,
    playerNumber: p.playerNumber != null ? String(p.playerNumber) : '',
    category: p.category,
    role: p.role ?? '',
    basePrice: String(p.basePrice ?? 0),
  };
}

function parsePlayerCsv(text: string): { rows: Partial<Player>[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { rows: [], errors: ['Empty file'] };

  const header = lines[0].split(',').map(c => c.trim().toLowerCase());
  const required = ['name', 'category'];
  for (const r of required) {
    if (!header.includes(r)) {
      errors.push(`Missing required column: ${r}`);
    }
  }
  if (errors.length > 0) return { rows: [], errors };

  const idx = (col: string) => header.indexOf(col);
  const rows: Partial<Player>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    const name = cols[idx('name')] ?? '';
    if (!name) { errors.push(`Row ${i + 1}: missing name`); continue; }

    const category = (cols[idx('category')] ?? '').toUpperCase();
    if (category !== 'CRICKET' && category !== 'OTHER') {
      errors.push(`Row ${i + 1}: category must be CRICKET or OTHER (got "${cols[idx('category')]}")`);
      continue;
    }

    const playerNumberRaw = idx('playernumber') >= 0 ? cols[idx('playernumber')] : '';
    const roleRaw = idx('role') >= 0 ? cols[idx('role')] : '';
    const basePriceRaw = idx('baseprice') >= 0 ? cols[idx('baseprice')] : '';

    rows.push({
      name,
      category: category as 'CRICKET' | 'OTHER',
      playerNumber: playerNumberRaw ? Number(playerNumberRaw) : undefined,
      role: roleRaw || undefined,
      basePrice: basePriceRaw ? Number(basePriceRaw) : 0,
    });
  }

  return { rows, errors };
}

function SeasonSelector({
  leagues,
  activeId,
  onChange,
}: { leagues: League[]; activeId: number | null; onChange: (id: number) => void }) {
  if (leagues.length === 0) return null;
  return (
    <Box
      sx={{
        display: 'flex',
        background: 'rgba(255,255,255,0.92)',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        p: 0.5,
        gap: 0.4,
        flexWrap: 'wrap',
      }}
    >
      {leagues.map(l => {
        const active = activeId === l.id;
        return (
          <Box
            key={l.id}
            onClick={() => onChange(l.id)}
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
                    color: '#6d28d9',
                  }
                : {
                    color: '#64748b',
                    border: '1px solid transparent',
                    '&:hover': { color: '#94a3b8', background: '#f1f5f9' },
                  }),
            }}
          >
            {(l.seasonDisplayName || l.season)}
          </Box>
        );
      })}
    </Box>
  );
}

function PlayerFormDialog({
  open,
  title,
  form,
  onChange,
  onClose,
  onSubmit,
  busy,
  error,
}: {
  open: boolean;
  title: string;
  form: PlayerFormState;
  onChange: (next: PlayerFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
  busy: boolean;
  error?: string | null;
}) {
  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      background: '#f1f5f9',
      borderRadius: '10px',
      '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
      '&.Mui-focused fieldset': { borderColor: '#f59e0b' },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#b45309' },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: '#ffffff',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, color: '#1e293b', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PersonIcon sx={{ color: '#b45309' }} />
          {title}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Name *"
            value={form.name}
            onChange={e => onChange({ ...form, name: e.target.value })}
            fullWidth size="small" sx={fieldSx}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            {(['CRICKET', 'OTHER'] as const).map(c => {
              const active = form.category === c;
              return (
                <Box
                  key={c}
                  onClick={() => onChange({ ...form, category: c })}
                  sx={{
                    flex: 1,
                    textAlign: 'center',
                    px: 2,
                    py: 1.1,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 800,
                    letterSpacing: '0.8px',
                    transition: 'all 0.2s ease',
                    ...(active
                      ? {
                          background: c === 'CRICKET'
                            ? 'linear-gradient(135deg, rgba(96,165,250,0.25), rgba(59,130,246,0.12))'
                            : 'linear-gradient(135deg, rgba(167,139,250,0.25), rgba(139,92,246,0.12))',
                          border: c === 'CRICKET' ? '1px solid rgba(96,165,250,0.5)' : '1px solid rgba(167,139,250,0.5)',
                          color: c === 'CRICKET' ? '#60a5fa' : '#a78bfa',
                        }
                      : {
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          color: '#64748b',
                          '&:hover': { color: '#94a3b8', borderColor: 'rgba(255,255,255,0.18)' },
                        }),
                  }}
                >
                  {c}
                </Box>
              );
            })}
          </Box>
          <TextField
            label="Player Number"
            type="number"
            value={form.playerNumber}
            onChange={e => onChange({ ...form, playerNumber: e.target.value })}
            fullWidth size="small" sx={fieldSx}
          />
          <TextField
            label="Role (e.g. Batsman, Bowler)"
            value={form.role}
            onChange={e => onChange({ ...form, role: e.target.value })}
            fullWidth size="small" sx={fieldSx}
          />
          <TextField
            label="Base Price (CR)"
            type="number"
            value={form.basePrice}
            onChange={e => onChange({ ...form, basePrice: e.target.value })}
            fullWidth size="small" sx={fieldSx}
            inputProps={{ step: '0.5', min: 0 }}
          />
        </Stack>
        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: '10px' }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: '#64748b', borderRadius: '10px', '&:hover': { background: '#eef2f7' } }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={busy || !form.name.trim()}
          sx={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            fontWeight: 700,
            borderRadius: '10px',
            '&:hover': { background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' },
          }}
        >
          {busy ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ImportCsvDialog({
  open,
  onClose,
  onImport,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (rows: Partial<Player>[]) => void;
  busy: boolean;
}) {
  const [parsed, setParsed] = useState<Partial<Player>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');

  const reset = () => { setParsed([]); setErrors([]); setFileName(''); };

  const handleClose = () => { reset(); onClose(); };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const { rows, errors } = parsePlayerCsv(text);
    setParsed(rows);
    setErrors(errors);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: '#ffffff',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, color: '#1e293b', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <UploadFileIcon sx={{ color: '#b45309' }} />
          Import Players from CSV
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ background: '#f1f5f9', border: '1px dashed rgba(255,255,255,0.18)', borderRadius: '12px', p: 2, mb: 2 }}>
          <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', mb: 1 }}>
            Required columns: <code>name</code>, <code>category</code>
          </Typography>
          <Typography sx={{ fontSize: '12px', color: '#64748b' }}>
            Optional: <code>playerNumber</code>, <code>role</code>, <code>basePrice</code>. Category must be <code>CRICKET</code> or <code>OTHER</code>.
          </Typography>
          <Typography sx={{ fontSize: '11px', color: '#475569', mt: 1, fontFamily: 'monospace' }}>
            name,category,playerNumber,role,basePrice<br />
            Aman Kumar,CRICKET,7,Batsman,2<br />
            Priya Singh,OTHER,,Quizzer,1
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Button
            component="label"
            variant="outlined"
            startIcon={<UploadFileIcon />}
            sx={{
              color: '#b45309',
              borderColor: 'rgba(245,158,11,0.4)',
              borderRadius: '10px',
              fontWeight: 700,
              '&:hover': { borderColor: '#f59e0b', background: 'rgba(245,158,11,0.06)' },
            }}
          >
            Choose CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </Button>
          {fileName && <Typography sx={{ fontSize: '13px', color: '#94a3b8' }}>{fileName}</Typography>}
        </Box>

        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
            <Typography sx={{ fontSize: '12px', fontWeight: 700 }}>Found {errors.length} issue{errors.length === 1 ? '' : 's'}:</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: '12px' }}>
              {errors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}
              {errors.length > 8 && <li>...and {errors.length - 8} more</li>}
            </Box>
          </Alert>
        )}

        {parsed.length > 0 && (
          <Box sx={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #eef2f7', overflow: 'hidden' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 1fr 100px', px: 2, py: 1, background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
              {['Name', 'Category', '#', 'Role', 'Base Price'].map(c => (
                <Typography key={c} sx={{ fontSize: '10px', fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.8px', textTransform: 'uppercase' }}>{c}</Typography>
              ))}
            </Box>
            <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
              {parsed.map((p, i) => (
                <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 1fr 100px', px: 2, py: 0.8, borderBottom: '1px solid #f1f5f9' }}>
                  <Typography sx={{ fontSize: '13px', color: '#1e293b' }} noWrap>{p.name}</Typography>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700, color: p.category === 'CRICKET' ? '#60a5fa' : '#a78bfa' }}>{p.category}</Typography>
                  <Typography sx={{ fontSize: '12px', color: '#64748b' }}>{p.playerNumber ?? '—'}</Typography>
                  <Typography sx={{ fontSize: '12px', color: '#94a3b8' }} noWrap>{p.role ?? '—'}</Typography>
                  <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>{p.basePrice ?? 0} CR</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={handleClose} sx={{ color: '#64748b', borderRadius: '10px', '&:hover': { background: '#eef2f7' } }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => onImport(parsed)}
          disabled={busy || parsed.length === 0 || errors.length > 0}
          sx={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            fontWeight: 700,
            borderRadius: '10px',
            '&:hover': { background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' },
          }}
        >
          {busy ? 'Importing...' : `Import ${parsed.length} player${parsed.length === 1 ? '' : 's'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PlayersTab() {
  const qc = useQueryClient();
  const { data: leagues } = useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: getLeagues,
  });

  const sortedLeagues = (leagues ?? []).slice().sort((a, b) => {
    const order: Record<string, number> = { ACTIVE: 0, SETUP: 1, COMPLETED: 2 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  });

  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  useEffect(() => {
    if (selectedLeagueId === null && sortedLeagues.length > 0) {
      setSelectedLeagueId(sortedLeagues[0].id);
    }
  }, [sortedLeagues, selectedLeagueId]);

  const activeLeague = sortedLeagues.find(l => l.id === selectedLeagueId) ?? sortedLeagues[0];

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 300ms debounce for search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 0 when filters/league change
  useEffect(() => { setPage(0); }, [debouncedSearch, activeLeague?.id]);

  const { data: pageData, isLoading, error } = useQuery<PageResponse<Player>>({
    queryKey: ['players-admin-page', activeLeague?.id, page, PAGE_SIZE, debouncedSearch],
    queryFn: () => getPlayersPaginated(activeLeague!.id, {
      page,
      size: PAGE_SIZE,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    }),
    enabled: !!activeLeague,
    placeholderData: prev => prev,
  });

  const players = pageData?.content ?? [];
  const totalElements = pageData?.totalElements ?? 0;
  const totalPages = pageData?.totalPages ?? 0;

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [deleting, setDeleting] = useState<Player | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState<PlayerFormState>(EMPTY_PLAYER_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['players-admin-page', activeLeague?.id] });

  const createMut = useMutation({
    mutationFn: (data: Partial<Player>) => createPlayer(activeLeague!.id, data),
    onSuccess: () => { invalidate(); setAddOpen(false); setForm(EMPTY_PLAYER_FORM); setFormError(null); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setFormError(e?.response?.data?.message ?? 'Failed to create player'),
  });

  const updateMut = useMutation({
    mutationFn: (data: Partial<Player>) => updatePlayer(editing!.id, data),
    onSuccess: () => { invalidate(); setEditing(null); setFormError(null); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setFormError(e?.response?.data?.message ?? 'Failed to update player'),
  });

  const deleteMut = useMutation({
    mutationFn: () => deletePlayer(deleting!.id),
    onSuccess: () => { invalidate(); setDeleting(null); },
  });

  const importMut = useMutation({
    mutationFn: (rows: Partial<Player>[]) => importPlayers(activeLeague!.id, rows),
    onSuccess: () => { invalidate(); setImportOpen(false); },
  });

  const openAdd = () => { setForm(EMPTY_PLAYER_FORM); setFormError(null); setAddOpen(true); };
  const openEdit = (p: Player) => { setForm(playerToForm(p)); setFormError(null); setEditing(p); };

  // Initial page load only — once we have data, keep showing it during refetch via placeholderData
  if (isLoading && !pageData) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: '#b45309' }} /></Box>;
  if (error) return <Alert severity="error" sx={{ borderRadius: '12px' }}>Failed to load players</Alert>;

  const statusColor = (s: string) => {
    const m: Record<string, string> = { RETAINED: '#60a5fa', SOLD: '#4ade80', UNSOLD: '#ef4444', AVAILABLE: '#94a3b8' };
    return m[s] ?? '#94a3b8';
  };

  const iconBtnSx = (color: string) => ({
    minWidth: 32, width: 32, height: 32, p: 0,
    color, borderRadius: '8px',
    background: `${color}10`,
    border: `1px solid ${color}30`,
    '&:hover': { background: `${color}20`, borderColor: `${color}55` },
  });

  const rows = players.map(p => [
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{p.name}</Typography>
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
    <Typography sx={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>{p.basePrice} CR</Typography>,
    <Box sx={{ display: 'flex', gap: 0.75 }}>
      <Button onClick={() => openEdit(p)} sx={iconBtnSx('#60a5fa')} title="Edit"><EditIcon sx={{ fontSize: 16 }} /></Button>
      <Button onClick={() => setDeleting(p)} sx={iconBtnSx('#ef4444')} title="Delete"><DeleteOutlineIcon sx={{ fontSize: 16 }} /></Button>
    </Box>,
  ]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Players</Typography>
          <Typography sx={{ fontSize: '12px', color: '#64748b' }}>
            {totalElements} player{totalElements === 1 ? '' : 's'} in {(activeLeague?.seasonDisplayName || activeLeague?.season) ?? '—'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <SeasonSelector
            leagues={sortedLeagues}
            activeId={activeLeague?.id ?? null}
            onChange={id => setSelectedLeagueId(id)}
          />
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            disabled={!activeLeague}
            onClick={() => setImportOpen(true)}
            sx={{
              color: '#6d28d9',
              borderColor: 'rgba(167,139,250,0.4)',
              borderRadius: '12px',
              fontWeight: 700,
              '&:hover': { borderColor: '#a78bfa', background: 'rgba(167,139,250,0.08)' },
            }}
          >
            Import CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!activeLeague}
            onClick={openAdd}
            sx={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              fontWeight: 700,
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
              '&:hover': { background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' },
            }}
          >
            Add Player
          </Button>
        </Box>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="Search players by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          fullWidth
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#475569', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            maxWidth: 420,
            '& .MuiOutlinedInput-root': {
              background: 'rgba(255,255,255,0.92)',
              borderRadius: '12px',
              fontSize: 14,
              '& fieldset': { borderColor: '#e2e8f0' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
              '&.Mui-focused fieldset': { borderColor: '#f59e0b' },
            },
            '& .MuiInputBase-input': {
              color: '#1e293b',
              '&::placeholder': { color: '#475569', opacity: 1 },
            },
          }}
        />
      </Box>

      {/* Table with optional refetch overlay */}
      <Box sx={{ position: 'relative' }}>
        {isLoading && pageData && (
          <Box
            sx={{
              position: 'absolute', inset: 0, zIndex: 5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(3px)',
            }}
          >
            <CircularProgress sx={{ color: '#b45309' }} size={28} />
          </Box>
        )}
        <StyledTable
          columns={['Name', 'Category', 'Status', 'Team', 'Base Price', '']}
          rows={rows}
        />
      </Box>

      {/* Pagination */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2.5, gap: 2, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
          {totalElements === 0
            ? 'No players match'
            : `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalElements)} of ${totalElements}`}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            onClick={page === 0 ? undefined : () => setPage(p => Math.max(0, p - 1))}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              px: 2, py: 0.9, borderRadius: '10px',
              fontSize: 13, fontWeight: 700,
              userSelect: 'none',
              color: '#94a3b8',
              border: '1px solid #e2e8f0',
              background: 'rgba(255,255,255,0.92)',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
              opacity: page === 0 ? 0.45 : 1,
              '&:hover': page === 0 ? {} : { background: '#eef2f7', color: '#eef2f7' },
            }}
          >
            <ChevronLeftIcon sx={{ fontSize: 16 }} /> Prev
          </Box>
          <Box
            sx={{
              px: 2, py: 0.9, borderRadius: '10px',
              fontSize: 13, fontWeight: 800, color: '#b45309',
              background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.1))',
              border: '1px solid rgba(245,158,11,0.4)',
            }}
          >
            Page {page + 1} of {Math.max(totalPages, 1)}
          </Box>
          <Box
            onClick={page >= totalPages - 1 ? undefined : () => setPage(p => Math.min(totalPages - 1, p + 1))}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              px: 2, py: 0.9, borderRadius: '10px',
              fontSize: 13, fontWeight: 700,
              userSelect: 'none',
              color: '#94a3b8',
              border: '1px solid #e2e8f0',
              background: 'rgba(255,255,255,0.92)',
              cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages - 1 ? 0.45 : 1,
              '&:hover': page >= totalPages - 1 ? {} : { background: '#eef2f7', color: '#eef2f7' },
            }}
          >
            Next <ChevronRightIcon sx={{ fontSize: 16 }} />
          </Box>
        </Box>
      </Box>

      <PlayerFormDialog
        open={addOpen}
        title="Add Player"
        form={form}
        onChange={setForm}
        onClose={() => setAddOpen(false)}
        onSubmit={() => createMut.mutate(formToPayload(form))}
        busy={createMut.isPending}
        error={formError}
      />
      <PlayerFormDialog
        open={!!editing}
        title="Edit Player"
        form={form}
        onChange={setForm}
        onClose={() => setEditing(null)}
        onSubmit={() => updateMut.mutate(formToPayload(form))}
        busy={updateMut.isPending}
        error={formError}
      />
      <ImportCsvDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={rows => importMut.mutate(rows)}
        busy={importMut.isPending}
      />

      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        PaperProps={{
          sx: {
            background: '#ffffff',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '18px',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#1e293b' }}>Delete Player?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#94a3b8' }}>
            Remove <b style={{ color: '#1e293b' }}>{deleting?.name}</b> from the league? This cannot be undone.
          </Typography>
          {deleteMut.error && <Alert severity="error" sx={{ mt: 2, borderRadius: '10px' }}>Failed to delete</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleting(null)} sx={{ color: '#64748b', borderRadius: '10px' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => deleteMut.mutate()}
            disabled={deleteMut.isPending}
            sx={{
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              fontWeight: 700,
              borderRadius: '10px',
              '&:hover': { background: 'linear-gradient(135deg, #fca5a5, #dc2626)' },
            }}
          >
            {deleteMut.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ---- Auction Control Tab ----
function AuctionControlTab() {
  const qc = useQueryClient();
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const { data: leagues } = useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: getLeagues,
  });

  const sortedLeagues = (leagues ?? []).slice().sort((a, b) => (b.season ?? '').localeCompare(a.season ?? ''));

  useEffect(() => {
    if (selectedLeagueId === null && sortedLeagues.length > 0) {
      const def = sortedLeagues.find(l => l.status !== 'COMPLETED') ?? sortedLeagues[0];
      setSelectedLeagueId(def.id);
    }
  }, [sortedLeagues, selectedLeagueId]);

  const activeLeague = sortedLeagues.find(l => l.id === selectedLeagueId) ?? null;

  const { data: auction, isLoading, refetch } = useQuery<Auction | null>({
    queryKey: ['auction-by-league', activeLeague?.id],
    queryFn: () => getAuctionByLeague(activeLeague!.id).catch(() => null),
    enabled: !!activeLeague,
  });

  const auctionId = auction?.id ?? null;

  const { data: availablePlayers } = useQuery<Player[]>({
    queryKey: ['players', activeLeague?.id],
    queryFn: () => getPlayers(activeLeague!.id),
    enabled: !!activeLeague,
  });

  const doMutation = (fn: () => Promise<unknown>, successMsg: string) => {
    setActionError('');
    setActionSuccess('');
    fn()
      .then(() => {
        setActionSuccess(successMsg);
        refetch();
        qc.invalidateQueries({ queryKey: ['auction-by-league'] });
        qc.invalidateQueries({ queryKey: ['players'] });
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Action failed';
        setActionError(msg);
      });
  };

  const createMutation = useMutation({
    mutationFn: () => createAuction(activeLeague!.id),
    onSuccess: () => {
      setActionSuccess('Auction created successfully');
      qc.invalidateQueries({ queryKey: ['auction-by-league'] });
      refetch();
    },
    onError: () => setActionError('Failed to create auction'),
  });

  if (sortedLeagues.length === 0) {
    return <Alert severity="warning" sx={{ borderRadius: '12px' }}>No leagues found. Create a league first.</Alert>;
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
                '&:disabled': { background: '#e2e8f0', color: '#475569', boxShadow: 'none' },
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
          background: '#ffffff',
          backdropFilter: 'blur(10px)',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          mb: 2,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
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
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Auction Control</Typography>
          <Typography sx={{ fontSize: '12px', color: '#64748b' }}>
            Manage auction lifecycle and player flow{activeLeague ? ` — ${activeLeague.name}` : ''}
          </Typography>
        </Box>
        <SeasonSelector
          leagues={sortedLeagues}
          activeId={selectedLeagueId}
          onChange={id => {
            setSelectedLeagueId(id);
            setSelectedPlayerId(null);
            setActionError('');
            setActionSuccess('');
          }}
        />
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
          {isLoading && <CircularProgress size={16} sx={{ color: '#b45309' }} />}
          {!auction && !isLoading && (
            <Typography sx={{ fontSize: '13px', color: '#64748b' }}>No auction found. Create one below.</Typography>
          )}
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
          <ActionButton label="Start (Retention)" icon={<PlayArrowIcon sx={{ fontSize: 16 }} />} onClick={() => doMutation(() => startAuction(auctionId!), 'Auction started')} disabled={!auction} color="#60a5fa" variant="outlined" />
          <ActionButton label="Advance to Live" icon={<SkipNextIcon sx={{ fontSize: 16 }} />} onClick={() => doMutation(() => advanceToLive(auctionId!), 'Advanced to live')} disabled={!auction} color="#4ade80" />
          <ActionButton label="Switch to Draft" onClick={() => doMutation(() => switchToDraft(auctionId!), 'Switched to draft')} disabled={!auction} color="#a78bfa" variant="outlined" />
          <ActionButton label="Complete" icon={<StopIcon sx={{ fontSize: 16 }} />} onClick={() => doMutation(() => completeAuction(auctionId!), 'Completed')} disabled={!auction} color="#ef4444" />
        </Stack>
      </SectionCard>

      {/* Pause / Resume */}
      <SectionCard title="Pause / Resume">
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <ActionButton label="Pause" icon={<PauseIcon sx={{ fontSize: 16 }} />} onClick={() => doMutation(() => pauseAuction(auctionId!), 'Paused')} disabled={!auction} color="#f59e0b" />
          <ActionButton label="Resume" icon={<PlayArrowIcon sx={{ fontSize: 16 }} />} onClick={() => doMutation(() => resumeAuction(auctionId!), 'Resumed')} disabled={!auction} color="#4ade80" />
        </Stack>
      </SectionCard>

      {/* Player controls */}
      <SectionCard title="Player Control">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            select
            label="Select Player"
            size="small"
            value={selectedPlayerId ?? ''}
            onChange={e => setSelectedPlayerId(e.target.value ? Number(e.target.value) : null)}
            SelectProps={{ native: true }}
            sx={{
              minWidth: 250,
              '& .MuiOutlinedInput-root': {
                background: '#f1f5f9',
                borderRadius: '10px',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                '&.Mui-focused fieldset': { borderColor: '#f59e0b' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#b45309' },
            }}
          >
            <option value="">-- Choose a player --</option>
            {(availablePlayers ?? [])
              .filter(p => p.status === 'AVAILABLE' || p.status === 'UNSOLD')
              .map(p => (
                <option key={p.id} value={p.id}>
                  {p.playerNumber ? `#${p.playerNumber} ` : ''}{p.name} ({p.category})
                </option>
              ))}
          </TextField>
          <ActionButton
            label="Put Up Player"
            icon={<PersonIcon sx={{ fontSize: 16 }} />}
            onClick={() => doMutation(() => putUpPlayer(auctionId!, selectedPlayerId!), `Player put up for auction`)}
            disabled={!auction || !selectedPlayerId}
            color="#60a5fa"
          />
          <ActionButton
            label="Mark Sold"
            icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
            onClick={() => doMutation(() => soldPlayer(auctionId!), 'Marked sold/unsold')}
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
