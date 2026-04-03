import { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLeagues } from '../api/leagues';
import type { League } from '../types';

interface LeagueState {
  activeLeague: League | null;
  leagues: League[];
  loading: boolean;
}

const LeagueContext = createContext<LeagueState>({ activeLeague: null, leagues: [], loading: true });

export function LeagueProvider({ children }: { children: ReactNode }) {
  const { data: leagues, isLoading } = useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: getLeagues,
  });

  const sorted = leagues?.slice().sort((a, b) => {
    // Prefer ACTIVE > SETUP > COMPLETED
    const order: Record<string, number> = { ACTIVE: 0, SETUP: 1, COMPLETED: 2 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  }) ?? [];

  const activeLeague = sorted[0] ?? null;

  return (
    <LeagueContext.Provider value={{ activeLeague, leagues: sorted, loading: isLoading }}>
      {children}
    </LeagueContext.Provider>
  );
}

export const useLeague = () => useContext(LeagueContext);
