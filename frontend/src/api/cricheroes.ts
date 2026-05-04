import api from './client';
import type { ApiResponse } from '../types';

export interface ImportProgress {
  jobId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  currentStep: string | null;
  teamsTotal: number;
  teamsDone: number;
  playersTotal: number;
  playersDone: number;
  matchesTotal: number;
  matchesDone: number;
  matchesSkipped: number;
  leagueId: number | null;
  errorMessage: string | null;
  warnings: string[];
  startedAt: string;
  finishedAt: string | null;
}

export const importTournament = (tournamentUrl: string, leagueId?: number) =>
  api.post<ApiResponse<{ jobId: string }>>('/cricheroes/import/tournament', { tournamentUrl, leagueId })
    .then(r => r.data.data);

export const getImportProgress = (jobId: string) =>
  api.get<ApiResponse<ImportProgress>>(`/cricheroes/import/${jobId}`).then(r => r.data.data);

export const importTeam = (cricheroesTeamId: number, leagueId: number) =>
  api.post<ApiResponse<{ teamId: number; name: string }>>('/cricheroes/import/team',
    { cricheroesTeamId, leagueId }).then(r => r.data.data);

export const importMatch = (cricheroesMatchId: number, leagueId: number, slug?: string, force = false) =>
  api.post<ApiResponse<{ matchId: number; cricheroesId: number }>>('/cricheroes/import/match',
    { cricheroesMatchId, leagueId, slug, force }).then(r => r.data.data);
