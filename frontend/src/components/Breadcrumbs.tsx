import { Box, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTeam } from '../api/teams';
import { getPlayer } from '../api/players';
import type { Team, Player } from '../types';

interface Crumb {
  label: string;
  to?: string;
}

const STATIC_LABELS: Record<string, string> = {
  '': 'Dashboard',
  teams: 'Teams',
  players: 'Players',
  auction: 'Live Auction',
  results: 'Auction Results',
  history: 'Season History',
  admin: 'Admin',
  audit: 'Audit Logs',
  login: 'Sign in',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const segments = location.pathname.split('/').filter(Boolean);

  // Hide breadcrumbs on login (no shell anyway)
  if (location.pathname === '/login') return null;

  const teamId = segments[0] === 'teams' && segments[1] ? Number(segments[1]) : null;
  const playerId = segments[0] === 'players' && segments[1] ? Number(segments[1]) : null;

  const { data: team } = useQuery<Team>({
    queryKey: ['team', teamId],
    queryFn: () => getTeam(teamId!),
    enabled: !!teamId,
  });

  const { data: player } = useQuery<Player>({
    queryKey: ['player', playerId],
    queryFn: () => getPlayer(playerId!),
    enabled: !!playerId,
  });

  const crumbs: Crumb[] = [{ label: 'Home', to: '/' }];

  if (segments.length === 0) {
    // home only
  } else {
    let path = '';
    segments.forEach((seg, i) => {
      path += '/' + seg;
      const isLast = i === segments.length - 1;

      // Dynamic id segments
      if (segments[0] === 'teams' && i === 1) {
        crumbs.push({ label: team?.name ?? `Team #${seg}` });
        return;
      }
      if (segments[0] === 'players' && i === 1) {
        crumbs.push({ label: player?.name ?? `Player #${seg}` });
        return;
      }

      const label = STATIC_LABELS[seg] ?? seg;
      crumbs.push({ label, to: isLast ? undefined : path });
    });
  }

  // ignore unused params var
  void params;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.25,
        mb: 1.75,
        px: 0,
        py: 0,
        flexWrap: 'wrap',
      }}
    >
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            {i > 0 && (
              <ChevronRightIcon sx={{ fontSize: 11, color: '#cbd5e1' }} />
            )}
            <Box
              onClick={c.to && !isLast ? () => navigate(c.to!) : undefined}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.35,
                px: 0.5,
                py: 0.15,
                borderRadius: '4px',
                cursor: c.to && !isLast ? 'pointer' : 'default',
                transition: 'color 140ms ease',
                '&:hover':
                  c.to && !isLast
                    ? { '& .crumb-text': { color: '#0f172a' } }
                    : {},
              }}
            >
              {i === 0 && <HomeIcon sx={{ fontSize: 10, color: isLast ? '#0891b2' : '#94a3b8' }} />}
              <Typography
                className="crumb-text"
                sx={{
                  fontSize: 10,
                  fontWeight: isLast ? 600 : 500,
                  letterSpacing: '0.04em',
                  color: isLast ? '#0891b2' : '#94a3b8',
                  lineHeight: 1,
                  textTransform: 'none',
                  transition: 'color 140ms ease',
                }}
              >
                {c.label}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
