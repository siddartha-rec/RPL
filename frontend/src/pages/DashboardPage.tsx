import { useQuery } from '@tanstack/react-query';
import Grid from '@mui/material/Grid';
import {
  Box, Card, CardContent, Typography, Chip, CircularProgress, Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getLeagues } from '../api/leagues';
import { getTeams } from '../api/teams';
import type { League, Team } from '../types';

function StatusChip({ status }: { status: string }) {
  const colorMap: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
    SETUP: 'default',
    RETENTION: 'info',
    DRAFT: 'info',
    LIVE: 'success',
    PAUSED: 'warning',
    COMPLETED: 'error',
  };
  return <Chip label={status} color={colorMap[status] ?? 'default'} size="small" />;
}

function TeamCard({ team, onClick }: { team: Team; onClick: () => void }) {
  const remaining = team.budget - team.budgetSpent;
  return (
    <Card
      sx={{ cursor: 'pointer', '&:hover': { boxShadow: 6 }, transition: 'box-shadow 0.2s' }}
      onClick={onClick}
    >
      <CardContent>
        <Typography variant="h6" sx={{ color: team.color || 'text.primary', fontWeight: 700 }}>
          {team.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {team.shortName}
        </Typography>
        <Typography variant="body2">
          Budget: <strong>₹{(team.budget / 100000).toFixed(1)}L</strong>
        </Typography>
        <Typography variant="body2">
          Spent: <strong>₹{(team.budgetSpent / 100000).toFixed(1)}L</strong>
        </Typography>
        <Typography variant="body2" color={remaining < 0 ? 'error' : 'text.secondary'}>
          Remaining: <strong>₹{(remaining / 100000).toFixed(1)}L</strong>
        </Typography>
      </CardContent>
    </Card>
  );
}

function LeagueTeamsSection({ league }: { league: League }) {
  const navigate = useNavigate();
  const { data: teams, isLoading, error } = useQuery<Team[]>({
    queryKey: ['teams', league.id],
    queryFn: () => getTeams(league.id),
  });

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h5">{league.name}</Typography>
        <StatusChip status={league.status} />
        <Typography variant="body2" color="text.secondary">Season: {league.season}</Typography>
      </Box>
      {isLoading && <CircularProgress size={24} />}
      {error && <Alert severity="error">Failed to load teams</Alert>}
      {teams && (
        <Grid container spacing={2}>
          {teams.map(team => (
            <Grid key={team.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <TeamCard team={team} onClick={() => navigate(`/teams/${team.id}`)} />
            </Grid>
          ))}
          {teams.length === 0 && (
            <Grid size={12}>
              <Typography color="text.secondary">No teams yet.</Typography>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}

export default function DashboardPage() {
  const { data: leagues, isLoading, error } = useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: getLeagues,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load leagues</Alert>;
  }

  const activeLeagues = leagues?.filter(l => l.status !== 'COMPLETED') ?? [];
  const displayLeagues = activeLeagues.length > 0 ? activeLeagues : (leagues ?? []).slice(0, 1);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>Dashboard</Typography>
      {displayLeagues.length === 0 && (
        <Alert severity="info">No leagues found. Create a league in the Admin panel.</Alert>
      )}
      {displayLeagues.map(league => (
        <LeagueTeamsSection key={league.id} league={league} />
      ))}
    </Box>
  );
}
