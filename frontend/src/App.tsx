import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LeagueProvider } from './context/LeagueContext';
import theme from './theme';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';

// Route-level code splitting: each page ships in its own chunk so the
// initial bundle stays small and navigations load only what they need.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TeamsPage = lazy(() => import('./pages/TeamsPage'));
const TeamDetailPage = lazy(() => import('./pages/TeamDetailPage'));
const PlayersPage = lazy(() => import('./pages/PlayersPage'));
const AuctionPage = lazy(() => import('./pages/AuctionPage'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const TournamentsPage = lazy(() => import('./pages/TournamentsPage'));
const TournamentDetailPage = lazy(() => import('./pages/TournamentDetailPage'));
const LeagueDetailPage = lazy(() => import('./pages/LeagueDetailPage'));
const MatchDetailPage = lazy(() => import('./pages/MatchDetailPage'));
const ViewerPage = lazy(() => import('./pages/ViewerPage'));

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <LeagueProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
              <Route
                path="/viewer"
                element={
                  <ProtectedRoute permission="auction:READ">
                    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0b1220' }} />}>
                      <ViewerPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route element={<Layout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/tournaments" element={<TournamentsPage />} />
                <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
                <Route path="/tournaments/:tournamentId/leagues/:leagueId" element={<LeagueDetailPage />} />
                <Route path="/tournaments/:tournamentId/leagues/:leagueId/matches/:matchId" element={<MatchDetailPage />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/teams/:id" element={<TeamDetailPage />} />
                <Route path="/players" element={<PlayersPage />} />
                <Route path="/auction" element={<AuctionPage />} />
                <Route path="/results" element={<ResultsPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route
                  path="/admin/audit"
                  element={
                    <ProtectedRoute permission="league:CREATE">
                      <AuditLogsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute permission="league:CREATE">
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
              </Route>
              </Route>
            </Routes>
            </LeagueProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
