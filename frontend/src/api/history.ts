import api from './client';
import type { ApiResponse, TeamStanding } from '../types';

export const getStandings = (leagueId: number) =>
  api.get<ApiResponse<TeamStanding[]>>(`/leagues/${leagueId}/standings`).then(r => r.data.data);
