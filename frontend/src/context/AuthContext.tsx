import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserInfo } from '../types';
import { login as apiLogin, getMe, logout as apiLogout } from '../api/auth';

interface AuthState {
  user: UserInfo | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<UserInfo>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  isViewer: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/** A read-only spectator: can view the auction but cannot run or bid in it. */
export function isViewerPermissions(perms: string[] | undefined): boolean {
  if (!perms) return false;
  return perms.includes('auction:READ')
    && !perms.includes('league:CREATE')
    && !perms.includes('auction:BID')
    && !perms.includes('auction:START');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      getMe().then(setUser).catch(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await apiLogin({ username, password });
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    apiLogout();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const hasPermission = (permission: string) => user?.permissions?.includes(permission) ?? false;
  const isViewer = isViewerPermissions(user?.permissions);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, isViewer }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
