import { useState, useEffect, useCallback, useRef } from 'react';
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
import { getAuction } from '../api/auctions';
import { getTeams } from '../api/teams';
import { getLeagues } from '../api/leagues';
import { useSse } from '../hooks/useSse';
import { useAuth } from '../context/AuthContext';
import type { Auction, Team, League, AuctionEvent } from '../types';

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
        background: 'linear-gradient(135deg, rgba(15,12,35,0.97) 0%, rgba(26,20,60,0.97) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: isLive ? '0 0 40px rgba(239,68,68,0.12), inset 0 0 60px rgba(255,255,255,0.02)' : 'none',
        '@keyframes pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.4 },
        },
        '@keyframes broadcastPulse': {
          '0%, 100%': { boxShadow: '0 0 40px rgba(239,68,68,0.12), inset 0 0 60px rgba(255,255,255,0.02)' },
          '50%': { boxShadow: '0 0 60px rgba(239,68,68,0.25), inset 0 0 60px rgba(255,255,255,0.02)' },
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
                bgcolor: '#ef4444',
                flexShrink: 0,
                animation: 'pulse 1s ease-in-out infinite',
              }}
            />
            <Typography sx={{ fontSize: '13px', fontWeight: 900, color: '#ef4444', letterSpacing: '2px' }}>
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
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
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

function PlayerStage({
  auction,
  timer,
  maxTimer,
  teams,
  flashState,
  hasPermission,
}: {
  auction: Auction;
  timer: number;
  maxTimer: number;
  teams?: Team[];
  flashState: 'SOLD' | 'UNSOLD' | null;
  hasPermission: (p: string) => boolean;
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
                color: '#f1f5f9',
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
                <SportsCricketIcon sx={{ fontSize: 13, color: '#60a5fa' }} />
                <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#60a5fa', letterSpacing: '0.8px' }}>
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

        {/* BID Button */}
        {hasPermission('auction:BID') && (
          <Box sx={{ mt: 1 }}>
            <Button
              variant="contained"
              size="large"
              disabled={auction.status !== 'LIVE'}
              startIcon={<GavelIcon sx={{ fontSize: '22px !important' }} />}
              sx={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
                color: '#fff',
                fontWeight: 900,
                fontSize: { xs: '15px', sm: '18px' },
                letterSpacing: '2px',
                px: { xs: 4, sm: 6 },
                py: { xs: 1.5, sm: 2 },
                borderRadius: '16px',
                border: '1px solid rgba(245,158,11,0.5)',
                boxShadow: '0 8px 32px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
                textTransform: 'uppercase',
                '@keyframes bidButtonGlow': {
                  '0%, 100%': { boxShadow: '0 8px 32px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,255,255,0.15)' },
                  '50%': { boxShadow: '0 8px 48px rgba(245,158,11,0.7), 0 0 20px rgba(245,158,11,0.3), inset 0 1px 0 rgba(255,255,255,0.15)' },
                },
                animation: auction.status === 'LIVE' ? 'bidButtonGlow 2.5s ease-in-out infinite' : 'none',
                '&:hover': {
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                  boxShadow: '0 12px 48px rgba(245,158,11,0.65), 0 0 30px rgba(245,158,11,0.4)',
                  transform: 'translateY(-3px) scale(1.02)',
                },
                '&:active': {
                  transform: 'translateY(-1px) scale(0.99)',
                },
                '&:disabled': {
                  background: 'rgba(255,255,255,0.06)',
                  color: '#334155',
                  boxShadow: 'none',
                  transform: 'none',
                  animation: 'none',
                },
                transition: 'transform 0.2s ease, background 0.25s ease',
              }}
            >
              PLACE BID
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/* ─────────────────── BidFeed ──────────────────────────────────── */

function BidFeed({ log }: { log: BidEntry[] }) {
  return (
    <Box
      sx={{
        background: 'rgba(15,12,35,0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.07)',
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
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: '#ef4444',
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
            <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b' }}>
              {log.length}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Feed */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {log.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, color: '#334155' }}>
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
                    ? `${entry.teamColor ? entry.teamColor + '10' : 'rgba(255,255,255,0.03)'}`
                    : 'rgba(255,255,255,0.02)',
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
                    color: isSold ? '#4ade80' : isUnsold ? '#ef4444' : isBid ? '#e2e8f0' : '#94a3b8',
                    lineHeight: 1.35,
                  }}
                >
                  {entry.text}
                </Typography>
                <Typography sx={{ fontSize: '10px', color: '#334155', mt: 0.25 }}>
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
          color: '#334155',
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
                  background: 'rgba(15,12,35,0.9)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  border: isActive ? `1px solid ${tc}70` : '1px solid rgba(255,255,255,0.06)',
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
                    sx={{ fontSize: '11px', fontWeight: 800, color: '#cbd5e1', mb: 0.5, letterSpacing: '0.3px' }}
                    noWrap
                    title={tp.teamName}
                  >
                    {tp.teamShortName ?? tp.teamName}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                    <AccountBalanceWalletIcon sx={{ fontSize: 11, color: tc }} />
                    <Typography sx={{ fontSize: '13px', fontWeight: 900, color: '#e2e8f0' }}>
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
                      bgcolor: 'rgba(255,255,255,0.05)',
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
  const { hasPermission } = useAuth();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [timer, setTimer] = useState(0);
  const [log, setLog] = useState<BidEntry[]>([]);
  const [teamPurses, setTeamPurses] = useState<TeamPurse[]>([]);
  const [flashState, setFlashState] = useState<'SOLD' | 'UNSOLD' | null>(null);
  const [lastBidTeamId, setLastBidTeamId] = useState<number | undefined>();
  const logIdRef = useRef(0);

  const { data: fetchedAuction, isLoading, error } = useQuery<Auction>({
    queryKey: ['auction', 1],
    queryFn: () => getAuction(1),
    retry: false,
  });

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
        const bid = d.bid as number ?? 0;
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
      case 'PLAYER_SOLD': {
        const soldTo = d.teamName as string ?? 'Unknown';
        const soldPrice = d.soldPrice as number ?? 0;
        addLog(`SOLD: ${d.playerName as string ?? ''} → ${soldTo} @ ${formatCR(soldPrice)}`, 'sold');
        setFlashState('SOLD');
        setTimeout(() => setFlashState(null), 3500);
        setAuction(prev => prev ? { ...prev, currentPlayerId: undefined, currentPlayerName: undefined } : prev);
        setTimer(0);
        break;
      }
      case 'PLAYER_UNSOLD': {
        addLog(`UNSOLD: ${d.playerName as string ?? ''}`, 'unsold');
        setFlashState('UNSOLD');
        setTimeout(() => setFlashState(null), 3000);
        setAuction(prev => prev ? { ...prev, currentPlayerId: undefined, currentPlayerName: undefined } : prev);
        setTimer(0);
        break;
      }
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
  }, [addLog, teams, timer]);

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
        <CircularProgress sx={{ color: '#f59e0b' }} size={56} thickness={3} />
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
            color: '#60a5fa',
            '& .MuiAlert-icon': { color: '#60a5fa' },
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
              background: 'linear-gradient(145deg, rgba(20,15,50,0.97) 0%, rgba(26,20,60,0.97) 100%)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.07)',
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
