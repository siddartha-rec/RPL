import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Grid from '@mui/material/Grid2';
import {
  Box, Typography, Chip, CircularProgress, Alert, Card, CardContent,
  LinearProgress, Paper, List, ListItem, ListItemText, Button, Divider,
} from '@mui/material';
import { getAuction } from '../api/auctions';
import { getTeams } from '../api/teams';
import { getLeagues } from '../api/leagues';
import { useSse } from '../hooks/useSse';
import { useAuth } from '../context/AuthContext';
import type { Auction, Team, League, AuctionEvent } from '../types';

function auctionStatusColor(status: string): 'default' | 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'LIVE': return 'success';
    case 'PAUSED': return 'warning';
    case 'COMPLETED': return 'error';
    case 'RETENTION': return 'info';
    case 'DRAFT': return 'info';
    default: return 'default';
  }
}

function timerColor(seconds: number): string {
  if (seconds > 15) return '#4caf50';
  if (seconds > 5) return '#ff9800';
  return '#f44336';
}

interface BidEntry {
  id: number;
  text: string;
  timestamp: string;
}

interface TeamPurse {
  teamId: number;
  teamName: string;
  teamColor?: string;
  budget: number;
  budgetSpent: number;
}

export default function AuctionPage() {
  const { hasPermission } = useAuth();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [timer, setTimer] = useState(0);
  const [log, setLog] = useState<BidEntry[]>([]);
  const [teamPurses, setTeamPurses] = useState<TeamPurse[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);

  // Try auction id=1 as default
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

  // Initialise auction state from fetch
  useEffect(() => {
    if (fetchedAuction && !auction) {
      setAuction(fetchedAuction);
      setTimer(fetchedAuction.timerSeconds ?? 0);
    }
  }, [fetchedAuction, auction]);

  // Initialise team purses from teams data
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

  const addLog = useCallback((text: string) => {
    const id = ++logIdRef.current;
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [{ id, text, timestamp }, ...prev].slice(0, 100));
  }, []);

  const handleSseEvent = useCallback((event: AuctionEvent) => {
    const d = event.data;
    switch (event.type) {
      case 'PLAYER_UP': {
        const playerName = d.playerName as string ?? 'Unknown';
        const basePrice = d.basePrice as number ?? 0;
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
        addLog(`Player up: ${playerName} @ ₹${(basePrice / 100000).toFixed(1)}L`);
        break;
      }
      case 'BID_PLACED': {
        const bid = d.bid as number ?? 0;
        const teamName = d.teamName as string ?? 'Unknown';
        setAuction(prev => prev ? {
          ...prev,
          currentHighestBid: bid,
          currentHighestBidTeam: teamName,
          timerSeconds: d.timerSeconds as number ?? prev.timerSeconds,
        } : prev);
        setTimer(d.timerSeconds as number ?? timer);
        addLog(`Bid: ₹${(bid / 100000).toFixed(1)}L by ${teamName}`);
        break;
      }
      case 'PLAYER_SOLD': {
        const soldTo = d.teamName as string ?? 'Unknown';
        const soldPrice = d.soldPrice as number ?? 0;
        addLog(`SOLD: ${d.playerName as string ?? ''} to ${soldTo} for ₹${(soldPrice / 100000).toFixed(1)}L`);
        setAuction(prev => prev ? { ...prev, currentPlayerId: undefined, currentPlayerName: undefined } : prev);
        setTimer(0);
        break;
      }
      case 'PLAYER_UNSOLD': {
        addLog(`UNSOLD: ${d.playerName as string ?? ''}`);
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
        addLog('Auction paused');
        break;
      case 'AUCTION_RESUMED':
        setAuction(prev => prev ? { ...prev, status: 'LIVE' } : prev);
        addLog('Auction resumed');
        break;
      case 'AUCTION_COMPLETED':
        setAuction(prev => prev ? { ...prev, status: 'COMPLETED' } : prev);
        addLog('Auction completed');
        break;
      case 'TIMER_TICK': {
        const remaining = d.remaining as number ?? 0;
        setTimer(remaining);
        setAuction(prev => prev ? { ...prev, timerSeconds: remaining } : prev);
        break;
      }
    }
  }, [addLog, timer]);

  useSse(auction?.id ?? null, handleSseEvent);

  // Client-side timer countdown
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

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [log]);

  const league = leagues?.find(l => l.id === leagueId);
  const maxTimer = league?.timerSeconds ?? 30;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !auction) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>Live Auction</Typography>
        <Alert severity="info">No auction running. Create an auction in the Admin panel.</Alert>
      </Box>
    );
  }

  const currentColor = timerColor(timer);
  const timerProgress = maxTimer > 0 ? (timer / maxTimer) * 100 : 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Live Auction</Typography>
        <Chip label={auction.status} color={auctionStatusColor(auction.status)} />
        {league && <Typography variant="body2" color="text.secondary">{league.name}</Typography>}
      </Box>

      <Grid container spacing={3}>
        {/* Left: Current Player + Timer */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              {auction.currentPlayerName ? (
                <>
                  <Typography variant="h5" component="h3" sx={{ fontWeight: 700, mb: 1 }}>
                    {auction.currentPlayerName}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    Base Price: ₹{((auction.currentBasePrice ?? 0) / 100000).toFixed(1)}L
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Highest Bid</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      ₹{((auction.currentHighestBid ?? auction.currentBasePrice ?? 0) / 100000).toFixed(1)}L
                    </Typography>
                    {auction.currentHighestBidTeam && (
                      <Typography variant="body1" color="text.secondary">
                        {auction.currentHighestBidTeam}
                      </Typography>
                    )}
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">Time Remaining</Typography>
                      <Typography variant="body2" sx={{ color: currentColor, fontWeight: 700 }}>
                        {timer}s
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={timerProgress}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        '& .MuiLinearProgress-bar': { bgcolor: currentColor },
                        bgcolor: 'action.hover',
                      }}
                    />
                  </Box>
                  {hasPermission('auction:BID') && (
                    <Box sx={{ mt: 3 }}>
                      <Button variant="contained" color="primary" size="large" disabled={auction.status !== 'LIVE'}>
                        BID
                      </Button>
                    </Box>
                  )}
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="text.secondary">
                    {auction.status === 'COMPLETED'
                      ? 'Auction completed'
                      : auction.status === 'PAUSED'
                      ? 'Auction paused — waiting for next player'
                      : 'Waiting for next player...'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Activity Log */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ height: 320, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={700}>Activity</Typography>
            </Box>
            <Box
              ref={logRef}
              sx={{ flex: 1, overflowY: 'auto', px: 1 }}
            >
              <List dense disablePadding>
                {log.length === 0 && (
                  <ListItem>
                    <ListItemText primary="No activity yet" primaryTypographyProps={{ color: 'text.secondary' }} />
                  </ListItem>
                )}
                {log.map(entry => (
                  <ListItem key={entry.id} divider>
                    <ListItemText
                      primary={entry.text}
                      secondary={entry.timestamp}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Team Purses */}
      {teamPurses.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Team Purses</Typography>
          <Grid container spacing={2}>
            {teamPurses.map(tp => {
              const remaining = tp.budget - tp.budgetSpent;
              return (
                <Grid key={tp.teamId} size={{ xs: 6, sm: 4, md: 2 }}>
                  <Card sx={{ borderTop: `3px solid ${tp.teamColor || '#888'}` }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="body2" fontWeight={700} noWrap title={tp.teamName}>
                        {tp.teamName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Rem: ₹{(remaining / 100000).toFixed(1)}L
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Spent: ₹{(tp.budgetSpent / 100000).toFixed(1)}L
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
