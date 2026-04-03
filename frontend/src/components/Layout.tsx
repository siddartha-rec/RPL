import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

const DRAWER_WIDTH = 248;
const TOPBAR_HEIGHT = 64;

export default function Layout() {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <TopBar />
      <Sidebar />

      {/* ── Main content area ────────────────────────────── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          ml: `${DRAWER_WIDTH}px`,
          mt: `${TOPBAR_HEIGHT}px`,
          p: { xs: 2.5, md: 3.5 },
          maxWidth: `calc(100vw - ${DRAWER_WIDTH}px)`,
          animation: 'fadeIn 0.35s ease forwards',

          /* subtle inner radial glow at top */
          '&::before': {
            content: '""',
            position: 'fixed',
            top: TOPBAR_HEIGHT,
            left: DRAWER_WIDTH,
            right: 0,
            height: 300,
            background:
              'radial-gradient(ellipse at 60% 0%, rgba(245,158,11,0.03) 0%, transparent 60%)',
            pointerEvents: 'none',
            zIndex: 0,
          },

          '& > *': {
            position: 'relative',
            zIndex: 1,
          },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
