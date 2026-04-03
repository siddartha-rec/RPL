import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Table, TableHead, TableRow, TableCell, TableBody,
  Paper, Chip, CircularProgress, Alert, Card, CardContent, Stack, Divider,
} from '@mui/material';
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

// ---- Tab panel helper ----
function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 3 }}>{children}</Box>;
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

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">Failed to load leagues</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Leagues ({(leagues ?? []).length})</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>Create League</Button>
      </Box>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Season</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Budget (L)</TableCell>
              <TableCell align="right">Max Players</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(leagues ?? []).map(l => (
              <TableRow key={l.id} hover>
                <TableCell>{l.name}</TableCell>
                <TableCell>{l.season}</TableCell>
                <TableCell><Chip label={l.status} size="small" /></TableCell>
                <TableCell align="right">{(l.teamBudget / 100000).toFixed(1)}</TableCell>
                <TableCell align="right">{l.maxPlayersPerTeam}</TableCell>
              </TableRow>
            ))}
            {(leagues ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary" sx={{ py: 2 }}>No leagues</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create League</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={form.name ?? ''} onChange={handleChange('name')} fullWidth />
            <TextField label="Season" value={form.season ?? ''} onChange={handleChange('season')} fullWidth />
            <TextField label="Team Budget" type="number" value={form.teamBudget ?? ''} onChange={handleChange('teamBudget')} fullWidth />
            <TextField label="Max Players Per Team" type="number" value={form.maxPlayersPerTeam ?? ''} onChange={handleChange('maxPlayersPerTeam')} fullWidth />
            <TextField label="Max Retentions" type="number" value={form.maxRetentionsPerTeam ?? ''} onChange={handleChange('maxRetentionsPerTeam')} fullWidth />
            <TextField label="Retention Cost" type="number" value={form.retentionCost ?? ''} onChange={handleChange('retentionCost')} fullWidth />
            <TextField label="Bid Increment" type="number" value={form.bidIncrement ?? ''} onChange={handleChange('bidIncrement')} fullWidth />
            <TextField label="Timer (seconds)" type="number" value={form.timerSeconds ?? ''} onChange={handleChange('timerSeconds')} fullWidth />
          </Stack>
          {mutation.error && <Alert severity="error" sx={{ mt: 2 }}>Failed to create league</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create'}
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

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">Failed to load teams</Alert>;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Teams ({(teams ?? []).length})</Typography>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Color</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Short Name</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell align="right">Budget (L)</TableCell>
              <TableCell align="right">Spent (L)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(teams ?? []).map(t => (
              <TableRow key={t.id} hover>
                <TableCell>
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: t.color || '#888' }} />
                </TableCell>
                <TableCell>{t.name}</TableCell>
                <TableCell>{t.shortName}</TableCell>
                <TableCell>{t.ownerName ?? '—'}</TableCell>
                <TableCell align="right">{(t.budget / 100000).toFixed(1)}</TableCell>
                <TableCell align="right">{(t.budgetSpent / 100000).toFixed(1)}</TableCell>
              </TableRow>
            ))}
            {(teams ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" sx={{ py: 2 }}>No teams</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
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

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">Failed to load players</Alert>;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Players ({(players ?? []).length})</Typography>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Team</TableCell>
              <TableCell align="right">Base Price (L)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(players ?? []).map(p => (
              <TableRow key={p.id} hover>
                <TableCell>{p.playerNumber ?? '—'}</TableCell>
                <TableCell>
                  {p.name}
                  {p.isCaptain && <Chip label="C" size="small" color="warning" sx={{ ml: 1 }} />}
                </TableCell>
                <TableCell>{p.category}</TableCell>
                <TableCell><Chip label={p.status} size="small" /></TableCell>
                <TableCell>{p.teamName ?? '—'}</TableCell>
                <TableCell align="right">{(p.basePrice / 100000).toFixed(1)}</TableCell>
              </TableRow>
            ))}
            {(players ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" sx={{ py: 2 }}>No players</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
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
    return <Alert severity="warning">No active league found. Create a league first.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Auction Control</Typography>

      {actionError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError('')}>{actionError}</Alert>}
      {actionSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setActionSuccess('')}>{actionSuccess}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="subtitle1">Auction ID:</Typography>
            <TextField
              type="number"
              size="small"
              value={auctionId}
              onChange={e => setAuctionId(Number(e.target.value))}
              sx={{ width: 100 }}
            />
            {isLoading && <CircularProgress size={20} />}
            {auction && <Chip label={auction.status} size="small" />}
          </Box>

          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Lifecycle</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              Create Auction
            </Button>
            <Button
              variant="outlined"
              color="info"
              onClick={() => doMutation(() => startAuction(auctionId), 'Auction started (retention)')}
              disabled={!auction}
            >
              Start (Retention)
            </Button>
            <Button
              variant="outlined"
              color="success"
              onClick={() => doMutation(() => advanceToLive(auctionId), 'Advanced to live')}
              disabled={!auction}
            >
              Advance to Live
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={() => doMutation(() => pauseAuction(auctionId), 'Auction paused')}
              disabled={!auction}
            >
              Pause
            </Button>
            <Button
              variant="outlined"
              color="success"
              onClick={() => doMutation(() => resumeAuction(auctionId), 'Auction resumed')}
              disabled={!auction}
            >
              Resume
            </Button>
            <Button
              variant="outlined"
              onClick={() => doMutation(() => switchToDraft(auctionId), 'Switched to draft')}
              disabled={!auction}
            >
              Switch to Draft
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => doMutation(() => completeAuction(auctionId), 'Auction completed')}
              disabled={!auction}
            >
              Complete
            </Button>
          </Stack>

          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Player Actions</Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              label="Player ID"
              type="number"
              size="small"
              value={playerIdInput}
              onChange={e => setPlayerIdInput(e.target.value)}
              sx={{ width: 120 }}
            />
            <Button
              variant="outlined"
              onClick={() => doMutation(
                () => putUpPlayer(auctionId, Number(playerIdInput)),
                `Player ${playerIdInput} put up`
              )}
              disabled={!auction || !playerIdInput}
            >
              Put Up Player
            </Button>
            <Button
              variant="outlined"
              color="success"
              onClick={() => doMutation(() => soldPlayer(auctionId), 'Player marked sold')}
              disabled={!auction}
            >
              Mark Sold
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

// ---- Main AdminPage ----
export default function AdminPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>Admin</Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Leagues" />
          <Tab label="Teams" />
          <Tab label="Players" />
          <Tab label="Auction Control" />
        </Tabs>
      </Box>
      <TabPanel value={tab} index={0}><LeaguesTab /></TabPanel>
      <TabPanel value={tab} index={1}><TeamsTab /></TabPanel>
      <TabPanel value={tab} index={2}><PlayersTab /></TabPanel>
      <TabPanel value={tab} index={3}><AuctionControlTab /></TabPanel>
    </Box>
  );
}
