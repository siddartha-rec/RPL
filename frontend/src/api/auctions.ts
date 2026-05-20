import api from './client';
import type { ApiResponse, Auction, CompletionCheck } from '../types';

export const createAuction = (leagueId: number) => api.post<ApiResponse<Auction>>(`/leagues/${leagueId}/auctions`).then(r => r.data.data);
export const getAuction = (id: number) => api.get<ApiResponse<Auction>>(`/auctions/${id}`).then(r => r.data.data);
export const getAuctionByLeague = (leagueId: number) =>
  api.get<ApiResponse<Auction>>(`/leagues/${leagueId}/auction`).then(r => r.data.data);
export const startAuction = (id: number) => api.put<ApiResponse<Auction>>(`/auctions/${id}/start`).then(r => r.data.data);
export const advanceToLive = (id: number) => api.put<ApiResponse<Auction>>(`/auctions/${id}/advance-to-live`).then(r => r.data.data);
export const putUpPlayer = (id: number, playerId: number) => api.put<ApiResponse<Auction>>(`/auctions/${id}/next-player/${playerId}`).then(r => r.data.data);
export const placeBid = (id: number, teamId: number) => api.post(`/auctions/${id}/bid`, { teamId }).then(r => r.data.data);
export const soldPlayer = (id: number) => api.put<ApiResponse<Auction>>(`/auctions/${id}/sold`).then(r => r.data.data);
export const markUnsold = (id: number) => api.put<ApiResponse<Auction>>(`/auctions/${id}/unsold`).then(r => r.data.data);
export const undoBid = (id: number) => api.put<ApiResponse<Auction>>(`/auctions/${id}/undo-bid`).then(r => r.data.data);
export const pauseAuction = (id: number) => api.put<ApiResponse<Auction>>(`/auctions/${id}/pause`).then(r => r.data.data);
export const resumeAuction = (id: number) => api.put<ApiResponse<Auction>>(`/auctions/${id}/resume`).then(r => r.data.data);
export const switchToDraft = (id: number) => api.put<ApiResponse<Auction>>(`/auctions/${id}/switch-to-draft`).then(r => r.data.data);
export interface RetentionPickOpts { teamId?: number; price?: number; }
export const retentionPick = (id: number, playerId: number, opts: RetentionPickOpts = {}) =>
  api.post(`/auctions/${id}/retention/pick`, { playerId, ...opts }).then(r => r.data.data);
export const draftPick = (id: number, playerId: number) => api.post(`/auctions/${id}/draft/pick`, { playerId }).then(r => r.data.data);
export const completeAuction = (id: number, force = false) =>
  api.put<ApiResponse<Auction>>(`/auctions/${id}/complete${force ? '?force=true' : ''}`).then(r => r.data.data);
export const getCompletionCheck = (id: number) =>
  api.get<ApiResponse<CompletionCheck>>(`/auctions/${id}/completion-check`).then(r => r.data.data);
