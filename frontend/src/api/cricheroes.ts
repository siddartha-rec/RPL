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

export interface TournamentImportCheck {
  exists: boolean;
  cricheroesId: number;
  leagueId?: number;
  leagueName?: string;
  season?: string;
  seasonDisplayName?: string;
}

export const checkTournamentImport = (tournamentUrl: string) =>
  api.get<ApiResponse<TournamentImportCheck>>('/cricheroes/import/tournament/check', { params: { tournamentUrl } })
    .then(r => r.data.data);

export const importTournament = (
  tournamentUrl: string,
  leagueId?: number,
  seasonDisplayName?: string,
  overrideExisting = false,
) =>
  api.post<ApiResponse<{ jobId: string }>>('/cricheroes/import/tournament',
    { tournamentUrl, leagueId, seasonDisplayName, overrideExisting })
    .then(r => r.data.data);

export const getImportProgress = (jobId: string) =>
  api.get<ApiResponse<ImportProgress>>(`/cricheroes/import/${jobId}`).then(r => r.data.data);

export const importTeam = (cricheroesTeamId: number, leagueId: number) =>
  api.post<ApiResponse<{ teamId: number; name: string }>>('/cricheroes/import/team',
    { cricheroesTeamId, leagueId }).then(r => r.data.data);

export const importMatch = (
  cricheroesMatchId: number,
  leagueId: number,
  tournamentSlug?: string,
  matchSlug?: string,
  force = false,
) =>
  api.post<ApiResponse<{ matchId: number; cricheroesId: number }>>('/cricheroes/import/match',
    { cricheroesMatchId, leagueId, tournamentSlug, matchSlug, force }).then(r => r.data.data);
