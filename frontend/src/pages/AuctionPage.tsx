import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Grid from '@mui/material/Grid';
import {
  Box, Typography, CircularProgress, Alert, Card, CardContent,
  LinearProgress, Button,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { getAuction } from '../api/auctions';
import { getTeams } from '../api/teams';
import { getLeagues } from '../api/leagues';
import { useSse } from '../hooks/useSse';
import { useAuth } from '../context/AuthContext';
import type { Auction, Team, League, AuctionEvent } from '../types';

function timerColor(seconds: number): string {
  if (seconds > 15) return '#4ade80';
  if (seconds > 5) return '#f59e0b';
  return '#ef4444';
}

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
  teamColor?: string;
  budget: number;
  budgetSpent: number;
}

function AuctionStatusBadge({ status }: { status: string }) {
  const live = status === 'LIVE';
  const paused = status === 'PAUSED';
  const completed = status === 'COMPLETED';
  const color = live ? '#ef4444' : paused ? '#f59e0b' : completed ? '#4ade80' : '#94a3b8';
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.75,
        py: 0.6,
        borderRadius: '20px',
        background: `${color}18`,
        border: `1px solid ${color}40`,
        ...(live && { animation: 'pulse 2s infinite' }),
      }}
    >
      {live && (
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444', animation: 'pulse 1s infinite' }} />
      )}
      <Typography sx={{ fontSize: '12px', fontWeight: 800, color, letterSpacing: '1px', textTransform: 'uppercase' }}>
        {status}
      </Typography>
    </Box>
  );
}

function TimerCircle({ timer, maxTimer }: { timer: number; maxTimer: number }) {
  const color = timerColor(timer);
  const pct = maxTimer > 0 ? Math.max(0, (timer / maxTimer) * 100) : 0;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pct / 100);

  return (
    <Box sx={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
      <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx="65"
          cy="65"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="8"
        />
        <circle
          cx="65"
          cy="65"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.5s ease' }}
        />
      </svg>
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
            fontSize: '36px',
            fontWeight: 900,
            color,
            lineHeight: 1,
            transition: 'color 0.5s ease',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {timer}
        </Typography>
        <Typography sx={{ fontSize: '10px', color: '#64748b', fontWeight: 600, letterSpacing: '0.5px' }}>
          SEC
        </Typography>
      </Box>
    </Box>
  );
}

