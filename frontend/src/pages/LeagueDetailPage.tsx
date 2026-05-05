import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupsIcon from '@mui/icons-material/Groups';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import BarChartIcon from '@mui/icons-material/BarChart';
import StarIcon from '@mui/icons-material/Star';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { getTournament } from '../api/tournaments';
import { getLeague } from '../api/leagues';
import { getLeagueMatches } from '../api/matches';
import type { MatchSummary, MatchStatus } from '../api/matches';
import type { League, Tournament } from '../types';

type TabKey = 'matches' | 'points' | 'stats' | 'teams' | 'gallery' | 'heroes';
const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'matches',  label: 'Matches',      icon: <SportsCricketIcon sx={{ fontSize: 16 }} /> },
  { key: 'points',   label: 'Points Table', icon: <LeaderboardIcon  sx={{ fontSize: 16 }} /> },
  { key: 'stats',    label: 'Stats',        icon: <BarChartIcon     sx={{ fontSize: 16 }} /> },
  { key: 'teams',    label: 'Teams',        icon: <GroupsIcon       sx={{ fontSize: 16 }} /> },
  { key: 'gallery',  label: 'Gallery',      icon: <PhotoLibraryIcon sx={{ fontSize: 16 }} /> },
  { key: 'heroes',   label: 'Heroes',       icon: <StarIcon         sx={{ fontSize: 16 }} /> },
];

