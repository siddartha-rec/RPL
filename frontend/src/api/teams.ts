import api from './client';
import type { ApiResponse, Team } from '../types';

export const getTeams = (leagueId: number) => api.get<ApiResponse<Team[]>>(`/leagues/${leagueId}/teams`).then(r => r.data.data);
export const getTeam = (id: number) => api.get<ApiResponse<Team>>(`/teams/${id}`).then(r => r.data.data);
export const createTeam = (leagueId: number, data: Partial<Team>) => api.post<ApiResponse<Team>>(`/leagues/${leagueId}/teams`, data).then(r => r.data.data);
export const updateTeam = (id: number, data: Partial<Team>) => api.put<ApiResponse<Team>>(`/teams/${id}`, data).then(r => r.data.data);
export const deleteTeam = (id: number) => api.delete(`/teams/${id}`);
