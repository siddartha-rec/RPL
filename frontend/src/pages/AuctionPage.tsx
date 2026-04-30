import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Grid from '@mui/material/Grid';
import {
  Box, Typography, CircularProgress, Alert, LinearProgress, Button,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import SportsIcon from '@mui/icons-material/Sports';
import PeopleIcon from '@mui/icons-material/People';
import { getAuctionByLeague, placeBid, soldPlayer, markUnsold, undoBid, putUpPlayer, pauseAuction, resumeAuction, completeAuction, getCompletionCheck } from '../api/auctions';
import { getTeams } from '../api/teams';
import { getLeagues } from '../api/leagues';
import { getPlayers } from '../api/players';
import type { Player } from '../types';
import { useSse } from '../hooks/useSse';
import { useAuth } from '../context/AuthContext';
import { useLeague } from '../context/LeagueContext';
import type { Auction, Team, League, AuctionEvent, UserInfo, CompletionCheck } from '../types';

/* ─────────────────────────── helpers ─────────────────────────── */

function timerColor(seconds: number): string {
  if (seconds > 15) return '#4ade80';
  if (seconds > 5) return '#f59e0b';
  return '#ef4444';
}

function formatCR(value: number): string {
  return `${value} CR`;
}

/* ─────────────────────────── types ───────────────────────────── */

interface BidEntry {
  id: number;
  text: string;
  timestamp: string;
  type: 'bid' | 'sold' | 'unsold' | 'event';
  teamColor?: string;
}

interface TeamPurse {
  teamId: number;
  teamName: string;
  teamShortName?: string;
  teamColor?: string;
  budget: number;
  budgetSpent: number;
  justBid?: boolean;
}

/* ─────────────────── BroadcastHeader ─────────────────────────── */

function BroadcastHeader({ status, leagueName, season }: { status: string; leagueName?: string; season?: string }) {
  const isLive = status === 'LIVE';
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1.5,
        mb: 3,
        px: 2.5,
        py: 1.5,
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #ffffff 0%, #ffffff 100%)',
        border: '1px solid #e2e8f0',
        boxShadow: isLive ? '0 0 40px rgba(239,68,68,0.12), inset 0 0 60px #f8fafc' : 'none',
        '@keyframes pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.4 },
        },
        '@keyframes broadcastPulse': {
          '0%, 100%': { boxShadow: '0 0 40px rgba(239,68,68,0.12), inset 0 0 60px #f8fafc' },
          '50%': { boxShadow: '0 0 60px rgba(239,68,68,0.25), inset 0 0 60px #f8fafc' },
        },
        ...(isLive && { animation: 'broadcastPulse 3s ease-in-out infinite' }),
      }}
    >
      {/* Left: Logo + Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
          }}
        >
          <GavelIcon sx={{ color: '#fff', fontSize: 22 }} />
        </Box>
        <Box>
          <Typography
            sx={{
              fontSize: { xs: '14px', sm: '18px' },
              fontWeight: 900,
              letterSpacing: { xs: '1px', sm: '2px' },
              background: 'linear-gradient(135deg, #fff 0%, #f59e0b 60%, #ef4444 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.2,
            }}
          >
            RECYKAL PREMIER LEAGUE
          </Typography>
          {leagueName && (
            <Typography sx={{ fontSize: '11px', color: '#64748b', fontWeight: 600, letterSpacing: '0.5px' }}>
              {leagueName}{season ? ` · Season ${season}` : ''}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Center: LIVE badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {isLive && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              px: 2,
              py: 0.75,
              borderRadius: '20px',
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.45)',
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#b91c1c',
                flexShrink: 0,
                animation: 'pulse 1s ease-in-out infinite',
              }}
            />
            <Typography sx={{ fontSize: '13px', fontWeight: 900, color: '#b91c1c', letterSpacing: '2px' }}>
              LIVE
            </Typography>
          </Box>
        )}
        {status !== 'LIVE' && (
          <Box
            sx={{
              px: 2,
              py: 0.75,
              borderRadius: '20px',
              background: status === 'COMPLETED' ? 'rgba(74,222,128,0.12)' : 'rgba(245,158,11,0.12)',
              border: `1px solid ${status === 'COMPLETED' ? 'rgba(74,222,128,0.4)' : 'rgba(245,158,11,0.4)'}`,
            }}
          >
            <Typography
              sx={{
                fontSize: '12px',
                fontWeight: 800,
                color: status === 'COMPLETED' ? '#4ade80' : '#f59e0b',
                letterSpacing: '1.5px',
              }}
            >
              {status}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Right: viewer count placeholder */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <PeopleIcon sx={{ fontSize: 15, color: '#475569' }} />
        <Typography sx={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
          AUCTION
        </Typography>
      </Box>
    </Box>
  );
}

/* ─────────────────── TimerCircle ─────────────────────────────── */

function TimerCircle({ timer, maxTimer }: { timer: number; maxTimer: number }) {
  const color = timerColor(timer);
  const pct = maxTimer > 0 ? Math.max(0, (timer / maxTimer) * 100) : 0;
  const r = 64;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pct / 100);
  const urgent = timer <= 5 && timer > 0;

  return (
    <Box
      sx={{
        position: 'relative',
        width: 160,
        height: 160,
        flexShrink: 0,
        '@keyframes urgentPulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.06)' },
        },
        ...(urgent && { animation: 'urgentPulse 0.6s ease-in-out infinite' }),
      }}
    >
      <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="80" cy="80" r={r} fill="none" stroke="#eef2f7" strokeWidth="10" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.5s ease' }}
        />
      </svg>
      {/* Glow ring */}
      <Box
        sx={{
          position: 'absolute',
          inset: 8,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`,
          transition: 'background 0.5s ease',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          sx={{
            fontSize: '48px',
            fontWeight: 900,
            color,
            lineHeight: 1,
            transition: 'color 0.5s ease',
            fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 20px ${color}80`,
          }}
        >
          {timer}
        </Typography>
        <Typography sx={{ fontSize: '10px', color: '#64748b', fontWeight: 700, letterSpacing: '1.5px', mt: 0.25 }}>
          SECONDS
        </Typography>
      </Box>
    </Box>
  );
}

