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
