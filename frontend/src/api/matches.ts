import api from './client';
import type { ApiResponse } from '../types';

export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'ABANDONED';

export interface MatchSummary {
  id: number;
  cricheroesId?: number;
  leagueId: number;
  status: MatchStatus;
  venue?: string;
  format?: string;
  overs?: number;
  scheduledAt?: string;
  resultText?: string;

  teamAId: number;
  teamAName: string;
  teamAShortName?: string;
  teamALogoUrl?: string;
  teamAScore?: string;
  teamARuns?: number;
  teamAWickets?: number;
  teamAOvers?: number;

  teamBId: number;
  teamBName: string;
  teamBShortName?: string;
  teamBLogoUrl?: string;
  teamBScore?: string;
  teamBRuns?: number;
  teamBWickets?: number;
  teamBOvers?: number;

  winnerTeamId?: number;
  winnerTeamName?: string;
}

export const getLeagueMatches = (leagueId: number, status?: MatchStatus) => {
  const params = status ? `?status=${status}` : '';
  return api.get<ApiResponse<MatchSummary[]>>(`/leagues/${leagueId}/matches${params}`).then(r => r.data.data);
};

export interface BattingRow {
  playerId: number;
  playerName: string;
  position?: number;
  runs?: number;
  balls?: number;
  fours?: number;
  sixes?: number;
  strikeRate?: number;
  dismissalText?: string;
}

export interface BowlingRow {
  playerId: number;
  playerName: string;
  overs?: number;
  maidens?: number;
  runs?: number;
  wickets?: number;
  economy?: number;
}

export interface InningsDetail {
  id: number;
  inningsNumber: number;
  battingTeamId: number;
  battingTeamName: string;
  battingTeamShortName?: string;
  bowlingTeamId: number;
  bowlingTeamName: string;
  bowlingTeamShortName?: string;
  totalRuns: number;
  wickets: number;
  overs?: number;
  extras: number;
  batting: BattingRow[];
  bowling: BowlingRow[];
}

export interface MatchDetail {
  id: number;
  cricheroesId?: number;
  leagueId: number;
  leagueName: string;
  status: MatchStatus;
  venue?: string;
  format?: string;
  overs?: number;
  scheduledAt?: string;
  resultText?: string;
  teamAId: number;
  teamAName: string;
  teamAShortName?: string;
  teamALogoUrl?: string;
  teamBId: number;
  teamBName: string;
  teamBShortName?: string;
  teamBLogoUrl?: string;
  winnerTeamId?: number;
  winnerTeamName?: string;
  innings: InningsDetail[];
}

export const getMatchDetail = (matchId: number) =>
  api.get<ApiResponse<MatchDetail>>(`/matches/${matchId}`).then(r => r.data.data);
