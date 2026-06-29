import { Box, CircularProgress, useMediaQuery, useTheme } from '@mui/material';
import { Suspense, useState, type ReactNode } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';
import GreetingHeader from './GreetingHeader';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 240;

export default function Layout() {
  const { isViewer } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleDrawer = () => setMobileOpen((o) => !o);
  const closeDrawer = () => setMobileOpen(false);
  const [headerRight, setHeaderRight] = useState<ReactNode>(null);
  const [mainBg, setMainBg] = useState<string | null>(null);

  // Viewers get the chrome-free spectator screen, never the admin shell.
  if (isViewer) return <Navigate to="/viewer" replace />;

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        position: 'relative',

        /* Single full-viewport background spanning sidebar + main */
        backgroundImage: 'url(/bg.png)',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',

        /* Light haze for readability — keep bg punchy */
        '&::before': {
          content: '""',
          position: 'fixed',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.45) 60%, rgba(255,255,255,0.55) 100%)',
          pointerEvents: 'none',
          zIndex: 0,
        },
      }}
    >
      {!isMobile && <TopBar isMobile={isMobile} onMenuClick={toggleDrawer} />}
      <Sidebar isMobile={isMobile} mobileOpen={mobileOpen} onMobileClose={closeDrawer} />
      <GreetingHeader isMobile={isMobile} onMenuClick={toggleDrawer} />

      {/* ── Main content tile ────────────────────────────── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: '84px',
          mr: '12px',
          mb: '12px',
          ml: { xs: '12px', md: 0 },
          height: 'calc(100vh - 96px)',
          /* Glass shell is STATIC (no scroll here) so backdrop-filter
             computes once instead of every scroll frame. */
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
          background: mainBg
            ? `linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.85) 60%, rgba(255,255,255,0.92) 100%), url(${mainBg}) center/cover no-repeat, rgba(255,255,255,0.7)`
            : 'rgba(255,255,255,0.9)',
          border: '1px solid rgba(15,23,42,0.06)',
          borderRadius: '16px',
          boxShadow: '0 6px 24px rgba(15,23,42,0.06)',
          animation: 'fadeIn 0.35s ease forwards',
        }}
      >
        {/* Scroll viewport — no filter, GPU-isolated so scrolling is a
            cheap composited layer move, not a repaint of the blurred shell. */}
        <Box
          sx={{
            height: '100%',
            overflow: 'auto',
            py: { xs: 2, md: 2.5 },
            px: { xs: 2, md: 3 },
            position: 'relative',
            zIndex: 1,
            transform: 'translateZ(0)',
            contain: 'paint',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <Breadcrumbs rightSlot={headerRight} />
          <Suspense
            fallback={
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress sx={{ color: '#a78bfa' }} />
              </Box>
            }
          >
            <Outlet context={{ setHeaderRight, setMainBg }} />
          </Suspense>
        </Box>
      </Box>
    </Box>
  );
}

export { DRAWER_WIDTH };
