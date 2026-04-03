import api from './client';
import type { ApiResponse, League } from '../types';

export const getLeagues = () => api.get<ApiResponse<League[]>>('/leagues').then(r => r.data.data);
export const getLeague = (id: number) => api.get<ApiResponse<League>>(`/leagues/${id}`).then(r => r.data.data);
export const createLeague = (data: Partial<League>) => api.post<ApiResponse<League>>('/leagues', data).then(r => r.data.data);
export const updateLeague = (id: number, data: Partial<League>) => api.put<ApiResponse<League>>(`/leagues/${id}`, data).then(r => r.data.data);
export const deleteLeague = (id: number) => api.delete(`/leagues/${id}`);
