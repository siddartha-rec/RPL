import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { getAuctionByLeague } from '../api/auctions';
import { getTeams } from '../api/teams';
import { getPlayers } from '../api/players';
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

export default function ViewerPage() {
  const { activeLeague, loading: leagueLoading } = useLeague();
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

  const status = auction?.status;
  const isMainPhase = status === 'LIVE' || status === 'PAUSED';
  const hasPlayer = !!auction?.currentPlayerId;

  if (leagueLoading || auctionQ.isLoading) return <Splash text="Loading…" />;
  if (!activeLeague) return <Splash text="No active league" />;
  if (!auction || !isMainPhase) {
    return <Splash text="Auction is not live yet" sub={activeLeague.name} />;
  }

  return (
    <Box sx={{ ...pageBg, height: '100vh', display: 'flex', flexDirection: 'column', gap: 1.25, p: 1.5 }}>
      {/* Header — logo in its own pill, hero content in a separate pill (mirrors the admin TopBar + GreetingHeader split) */}
      <Box sx={{ flex: '0 0 auto', display: 'flex', alignItems: 'stretch', gap: 1.25, height: 64, zIndex: 1 }}>
        {/* Logo pill */}
        <Box sx={{ ...glass, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 3, flex: '0 0 auto' }}>
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
        </Box>
      </Box>

      {/* Body: spotlight | teams */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '34% 1fr', gap: 1.25, zIndex: 1 }}>
        {/* Spotlight */}
        <Box sx={{ ...glass, p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: 0 }}>
          <Typography sx={labelSx}>{hasPlayer ? 'On the block' : 'Standing by'}</Typography>
          {hasPlayer ? (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 1.5, textAlign: 'center', position: 'relative' }}>
              {timer > 0 && (
                <Box sx={{ position: 'absolute', top: 0, right: 0, width: 66, height: 66, borderRadius: '50%',
                  border: '4px solid', borderColor: timer <= 5 ? '#ef4444' : '#16a34a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'monospace', fontWeight: 800, fontSize: 24, color: timer <= 5 ? '#ef4444' : '#16a34a' }}>{timer}</Box>
              )}
              <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8', letterSpacing: '0.06em' }}>
                {auction.currentPlayerId ? `#${auction.currentPlayerId}` : ''} · {cr(auction.currentBasePrice)} base
              </Typography>
              <Typography sx={{ fontWeight: 900, fontSize: 'clamp(28px,4vw,52px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: '#0f172a' }}>
                {auction.currentPlayerName ?? 'Player'}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Typography sx={labelSx}>Current highest bid</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: 'clamp(32px,5vw,64px)', color: '#b45309', lineHeight: 1.05 }}>
                  {cr(auction.currentHighestBid)}
                </Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#475569', mt: 0.5 }}>
                  {auction.currentHighestBidTeam ?? 'No bids yet'}
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
              <Typography sx={{ fontWeight: 800, fontSize: 26, color: '#94a3b8' }}>Next player coming up…</Typography>
            </Box>
          )}
        </Box>

        {/* Teams */}
        <Box sx={{ ...glass, p: 1.5, minHeight: 0, display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(teams.length, 1)}, 1fr)`, gap: 1 }}>
          {teams.map(team => {
            const roster = soldByTeam.get(team.id) ?? [];
            const left = team.budget - team.budgetSpent;
            const color = /^#[0-9a-fA-F]{6}$/.test(team.color) ? team.color : '#64748b';
            return (
              <Box key={team.id} sx={{ minHeight: 0, display: 'flex', flexDirection: 'column',
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <Box sx={{ p: 1.25, borderBottom: '1px solid #eef2f7', background: `linear-gradient(180deg, ${color}1f, transparent)` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 14, height: 14, borderRadius: '4px', background: color, flex: '0 0 auto' }} />
                    <Typography sx={{ fontWeight: 900, fontSize: 14, color: '#0f172a' }}>{team.shortName || team.name}</Typography>
                  </Box>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', mt: 0.5 }}>
                    {left} CR left · {roster.length} bought
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {roster.length === 0 && (
                    <Typography sx={{ fontSize: 11, color: '#94a3b8', p: 1, textAlign: 'center' }}>No buys yet</Typography>
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
          LATEST
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

function Splash({ text, sub }: { text: string; sub?: string }) {
  return (
    <Box sx={{ ...pageBg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <Box component="img" src="/recykal-logo.png" alt="Recykal" sx={{ height: 44, position: 'relative', zIndex: 1 }} />
      <Typography sx={{ fontWeight: 800, fontSize: 24, color: '#0f172a', position: 'relative', zIndex: 1 }}>{text}</Typography>
      {sub && <Typography sx={{ fontSize: 14, color: '#64748b', position: 'relative', zIndex: 1 }}>{sub}</Typography>}
    </Box>
  );
}