export default function LeagueDetailPage() {
  const { tournamentId, leagueId } = useParams<{ tournamentId: string; leagueId: string }>();
  const tid = Number(tournamentId);
  const lid = Number(leagueId);
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('matches');

  const { data: tournament } = useQuery<Tournament>({
    queryKey: ['tournament', tid], queryFn: () => getTournament(tid), enabled: !!tid,
  });
  const { data: league, isLoading, error } = useQuery<League>({
    queryKey: ['league', lid], queryFn: () => getLeague(lid), enabled: !!lid,
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: '#a78bfa' }} /></Box>;
  if (error || !league) return <Alert severity="error" sx={{ borderRadius: '12px' }}>Failed to load league</Alert>;

  const statusColor = (s: string) => ({ SETUP: '#94a3b8', ACTIVE: '#4ade80', COMPLETED: '#60a5fa' } as Record<string, string>)[s] ?? '#94a3b8';

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease' }}>
      {/* Breadcrumb */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, fontSize: '12px', color: '#64748b' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/tournaments/${tid}`)}
          sx={{ color: '#64748b', borderRadius: '10px', '&:hover': { background: '#eef2f7' } }}>
          {tournament?.name ?? 'Tournament'}
        </Button>
        <Typography sx={{ color: '#cbd5e1' }}>›</Typography>
        <Typography sx={{ fontWeight: 600, color: '#1e293b' }}>{league.seasonDisplayName || league.name}</Typography>
      </Box>

      {/* Hero header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 2.5, mb: 3,
        background: 'linear-gradient(135deg, rgba(96,165,250,0.10), rgba(167,139,250,0.05))',
        border: '1px solid rgba(96,165,250,0.25)',
        borderRadius: '20px', p: 3,
      }}>
        <Box sx={{
          width: 72, height: 72, borderRadius: '18px',
          background: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(96,165,250,0.4)', flexShrink: 0,
        }}>
          <SportsCricketIcon sx={{ color: '#fff', fontSize: 36 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b' }}>
              {league.seasonDisplayName || league.name}
            </Typography>
            <Box sx={{ display: 'inline-block', px: 1.2, py: 0.3, borderRadius: '20px',
              background: `${statusColor(league.status)}15`, border: `1px solid ${statusColor(league.status)}40`,
              fontSize: '11px', fontWeight: 700, color: statusColor(league.status), letterSpacing: '0.3px' }}>
              {league.status}
            </Box>
            {league.cricheroesId && (
              <Box sx={{ display: 'inline-block', px: 1, py: 0.25, borderRadius: '20px',
                background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)',
                fontSize: '10px', fontWeight: 600, color: '#7c3aed' }}>
                CricHeroes
              </Box>
            )}
          </Box>
          <Typography sx={{ fontSize: '13px', color: '#64748b' }}>
            Season {league.season} · Budget {league.teamBudget} CR · Max players/team {league.maxPlayersPerTeam}
          </Typography>
        </Box>
      </Box>

      {/* Tab strip */}
      <Box sx={{
        display: 'flex', gap: 0.5, background: '#f1f5f9', border: '1px solid #e2e8f0',
        borderRadius: '14px', p: 0.75, mb: 3, flexWrap: 'wrap',
      }}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <Box key={t.key} onClick={() => setTab(t.key)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.75, px: 2, py: 1, borderRadius: '10px',
                cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s ease',
                ...(active
                  ? { background: 'rgba(96,165,250,0.18)', border: '1px solid rgba(96,165,250,0.4)',
                      color: '#1d4ed8', boxShadow: '0 2px 12px rgba(96,165,250,0.15)' }
                  : { color: '#64748b', border: '1px solid transparent',
                      '&:hover': { color: '#475569', background: '#e2e8f0' } }),
              }}>
              {t.icon}
              {t.label}
            </Box>
          );
        })}
      </Box>

      {/* Tab content */}
      {tab === 'matches' && <MatchesPanel leagueId={lid} />}
      {tab === 'points' && <PointsTablePanel />}
      {tab === 'stats' && <StatsPanel />}
      {tab === 'teams' && <TeamsPanel />}
      {tab === 'gallery' && <GalleryPanel />}
      {tab === 'heroes' && <HeroesPanel />}
    </Box>
  );
}

// ----------------------------------------------------------------------------
// Mock data — replace with real API hooks once endpoints land
// ----------------------------------------------------------------------------

type MatchTab = 'past' | 'live' | 'upcoming';

const TAB_TO_BACKEND: Record<MatchTab, MatchStatus> = {
  past: 'COMPLETED',
  live: 'LIVE',
  upcoming: 'SCHEDULED',
};

const MOCK_POINTS = [
  { rank: 1, team: 'Gang Of Gladiators', p: 6, w: 5, l: 1, t: 0, n: 0, pts: 10, nrr: '+1.42' },
  { rank: 2, team: 'Clan Of Champions',  p: 6, w: 4, l: 2, t: 0, n: 0, pts: 8,  nrr: '+0.85' },
  { rank: 3, team: 'Squad of Samurais',  p: 6, w: 3, l: 3, t: 0, n: 0, pts: 6,  nrr: '+0.21' },
  { rank: 4, team: 'Tribe of Titans',    p: 6, w: 2, l: 4, t: 0, n: 0, pts: 4,  nrr: '-0.55' },
  { rank: 5, team: 'Force Of Fighters',  p: 6, w: 1, l: 5, t: 0, n: 0, pts: 2,  nrr: '-1.93' },
];

const BATTING_CATS = ['Most Runs', 'Highest Score', 'Best Average', 'Best Strike Rate', 'Most 100s', 'Most 50s', 'Most 4s', 'Most 6s'];
const BOWLING_CATS = ['Most Wickets', 'Best Bowling', 'Best Average', 'Best Economy', 'Best Strike Rate', 'Most 5W'];

const MOCK_BATTING = [
  { name: 'Priteesh M',    team: 'GOG', m: 6, runs: 287, avg: 47.83, sr: 142.3 },
  { name: 'Suraj',         team: 'COC', m: 6, runs: 224, avg: 37.33, sr: 128.0 },
  { name: 'Aniket Tyagi',  team: 'GOG', m: 6, runs: 198, avg: 33.0,  sr: 119.8 },
  { name: 'Hari Naredla',  team: 'TOT', m: 6, runs: 174, avg: 29.0,  sr: 115.2 },
  { name: 'Praveen Gali',  team: 'COC', m: 6, runs: 156, avg: 26.0,  sr: 132.6 },
];

const MOCK_BOWLING = [
  { name: 'Dheeraj Singh', team: 'COC', m: 6, w: 14, eco: 6.8, avg: 11.2 },
  { name: 'Aziz ReTearn',  team: 'GOG', m: 6, w: 12, eco: 7.2, avg: 12.5 },
  { name: 'Sirivalli',     team: 'COC', m: 6, w: 10, eco: 8.4, avg: 14.8 },
  { name: 'Suraj',         team: 'COC', m: 6, w: 9,  eco: 7.9, avg: 16.1 },
  { name: 'Prakhar Pm',    team: 'GOG', m: 6, w: 8,  eco: 6.4, avg: 13.4 },
];

const MOCK_TEAMS = [
  { name: 'Gang Of Gladiators', short: 'GOG', captain: 'Anurag Doshi',     players: 15, color: '#1e88e5' },
  { name: 'Clan Of Champions',  short: 'COC', captain: 'Suraj',            players: 17, color: '#e53935' },
  { name: 'Squad of Samurais',  short: 'SOS', captain: 'Vamsi C.',         players: 17, color: '#43a047' },
  { name: 'Tribe of Titans',    short: 'TOT', captain: 'Hari Naredla',     players: 17, color: '#fb8c00' },
  { name: 'Force Of Fighters',  short: 'FOF', captain: 'Pranay',           players: 16, color: '#8e24aa' },
];

const MOCK_HEROES = [
  { title: 'Player of the Series', name: 'Priteesh M',    team: 'Gang Of Gladiators',  stat: '287 runs · 4 fifties' },
  { title: 'Best Batter',          name: 'Priteesh M',    team: 'Gang Of Gladiators',  stat: 'Avg 47.83 · SR 142.3' },
  { title: 'Best Bowler',          name: 'Dheeraj Singh', team: 'Clan Of Champions',   stat: '14 wickets · Avg 11.2' },
  { title: 'Most Sixes',           name: 'Madhu G.',      team: 'Gang Of Gladiators',  stat: '11 sixes' },
  { title: 'Most Fours',           name: 'Aniket Tyagi',  team: 'Gang Of Gladiators',  stat: '24 fours' },
  { title: 'Best Strike Rate',     name: 'Praveen Gali',  team: 'Clan Of Champions',   stat: 'SR 132.6' },
];

// ----------------------------------------------------------------------------
// Tab panels
// ----------------------------------------------------------------------------

function ComingSoonBadge() {
  return (
    <Box sx={{ display: 'inline-block', px: 1, py: 0.25, borderRadius: '20px',
      background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
      fontSize: '10px', fontWeight: 700, color: '#d97706', letterSpacing: '0.3px' }}>
      MOCK · BE PENDING
    </Box>
  );
}

function MatchesPanel({ leagueId }: { leagueId: number }) {
  const [sub, setSub] = useState<MatchTab>('past');

  const { data: allMatches, isLoading, error } = useQuery<MatchSummary[]>({
    queryKey: ['league-matches', leagueId],
    queryFn: () => getLeagueMatches(leagueId),
    enabled: !!leagueId,
  });

  const matches = allMatches ?? [];
  const counts: Record<MatchTab, number> = {
    past: matches.filter(m => m.status === 'COMPLETED').length,
    live: matches.filter(m => m.status === 'LIVE').length,
    upcoming: matches.filter(m => m.status === 'SCHEDULED').length,
  };
  const subTabs: { key: MatchTab; label: string; tone: string }[] = [
    { key: 'past',     label: 'Past',     tone: '#60a5fa' },
    { key: 'live',     label: 'Live',     tone: '#ef4444' },
    { key: 'upcoming', label: 'Upcoming', tone: '#f59e0b' },
  ];
  const filtered = matches.filter(m => m.status === TAB_TO_BACKEND[sub]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          Matches
        </Typography>
      </Box>

      {/* Sub-tab pills */}
      <Box sx={{ display: 'flex', gap: 0.75, mb: 2.5, flexWrap: 'wrap' }}>
        {subTabs.map(t => {
          const active = sub === t.key;
          const isLive = t.key === 'live';
          return (
            <Box key={t.key} onClick={() => setSub(t.key)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.85,
                px: 2.25, py: 0.85, borderRadius: '12px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 700, transition: 'all 0.2s',
                ...(active
                  ? { background: `${t.tone}18`, border: `1px solid ${t.tone}55`, color: t.tone,
                      boxShadow: `0 2px 12px ${t.tone}25` }
                  : { background: '#fff', border: '1px solid #e2e8f0', color: '#64748b',
                      '&:hover': { borderColor: '#cbd5e1', color: '#475569' } }),
              }}>
              {isLive && (
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: t.tone,
                  ...(active && counts.live > 0 && { animation: 'pulse 1.2s infinite' }) }} />
              )}
              {t.label}
              <Box sx={{ display: 'inline-block', minWidth: 18, px: 0.6, py: 0.05, borderRadius: '10px',
                background: active ? `${t.tone}22` : '#f1f5f9',
                fontSize: '10px', fontWeight: 700, color: active ? t.tone : '#94a3b8',
                textAlign: 'center', lineHeight: 1.5 }}>
                {counts[t.key]}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Match cards */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={24} sx={{ color: '#60a5fa' }} /></Box>
      ) : error ? (
        <Alert severity="error" sx={{ borderRadius: '12px' }}>Failed to load matches</Alert>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: '#64748b',
          background: '#fff', border: '1px dashed #e2e8f0', borderRadius: '14px' }}>
          <SportsCricketIcon sx={{ fontSize: 36, color: '#cbd5e1', mb: 0.75 }} />
          <Typography sx={{ fontSize: '13px' }}>
            {sub === 'live' ? 'No matches in progress' : sub === 'upcoming' ? 'No upcoming matches scheduled' : 'No completed matches yet'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filtered.map(m => {
            const isLive = m.status === 'LIVE';
            const isUpcoming = m.status === 'SCHEDULED';
            const dateLabel = m.scheduledAt
              ? new Date(m.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
              : (isUpcoming ? 'TBD' : '—');
            return (
              <Box key={m.id} sx={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', p: 2.25,
                position: 'relative',
                ...(isLive && { borderColor: 'rgba(239,68,68,0.4)', boxShadow: '0 0 0 3px rgba(239,68,68,0.05)' }),
                '&:hover': { borderColor: 'rgba(96,165,250,0.45)', boxShadow: '0 4px 14px rgba(96,165,250,0.12)' },
                transition: 'all 0.2s ease', cursor: 'pointer' }}>
                {isLive && (
                  <Box sx={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 0.5,
                    px: 0.85, py: 0.25, borderRadius: '10px', background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.35)' }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#ef4444', animation: 'pulse 1.2s infinite' }} />
                    <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', letterSpacing: '0.5px' }}>LIVE</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.25, pl: isLive ? 7 : 0 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    {dateLabel}{m.format ? ` · ${m.format}` : ''}{m.overs ? ` · ${m.overs} ov` : ''}
                  </Typography>
                  <Typography sx={{ fontSize: '11px', color: '#94a3b8' }}>{m.venue}</Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{m.teamAName}</Typography>
                    {m.teamAScore && <Typography sx={{ fontSize: '13px', color: '#0891b2', fontWeight: 600 }}>{m.teamAScore}</Typography>}
                  </Box>
                  <Box sx={{ px: 1.5, py: 0.5, borderRadius: '20px', background: '#f1f5f9',
                    fontSize: '11px', fontWeight: 700, color: '#64748b' }}>VS</Box>
                  <Box>
                    <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{m.teamBName}</Typography>
                    {m.teamBScore && <Typography sx={{ fontSize: '13px', color: '#0891b2', fontWeight: 600 }}>{m.teamBScore}</Typography>}
                  </Box>
                </Box>
                {m.resultText && !isLive && !isUpcoming && (
                  <Typography sx={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, mt: 1.5, textAlign: 'center' }}>
                    {m.resultText}
                  </Typography>
                )}
                {isLive && (
                  <Typography sx={{ fontSize: '12px', color: '#dc2626', fontWeight: 600, mt: 1.5, textAlign: 'center' }}>
                    {m.resultText ?? 'In progress'}
                  </Typography>
                )}
                {isUpcoming && (
                  <Typography sx={{ fontSize: '12px', color: '#d97706', fontWeight: 600, mt: 1.5, textAlign: 'center' }}>
                    Scheduled
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

function PointsTablePanel() {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          Points Table
        </Typography>
        <ComingSoonBadge />
      </Box>
      <Box sx={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '60px 1.5fr 50px 50px 50px 50px 50px 70px 80px',
          px: 2.5, py: 1.25, background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
          fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          <Box>#</Box><Box>Team</Box><Box>P</Box><Box>W</Box><Box>L</Box><Box>T</Box><Box>NR</Box><Box>NRR</Box><Box>PTS</Box>
        </Box>
        {MOCK_POINTS.map((r, i) => (
          <Box key={r.team} sx={{ display: 'grid', gridTemplateColumns: '60px 1.5fr 50px 50px 50px 50px 50px 70px 80px',
            px: 2.5, py: 1.5, alignItems: 'center', borderBottom: i < MOCK_POINTS.length - 1 ? '1px solid #f1f5f9' : 'none',
            fontSize: '13px', color: '#1e293b' }}>
            <Box sx={{ fontWeight: 700, color: r.rank <= 4 ? '#16a34a' : '#94a3b8' }}>{r.rank}</Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>{r.team}</Typography>
            <Box>{r.p}</Box><Box>{r.w}</Box><Box>{r.l}</Box><Box>{r.t}</Box><Box>{r.n}</Box>
            <Typography sx={{ fontSize: '12px', color: r.nrr.startsWith('+') ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{r.nrr}</Typography>
            <Typography sx={{ fontWeight: 700, color: '#1d4ed8' }}>{r.pts}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function StatsPanel() {
  const [side, setSide] = useState<'batting' | 'bowling'>('batting');
  const [cat, setCat] = useState<string>(BATTING_CATS[0]);
  const cats = side === 'batting' ? BATTING_CATS : BOWLING_CATS;
  const rows = side === 'batting' ? MOCK_BATTING : MOCK_BOWLING;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          Stats
        </Typography>
        <ComingSoonBadge />
      </Box>

      {/* Side pill */}
      <Box sx={{ display: 'flex', gap: 0.75, mb: 2 }}>
        {(['batting', 'bowling'] as const).map(s => (
          <Box key={s} onClick={() => { setSide(s); setCat((s === 'batting' ? BATTING_CATS : BOWLING_CATS)[0]); }}
            sx={{
              px: 2.5, py: 0.85, borderRadius: '12px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 700, transition: 'all 0.2s',
              ...(side === s
                ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff',
                    boxShadow: '0 3px 12px rgba(245,158,11,0.3)' }
                : { background: '#fff', border: '1px solid #e2e8f0', color: '#64748b',
                    '&:hover': { borderColor: '#cbd5e1' } }),
            }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Box>
        ))}
      </Box>

      {/* Category chips */}
      <Box sx={{ display: 'flex', gap: 0.75, mb: 2.5, flexWrap: 'wrap' }}>
        {cats.map(c => (
          <Box key={c} onClick={() => setCat(c)}
            sx={{
              px: 1.75, py: 0.6, borderRadius: '20px', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600, transition: 'all 0.15s',
              ...(cat === c
                ? { background: 'rgba(96,165,250,0.18)', border: '1px solid rgba(96,165,250,0.45)', color: '#1d4ed8' }
                : { background: '#fff', border: '1px solid #e2e8f0', color: '#64748b',
                    '&:hover': { borderColor: '#cbd5e1', color: '#475569' } }),
            }}>
            {c}
          </Box>
        ))}
      </Box>

      {/* Leaderboard table */}
      <Box sx={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
        <Box sx={{ display: 'grid',
          gridTemplateColumns: side === 'batting' ? '60px 1.5fr 60px 80px 80px 80px' : '60px 1.5fr 60px 80px 80px 80px',
          px: 2.5, py: 1.25, background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
          fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          <Box>#</Box><Box>Player</Box><Box>M</Box>
          {side === 'batting' ? <><Box>Runs</Box><Box>Avg</Box><Box>SR</Box></> : <><Box>Wkts</Box><Box>Eco</Box><Box>Avg</Box></>}
        </Box>
        {rows.map((r, i) => (
          <Box key={r.name} sx={{ display: 'grid',
            gridTemplateColumns: side === 'batting' ? '60px 1.5fr 60px 80px 80px 80px' : '60px 1.5fr 60px 80px 80px 80px',
            px: 2.5, py: 1.5, alignItems: 'center', borderBottom: i < rows.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
            <Box sx={{ fontWeight: 700, color: i === 0 ? '#d97706' : '#94a3b8', fontSize: '13px' }}>{i + 1}</Box>
            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{r.name}</Typography>
              <Typography sx={{ fontSize: '11px', color: '#94a3b8' }}>{r.team}</Typography>
            </Box>
            <Box sx={{ fontSize: '13px', color: '#64748b' }}>{r.m}</Box>
            {side === 'batting' ? (
              <>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#1d4ed8' }}>{(r as typeof MOCK_BATTING[0]).runs}</Typography>
                <Box sx={{ fontSize: '13px', color: '#475569' }}>{(r as typeof MOCK_BATTING[0]).avg}</Box>
                <Box sx={{ fontSize: '13px', color: '#475569' }}>{(r as typeof MOCK_BATTING[0]).sr}</Box>
              </>
            ) : (
              <>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#1d4ed8' }}>{(r as typeof MOCK_BOWLING[0]).w}</Typography>
                <Box sx={{ fontSize: '13px', color: '#475569' }}>{(r as typeof MOCK_BOWLING[0]).eco}</Box>
                <Box sx={{ fontSize: '13px', color: '#475569' }}>{(r as typeof MOCK_BOWLING[0]).avg}</Box>
              </>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function TeamsPanel() {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          Teams
        </Typography>
        <ComingSoonBadge />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 2 }}>
        {MOCK_TEAMS.map(t => (
          <Box key={t.short} sx={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', p: 2.25,
            cursor: 'pointer', transition: 'all 0.2s ease',
            '&:hover': { borderColor: `${t.color}55`, transform: 'translateY(-2px)', boxShadow: `0 6px 20px ${t.color}20` } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: '12px',
                background: `linear-gradient(135deg, ${t.color}, ${t.color}cc)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: '14px',
                boxShadow: `0 4px 12px ${t.color}40` }}>
                {t.short}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{t.name}</Typography>
                <Typography sx={{ fontSize: '11px', color: '#94a3b8' }}>Captain · {t.captain}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              pt: 1.25, borderTop: '1px solid #f1f5f9' }}>
              <Typography sx={{ fontSize: '12px', color: '#64748b' }}>Players</Typography>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: t.color }}>{t.players}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function GalleryPanel() {
  const tiles = Array.from({ length: 12 }, (_, i) => i);
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          Gallery
        </Typography>
        <ComingSoonBadge />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1.5 }}>
        {tiles.map(i => (
          <Box key={i} sx={{ aspectRatio: '4 / 3', borderRadius: '12px',
            background: `linear-gradient(${135 + i * 15}deg, hsl(${(i * 31) % 360}, 65%, 88%), hsl(${(i * 47) % 360}, 70%, 78%))`,
            border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#475569', fontSize: '12px', fontWeight: 600, position: 'relative', overflow: 'hidden',
            cursor: 'pointer', transition: 'all 0.2s',
            '&:hover': { transform: 'scale(1.02)', boxShadow: '0 6px 20px rgba(0,0,0,0.12)' } }}>
            <PhotoLibraryIcon sx={{ fontSize: 32, opacity: 0.4 }} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function HeroesPanel() {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          Heroes
        </Typography>
        <ComingSoonBadge />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
        {MOCK_HEROES.map((h, i) => (
          <Box key={h.title} sx={{
            background: i === 0
              ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.05))'
              : '#ffffff',
            border: i === 0 ? '1px solid rgba(245,158,11,0.4)' : '1px solid #e2e8f0',
            borderRadius: '16px', p: 2.25, position: 'relative', overflow: 'hidden',
          }}>
            {i === 0 && (
              <Box sx={{ position: 'absolute', top: -10, right: -10, width: 80, height: 80,
                borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.25), transparent 70%)' }} />
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
              <Box sx={{ width: 38, height: 38, borderRadius: '10px',
                background: i === 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: i === 0 ? '0 4px 12px rgba(245,158,11,0.35)' : '0 3px 10px rgba(96,165,250,0.25)' }}>
                {i === 0 ? <EmojiEventsIcon sx={{ color: '#fff', fontSize: 20 }} /> : <StarIcon sx={{ color: '#fff', fontSize: 20 }} />}
              </Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                {h.title}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '17px', fontWeight: 800, color: '#1e293b', mb: 0.25 }}>{h.name}</Typography>
            <Typography sx={{ fontSize: '12px', color: '#94a3b8', mb: 0.75 }}>{h.team}</Typography>
            <Typography sx={{ fontSize: '13px', color: i === 0 ? '#d97706' : '#1d4ed8', fontWeight: 700 }}>{h.stat}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
