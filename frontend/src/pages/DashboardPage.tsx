import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Grid from '@mui/material/Grid';
import {
  Box, Card, CardContent, Typography, CircularProgress, Alert, LinearProgress, Button,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { useNavigate } from 'react-router-dom';
import { getLeagues } from '../api/leagues';
import { getTeams } from '../api/teams';
import type { League, Team } from '../types';

// ─── Animations ────────────────────────────────────────────────────────────
const keyframes = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes pulseDot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.4; transform: scale(0.75); }
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 20px rgba(245,158,11,0.3); }
    50%       { box-shadow: 0 0 40px rgba(245,158,11,0.7); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-6px); }
  }
  @keyframes particle {
    0%   { opacity: 0; transform: translateY(0) scale(0); }
    50%  { opacity: 1; }
    100% { opacity: 0; transform: translateY(-60px) scale(1.5); }
  }
`;

// ─── Team colour map ────────────────────────────────────────────────────────
const TEAM_COLORS: Record<string, string> = {
  TOT: '#FF5722',
  SOS: '#2196F3',
  COC: '#4CAF50',
  GOG: '#9C27B0',
  FOF: '#00BCD4',
};

function resolveColor(team: Team): string {
  if (team.color) return team.color;
  return TEAM_COLORS[team.shortName] ?? '#888';
}

// ─── Live Status Bar ────────────────────────────────────────────────────────
function LiveStatusBar({ league }: { league: League }) {
  const navigate = useNavigate();
  const isLive = league.status === 'LIVE';
  const statusLabel =
    league.status === 'LIVE'      ? 'Auction Live Now!'    :
    league.status === 'SETUP'     ? 'Auction in Setup'     :
    league.status === 'COMPLETED' ? 'Auction Completed'    :
    league.status === 'PAUSED'    ? 'Auction Paused'       :
    league.status === 'RETENTION' ? 'Retention Phase'      :
    league.status === 'DRAFT'     ? 'Draft Phase'          : league.status;

  return (
    <Box
      sx={{
        background: isLive
          ? 'linear-gradient(90deg, rgba(239,68,68,0.15) 0%, rgba(245,158,11,0.1) 50%, rgba(239,68,68,0.15) 100%)'
          : 'rgba(255,255,255,0.92)',
        border: isLive ? '1px solid rgba(239,68,68,0.4)' : '1px solid #e2e8f0',
        borderRadius: '12px',
        px: 3,
        py: 1.5,
        mb: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Animated dot */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: isLive ? '#ef4444' : '#64748b',
            animation: isLive ? 'pulseDot 1.2s ease-in-out infinite' : 'none',
          }}
        />
        <Typography
          sx={{
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: isLive ? '#ef4444' : '#64748b',
          }}
        >
          {isLive ? 'LIVE' : league.status}
        </Typography>
      </Box>

      <Box sx={{ width: '1px', height: 20, bgcolor: 'rgba(255,255,255,0.1)' }} />

      <Typography sx={{ flex: 1, color: '#1e293b', fontSize: '14px', fontWeight: 600 }}>
        {statusLabel}
      </Typography>

      <Button
        onClick={() => navigate('/auction')}
        variant="contained"
        size="small"
        startIcon={<PlayCircleOutlineIcon />}
        sx={{
          background: isLive
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: '#fff',
          fontWeight: 700,
          fontSize: '12px',
          letterSpacing: '0.5px',
          borderRadius: '8px',
          textTransform: 'none',
          px: 2,
          py: 0.75,
          '&:hover': { filter: 'brightness(1.15)' },
        }}
      >
        {isLive ? 'Watch Live' : 'Enter Auction'}
      </Button>
    </Box>
  );
}

// ─── Season Stats Row ────────────────────────────────────────────────────────
function SeasonStatCard({
  icon, label, value, color, delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  delay?: number;
}) {
  return (
    <Card
      sx={{
        background: '#f8fafc',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${color}25`,
        borderRadius: '16px',
        height: '100%',
        animation: `fadeInUp 0.5s ease ${delay}s both`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          background: '#ffffff',
          border: `1px solid ${color}60`,
          boxShadow: `0 8px 32px ${color}25`,
        },
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: '14px',
            background: `linear-gradient(135deg, ${color}30, ${color}15)`,
            border: `1px solid ${color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
            flexShrink: 0,
            fontSize: 24,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            {label}
          </Typography>
          <Typography sx={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', lineHeight: 1.2, mt: 0.25 }}>
            {value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── IPL-style Team Card ────────────────────────────────────────────────────
function TeamCard({ team, onClick, index }: { team: Team; onClick: () => void; index: number }) {
  const color = resolveColor(team);
  const budgetPct = team.budget > 0 ? Math.min((team.budgetSpent / team.budget) * 100, 100) : 0;
  const remaining = team.budget - team.budgetSpent;
  const playerCount = team.playerCount ?? 0;

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid #eef2f7',
        borderRadius: '20px',
        overflow: 'hidden',
        position: 'relative',
        height: '100%',
        animation: `fadeInUp 0.5s ease ${index * 0.07}s both`,
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-8px) scale(1.01)',
          boxShadow: `0 20px 60px ${color}45`,
          border: `1px solid ${color}50`,
        },
        '&:hover .team-header-bg': {
          opacity: 0.9,
        },
      }}
    >
      {/* ── Coloured header band ── */}
      <Box
        className="team-header-bg"
        sx={{
          height: 72,
          background: `linear-gradient(135deg, ${color} 0%, ${color}aa 60%, ${color}55 100%)`,
          position: 'relative',
          opacity: 0.85,
          transition: 'opacity 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          px: 2.5,
          gap: 1.5,
        }}
      >
        {/* Team name in white on the header */}
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: '18px',
            color: '#fff',
            flex: 1,
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            letterSpacing: '-0.3px',
          }}
        >
          {team.name}
        </Typography>

      </Box>

      {/* ── Watermark short name ── */}
      <Typography
        sx={{
          position: 'absolute',
          bottom: -12,
          right: -8,
          fontSize: '90px',
          fontWeight: 900,
          color: `${color}09`,
          lineHeight: 1,
          letterSpacing: '-4px',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 0,
        }}
      >
        {team.shortName}
      </Typography>

      <CardContent sx={{ position: 'relative', zIndex: 1, p: 2.5, pt: 2, '&:last-child': { pb: 2.5 } }}>

        {/* Captain row */}
        {team.captainName ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Box
              sx={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 900,
                color: '#fff',
                flexShrink: 0,
                boxShadow: '0 0 8px rgba(245,158,11,0.5)',
              }}
            >
              C
            </Box>
            <Typography sx={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
              {team.captainName}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ mb: 2, height: 22 }} />
        )}

        {/* ── Stat blocks ── */}
        <Grid container spacing={1} sx={{ mb: 2 }}>
          {[
            { label: 'Budget',    value: `${team.budget} CR`,        col: '#94a3b8' },
            { label: 'Spent',     value: `${team.budgetSpent} CR`,   col: '#fbbf24' },
            { label: 'Left',      value: `${remaining} CR`,          col: remaining < 0 ? '#ef4444' : '#4ade80' },
            { label: 'Players',   value: playerCount,                                       col: color },
          ].map(({ label, value, col }) => (
            <Grid key={label} size={{ xs: 6 }}>
              <Box
                sx={{
                  background: '#f8fafc',
                  border: '1px solid #eef2f7',
                  borderRadius: '10px',
                  p: 1,
                  textAlign: 'center',
                }}
              >
                <Typography sx={{ fontSize: '10px', color: '#475569', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  {label}
                </Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 800, color: col, mt: 0.25, lineHeight: 1 }}>
                  {value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* ── Budget utilisation bar ── */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
            <Typography sx={{ fontSize: '10px', color: '#475569', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Budget Used
            </Typography>
            <Typography sx={{ fontSize: '12px', fontWeight: 800, color: budgetPct > 85 ? '#ef4444' : '#94a3b8' }}>
              {budgetPct.toFixed(0)}%
            </Typography>
          </Box>
          <Box sx={{ position: 'relative', height: 8, borderRadius: 4, bgcolor: '#e2e8f0', overflow: 'hidden' }}>
            <LinearProgress
              variant="determinate"
              value={budgetPct}
              sx={{
                position: 'absolute',
                inset: 0,
                height: '100%',
                borderRadius: 4,
                bgcolor: 'transparent',
                '& .MuiLinearProgress-bar': {
                  background: budgetPct > 85
                    ? 'linear-gradient(90deg, #ef4444, #fbbf24)'
                    : `linear-gradient(90deg, ${color}cc, ${color})`,
                  borderRadius: 4,
                  boxShadow: `0 0 8px ${color}60`,
                },
              }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── League + Teams section ──────────────────────────────────────────────────
function LeagueTeamsSection({ league }: { league: League }) {
  const navigate = useNavigate();
  const { data: teams, isLoading, error } = useQuery<Team[]>({
    queryKey: ['teams', league.id],
    queryFn: () => getTeams(league.id),
  });

  const totalPlayers  = (teams ?? []).reduce((s, t) => s + (t.playerCount ?? 0), 0);
  const totalBudget   = (teams ?? []).reduce((s, t) => s + t.budget, 0);
  const budgetDisplay = totalBudget > 0 ? `${totalBudget} CR` : '—';

  return (
    <Box sx={{ mb: 6 }}>
      <LiveStatusBar league={league} />

      {/* ── Season Stats Row ── */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <SeasonStatCard icon={<GroupsIcon fontSize="inherit" />}           label="Total Teams"   value={(teams ?? []).length} color="#f59e0b" delay={0}    />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <SeasonStatCard icon={<PersonIcon fontSize="inherit" />}           label="Players"       value={totalPlayers}         color="#60a5fa" delay={0.06} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <SeasonStatCard icon={<AccountBalanceWalletIcon fontSize="inherit" />} label="Budget Pool" value={budgetDisplay}     color="#4ade80" delay={0.12} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <SeasonStatCard icon={<SportsCricketIcon fontSize="inherit" />}    label="Season"        value={league.season}        color="#a78bfa" delay={0.18} />
        </Grid>
      </Grid>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: '#b45309' }} size={40} />
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ borderRadius: '12px' }}>Failed to load teams</Alert>
      )}

      {teams && (
        <>
          <Grid container spacing={2.5}>
            {teams.map((team, i) => (
              <Grid key={team.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <TeamCard team={team} index={i} onClick={() => navigate(`/teams/${team.id}`)} />
              </Grid>
            ))}
            {teams.length === 0 && (
              <Grid size={12}>
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 8,
                    color: '#475569',
                    border: '1px dashed #e2e8f0',
                    borderRadius: '16px',
                  }}
                >
                  <GroupsIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                  <Typography sx={{ color: '#475569' }}>No teams yet. Add teams in the Admin panel.</Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </>
      )}
    </Box>
  );
}

// ─── Hero Banner ─────────────────────────────────────────────────────────────
function HeroBanner({ league }: { league: League | undefined }) {
  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: '24px',
        overflow: 'hidden',
        mb: 4,
        background: 'linear-gradient(135deg, #ffffff 0%, #ffffff 40%, #ffffff 70%, #ffffff 100%)',
        border: '1px solid rgba(245,158,11,0.2)',
        animation: 'glowPulse 4s ease-in-out infinite',
        minHeight: 220,
      }}
    >
      {/* Background mesh gradient */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 60% 80% at 20% 50%, rgba(245,158,11,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 50% 70% at 80% 30%, rgba(96,165,250,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 50% 90%, rgba(167,139,250,0.06) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
        }}
      />

      {/* Shimmer sweep */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(105deg, transparent 40%, rgba(245,158,11,0.06) 50%, transparent 60%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 3.5s linear infinite',
          pointerEvents: 'none',
        }}
      />

      {/* Floating particles */}
      {[...Array(8)].map((_, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: i % 2 === 0 ? '#f59e0b' : '#60a5fa',
            opacity: 0.6,
            left: `${10 + i * 11}%`,
            top: `${20 + (i % 3) * 25}%`,
            animation: `particle ${2.5 + i * 0.4}s ease-in-out ${i * 0.5}s infinite`,
          }}
        />
      ))}

      {/* Content */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          px: { xs: 3, md: 5 },
          py: { xs: 3.5, md: 4.5 },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 3,
        }}
      >
        {/* Trophy */}
        <Box
          sx={{
            width: { xs: 60, md: 80 },
            height: { xs: 60, md: 80 },
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.1))',
            border: '2px solid rgba(245,158,11,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            animation: 'float 3s ease-in-out infinite',
            boxShadow: '0 0 30px rgba(245,158,11,0.3)',
          }}
        >
          <EmojiEventsIcon sx={{ fontSize: { xs: 32, md: 40 }, color: '#b45309' }} />
        </Box>

        {/* Titles */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
            <Typography
              component="h1"
              sx={{
                fontWeight: 900,
                fontSize: { xs: '26px', md: '38px', lg: '44px' },
                background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 40%, #f59e0b 70%, #d97706 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmer 4s linear infinite',
                lineHeight: 1.1,
                letterSpacing: '-1px',
              }}
            >
              Recykal Premier League
            </Typography>
            {league && (
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: '8px',
                  background: 'rgba(245,158,11,0.15)',
                  border: '1px solid rgba(245,158,11,0.4)',
                  flexShrink: 0,
                }}
              >
                <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#b45309', letterSpacing: '1px' }}>
                  SEASON {league.season}
                </Typography>
              </Box>
            )}
          </Box>
          <Typography
            sx={{
              fontSize: { xs: '14px', md: '16px' },
              color: '#64748b',
              fontWeight: 500,
              letterSpacing: '0.5px',
            }}
          >
            Where Every Bid Counts
          </Typography>
        </Box>

        {/* League badge */}
        {league && (
          <Box
            sx={{
              textAlign: { xs: 'left', md: 'right' },
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1,
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.88)',
                border: '1px solid #e2e8f0',
                backdropFilter: 'blur(10px)',
              }}
            >
              <SportsCricketIcon sx={{ fontSize: 18, color: '#b45309' }} />
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8' }}>
                {league.name}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);

  const { data: leagues, isLoading, error } = useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: getLeagues,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
        <CircularProgress sx={{ color: '#b45309' }} size={48} />
        <Typography sx={{ color: '#475569', fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Loading Dashboard…
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: '12px' }}>
        Failed to load leagues
      </Alert>
    );
  }

  const allLeagues = leagues ?? [];
  const selectedLeague = selectedLeagueId
    ? allLeagues.find(l => l.id === selectedLeagueId)
    : allLeagues.find(l => l.status !== 'COMPLETED') ?? allLeagues[0];

  return (
    <Box sx={{ animation: 'fadeInUp 0.4s ease' }}>
      {/* Inject keyframes */}
      <style>{keyframes}</style>

      {/* Season filter */}
      {allLeagues.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Season
          </Typography>
          <Box
            sx={{
              display: 'flex',
              background: 'rgba(255,255,255,0.92)',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              p: 0.5,
              gap: 0.4,
            }}
          >
            {allLeagues.map(l => {
              const active = selectedLeague?.id === l.id;
              return (
                <Box
                  key={l.id}
                  onClick={() => setSelectedLeagueId(l.id)}
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
                          boxShadow: '0 2px 8px rgba(167,139,250,0.2)',
                        }
                      : {
                          color: '#64748b',
                          border: '1px solid transparent',
                          '&:hover': { color: '#94a3b8', background: '#eef2f7', border: '1px solid #eef2f7' },
                        }),
                  }}
                >
                  {l.season}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* League section */}
      {!selectedLeague && (
        <Alert
          severity="info"
          sx={{
            borderRadius: '12px',
            background: 'rgba(96,165,250,0.08)',
            border: '1px solid rgba(96,165,250,0.25)',
            color: '#1d4ed8',
          }}
        >
          No leagues found. Create a league in the Admin panel.
        </Alert>
      )}

      {selectedLeague && (
        <LeagueTeamsSection key={selectedLeague.id} league={selectedLeague} />
      )}
    </Box>
  );
}
