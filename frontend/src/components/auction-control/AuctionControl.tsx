import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Alert, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import GavelIcon from '@mui/icons-material/Gavel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { getLeagues } from '../../api/leagues';
import { getTeams } from '../../api/teams';
import { getPlayers } from '../../api/players';
import {
  getAuctionByLeague, createAuction, startAuction, advanceToLive,
  pauseAuction, resumeAuction, completeAuction,
} from '../../api/auctions';
import type { League, Team, Player, Auction } from '../../types';
import { derivePhase, type AuctionControlContext } from './types';
import AuctionStepper from './AuctionStepper';
import PhaseHeaderCard, { type PhaseAction } from './PhaseHeaderCard';
import RetentionPanel from './RetentionPanel';
import MainAuctionPanel from './MainAuctionPanel';
import CompletePanel from './CompletePanel';

interface AuctionControlProps {
  selectedLeagueId: number | null;
}

export default function AuctionControl({ selectedLeagueId }: AuctionControlProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data: leagues } = useQuery<League[]>({ queryKey: ['leagues'], queryFn: getLeagues });
  const league = leagues?.find(l => l.id === selectedLeagueId) ?? null;

  const { data: auction, isLoading: auctionLoading, refetch } = useQuery<Auction | null>({
    queryKey: ['auction-by-league', league?.id],
    queryFn: () => getAuctionByLeague(league!.id).catch(() => null),
    enabled: !!league,
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['teams', league?.id],
    queryFn: () => getTeams(league!.id),
    enabled: !!league,
  });

  const { data: allPlayers = [] } = useQuery<Player[]>({
    queryKey: ['players', league?.id],
    queryFn: () => getPlayers(league!.id),
    enabled: !!league,
  });

  const phase = derivePhase(auction?.status);

  const retainedPlayers = useMemo(() => allPlayers.filter(p => p.status === 'RETAINED'), [allPlayers]);
  const availablePlayers = useMemo(() => allPlayers.filter(p => p.status !== 'RETAINED'), [allPlayers]);

  const ctx: AuctionControlContext | null = league && {
    auction: auction ?? null,
    league,
    teams,
    availablePlayers,
    retainedPlayers,
    refetch,
  };

  useEffect(() => {
    setActionError(null);
    setActionSuccess(null);
  }, [selectedLeagueId]);

  const lifecycleMut = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: (_d, _v, _ctx) => {
      refetch();
      qc.invalidateQueries({ queryKey: ['auction-by-league'] });
      qc.invalidateQueries({ queryKey: ['players'] });
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setActionError(e?.response?.data?.message ?? 'Action failed'),
  });

  function runAction(label: string, fn: () => Promise<unknown>) {
    setActionError(null);
    setActionSuccess(null);
    lifecycleMut.mutate(fn, {
      onSuccess: () => setActionSuccess(`${label} ✓`),
    });
  }

  if (!league) {
    return (
      <Alert severity="info" sx={{ borderRadius: '12px' }}>
        Select a season from the picker to manage its auction.
      </Alert>
    );
  }

  if (auctionLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: '#b45309' }} /></Box>;
  }

  // No auction record yet
  if (!auction) {
    return (
      <Box>
        {actionError && <Alert severity="error" onClose={() => setActionError(null)} sx={{ borderRadius: '12px', mb: 2 }}>{actionError}</Alert>}
        {actionSuccess && <Alert severity="success" onClose={() => setActionSuccess(null)} sx={{ borderRadius: '12px', mb: 2 }}>{actionSuccess}</Alert>}
        <PhaseHeaderCard
          icon={<AddIcon />}
          label="NO AUCTION YET"
          title="Create the auction for this season"
          subtitle={`${league.name} — auction record will be initialised in SETUP status.`}
          tone="neutral"
          actions={[
            {
              label: 'Create Auction',
              icon: <AddIcon />,
              variant: 'primary',
              onClick: () => runAction('Auction created', () => createAuction(league.id)),
              disabled: lifecycleMut.isPending,
            },
          ]}
        />
      </Box>
    );
  }

  const headerByPhase = (): { icon: ReactElement; label: string; title: string; subtitle: string; tone: 'neutral' | 'blue' | 'live' | 'success'; actions: PhaseAction[] } => {
    if (auction.status === 'SETUP') {
      return {
        icon: <PlayArrowIcon />,
        label: 'PHASE 1 OF 2 · SETUP',
        title: 'Retention Auction',
        subtitle: 'Click Start Retention to open manual retention entry.',
        tone: 'blue',
        actions: [{
          label: 'Start Retention',
          icon: <PlayArrowIcon />,
          variant: 'primary',
          onClick: () => runAction('Retention started', () => startAuction(auction.id)),
          disabled: lifecycleMut.isPending,
        }],
      };
    }
    if (auction.status === 'RETENTION') {
      return {
        icon: <CheckCircleIcon />,
        label: 'PHASE 1 OF 2 · OPEN',
        title: 'Retention Auction · Manual bid entry',
        subtitle: 'Enter retained players + retention price per team. Lock when done.',
        tone: 'blue',
        actions: [{
          label: 'Lock & Advance to Main →',
          variant: 'primary',
          onClick: () => runAction('Advanced to main', () => advanceToLive(auction.id)),
          disabled: lifecycleMut.isPending,
        }],
      };
    }
    if (auction.status === 'LIVE' || auction.status === 'DRAFT') {
      return {
        icon: <GavelIcon />,
        label: `PHASE 2 OF 2 · ${auction.status}`,
        title: 'Main Auction',
        subtitle: 'Bidding underway on Live Auction page.',
        tone: 'live',
        actions: [
          {
            label: 'Open Live Auction →',
            variant: 'primary',
            onClick: () => navigate('/auction'),
          },
          {
            label: 'Pause',
            icon: <PauseIcon />,
            variant: 'secondary',
            onClick: () => runAction('Paused', () => pauseAuction(auction.id)),
            disabled: lifecycleMut.isPending,
          },
          {
            label: 'Complete Auction',
            variant: 'danger',
            onClick: () => {
              if (window.confirm('Complete this auction? This is final.')) {
                runAction('Completed', () => completeAuction(auction.id));
              }
            },
            disabled: lifecycleMut.isPending,
          },
        ],
      };
    }
    if (auction.status === 'PAUSED') {
      return {
        icon: <PauseIcon />,
        label: 'PHASE 2 OF 2 · PAUSED',
        title: 'Main Auction · Paused',
        subtitle: 'Resume to continue bidding.',
        tone: 'neutral',
        actions: [
          {
            label: 'Resume',
            icon: <PlayArrowIcon />,
            variant: 'primary',
            onClick: () => runAction('Resumed', () => resumeAuction(auction.id)),
            disabled: lifecycleMut.isPending,
          },
          {
            label: 'Complete Auction',
            variant: 'danger',
            onClick: () => {
              if (window.confirm('Complete this auction? This is final.')) {
                runAction('Completed', () => completeAuction(auction.id));
              }
            },
            disabled: lifecycleMut.isPending,
          },
        ],
      };
    }
    // COMPLETED
    return {
      icon: <CheckCircleIcon />,
      label: 'DONE',
      title: 'Auction Completed',
      subtitle: 'View team rosters and results.',
      tone: 'success',
      actions: [{
        label: 'View Results →',
        variant: 'primary',
        onClick: () => navigate('/results'),
      }],
    };
  };

  const header = headerByPhase();

  return (
    <Box>
      {actionError && <Alert severity="error" onClose={() => setActionError(null)} sx={{ borderRadius: '12px', mb: 2 }}>{actionError}</Alert>}
      {actionSuccess && <Alert severity="success" onClose={() => setActionSuccess(null)} sx={{ borderRadius: '12px', mb: 2 }}>{actionSuccess}</Alert>}

      <AuctionStepper
        phase={phase}
        retentionCount={retainedPlayers.length}
        retentionTotal={teams.length * league.maxRetentionsPerTeam}
        mainSoldCount={availablePlayers.filter(p => p.status === 'SOLD').length}
      />

      <PhaseHeaderCard
        icon={header.icon}
        label={header.label}
        title={header.title}
        subtitle={header.subtitle}
        tone={header.tone}
        actions={header.actions}
      />

      {ctx && phase.isRetention && auction.status !== 'SETUP' && <RetentionPanel ctx={ctx} />}
      {ctx && phase.isMain && <MainAuctionPanel ctx={ctx} />}
      {ctx && phase.isComplete && <CompletePanel ctx={ctx} />}
    </Box>
  );
}
