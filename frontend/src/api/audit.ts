import api from './client';
import type { ApiResponse, PageResponse } from '../types';

export interface AuditLog {
  id: number;
  userId?: number;
  username?: string;
  action: string;
  entityType?: string;
  entityId?: number;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export const getAuditLogs = (params: { page?: number; size?: number; entityType?: string }) =>
  api.get<ApiResponse<PageResponse<AuditLog>>>('/audit-logs', { params }).then(r => r.data.data);
