import { useQuery } from '@tanstack/react-query';
import Grid from '@mui/material/Grid2';
import {
  Box, Card, CardContent, Typography, CircularProgress, Alert, Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getLeagues } from '../api/leagues';
import { getTeams } from '../api/teams';
import type { League, Team } from '../types';

function TeamCard({ team, onClick }: { team: Team; onClick: () => void }) {
  const remaining = team.budget - team.budgetSpent;
  return (
    <Card
      sx={{
        cursor: 'pointer',
        borderTop: `4px solid ${team.color || '#888'}`,
        '&:hover': { boxShadow: 6 },
        transition: 'box-shadow 0.2s',
        height: '100%',
      }}
      onClick={onClick}
    >
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          {team.name}
        </Typography>
        <Chip label={team.shortName} size="small" sx={{ mb: 1, bgcolor: team.color || undefined, color: team.color ? '#fff' : undefined }} />
        {team.captainName && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Captain: {team.captainName}
          </Typography>
        )}
        {team.ownerName && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Owner: {team.ownerName}
          </Typography>
        )}
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2">
            Budget: <strong>₹{(team.budget / 100000).toFixed(1)}L</strong>
          </Typography>
          <Typography variant="body2">
            Spent: <strong>₹{(team.budgetSpent / 100000).toFixed(1)}L</strong>
          </Typography>
          <Typography variant="body2" color={remaining < 0 ? 'error.main' : 'text.secondary'}>
            Remaining: <strong>₹{(remaining / 100000).toFixed(1)}L</strong>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function LeagueTeams({ league }: { league: League }) {
  const navigate = useNavigate();
  const { data: teams, isLoading, error } = useQuery<Team[]>({
    queryKey: ['teams', league.id],
    queryFn: () => getTeams(league.id),
  });

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
        {league.name} — Season {league.season}
      </Typography>
      {isLoading && <CircularProgress size={24} />}
      {error && <Alert severity="error">Failed to load teams</Alert>}
      {teams && (
        <Grid container spacing={2}>
          {teams.map(team => (
            <Grid key={team.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <TeamCard team={team} onClick={() => navigate(`/teams/${team.id}`)} />
            </Grid>
          ))}
          {teams.length === 0 && (
            <Grid size={12}>
              <Typography color="text.secondary">No teams in this league.</Typography>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}

export default function TeamsPage() {
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

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>Teams</Typography>
      {(leagues ?? []).length === 0 && (
        <Alert severity="info">No leagues found.</Alert>
      )}
      {(leagues ?? []).map(league => (
        <LeagueTeams key={league.id} league={league} />
      ))}
    </Box>
  );
}