export default function AuctionPage() {
  const { hasPermission } = useAuth();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [timer, setTimer] = useState(0);
  const [log, setLog] = useState<BidEntry[]>([]);
  const [teamPurses, setTeamPurses] = useState<TeamPurse[]>([]);
  const [flashState, setFlashState] = useState<'SOLD' | 'UNSOLD' | null>(null);
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
        setAuction(prev => prev ? {
          ...prev, status: 'LIVE',
          currentPlayerId: d.playerId as number,
          currentPlayerName: playerName,
          currentBasePrice: basePrice,
          currentHighestBid: basePrice,
          currentHighestBidTeam: undefined,
          timerSeconds: d.timerSeconds as number ?? prev.timerSeconds,
        } : prev);
        setTimer(d.timerSeconds as number ?? 30);
        addLog(`Player up: ${playerName} @ ₹${(basePrice / 100000).toFixed(1)}L`, 'event');
        break;
      }
      case 'BID_PLACED': {
        const bid = d.bid as number ?? 0;
        const teamName = d.teamName as string ?? 'Unknown';
        const bidTeamColor = teams?.find(t => t.name === teamName)?.color;
        setAuction(prev => prev ? {
          ...prev,
          currentHighestBid: bid,
          currentHighestBidTeam: teamName,
          timerSeconds: d.timerSeconds as number ?? prev.timerSeconds,
        } : prev);
        setTimer(d.timerSeconds as number ?? timer);
        addLog(`₹${(bid / 100000).toFixed(1)}L — ${teamName}`, 'bid', bidTeamColor);
        break;
      }
      case 'PLAYER_SOLD': {
        const soldTo = d.teamName as string ?? 'Unknown';
        const soldPrice = d.soldPrice as number ?? 0;
        addLog(`SOLD: ${d.playerName as string ?? ''} → ${soldTo} for ₹${(soldPrice / 100000).toFixed(1)}L`, 'sold');
        setFlashState('SOLD');
        setTimeout(() => setFlashState(null), 3000);
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
  const currentColor = timerColor(timer);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress sx={{ color: '#f59e0b' }} />
      </Box>
    );
  }

  if (error || !auction) {
    return (
      <Box sx={{ animation: 'fadeIn 0.5s ease' }}>
        <Typography
          variant="h4"
          sx={{
            mb: 2,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Live Auction
        </Typography>
        <Alert severity="info" sx={{ borderRadius: '12px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa' }}>
          No auction running. Create an auction in the Admin panel.
        </Alert>
      </Box>
    );
  }

  const highestBid = auction.currentHighestBid ?? auction.currentBasePrice ?? 0;
  const highestBidTeamColor = teams?.find(t => t.name === auction.currentHighestBidTeam)?.color;

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <GavelIcon sx={{ color: '#f59e0b', fontSize: 28 }} />
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 80%, #fbbf24 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Live Auction
          </Typography>
        </Box>
        <AuctionStatusBadge status={auction.status} />
        {league && (
          <Typography sx={{ fontSize: '13px', color: '#64748b', background: 'rgba(255,255,255,0.05)', px: 1.5, py: 0.5, borderRadius: '8px' }}>
            {league.name}
          </Typography>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* LEFT: Current Player Stage */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card
            sx={{
              background: 'rgba(26,26,46,0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '20px',
              mb: 3,
              overflow: 'hidden',
              position: 'relative',
              minHeight: 340,
              ...(flashState === 'SOLD' && {
                border: '1px solid rgba(74,222,128,0.5)',
                boxShadow: '0 0 40px rgba(74,222,128,0.2)',
              }),
              ...(flashState === 'UNSOLD' && {
                border: '1px solid rgba(239,68,68,0.5)',
                boxShadow: '0 0 40px rgba(239,68,68,0.2)',
              }),
            }}
          >
            {auction.currentPlayerName ? (
              <CardContent sx={{ p: 3.5, position: 'relative', zIndex: 1 }}>
                {/* Flash banner */}
                {flashState && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: flashState === 'SOLD' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                      zIndex: 10,
                      animation: 'fadeIn 0.3s ease',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '72px',
                        fontWeight: 900,
                        color: flashState === 'SOLD' ? '#4ade80' : '#ef4444',
                        letterSpacing: '4px',
                        textShadow: `0 0 40px ${flashState === 'SOLD' ? '#4ade80' : '#ef4444'}`,
                      }}
                    >
                      {flashState}!
                    </Typography>
                  </Box>
                )}

                {/* Player name - large */}
                <Typography
                  variant="h3"
                  sx={{ fontWeight: 900, color: '#e2e8f0', mb: 1, lineHeight: 1.1 }}
                >
                  {auction.currentPlayerName}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '20px',
                      background: 'rgba(96,165,250,0.15)',
                      border: '1px solid rgba(96,165,250,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <SportsCricketIcon sx={{ fontSize: 14, color: '#60a5fa' }} />
                    <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa' }}>
                      CRICKET
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '14px', color: '#64748b' }}>
                    Base: <span style={{ color: '#94a3b8', fontWeight: 600 }}>₹{((auction.currentBasePrice ?? 0) / 100000).toFixed(1)}L</span>
                  </Typography>
                </Box>

                {/* Bid + Timer row */}
                <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Highest bid */}
                  <Box
                    sx={{
                      flex: 1,
                      p: 2.5,
                      borderRadius: '16px',
                      background: highestBidTeamColor
                        ? `linear-gradient(135deg, ${highestBidTeamColor}20, ${highestBidTeamColor}08)`
                        : 'rgba(255,255,255,0.04)',
                      border: highestBidTeamColor
                        ? `1px solid ${highestBidTeamColor}40`
                        : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <Typography sx={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', mb: 0.5 }}>
                      Highest Bid
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '42px',
                        fontWeight: 900,
                        color: highestBidTeamColor || '#f59e0b',
                        lineHeight: 1,
                        mb: 0.5,
                      }}
                    >
                      ₹{(highestBid / 100000).toFixed(1)}L
                    </Typography>
                    {auction.currentHighestBidTeam && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {highestBidTeamColor && (
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              bgcolor: highestBidTeamColor,
                              boxShadow: `0 0 8px ${highestBidTeamColor}`,
                            }}
                          />
                        )}
                        <Typography sx={{ fontSize: '15px', fontWeight: 700, color: highestBidTeamColor || '#94a3b8' }}>
                          {auction.currentHighestBidTeam}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Timer */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <TimerCircle timer={timer} maxTimer={maxTimer} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTimeIcon sx={{ fontSize: 13, color: '#64748b' }} />
                      <Typography sx={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                        TIME LEFT
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* BID Button */}
                {hasPermission('auction:BID') && (
                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      size="large"
                      disabled={auction.status !== 'LIVE'}
                      startIcon={<GavelIcon />}
                      sx={{
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '16px',
                        letterSpacing: '1px',
                        px: 4,
                        py: 1.5,
                        borderRadius: '14px',
                        border: 'none',
                        boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                          boxShadow: '0 8px 32px rgba(245,158,11,0.6)',
                          transform: 'translateY(-2px)',
                        },
                        '&:disabled': {
                          background: 'rgba(255,255,255,0.08)',
                          color: '#475569',
                          boxShadow: 'none',
                          transform: 'none',
                        },
                        transition: 'all 0.25s ease',
                      }}
                    >
                      PLACE BID
                    </Button>
                  </Box>
                )}
              </CardContent>
            ) : (
              <CardContent>
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <GavelIcon sx={{ fontSize: 56, color: 'rgba(245,158,11,0.2)', mb: 2 }} />
                  <Typography variant="h5" sx={{ color: '#64748b', fontWeight: 600 }}>
                    {auction.status === 'COMPLETED'
                      ? 'Auction Completed'
                      : auction.status === 'PAUSED'
                      ? 'Auction Paused'
                      : 'Waiting for next player...'}
                  </Typography>
                  <Typography sx={{ color: '#475569', mt: 1, fontSize: '14px' }}>
                    {auction.status === 'PAUSED' ? 'Admin will resume shortly.' : ''}
                  </Typography>
                </Box>
              </CardContent>
            )}
          </Card>
        </Grid>

        {/* RIGHT: Activity Log */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box
            sx={{
              background: 'rgba(26,26,46,0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '20px',
              height: '100%',
              minHeight: 340,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 2,
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                Bid Activity
              </Typography>
              {log.length > 0 && (
                <Box
                  sx={{
                    background: 'rgba(245,158,11,0.15)',
                    borderRadius: '20px',
                    px: 1,
                    py: 0.15,
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#f59e0b',
                  }}
                >
                  {log.length}
                </Box>
              )}
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
              {log.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6, color: '#475569' }}>
                  <Typography sx={{ fontSize: '14px' }}>No activity yet</Typography>
                </Box>
              ) : (
                log.map(entry => {
                  const isSold = entry.type === 'sold';
                  const isUnsold = entry.type === 'unsold';
                  const isBid = entry.type === 'bid';
                  const borderColor = isSold ? '#4ade80' : isUnsold ? '#ef4444' : entry.teamColor || '#64748b';
                  return (
                    <Box
                      key={entry.id}
                      sx={{
                        borderLeft: `3px solid ${borderColor}`,
                        pl: 1.5,
                        py: 1,
                        mb: 0.75,
                        borderRadius: '0 8px 8px 0',
                        background: isSold
                          ? 'rgba(74,222,128,0.06)'
                          : isUnsold
                          ? 'rgba(239,68,68,0.06)'
                          : isBid
                          ? `${entry.teamColor ? entry.teamColor + '0a' : 'rgba(255,255,255,0.03)'}`
                          : 'rgba(255,255,255,0.02)',
                        animation: 'slideInRight 0.3s ease',
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '13px',
                          fontWeight: isSold || isUnsold ? 700 : 500,
                          color: isSold ? '#4ade80' : isUnsold ? '#ef4444' : '#cbd5e1',
                          lineHeight: 1.3,
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
        </Grid>
      </Grid>

      {/* Team Purses */}
      {teamPurses.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography
            sx={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#64748b',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              mb: 2,
            }}
          >
            Team Purses
          </Typography>
          <Grid container spacing={2}>
            {teamPurses.map(tp => {
              const remaining = tp.budget - tp.budgetSpent;
              const pct = tp.budget > 0 ? Math.min((tp.budgetSpent / tp.budget) * 100, 100) : 0;
              const tc = tp.teamColor || '#888';
              return (
                <Grid key={tp.teamId} size={{ xs: 6, sm: 4, md: 2 }}>
                  <Box
                    sx={{
                      background: 'rgba(26,26,46,0.8)',
                      backdropFilter: 'blur(8px)',
                      border: `1px solid ${tc}30`,
                      borderRadius: '14px',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${tc}30` },
                    }}
                  >
                    {/* Color header */}
                    <Box
                      sx={{
                        background: `linear-gradient(135deg, ${tc} 0%, ${tc}88 100%)`,
                        px: 1.5,
                        py: 0.9,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '12px',
                          fontWeight: 800,
                          color: '#fff',
                          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                        }}
                        noWrap
                        title={tp.teamName}
                      >
                        {tp.teamName}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                        <AccountBalanceWalletIcon sx={{ fontSize: 12, color: tc }} />
                        <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#e2e8f0' }}>
                          ₹{(remaining / 100000).toFixed(1)}L
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: '10px', color: '#64748b', mb: 0.75 }}>
                        Spent ₹{(tp.budgetSpent / 100000).toFixed(1)}L
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          bgcolor: 'rgba(255,255,255,0.06)',
                          '& .MuiLinearProgress-bar': {
                            background: pct > 85
                              ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                              : `linear-gradient(90deg, ${tc}, ${tc}cc)`,
                            borderRadius: 2,
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
      )}
    </Box>
  );
}
