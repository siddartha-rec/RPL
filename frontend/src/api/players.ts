import api from './client';
import type { ApiResponse, Player, PlayerHistory, PageResponse } from '../types';

export const getPlayers = (leagueId: number, params?: { category?: string; status?: string; teamId?: number }) =>
  api.get<ApiResponse<Player[]>>(`/leagues/${leagueId}/players`, { params }).then(r => r.data.data);
export const getPlayer = (id: number) => api.get<ApiResponse<Player>>(`/players/${id}`).then(r => r.data.data);
export const getPlayerHistory = (playerId: number) => api.get<ApiResponse<PlayerHistory[]>>(`/players/${playerId}/history`).then(r => r.data.data);
export const importPlayers = (leagueId: number, players: Partial<Player>[]) =>
  api.post<ApiResponse<Player[]>>(`/leagues/${leagueId}/players/import`, { players }).then(r => r.data.data);
export const getPlayersPaginated = (
  leagueId: number,
  params: { page?: number; size?: number; category?: string; status?: string; teamId?: number; search?: string }
) =>
  api.get<ApiResponse<PageResponse<Player>>>(`/leagues/${leagueId}/players/page`, { params }).then(r => r.data.data);