/* ─────────────────── PlayerStage ─────────────────────────────── */

/* ─────────────────── AuctionControls ─────────────────────────── */

function AuctionControls({
  auction,
  teams,
  user,
  hasPermission,
  bidIncrement,
  completionCheck,
  refetchCompletionCheck,
}: {
  auction: Auction;
  teams: Team[];
  user: UserInfo | null;
  hasPermission: (p: string) => boolean;
  bidIncrement: number;
  completionCheck?: CompletionCheck;
  refetchCompletionCheck: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = hasPermission('user:CREATE') || hasPermission('league:CREATE');
  const isOwner = hasPermission('auction:BID') && !isAdmin;
  const myTeam = user ? teams.find(t => t.ownerId === user.id) : null;

  const isLive = auction.status === 'LIVE';
  const hasPlayer = !!auction.currentPlayerId;
  const highestTeam = teams.find(t => t.name === auction.currentHighestBidTeam);
  const hasAnyBid = !!auction.currentHighestBidTeam;
  const highestBid = auction.currentHighestBid ?? 0;
  const nextBid = hasAnyBid
    ? highestBid + bidIncrement
    : auction.currentBasePrice ?? 0;

  function teamRemaining(team: Team): number {
    return team.budget - team.budgetSpent;
  }

  function canTeamBid(team: Team): boolean {
    if (!isLive || !hasPlayer) return false;
    if (highestTeam?.id === team.id) return false;
    if (teamRemaining(team) < nextBid) return false;
    return true;
  }

  async function withBusy(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? 'Action failed';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  const onBid = (teamId: number) => withBusy(() => placeBid(auction.id, teamId));
  const onSold = () => withBusy(() => soldPlayer(auction.id));
  const onUnsold = () => withBusy(() => markUnsold(auction.id));
  const onUndo = () => withBusy(() => undoBid(auction.id));
  const onPause = () => withBusy(() => pauseAuction(auction.id));
  const onResume = () => withBusy(() => resumeAuction(auction.id));
  const onComplete = () => {
    const playerWarning = auction.currentPlayerId
      ? `\n\nNote: ${auction.currentPlayerName ?? 'A player'} is still on the block and will remain unsold.`
      : '';
    if (!window.confirm(`Complete this auction? This is final — no more bidding after this.${playerWarning}`)) return;
    return withBusy(async () => {
      try {
        return await completeAuction(auction.id);
      } finally {
        refetchCompletionCheck();
      }
    });
  };
  const onForceComplete = () => {
    const shortPlayers = completionCheck?.shortPlayers ?? [];
    const shortWomen = completionCheck?.shortWomen ?? [];
    const lines: string[] = [];
    if (shortPlayers.length > 0) {
      const min = completionCheck?.minPlayersPerTeam ?? '?';
      lines.push(`• ${shortPlayers.length} team(s) below ${min} players: ` +
        shortPlayers.map(s => `${s.teamName} (${s.current}/${s.required})`).join(', '));
    }
    if (shortWomen.length > 0) {
      const min = completionCheck?.minWomenPerTeam ?? '?';
      lines.push(`• ${shortWomen.length} team(s) below ${min} women: ` +
        shortWomen.map(s => `${s.teamName} (${s.current}/${s.required})`).join(', '));
    }
    if (auction.currentPlayerId) {
      lines.push(`• ${auction.currentPlayerName ?? 'A player'} is on the block and will remain unsold.`);
    }
    const detail = lines.length ? `\n\nThis will FORCE-complete despite:\n${lines.join('\n')}` : '';
    if (!window.confirm(`Force complete this auction? This bypasses roster validation and is final.${detail}`)) return;
    return withBusy(async () => {
      try {
        return await completeAuction(auction.id, true);
      } finally {
        refetchCompletionCheck();
      }
    });
  };

  if (!isAdmin && !isOwner) return null;

  return (
    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#b91c1c' }}
        >
          {error}
        </Alert>
      )}

      {/* Owner: single bid button for their own team */}
      {isOwner && myTeam && (
        <Button
          variant="contained"
          size="large"
          disabled={busy || !canTeamBid(myTeam)}
          onClick={() => onBid(myTeam.id)}
          startIcon={<GavelIcon sx={{ fontSize: '22px !important' }} />}
          sx={{
            alignSelf: 'flex-start',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
            color: '#fff',
            fontWeight: 900,
            fontSize: { xs: '15px', sm: '17px' },
            letterSpacing: '1.5px',
            px: { xs: 4, sm: 5 },
            py: { xs: 1.5, sm: 1.75 },
            borderRadius: '14px',
            border: '1px solid rgba(245,158,11,0.5)',
            boxShadow: '0 8px 32px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
            textTransform: 'uppercase',
            '@keyframes bidButtonGlow': {
              '0%, 100%': { boxShadow: '0 8px 32px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,255,255,0.15)' },
              '50%': { boxShadow: '0 8px 48px rgba(245,158,11,0.7), 0 0 20px rgba(245,158,11,0.3), inset 0 1px 0 rgba(255,255,255,0.15)' },
            },
            animation: canTeamBid(myTeam) && !busy ? 'bidButtonGlow 2.5s ease-in-out infinite' : 'none',
            '&:hover': {
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
              transform: 'translateY(-2px) scale(1.02)',
            },
            '&:disabled': {
              background: '#eef2f7',
              color: '#475569',
              boxShadow: 'none',
              animation: 'none',
            },
            transition: 'transform 0.2s ease, background 0.25s ease',
          }}
        >
          {hasPlayer ? `BID ${nextBid} CR — ${myTeam.shortName ?? myTeam.name}` : 'PLACE BID'}
        </Button>
      )}

      {/* Owner without an assigned team — show notice */}
      {isOwner && !myTeam && (
        <Alert
          severity="info"
          sx={{ borderRadius: '12px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', color: '#93c5fd' }}
        >
          You are not assigned to a team in this league.
        </Alert>
      )}

      {/* Admin: per-team bid panel */}
      {isAdmin && teams.length > 0 && (
        <Box>
          <Typography
            sx={{ fontSize: '10px', fontWeight: 800, color: '#64748b', letterSpacing: '1.5px', mb: 1, textTransform: 'uppercase' }}
          >
            Auctioneer · Bid for Team {hasPlayer && `· Next: ${nextBid} CR`}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {teams.map(team => {
              const enabled = canTeamBid(team) && !busy;
              const color = team.color || '#888';
              const remaining = teamRemaining(team);
              const isHighest = highestTeam?.id === team.id;
              return (
                <Button
                  key={team.id}
                  onClick={() => onBid(team.id)}
                  disabled={!enabled}
                  sx={{
                    minWidth: 0,
                    px: 1.75,
                    py: 1,
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 800,
                    textTransform: 'none',
                    color: enabled ? '#fff' : '#475569',
                    background: enabled
                      ? `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`
                      : '#0f172a',
                    border: `1px solid ${enabled ? color + '88' : '#e2e8f0'}`,
                    boxShadow: enabled ? `0 4px 14px ${color}40` : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 0.25,
                    '&:hover': enabled
                      ? { transform: 'translateY(-2px)', boxShadow: `0 6px 20px ${color}60` }
                      : {},
                    '&:disabled': { opacity: 0.55 },
                    transition: 'transform 0.15s ease, box-shadow 0.2s ease',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {team.shortName ?? team.name}
                    {isHighest && (
                      <Box
                        sx={{
                          fontSize: '9px',
                          fontWeight: 900,
                          letterSpacing: '0.5px',
                          background: 'rgba(255,255,255,0.2)',
                          px: 0.6,
                          py: 0.15,
                          borderRadius: '5px',
                        }}
                      >
                        HIGH
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ fontSize: '10px', fontWeight: 700, opacity: 0.85, letterSpacing: '0.3px' }}>
                    {remaining} CR left
                  </Box>
                </Button>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Admin: action strip */}
      {isAdmin && (
        <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
          <Button
            onClick={onSold}
            disabled={busy || !isLive || !hasPlayer || !hasAnyBid}
            sx={{
              fontWeight: 900,
              fontSize: '13px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: '#fff',
              background: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)',
              border: '1px solid rgba(74,222,128,0.5)',
              borderRadius: '12px',
              px: 3,
              py: 1.1,
              '&:hover': { background: 'linear-gradient(135deg, #6ee7b7 0%, #22c55e 100%)' },
              '&:disabled': { background: '#eef2f7', color: '#475569', border: '1px solid #eef2f7' },
            }}
          >
            Mark Sold
          </Button>
          <Button
            onClick={onUnsold}
            disabled={busy || !isLive || !hasPlayer}
            sx={{
              fontWeight: 900,
              fontSize: '13px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: '#fff',
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              border: '1px solid rgba(239,68,68,0.5)',
              borderRadius: '12px',
              px: 3,
              py: 1.1,
              '&:hover': { background: 'linear-gradient(135deg, #fca5a5 0%, #dc2626 100%)' },
              '&:disabled': { background: '#eef2f7', color: '#475569', border: '1px solid #eef2f7' },
            }}
          >
            Force Unsold
          </Button>
          <Button
            onClick={onUndo}
            disabled={busy || !isLive || !hasPlayer || !hasAnyBid}
            sx={{
              fontWeight: 800,
              fontSize: '13px',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              color: '#b45309',
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.4)',
              borderRadius: '12px',
              px: 2.5,
              py: 1.1,
              '&:hover': { background: 'rgba(251,191,36,0.15)' },
              '&:disabled': { color: '#475569', background: '#f8fafc', border: '1px solid #eef2f7' },
            }}
          >
            Undo Last Bid
          </Button>

          <Box sx={{ flexBasis: '100%', height: 0 }} />

          {/* Lifecycle controls: Pause / Resume / Complete */}
          {isLive && (
            <Button
              onClick={onPause}
              disabled={busy}
              sx={{
                fontWeight: 800,
                fontSize: '13px',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: '#475569',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                px: 2.5,
                py: 1.1,
                '&:hover': { background: '#e2e8f0' },
                '&:disabled': { color: '#94a3b8', background: '#f8fafc' },
              }}
            >
              Pause
            </Button>
          )}
          {auction.status === 'PAUSED' && (
            <Button
              onClick={onResume}
              disabled={busy}
              sx={{
                fontWeight: 800,
                fontSize: '13px',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: '#fff',
                background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
                border: '1px solid rgba(8,145,178,0.5)',
                borderRadius: '12px',
                px: 2.5,
                py: 1.1,
                '&:hover': { background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' },
              }}
            >
              Resume
            </Button>
          )}
          {auction.status !== 'COMPLETED' && (
            <Button
              onClick={onComplete}
              disabled={busy}
              sx={{
                fontWeight: 900,
                fontSize: '13px',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: '#fff',
                background: 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)',
                border: '1px solid rgba(109,40,217,0.5)',
                borderRadius: '12px',
                px: 3,
                py: 1.1,
                '&:hover': { background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' },
                '&:disabled': { background: '#eef2f7', color: '#475569', border: '1px solid #eef2f7' },
              }}
            >
              Complete Auction
            </Button>
          )}
          {auction.status !== 'COMPLETED' && completionCheck && !completionCheck.canComplete && (
            <Button
              onClick={onForceComplete}
              disabled={busy}
              sx={{
                fontWeight: 900,
                fontSize: '13px',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: '#fff',
                background: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
                border: '1px solid rgba(185,28,28,0.5)',
                borderRadius: '12px',
                px: 3,
                py: 1.1,
                '&:hover': { background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' },
                '&:disabled': { background: '#eef2f7', color: '#475569', border: '1px solid #eef2f7' },
              }}
            >
              Force Complete
            </Button>
          )}
        </Box>
      )}

      {/* Roster shortfall panel — admin-only, when auction not yet completed */}
      {isAdmin && auction.status !== 'COMPLETED' && completionCheck && !completionCheck.canComplete && (
        <Box
          sx={{
            mt: 0.5,
            p: 2,
            borderRadius: '14px',
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.3)',
          }}
        >
          <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#b45309', letterSpacing: '1.5px', mb: 1, textTransform: 'uppercase' }}>
            Roster Shortfalls — Complete blocked
          </Typography>
          {completionCheck.shortPlayers.length > 0 && (
            <Box sx={{ mb: completionCheck.shortWomen.length > 0 ? 1 : 0 }}>
              <Typography sx={{ fontSize: '12px', color: '#475569', fontWeight: 700, mb: 0.5 }}>
                Min {completionCheck.minPlayersPerTeam} players per team:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {completionCheck.shortPlayers.map(s => (
                  <Box
                    key={`p-${s.teamId}`}
                    sx={{
                      px: 1.25, py: 0.5, borderRadius: '8px',
                      background: '#fff', border: '1px solid #fde68a',
                      fontSize: '12px', fontWeight: 700, color: '#92400e',
                    }}
                  >
                    {s.teamName} <Box component="span" sx={{ color: '#b91c1c', fontWeight: 800 }}>{s.current}/{s.required}</Box> <Box component="span" sx={{ color: '#94a3b8', fontWeight: 600 }}>(need {s.missing})</Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
          {completionCheck.shortWomen.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: '12px', color: '#475569', fontWeight: 700, mb: 0.5 }}>
                Min {completionCheck.minWomenPerTeam} women per team:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {completionCheck.shortWomen.map(s => (
                  <Box
                    key={`w-${s.teamId}`}
                    sx={{
                      px: 1.25, py: 0.5, borderRadius: '8px',
                      background: '#fff', border: '1px solid #fbcfe8',
                      fontSize: '12px', fontWeight: 700, color: '#9d174d',
                    }}
                  >
                    {s.teamName} <Box component="span" sx={{ color: '#b91c1c', fontWeight: 800 }}>{s.current}/{s.required}</Box> <Box component="span" sx={{ color: '#94a3b8', fontWeight: 600 }}>(need {s.missing})</Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

/* ─────────────────── NextPlayerPicker ────────────────────────── */

function NextPlayerPicker({ auctionId, leagueId }: { auctionId: number; leagueId: number }) {
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: players, refetch } = useQuery<Player[]>({
    queryKey: ['available-players', leagueId],
    queryFn: () => getPlayers(leagueId, { status: 'AVAILABLE' }),
  });

  const filtered = useMemo(() => {
    const list = players ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(p => p.name.toLowerCase().includes(q));
  }, [players, search]);

  async function putUp() {
    if (!selectedId) return;
    setBusy(true); setError(null);
    try {
      await putUpPlayer(auctionId, Number(selectedId));
      setSelectedId('');
      setSearch('');
      await refetch();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? 'Failed to put up player';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        mt: 3,
        width: '100%',
        maxWidth: 520,
        background: 'rgba(255,255,255,0.95)',
        border: '1px solid rgba(245,158,11,0.28)',
        borderRadius: '14px',
        p: 2.25,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
      }}
    >
      <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#b45309', letterSpacing: '1.2px' }}>
        AUCTIONEER · PUT UP NEXT PLAYER
      </Typography>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search available players…"
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.1)',
          background: '#f8fafc',
          color: '#1e293b',
          fontSize: 13,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      <select
        value={selectedId}
        onChange={e => setSelectedId(e.target.value ? Number(e.target.value) : '')}
        style={{
          width: '100%',
          padding: '9px 12px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.1)',
          background: '#f8fafc',
          color: '#1e293b',
          fontSize: 13,
          outline: 'none',
        }}
      >
        <option value="">— Choose player ({filtered.length} available) —</option>
        {filtered.slice(0, 200).map(p => (
          <option key={p.id} value={p.id}>
            {p.playerNumber ? `#${p.playerNumber} ` : ''}{p.name} · {p.category} · base {p.basePrice} CR
          </option>
        ))}
      </select>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#b91c1c' }}>
          {error}
        </Alert>
      )}

      <Button
        onClick={putUp}
        disabled={busy || !selectedId}
        sx={{
          alignSelf: 'flex-start',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: '#fff',
          fontWeight: 800,
          fontSize: 13,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          px: 2.5,
          py: 1,
          borderRadius: 10,
          '&:hover': { background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' },
          '&:disabled': { background: '#eef2f7', color: '#475569' },
        }}
      >
        {busy ? 'Putting up…' : 'Put Up Player'}
      </Button>

      {(players?.length ?? 0) === 0 && (
        <Typography sx={{ fontSize: 12, color: '#64748b' }}>
          No available players left in this league.
        </Typography>
      )}
    </Box>
  );
}

function PlayerStage({
  auction,
  timer,
  maxTimer,
  teams,
  flashState,
  hasPermission,
  user,
  league,
  completionCheck,
  refetchCompletionCheck,
}: {
  auction: Auction;
  timer: number;
  maxTimer: number;
  teams?: Team[];
  flashState: 'SOLD' | 'UNSOLD' | null;
  hasPermission: (p: string) => boolean;
  user: UserInfo | null;
  league?: League;
  completionCheck?: CompletionCheck;
  refetchCompletionCheck: () => void;
}) {
  const highestBid = auction.currentHighestBid ?? auction.currentBasePrice ?? 0;
  const highestBidTeamColor = teams?.find(t => t.name === auction.currentHighestBidTeam)?.color;
  const playerTeam = teams?.find(t => t.name === auction.currentHighestBidTeam);

  if (!auction.currentPlayerName) {
    return (
      <Box
        sx={{
          minHeight: 420,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          '@keyframes fadeInUp': {
            from: { opacity: 0, transform: 'translateY(20px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
          animation: 'fadeInUp 0.5s ease',
        }}
      >
        {/* Animated dots */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          {[0, 1, 2].map(i => (
            <Box
              key={i}
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                '@keyframes dotBounce': {
                  '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.4 },
                  '40%': { transform: 'scale(1)', opacity: 1 },
                },
                animation: `dotBounce 1.4s ease-in-out ${i * 0.16}s infinite`,
              }}
            />
          ))}
        </Box>
        <Typography
          sx={{
            fontSize: { xs: '20px', sm: '26px' },
            fontWeight: 700,
            color: '#64748b',
            letterSpacing: '1px',
          }}
        >
          {auction.status === 'COMPLETED'
            ? 'AUCTION COMPLETED'
            : auction.status === 'PAUSED'
            ? 'AUCTION PAUSED'
            : 'NEXT PLAYER COMING UP...'}
        </Typography>
        {auction.status === 'PAUSED' && (
          <Typography sx={{ fontSize: '14px', color: '#475569' }}>
            Admin will resume shortly
          </Typography>
        )}

        {/* Admin-only Next Player picker — appears when no player is up and auction isn't completed */}
        {(hasPermission('user:CREATE') || hasPermission('league:CREATE')) &&
          auction.status !== 'COMPLETED' && (
            <NextPlayerPicker auctionId={auction.id} leagueId={auction.leagueId} />
          )}
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', minHeight: 420 }}>
      {/* SOLD / UNSOLD overlay */}
      {flashState && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 1,
            borderRadius: '20px',
            background: flashState === 'SOLD'
              ? 'linear-gradient(135deg, rgba(22,101,52,0.92) 0%, rgba(21,128,61,0.92) 100%)'
              : 'linear-gradient(135deg, rgba(127,29,29,0.92) 0%, rgba(153,27,27,0.92) 100%)',
            backdropFilter: 'blur(4px)',
            '@keyframes flashIn': {
              '0%': { opacity: 0, transform: 'scale(0.85)' },
              '20%': { opacity: 1, transform: 'scale(1.04)' },
              '40%': { transform: 'scale(1)' },
            },
            animation: 'flashIn 0.4s ease',
          }}
        >
          {/* Confetti-style particles for SOLD */}
          {flashState === 'SOLD' && (
            <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: '20px', pointerEvents: 'none' }}>
              {[...Array(12)].map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    position: 'absolute',
                    width: `${6 + (i % 4) * 4}px`,
                    height: `${6 + (i % 4) * 4}px`,
                    borderRadius: i % 3 === 0 ? '50%' : '2px',
                    background: ['#f59e0b', '#4ade80', '#60a5fa', '#a78bfa', '#fb7185'][i % 5],
                    top: `${10 + (i * 7) % 80}%`,
                    left: `${5 + (i * 8) % 90}%`,
                    '@keyframes confettiFall': {
                      '0%': { transform: 'translateY(-20px) rotate(0deg)', opacity: 1 },
                      '100%': { transform: `translateY(${60 + (i * 10) % 40}px) rotate(${180 + i * 30}deg)`, opacity: 0 },
                    },
                    animation: `confettiFall 1.5s ease-in ${i * 0.1}s forwards`,
                  }}
                />
              ))}
            </Box>
          )}
          <Typography
            sx={{
              fontSize: { xs: '56px', sm: '80px' },
              fontWeight: 900,
              color: '#fff',
              letterSpacing: { xs: '4px', sm: '8px' },
              textShadow: `0 0 60px ${flashState === 'SOLD' ? '#4ade80' : '#ef4444'}`,
              lineHeight: 1,
            }}
          >
            {flashState}!
          </Typography>
          {flashState === 'SOLD' && auction.currentHighestBidTeam && (
            <Typography sx={{ fontSize: '22px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '1px' }}>
              {auction.currentHighestBidTeam}
            </Typography>
          )}
        </Box>
      )}

      {/* Player content */}
      <Box
        sx={{
          '@keyframes playerIn': {
            from: { opacity: 0, transform: 'translateY(16px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
          animation: 'playerIn 0.5s ease',
        }}
      >
        {/* Top row: player number circle + name + badges */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 2, sm: 3 }, mb: 3, flexWrap: 'wrap' }}>
          {/* Player number badge */}
          <Box
            sx={{
              width: { xs: 60, sm: 80 },
              height: { xs: 60, sm: 80 },
              borderRadius: '50%',
              background: highestBidTeamColor
                ? `linear-gradient(135deg, ${highestBidTeamColor} 0%, ${highestBidTeamColor}88 100%)`
                : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 8px 32px ${highestBidTeamColor || '#f59e0b'}50`,
              transition: 'all 0.5s ease',
              border: '3px solid rgba(255,255,255,0.15)',
            }}
          >
            <Typography sx={{ fontSize: { xs: '22px', sm: '28px' }, fontWeight: 900, color: '#fff' }}>
              {auction.currentPlayerId ?? '#'}
            </Typography>
          </Box>

          {/* Name + badges */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: { xs: '2rem', sm: '2.8rem', md: '3.2rem' },
                fontWeight: 900,
                color: '#0f172a',
                lineHeight: 1.05,
                letterSpacing: '-0.5px',
                mb: 1.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: { xs: 'normal', sm: 'nowrap' },
              }}
            >
              {auction.currentPlayerName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: '20px',
                  background: 'rgba(96,165,250,0.15)',
                  border: '1px solid rgba(96,165,250,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <SportsCricketIcon sx={{ fontSize: 13, color: '#1d4ed8' }} />
                <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#1d4ed8', letterSpacing: '0.8px' }}>
                  CRICKET
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: '20px',
                  background: 'rgba(148,163,184,0.1)',
                  border: '1px solid rgba(148,163,184,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <SportsIcon sx={{ fontSize: 13, color: '#94a3b8' }} />
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.8px' }}>
                  BASE: {formatCR(auction.currentBasePrice ?? 0)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Bid + Timer row */}
        <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, alignItems: 'stretch', flexWrap: 'wrap', mb: 3 }}>
          {/* Highest bid panel */}
          <Box
            sx={{
              flex: 1,
              minWidth: { xs: '100%', sm: 220 },
              p: { xs: 2, sm: 3 },
              borderRadius: '18px',
              background: highestBidTeamColor
                ? `linear-gradient(135deg, ${highestBidTeamColor}22 0%, ${highestBidTeamColor}0a 100%)`
                : 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)',
              border: `1.5px solid ${highestBidTeamColor ? highestBidTeamColor + '50' : 'rgba(245,158,11,0.3)'}`,
              boxShadow: highestBidTeamColor ? `0 8px 32px ${highestBidTeamColor}18` : 'none',
              transition: 'all 0.5s ease',
              '@keyframes bidFlash': {
                '0%': { transform: 'scale(1)' },
                '15%': { transform: 'scale(1.03)' },
                '30%': { transform: 'scale(1)' },
              },
            }}
          >
            <Typography
              sx={{ fontSize: '10px', color: '#64748b', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', mb: 0.75 }}
            >
              Current Highest Bid
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: '3rem', sm: '3.8rem' },
                fontWeight: 900,
                color: highestBidTeamColor || '#f59e0b',
                lineHeight: 1,
                mb: 0.75,
                transition: 'color 0.5s ease',
                textShadow: `0 0 30px ${highestBidTeamColor || '#f59e0b'}60`,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatCR(highestBid)}
            </Typography>
            {auction.currentHighestBidTeam ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {highestBidTeamColor && (
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: highestBidTeamColor,
                      boxShadow: `0 0 10px ${highestBidTeamColor}`,
                      flexShrink: 0,
                    }}
                  />
                )}
                <Typography
                  sx={{
                    fontSize: { xs: '16px', sm: '20px' },
                    fontWeight: 800,
                    color: highestBidTeamColor || '#94a3b8',
                    letterSpacing: '0.5px',
                  }}
                >
                  {playerTeam?.shortName ?? auction.currentHighestBidTeam}
                </Typography>
              </Box>
            ) : (
              <Typography sx={{ fontSize: '14px', color: '#475569', fontStyle: 'italic' }}>
                No bids yet
              </Typography>
            )}
          </Box>

          {/* Timer */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              px: { xs: 2, sm: 0 },
            }}
          >
            <TimerCircle timer={timer} maxTimer={maxTimer} />
          </Box>
        </Box>

        <AuctionControls
          auction={auction}
          teams={teams ?? []}
          user={user}
          hasPermission={hasPermission}
          bidIncrement={league?.bidIncrement ?? 0}
          completionCheck={completionCheck}
          refetchCompletionCheck={refetchCompletionCheck}
        />
      </Box>
    </Box>
  );
}

/* ─────────────────── BidFeed ──────────────────────────────────── */

function BidFeed({ log }: { log: BidEntry[] }) {
  return (
    <Box
      sx={{
        background: '#ffffff',
        backdropFilter: 'blur(12px)',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        height: '100%',
        minHeight: { xs: 280, md: 480 },
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          background: '#f8fafc',
        }}
      >
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: '#b91c1c',
            '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
            animation: 'pulse 1.2s ease-in-out infinite',
          }}
        />
        <Typography
          sx={{ fontSize: '11px', fontWeight: 800, color: '#64748b', letterSpacing: '2px', textTransform: 'uppercase', flex: 1 }}
        >
          Live Bid Activity
        </Typography>
        {log.length > 0 && (
          <Box
            sx={{
              background: 'rgba(245,158,11,0.15)',
              borderRadius: '20px',
              px: 1.25,
              py: 0.15,
            }}
          >
            <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#b45309' }}>
              {log.length}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Feed */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {log.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, color: '#475569' }}>
            <Typography sx={{ fontSize: '13px' }}>No bids yet</Typography>
          </Box>
        ) : (
          log.map((entry, idx) => {
            const isSold = entry.type === 'sold';
            const isUnsold = entry.type === 'unsold';
            const isBid = entry.type === 'bid';
            const borderColor = isSold ? '#4ade80' : isUnsold ? '#ef4444' : entry.teamColor || '#475569';
            const isNew = idx === 0;
            return (
              <Box
                key={entry.id}
                sx={{
                  borderLeft: `3px solid ${borderColor}`,
                  pl: 1.5,
                  py: 1,
                  borderRadius: '0 10px 10px 0',
                  background: isSold
                    ? 'rgba(74,222,128,0.08)'
                    : isUnsold
                    ? 'rgba(239,68,68,0.08)'
                    : isBid
                    ? `${entry.teamColor ? entry.teamColor + '10' : '#f8fafc'}`
                    : '#f8fafc',
                  '@keyframes slideInRight': {
                    from: { opacity: 0, transform: 'translateX(16px)' },
                    to: { opacity: 1, transform: 'translateX(0)' },
                  },
                  ...(isNew && { animation: 'slideInRight 0.3s ease' }),
                  transition: 'background 0.3s ease',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '13px',
                    fontWeight: isSold ? 800 : isUnsold ? 800 : isBid ? 600 : 500,
                    color: isSold ? '#4ade80' : isUnsold ? '#ef4444' : isBid ? '#1e293b' : '#94a3b8',
                    lineHeight: 1.35,
                  }}
                >
                  {entry.text}
                </Typography>
                <Typography sx={{ fontSize: '10px', color: '#475569', mt: 0.25 }}>
                  {entry.timestamp}
                </Typography>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}

/* ─────────────────── TeamPurseBar ────────────────────────────── */

function TeamPurseBar({ teamPurses, lastBidTeamId }: { teamPurses: TeamPurse[]; lastBidTeamId?: number }) {
  if (teamPurses.length === 0) return null;
  return (
    <Box sx={{ mt: 2 }}>
      <Typography
        sx={{
          fontSize: '10px',
          fontWeight: 700,
          color: '#475569',
          letterSpacing: '2.5px',
          textTransform: 'uppercase',
          mb: 1.5,
        }}
      >
        Team Purses
      </Typography>
      <Grid container spacing={1.5}>
        {teamPurses.map(tp => {
          const remaining = tp.budget - tp.budgetSpent;
          const pct = tp.budget > 0 ? Math.min((tp.budgetSpent / tp.budget) * 100, 100) : 0;
          const tc = tp.teamColor || '#6366f1';
          const isActive = tp.teamId === lastBidTeamId;
          return (
            <Grid key={tp.teamId} size={{ xs: 6, sm: 4, md: 2 }}>
              <Box
                sx={{
                  background: '#ffffff',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  border: isActive ? `1px solid ${tc}70` : '1px solid #eef2f7',
                  boxShadow: isActive ? `0 0 20px ${tc}30` : 'none',
                  transition: 'all 0.4s ease',
                  '@keyframes teamPulse': {
                    '0%, 100%': { boxShadow: `0 0 20px ${tc}30` },
                    '50%': { boxShadow: `0 0 40px ${tc}55` },
                  },
                  ...(isActive && { animation: 'teamPulse 1.5s ease-in-out 3' }),
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${tc}28` },
                }}
              >
                {/* Color top bar */}
                <Box
                  sx={{
                    height: 4,
                    background: `linear-gradient(90deg, ${tc}, ${tc}88)`,
                  }}
                />
                <Box sx={{ px: 1.5, py: 1.25 }}>
                  <Typography
                    sx={{ fontSize: '11px', fontWeight: 800, color: '#475569', mb: 0.5, letterSpacing: '0.3px' }}
                    noWrap
                    title={tp.teamName}
                  >
                    {tp.teamShortName ?? tp.teamName}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                    <AccountBalanceWalletIcon sx={{ fontSize: 11, color: tc }} />
                    <Typography sx={{ fontSize: '13px', fontWeight: 900, color: '#1e293b' }}>
                      {formatCR(remaining)}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '9px', color: '#475569', mb: 0.75 }}>
                    Spent {formatCR(tp.budgetSpent)}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      height: 3,
                      borderRadius: 2,
                      bgcolor: '#eef2f7',
                      '& .MuiLinearProgress-bar': {
                        background: pct > 85
                          ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                          : `linear-gradient(90deg, ${tc}, ${tc}bb)`,
                        borderRadius: 2,
                        transition: 'transform 0.8s ease',
                      },
                    }}
                  />
                </Box>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

/* ─────────────────── Main AuctionPage ────────────────────────── */

export default function AuctionPage() {
  const { hasPermission, user } = useAuth();
  const { activeLeague } = useLeague();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [timer, setTimer] = useState(0);
  const [log, setLog] = useState<BidEntry[]>([]);
  const [teamPurses, setTeamPurses] = useState<TeamPurse[]>([]);
  const [flashState, setFlashState] = useState<'SOLD' | 'UNSOLD' | null>(null);
  const [lastBidTeamId, setLastBidTeamId] = useState<number | undefined>();
  const logIdRef = useRef(0);

  const activeLeagueId = activeLeague?.id;

  const { data: fetchedAuction, isLoading, error } = useQuery<Auction>({
    queryKey: ['auction-by-league', activeLeagueId],
    queryFn: () => getAuctionByLeague(activeLeagueId!),
    enabled: !!activeLeagueId,
    retry: false,
  });

  // Reset local auction state when active league changes
  useEffect(() => {
    setAuction(null);
    setLog([]);
    setLastBidTeamId(undefined);
  }, [activeLeagueId]);

  const { data: leagues } = useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: getLeagues,
  });

  const leagueId = auction?.leagueId ?? fetchedAuction?.leagueId;

  const { data: teams } = useQuery<Team[]>({
    queryKey: ['teams', leagueId],
    queryFn: () => getTeams(leagueId!),
    enabled: !!leagueId,
  });

  const auctionId = auction?.id ?? fetchedAuction?.id;
  const isAdminUser = hasPermission('user:CREATE') || hasPermission('league:CREATE');
  const { data: completionCheck, refetch: refetchCompletionCheckRaw } = useQuery<CompletionCheck>({
    queryKey: ['auction-completion-check', auctionId],
    queryFn: () => getCompletionCheck(auctionId!),
    enabled: !!auctionId && isAdminUser && auction?.status !== 'COMPLETED',
    staleTime: 5_000,
  });
  const refetchCompletionCheck = useCallback(() => { refetchCompletionCheckRaw(); }, [refetchCompletionCheckRaw]);

  useEffect(() => {
    if (fetchedAuction && !auction) {
      setAuction(fetchedAuction);
      setTimer(fetchedAuction.timerSeconds ?? 0);
    }
  }, [fetchedAuction, auction]);

  useEffect(() => {
    if (teams && teams.length > 0) {
      setTeamPurses(teams.map(t => ({
        teamId: t.id,
        teamName: t.name,
        teamShortName: t.shortName,
        teamColor: t.color,
        budget: t.budget,
        budgetSpent: t.budgetSpent,
      })));
    }
  }, [teams]);

  const addLog = useCallback((text: string, type: BidEntry['type'], teamColor?: string) => {
    const id = ++logIdRef.current;
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [{ id, text, timestamp, type, teamColor }, ...prev].slice(0, 100));
  }, []);

  const handleSseEvent = useCallback((event: AuctionEvent) => {
    const d = event.data;
    switch (event.type) {
      case 'PLAYER_UP': {
        const playerName = d.playerName as string ?? 'Unknown';
        const basePrice = d.basePrice as number ?? 0;
        setFlashState(null);
        setLastBidTeamId(undefined);
        setAuction(prev => prev ? {
          ...prev,
          status: 'LIVE',
          currentPlayerId: d.playerId as number,
          currentPlayerName: playerName,
          currentBasePrice: basePrice,
          currentHighestBid: basePrice,
          currentHighestBidTeam: undefined,
          timerSeconds: d.timerSeconds as number ?? prev.timerSeconds,
        } : prev);
        setTimer(d.timerSeconds as number ?? 30);
        addLog(`Player up: ${playerName} @ ${formatCR(basePrice)}`, 'event');
        break;
      }
      case 'BID_PLACED': {
        const bid = (d.amount as number) ?? (d.bid as number) ?? 0;
        const teamName = d.teamName as string ?? 'Unknown';
        const bidTeam = teams?.find(t => t.name === teamName);
        setAuction(prev => prev ? {
          ...prev,
          currentHighestBid: bid,
          currentHighestBidTeam: teamName,
          timerSeconds: d.timerSeconds as number ?? prev.timerSeconds,
        } : prev);
        setTimer(d.timerSeconds as number ?? timer);
        setLastBidTeamId(bidTeam?.id);
        addLog(`${formatCR(bid)} — ${teamName}`, 'bid', bidTeam?.color);
        break;
      }
      case 'BID_UNDONE': {
        const undoneAmount = d.undoneAmount as number ?? 0;
        const undoneTeam = d.undoneTeamName as string ?? 'Unknown';
        const newAmount = d.newHighestAmount as number | undefined;
        const newTeamName = d.newHighestTeamName as string | undefined;
        const newTeam = newTeamName ? teams?.find(t => t.name === newTeamName) : undefined;
        setAuction(prev => prev ? {
          ...prev,
          currentHighestBid: newAmount ?? prev.currentBasePrice ?? 0,
          currentHighestBidTeam: newTeamName,
        } : prev);
        setLastBidTeamId(newTeam?.id);
        addLog(
          newTeamName
            ? `↺ Undone ${formatCR(undoneAmount)} — ${undoneTeam} · now ${formatCR(newAmount ?? 0)} ${newTeamName}`
            : `↺ Undone ${formatCR(undoneAmount)} — ${undoneTeam} · no bids`,
          'event',
        );
        break;
      }
      case 'PLAYER_SOLD': {
        const soldTo = d.teamName as string ?? 'Unknown';
        const soldPrice = (d.amount as number) ?? (d.soldPrice as number) ?? 0;
        addLog(`SOLD: ${d.playerName as string ?? ''} → ${soldTo} @ ${formatCR(soldPrice)}`, 'sold');
        setFlashState('SOLD');
        setTimeout(() => setFlashState(null), 3500);
        setAuction(prev => prev ? { ...prev, currentPlayerId: undefined, currentPlayerName: undefined } : prev);
        setTimer(0);
        refetchCompletionCheckRaw();
        break;
      }
      case 'PLAYER_UNSOLD': {
        addLog(`UNSOLD: ${d.playerName as string ?? ''}`, 'unsold');
        setFlashState('UNSOLD');
        setTimeout(() => setFlashState(null), 3000);
        setAuction(prev => prev ? { ...prev, currentPlayerId: undefined, currentPlayerName: undefined } : prev);
        setTimer(0);
        refetchCompletionCheckRaw();
        break;
      }
      case 'BUDGET_UPDATE':
      case 'BUDGET_UPDATED': {
        const updatedTeamId = d.teamId as number;
        const newBudgetSpent = d.budgetSpent as number ?? 0;
        setTeamPurses(prev => prev.map(tp =>
          tp.teamId === updatedTeamId ? { ...tp, budgetSpent: newBudgetSpent } : tp
        ));
        break;
      }
      case 'AUCTION_PAUSED':
        setAuction(prev => prev ? { ...prev, status: 'PAUSED' } : prev);
        addLog('Auction paused', 'event');
        break;
      case 'AUCTION_RESUMED':
        setAuction(prev => prev ? { ...prev, status: 'LIVE' } : prev);
        addLog('Auction resumed', 'event');
        break;
      case 'AUCTION_COMPLETED':
        setAuction(prev => prev ? { ...prev, status: 'COMPLETED' } : prev);
        addLog('Auction completed', 'event');
        break;
      case 'TIMER_TICK': {
        const remaining = d.remaining as number ?? 0;
        setTimer(remaining);
        setAuction(prev => prev ? { ...prev, timerSeconds: remaining } : prev);
        break;
      }
    }
  }, [addLog, teams, timer, refetchCompletionCheckRaw]);

  useSse(auction?.id ?? null, handleSseEvent);

  useEffect(() => {
    if (!auction || auction.status !== 'LIVE' || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [auction?.status, timer > 0]);

  const league = leagues?.find(l => l.id === leagueId);
  const maxTimer = league?.timerSeconds ?? 30;

  /* ── Loading ── */
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 2,
          '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
        }}
      >
        <CircularProgress sx={{ color: '#b45309' }} size={56} thickness={3} />
        <Typography sx={{ color: '#475569', fontSize: '14px', letterSpacing: '1px' }}>
          LOADING AUCTION...
        </Typography>
      </Box>
    );
  }

  /* ── No auction ── */
  if (error || !auction) {
    return (
      <Box
        sx={{
          '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
          animation: 'fadeIn 0.5s ease',
        }}
      >
        <BroadcastHeader status="PENDING" />
        <Alert
          severity="info"
          sx={{
            borderRadius: '14px',
            background: 'rgba(96,165,250,0.08)',
            border: '1px solid rgba(96,165,250,0.25)',
            color: '#1d4ed8',
            '& .MuiAlert-icon': { color: '#1d4ed8' },
          }}
        >
          No auction running. Create an auction in the Admin panel to get started.
        </Alert>
      </Box>
    );
  }

  /* ── Main ── */
  return (
    <Box
      sx={{
        '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
        '@keyframes slideInRight': {
          from: { opacity: 0, transform: 'translateX(16px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        animation: 'fadeIn 0.4s ease',
        pb: 3,
      }}
    >
      {/* Broadcast Header */}
      <BroadcastHeader
        status={auction.status}
        leagueName={league?.name}
        season={league?.season}
      />

      <Grid container spacing={2.5}>
        {/* CENTER STAGE — Current Player (60-70% wide) */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Box
            sx={{
              background: 'linear-gradient(145deg, #ffffff 0%, #ffffff 100%)',
              backdropFilter: 'blur(16px)',
              border: '1px solid #e2e8f0',
              borderRadius: '22px',
              overflow: 'hidden',
              position: 'relative',
              minHeight: { xs: 380, sm: 460 },
              p: { xs: 2.5, sm: 3.5 },
              transition: 'border-color 0.5s ease, box-shadow 0.5s ease',
              ...(flashState === 'SOLD' && {
                borderColor: 'rgba(74,222,128,0.4)',
                boxShadow: '0 0 60px rgba(74,222,128,0.18)',
              }),
              ...(flashState === 'UNSOLD' && {
                borderColor: 'rgba(239,68,68,0.4)',
                boxShadow: '0 0 60px rgba(239,68,68,0.18)',
              }),
              /* Subtle inner gradient glow */
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: auction.currentPlayerName
                  ? 'linear-gradient(90deg, transparent 0%, #f59e0b 30%, #ef4444 70%, transparent 100%)'
                  : 'transparent',
                transition: 'background 0.5s ease',
              },
            }}
          >
            <PlayerStage
              auction={auction}
              timer={timer}
              maxTimer={maxTimer}
              teams={teams}
              flashState={flashState}
              hasPermission={hasPermission}
              user={user}
              league={league}
              completionCheck={completionCheck}
              refetchCompletionCheck={refetchCompletionCheck}
            />
          </Box>
        </Grid>

        {/* RIGHT — Bid Activity Feed */}
        <Grid size={{ xs: 12, md: 4 }}>
          <BidFeed log={log} />
        </Grid>
      </Grid>

      {/* BOTTOM — Team Purse Tracker */}
      <TeamPurseBar teamPurses={teamPurses} lastBidTeamId={lastBidTeamId} />
    </Box>
  );
}
