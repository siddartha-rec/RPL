export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: FieldError[];
  timestamp: string;
}

export interface FieldError { field: string; message: string; }

export interface LoginRequest { username: string; password: string; }

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserInfo;
}

export interface UserInfo {
  id: number;
  username: string;
  displayName: string;
  permissions: string[];
}

export interface League {
  id: number; name: string; season: string; status: string;
  teamBudget: number; maxPlayersPerTeam: number; maxRetentionsPerTeam: number;
  retentionCost: number; bidIncrement: number; timerSeconds: number;
  createdAt: string; updatedAt: string;
}

export interface Team {
  id: number; name: string; shortName: string; color: string;
  logoUrl?: string; captainId?: number; captainName?: string;
  ownerId?: number; ownerName?: string; leagueId: number;
  budget: number; budgetSpent: number; playerCount?: number; createdAt: string;
}

export interface Player {
  id: number; name: string; playerNumber?: number;
  category: 'CRICKET' | 'OTHER'; role?: string; basePrice: number;
  teamId?: number; teamName?: string; teamColor?: string;
  leagueId: number; status: 'AVAILABLE' | 'RETAINED' | 'SOLD' | 'UNSOLD';
  isCaptain: boolean; createdAt: string;
}

export interface Auction {
  id: number; leagueId: number; status: string;
  currentPlayerId?: number; currentPlayerName?: string;
  currentBasePrice?: number; currentHighestBid?: number;
  currentHighestBidTeam?: string; timerSeconds: number;
  currentPickTeamId?: number; currentPickTeamName?: string; createdAt: string;
}

export interface AuctionEvent { type: string; data: Record<string, unknown>; }

export interface PlayerHistory {
  id: number; playerId: number; leagueId: number; leagueName: string;
  teamId: number; teamName: string; acquisitionType: string;
  soldPrice?: number; createdAt: string;
}

export interface TeamStanding {
  id: number; teamId: number; teamName: string; leagueId: number;
  rank: number; points?: number; notes?: string;
}
