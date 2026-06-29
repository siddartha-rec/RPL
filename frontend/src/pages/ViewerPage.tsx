import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { getAuctionByLeague } from '../api/auctions';
import { getTeams } from '../api/teams';
import { getPlayers } from '../api/players';
import { useAuth } from '../context/AuthContext';
import { useLeague } from '../context/LeagueContext';
import { useSse } from '../hooks/useSse';
import { CRICKET_BANTER } from '../data/cricketBanter';
import type { Auction, Team, Player, AuctionEvent } from '../types';

const cr = (n: number | undefined | null) => `${n ?? 0} CR`;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Floodlights still on';
  if (h < 12) return 'First-over mood';
  if (h < 17) return 'Afternoon at the crease';
  if (h < 21) return 'Death overs incoming';
  return 'Stumps drawn';
}

interface TickerItem { id: number; kind: 'sold' | 'unsold' | 'up' | 'info'; text: string; }

// Shared glass surface — same recipe as the admin shell tiles.
const glass = {
  background: 'rgba(255,255,255,0.9)',
  border: '1px solid rgba(15,23,42,0.06)',
  borderRadius: '16px',
  boxShadow: '0 6px 24px rgba(15,23,42,0.06)',
};

// Fixed width of the left rail; the logo pill above matches it so they align vertically.
const LEFT_W = 320;

// Rotating "not live yet" status lines (cycled on the splash, Claude-Code style).
const PITCH_PHRASES = [
  'Pitch inspection in progress',
  'Covers are on',
  'Waiting on the toss',
  'Rain delay',
  'Tea break — play resumes soon',
  'Players in the dugout',
];

