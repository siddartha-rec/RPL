import api from './client';
import type { ApiResponse, LoginRequest, LoginResponse, UserInfo } from '../types';

export const login = (data: LoginRequest) =>
  api.post<ApiResponse<LoginResponse>>('/auth/login', data).then(r => r.data.data);

export const getMe = () =>
  api.get<ApiResponse<UserInfo>>('/auth/me').then(r => r.data.data);

export const logout = () => api.post('/auth/logout').catch(() => {});
