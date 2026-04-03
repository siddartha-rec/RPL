import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, TextField, Chip, CircularProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, Paper,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import { getLeagues } from '../api/leagues';
import { getPlayers } from '../api/players';
import type { League, Player } from '../types';

function statusColor(status: string): 'default' | 'info' | 'success' | 'error' {
  switch (status) {
    case 'RETAINED': return 'info';
    case 'SOLD': return 'success';
    case 'UNSOLD': return 'error';
    default: return 'default';
  }
}

function AllPlayersTable() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'ALL' | 'CRICKET' | 'OTHER'>('ALL');

  const { data: leagues } = useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: getLeagues,
  });

  // Use the first active (non-completed) league, or first league
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
    if (category !== 'ALL') {
      list = list.filter(p => p.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [players, category, search]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load players</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          label="Search players"
          size="small"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ minWidth: 240 }}
        />
        <ToggleButtonGroup
          value={category}
          exclusive
          size="small"
          onChange={(_, val) => { if (val) setCategory(val); }}
        >
          <ToggleButton value="ALL">All</ToggleButton>
          <ToggleButton value="CRICKET">Cricket</ToggleButton>
          <ToggleButton value="OTHER">Other</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary">
          {filtered.length} player{filtered.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Team</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Base Price</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.id} hover>
                <TableCell>{p.playerNumber ?? '—'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {p.name}
                    {p.isCaptain && <Chip label="C" size="small" color="warning" />}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={p.category}
                    size="small"
                    color={p.category === 'CRICKET' ? 'primary' : 'secondary'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {p.teamName ? (
                    <Chip
                      label={p.teamName}
                      size="small"
                      sx={{
                        bgcolor: p.teamColor || undefined,
                        color: p.teamColor ? '#fff' : undefined,
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">—</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip label={p.status} size="small" color={statusColor(p.status)} />
                </TableCell>
                <TableCell align="right">₹{(p.basePrice / 100000).toFixed(1)}L</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" sx={{ py: 2 }}>No players found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}

export default function PlayersPage() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>Players</Typography>
      <AllPlayersTable />
    </Box>
  );
}
