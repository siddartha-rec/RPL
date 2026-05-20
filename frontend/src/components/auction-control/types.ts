import type { Auction, League, Team, Player } from '../../types';

export type AuctionPhase = 'retention' | 'main' | 'complete';

export interface PhaseDerivation {
  phase: AuctionPhase;
  stepIndex: 0 | 1 | 2;
  isRetention: boolean;
  isMain: boolean;
  isComplete: boolean;
}

export function derivePhase(status: string | undefined): PhaseDerivation {
  if (status === 'COMPLETED') {
    return { phase: 'complete', stepIndex: 2, isRetention: false, isMain: false, isComplete: true };
  }
  if (status === 'LIVE' || status === 'PAUSED' || status === 'DRAFT') {
    return { phase: 'main', stepIndex: 1, isRetention: false, isMain: true, isComplete: false };
  }
  return { phase: 'retention', stepIndex: 0, isRetention: true, isMain: false, isComplete: false };
}

export interface AuctionControlContext {
  auction: Auction | null;
  league: League;
  teams: Team[];
  availablePlayers: Player[];
  retainedPlayers: Player[];
  refetch: () => void;
}
