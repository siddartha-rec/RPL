import api from './client';
import type { ApiResponse, Tournament, League } from '../types';

export const getTournaments = () =>
  api.get<ApiResponse<Tournament[]>>('/tournaments').then(r => r.data.data);

export const getTournament = (id: number) =>
  api.get<ApiResponse<Tournament>>(`/tournaments/${id}`).then(r => r.data.data);

export const getTournamentLeagues = (id: number) =>
  api.get<ApiResponse<League[]>>(`/tournaments/${id}/leagues`).then(r => r.data.data);

export const createTournament = (data: Partial<Tournament>) =>
  api.post<ApiResponse<Tournament>>('/tournaments', data).then(r => r.data.data);

export const updateTournament = (id: number, data: Partial<Tournament>) =>
  api.put<ApiResponse<Tournament>>(`/tournaments/${id}`, data).then(r => r.data.data);

export const archiveTournament = (id: number) =>
  api.delete(`/tournaments/${id}`);

export const assignLeagueToTournament = (tournamentId: number, leagueId: number) =>
  api.put(`/tournaments/${tournamentId}/leagues/${leagueId}`);