export default function ViewerPage() {
  const { activeLeague, loading: leagueLoading } = useLeague();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const onLogout = () => { logout(); navigate('/login', { replace: true }); };
  const leagueId = activeLeague?.id ?? null;

  const auctionQ = useQuery<Auction | null>({
    queryKey: ['viewer-auction', leagueId],
    queryFn: () => getAuctionByLeague(leagueId!).catch(() => null),
    enabled: !!leagueId,
    refetchInterval: 20000,
  });
  const teamsQ = useQuery<Team[]>({
    queryKey: ['viewer-teams', leagueId], queryFn: () => getTeams(leagueId!), enabled: !!leagueId,
  });
  const playersQ = useQuery<Player[]>({
    queryKey: ['viewer-players', leagueId], queryFn: () => getPlayers(leagueId!), enabled: !!leagueId,
  });

  const auction = auctionQ.data ?? null;
  const teams = useMemo(() => teamsQ.data ?? [], [teamsQ.data]);
  const players = useMemo(() => playersQ.data ?? [], [playersQ.data]);

  const [ticker, setTicker] = useState<TickerItem[]>([]);
  const [freshSoldId, setFreshSoldId] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);
  const tickIdRef = useRef(0);

  const pushTicker = useCallback((kind: TickerItem['kind'], text: string) => {
    setTicker(prev => [{ id: ++tickIdRef.current, kind, text }, ...prev].slice(0, 30));
  }, []);

  const onEvent = useCallback((e: AuctionEvent) => {
    const d = e.data;
    switch (e.type) {
      case 'PLAYER_UP':
        auctionQ.refetch();
        setTimer((d.timerSeconds as number) ?? 30);
        pushTicker('up', `Up next: ${d.playerName as string ?? 'Player'}`);
        break;
      case 'BID_PLACED':
        auctionQ.refetch();
        setTimer((d.timerSeconds as number) ?? 0);
        break;
      case 'BID_UNDONE':
        auctionQ.refetch();
        break;
      case 'TIMER_TICK':
        setTimer((d.timerSeconds as number) ?? (d.seconds as number) ?? 0);
        break;
      case 'PLAYER_SOLD':
        auctionQ.refetch(); teamsQ.refetch(); playersQ.refetch();
        setTimer(0);
        setFreshSoldId((d.playerId as number) ?? null);
        pushTicker('sold', `SOLD: ${d.playerName as string ?? ''} → ${d.teamName as string ?? ''} @ ${cr((d.amount as number) ?? (d.soldPrice as number))}`);
        break;
      case 'PLAYER_UNSOLD':
        auctionQ.refetch(); playersQ.refetch();
        setTimer(0);
        pushTicker('unsold', `UNSOLD: ${d.playerName as string ?? ''}`);
        break;
      case 'BUDGET_UPDATE':
      case 'BUDGET_UPDATED':
        teamsQ.refetch();
        break;
      case 'AUCTION_PAUSED':
        auctionQ.refetch(); pushTicker('info', 'Auction paused');
        break;
      case 'AUCTION_RESUMED':
        auctionQ.refetch(); pushTicker('info', 'Auction resumed');
        break;
      case 'AUCTION_COMPLETED':
        auctionQ.refetch(); pushTicker('info', 'Auction completed');
        break;
      default:
        break;
    }
  }, [auctionQ, teamsQ, playersQ, pushTicker]);

  useSse(auction?.id ?? null, onEvent);

  // Local countdown while a player is on the block.
  useEffect(() => {
    if (!auction || auction.status !== 'LIVE' || !auction.currentPlayerId || timer <= 0) return;
    const t = setInterval(() => setTimer(p => (p <= 1 ? 0 : p - 1)), 1000);
    return () => clearInterval(t);
  }, [auction, timer]);

  // Clear the "just sold" highlight after a few seconds.
  useEffect(() => {
    if (freshSoldId == null) return;
    const t = setTimeout(() => setFreshSoldId(null), 6000);
    return () => clearTimeout(t);
  }, [freshSoldId]);

  // Rotating hype quote.
  const [quoteIdx, setQuoteIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setQuoteIdx(i => (i + 1) % CRICKET_BANTER.length), 12000);
    return () => clearInterval(t);
  }, []);

  // Rotating status line for the "not live" splash.
  const [phraseIdx, setPhraseIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhraseIdx(i => (i + 1) % PITCH_PHRASES.length), 12000);
    return () => clearInterval(t);
  }, []);

  const soldByTeam = useMemo(() => {
    const map = new Map<number, Player[]>();
    for (const p of players) {
      if (p.status === 'SOLD' && p.teamId != null) {
        if (!map.has(p.teamId)) map.set(p.teamId, []);
        map.get(p.teamId)!.push(p);
      }
    }
    for (const list of map.values()) list.sort((a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0));
    return map;
  }, [players]);

  const pulse = useMemo(() => {
    const sold = players.filter(p => p.status === 'SOLD');
    const totalSpent = sold.reduce((s, p) => s + (p.soldPrice ?? 0), 0);
    let top: Player | null = null;
    for (const p of sold) if (!top || (p.soldPrice ?? 0) > (top.soldPrice ?? 0)) top = p;
    const topTeam = top?.teamId != null ? teams.find(t => t.id === top!.teamId) ?? null : null;
    const available = players.filter(p => p.status === 'AVAILABLE').length;
    return { soldCount: sold.length, totalSpent, top, topTeam, available };
  }, [players, teams]);

  const status = auction?.status;
  const isMainPhase = status === 'LIVE' || status === 'PAUSED';
  const hasPlayer = !!auction?.currentPlayerId;

  if (leagueLoading || auctionQ.isLoading) return <Splash text="Loading…" />;
  if (!activeLeague) return <Splash text="No active league" />;
  if (!auction || !isMainPhase) {
    return <Splash text={PITCH_PHRASES[phraseIdx]} sub={activeLeague.name} rotating />;
  }

  return (
    <Box sx={{ ...pageBg, height: '100vh', display: 'flex', flexDirection: 'column', gap: 1.25, p: 1.5 }}>
      {/* Header — logo in its own pill, hero content in a separate pill (mirrors the admin TopBar + GreetingHeader split) */}
      <Box sx={{ flex: '0 0 auto', display: 'flex', alignItems: 'stretch', gap: 1.25, height: 64, zIndex: 1 }}>
        {/* Logo pill — width matches the left rail below */}
        <Box sx={{ ...glass, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: `0 0 ${LEFT_W}px` }}>
          <Box component="img" src="/recykal-logo.png" alt="Recykal" sx={{ height: 30, opacity: 0.95 }} />
        </Box>
        {/* Hero pill */}
        <Box sx={{ ...glass, flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 2.5, px: 2.5 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.015em', color: '#0f172a',
            whiteSpace: 'nowrap', flex: '0 0 auto' }}>
            {greeting()} 👋
          </Typography>
          <Box aria-hidden sx={{ width: '1px', height: 26, flex: '0 0 auto',
            background: 'linear-gradient(180deg, transparent, rgba(15,23,42,0.18) 50%, transparent)' }} />
          <Typography sx={{ fontFamily: '"Caveat","Bradley Hand",cursive', fontWeight: 600, fontSize: '1.35rem',
            background: 'linear-gradient(90deg,#0891b2 0%,#f59e0b 100%)', WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent', backgroundClip: 'text', flex: 1, minWidth: 0,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            '&::before': { content: '"\\201C"' }, '&::after': { content: '"\\201D"' } }}>
            {CRICKET_BANTER[quoteIdx]}
          </Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap', flex: '0 0 auto' }}>
            {activeLeague.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, borderRadius: 999, flex: '0 0 auto',
            background: status === 'LIVE' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.14)',
            border: `1px solid ${status === 'LIVE' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.45)'}` }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: status === 'LIVE' ? '#ef4444' : '#f59e0b',
              animation: status === 'LIVE' ? 'vp-blink 1.4s infinite' : 'none' }} />
            <Typography sx={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.12em', fontWeight: 800,
              color: status === 'LIVE' ? '#b91c1c' : '#b45309' }}>{status}</Typography>
          </Box>
          <Tooltip title="Sign out">
            <IconButton onClick={onLogout} aria-label="Sign out" sx={{ flex: '0 0 auto', color: '#64748b',
              '&:hover': { background: 'rgba(15,23,42,0.05)', color: '#0f172a' } }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Body: [spotlight + creative] | teams */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: `${LEFT_W}px 1fr`, gap: 1.25, zIndex: 1 }}>
        {/* Left rail — bidding player (top) + creative pulse (bottom) */}
        <Box sx={{ minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {/* Bidding player */}
          <Box sx={{ ...glass, p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.25, flex: '1 1 58%', minHeight: 0 }}>
            <Typography sx={labelSx}>{hasPlayer ? 'At the crease' : 'Drinks break'}</Typography>
            {hasPlayer ? (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 1, textAlign: 'center', position: 'relative', minHeight: 0 }}>
                {timer > 0 && (
                  <Box sx={{ position: 'absolute', top: 0, right: 0, width: 56, height: 56, borderRadius: '50%',
                    border: '4px solid', borderColor: timer <= 5 ? '#ef4444' : '#16a34a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'monospace', fontWeight: 800, fontSize: 20, color: timer <= 5 ? '#ef4444' : '#16a34a' }}>{timer}</Box>
                )}
                <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', letterSpacing: '0.06em' }}>
                  {auction.currentPlayerId ? `#${auction.currentPlayerId}` : ''} · {cr(auction.currentBasePrice)} base
                </Typography>
                <Typography sx={{ fontWeight: 900, fontSize: 'clamp(24px,2.4vw,38px)', lineHeight: 1.05, letterSpacing: '-0.02em',
                  color: '#0f172a', textWrap: 'balance' }}>
                  {auction.currentPlayerName ?? 'Player'}
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Typography sx={labelSx}>Highest knock</Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: 'clamp(30px,3.4vw,52px)', color: '#b45309', lineHeight: 1.05 }}>
                    {cr(auction.currentHighestBid)}
                  </Typography>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#475569', mt: 0.5 }}>
                    {auction.currentHighestBidTeam ?? 'Zero rizzzz…'}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {[0, 1, 2].map(i => (
                    <Box key={i} sx={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b',
                      animation: 'vp-bounce 1.2s infinite', animationDelay: `${i * 0.15}s` }} />
                  ))}
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: 22, color: '#94a3b8' }}>Padding up…</Typography>
              </Box>
            )}
          </Box>

          {/* Creative — Auction Pulse */}
          <Box sx={{ ...glass, flex: '1 1 42%', minHeight: 0, p: 2, display: 'flex', flexDirection: 'column', gap: 1.25, overflow: 'hidden',
            position: 'relative' }}>
            <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 100% 0%, rgba(245,158,11,0.10), transparent 60%)', pointerEvents: 'none' }} />
            <Typography sx={labelSx}>The Pitch Report</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <PulseStat value={pulse.soldCount} label="Snagged" />
              <PulseStat value={pulse.available} label="On deck" />
            </Box>
            <Box sx={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(15,23,42,0.10), transparent)' }} />
            <Box>
              <Typography sx={{ ...labelSx, mb: 0.5 }}>Marquee pick</Typography>
              {pulse.top ? (
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#0f172a', minWidth: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pulse.top.name}
                    {pulse.topTeam ? <Box component="span" sx={{ color: '#64748b', fontWeight: 600, fontSize: 12 }}> · {pulse.topTeam.shortName || pulse.topTeam.name}</Box> : null}
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, color: '#b45309', flex: '0 0 auto' }}>
                    {pulse.top.soldPrice ?? 0}
                  </Typography>
                </Box>
              ) : (
                <Typography sx={{ fontSize: 13, color: '#94a3b8' }}>No sales yet</Typography>
              )}
            </Box>
            <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ ...labelSx, mb: 0 }}>Purse burnt</Typography>
              <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color: '#0f172a' }}>
                {pulse.totalSpent} <Box component="span" sx={{ fontSize: 12, color: '#94a3b8' }}>CR</Box>
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Teams — cricket art backdrop, its own image (page bg stays separate) */}
        <Box sx={{ ...glass, p: 1.5, minHeight: 0, display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(teams.length, 1)}, 1fr)`, gap: 1,
          background: 'url(/View_Team_list.png) center/cover no-repeat' }}>
          {teams.map(team => {
            const roster = soldByTeam.get(team.id) ?? [];
            const left = team.budget - team.budgetSpent;
            const color = /^#[0-9a-fA-F]{6}$/.test(team.color) ? team.color : '#64748b';
            return (
              <Box key={team.id} sx={{ minHeight: 0, display: 'flex', flexDirection: 'column',
                background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: '12px',
                overflow: 'hidden', boxShadow: '0 2px 10px rgba(15,23,42,0.06)' }}>
                <Box sx={{ p: 1.25, borderBottom: '1px solid #eef2f7', background: `linear-gradient(180deg, ${color}1f, transparent)` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 14, height: 14, borderRadius: '4px', background: color, flex: '0 0 auto' }} />
                    <Typography sx={{ fontWeight: 900, fontSize: 14, color: '#0f172a' }}>{team.shortName || team.name}</Typography>
                  </Box>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', mt: 0.5 }}>
                    {left} CR purse left · {roster.length} capped
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {roster.length === 0 && (
                    <Typography sx={{ fontSize: 11, color: '#94a3b8', p: 1, textAlign: 'center' }}>Nobody capped yet</Typography>
                  )}
                  {roster.map(p => {
                    const fresh = p.id === freshSoldId;
                    return (
                      <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 0.5,
                        px: 0.75, py: 0.5, borderRadius: '6px',
                        background: fresh ? 'rgba(245,158,11,0.16)' : 'transparent',
                        border: fresh ? '1px solid rgba(245,158,11,0.5)' : '1px solid transparent',
                        animation: fresh ? 'vp-pop 0.4s ease' : 'none' }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name}
                        </Typography>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: '#b45309', flex: '0 0 auto' }}>
                          {p.soldPrice ?? 0}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Ticker */}
      <Box sx={{ ...glass, flex: '0 0 auto', height: 42, display: 'flex', alignItems: 'stretch', overflow: 'hidden', zIndex: 1, p: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', px: 1.75, background: '#f59e0b', color: '#3a2a06',
          fontFamily: 'monospace', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', flex: '0 0 auto',
          borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' }}>
          STUMP MIC
        </Box>
        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
          {ticker.length === 0 ? (
            <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8', pl: 2 }}>
              Waiting for auction activity…
            </Typography>
          ) : (
            <Box sx={{ whiteSpace: 'nowrap', display: 'inline-flex', gap: 3, pl: 2, animation: 'vp-marquee 30s linear infinite' }}>
              {ticker.map(t => (
                <Typography component="span" key={t.id} sx={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700,
                  color: t.kind === 'sold' ? '#15803d' : t.kind === 'unsold' ? '#b91c1c' : '#475569' }}>
                  {t.kind === 'sold' ? '● ' : t.kind === 'unsold' ? '○ ' : '· '}{t.text}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      <style>{`
        @keyframes vp-blink { 50% { opacity: 0.25; } }
        @keyframes vp-pop { from { transform: scale(0.92); } to { transform: scale(1); } }
        @keyframes vp-bounce { 0%,100% { transform: translateY(0); opacity: 0.6; } 50% { transform: translateY(-6px); opacity: 1; } }
        @keyframes vp-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
      `}</style>
    </Box>
  );
}

const pageBg = {
  position: 'relative' as const,
  backgroundImage: 'url(/bg.png)',
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
  backgroundPosition: 'center top',
  backgroundAttachment: 'fixed',
  '&::before': {
    content: '""', position: 'fixed', inset: 0,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.45) 60%, rgba(255,255,255,0.55) 100%)',
    pointerEvents: 'none', zIndex: 0,
  },
};

const labelSx = {
  fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' as const,
  color: '#94a3b8', fontWeight: 700,
};

function PulseStat({ value, label }: { value: number; label: string }) {
  return (
    <Box sx={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: '10px',
      px: 1.25, py: 1, textAlign: 'center' }}>
      <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 26, color: '#b45309', lineHeight: 1 }}>{value}</Typography>
      <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', mt: 0.5 }}>{label}</Typography>
    </Box>
  );
}

function Splash({ text, sub, rotating }: { text: string; sub?: string; rotating?: boolean }) {
  return (
    <Box sx={{ ...pageBg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <Box component="img" src="/recykal-logo.png" alt="Recykal" sx={{ height: 44, position: 'relative', zIndex: 1 }} />
      {rotating && (
        <Box sx={{ display: 'flex', gap: 1, position: 'relative', zIndex: 1 }}>
          {[0, 1, 2].map(i => (
            <Box key={i} sx={{ width: 9, height: 9, borderRadius: '50%', background: '#f59e0b',
              animation: 'vp-bounce 1.2s infinite', animationDelay: `${i * 0.15}s` }} />
          ))}
        </Box>
      )}
      <Typography key={text} sx={{ fontWeight: 800, fontSize: 24, color: '#0f172a', position: 'relative', zIndex: 1,
        animation: rotating ? 'vp-fade 0.5s ease' : 'none' }}>{text}</Typography>
      {sub && <Typography sx={{ fontSize: 14, color: '#64748b', position: 'relative', zIndex: 1 }}>{sub}</Typography>}
      <style>{`
        @keyframes vp-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes vp-bounce { 0%,100% { transform: translateY(0); opacity: 0.6; } 50% { transform: translateY(-6px); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
      `}</style>
    </Box>
  );
}
