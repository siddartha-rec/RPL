import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Chip, CircularProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, Paper, Divider,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { getTeam } from '../api/teams';
import { getPlayers } from '../api/players';
import { getLeagues } from '../api/leagues';
import type { Team, Player, League } from '../types';

function statusColor(status: string): 'default' | 'info' | 'success' | 'error' {
  switch (status) {
    case 'RETAINED': return 'info';
    case 'SOLD': return 'success';
    case 'UNSOLD': return 'error';
    default: return 'default';
  }
}

function PlayerTable({ title, players }: { title: string; players: Player[] }) {
  if (players.length === 0) return null;
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="right">Base Price</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {players.map(p => (
              <TableRow key={p.id} hover>
                <TableCell>{p.playerNumber ?? '—'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {p.name}
                    {p.isCaptain && <Chip label="C" size="small" color="warning" />}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={p.status} size="small" color={statusColor(p.status)} />
                </TableCell>
                <TableCell>{p.role ?? '—'}</TableCell>
                <TableCell align="right">₹{(p.basePrice / 100000).toFixed(1)}L</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
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
        <CircularProgress />
      </Box>
    );
  }

  if (teamError || !team) {
    return <Alert severity="error">Failed to load team</Alert>;
  }

  const league = leagues?.find(l => l.id === team.leagueId);
  const cricketPlayers = (allPlayers ?? []).filter(p => p.category === 'CRICKET');
  const otherPlayers = (allPlayers ?? []).filter(p => p.category === 'OTHER');
  const remaining = team.budget - team.budgetSpent;

  return (
    <Box>
      {/* Team Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: team.color || '#888', flexShrink: 0 }} />
        <Typography variant="h4" sx={{ fontWeight: 700 }}>{team.name}</Typography>
        <Chip label={team.shortName} size="small" sx={{ bgcolor: team.color || undefined, color: team.color ? '#fff' : undefined }} />
        {league && <Chip label={`Season ${league.season}`} size="small" variant="outlined" />}
      </Box>

      {team.captainName && (
        <Typography variant="body1" sx={{ mb: 0.5 }}>
          Captain: <strong>{team.captainName}</strong>
        </Typography>
      )}
      {team.ownerName && (
        <Typography variant="body1" sx={{ mb: 0.5 }}>
          Owner: <strong>{team.ownerName}</strong>
        </Typography>
      )}

      {/* Budget Info */}
      <Box sx={{ display: 'flex', gap: 3, mt: 2, mb: 3 }}>
        <Box>
          <Typography variant="body2" color="text.secondary">Total Budget</Typography>
          <Typography variant="h6">₹{(team.budget / 100000).toFixed(1)}L</Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">Spent</Typography>
          <Typography variant="h6">₹{(team.budgetSpent / 100000).toFixed(1)}L</Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">Remaining</Typography>
          <Typography variant="h6" color={remaining < 0 ? 'error.main' : 'success.main'}>
            ₹{(remaining / 100000).toFixed(1)}L
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">Players</Typography>
          <Typography variant="h6">{(allPlayers ?? []).length}</Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <PlayerTable title="Cricket Players" players={cricketPlayers} />
      <PlayerTable title="Other Players" players={otherPlayers} />

      {(allPlayers ?? []).length === 0 && (
        <Typography color="text.secondary">No players assigned to this team yet.</Typography>
      )}
    </Box>
  );
}
