import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';

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
          py: { xs: 2, md: 2.5 },
          px: { xs: 2, md: 3 },
          overflow: 'auto',
          position: 'relative',
          animation: 'fadeIn 0.35s ease forwards',

          /* Soft radial gradient blobs */
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 480,
            background:
              'radial-gradient(ellipse 55% 70% at 10% 0%, rgba(8,145,178,0.20) 0%, transparent 60%), radial-gradient(ellipse 55% 70% at 90% 0%, rgba(245,158,11,0.16) 0%, transparent 60%), radial-gradient(ellipse 40% 50% at 50% 100%, rgba(59,130,246,0.10) 0%, transparent 60%)',
            pointerEvents: 'none',
            zIndex: 0,
          },
        }}
      >
        {/* ── Cricket SVG decoration layer ────────────────── */}
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            zIndex: 0,
          }}
        >
          {/* Cricket bat — top right, tilted */}
          <Box
            component="svg"
            viewBox="0 0 100 220"
            sx={{
              position: 'absolute',
              top: -40,
              right: -50,
              width: 240,
              height: 520,
              transform: 'rotate(32deg)',
              opacity: 0.16,
            }}
          >
            <rect x="42" y="0" width="16" height="52" fill="#1e293b" rx="4" />
            <rect x="38" y="48" width="24" height="10" fill="#0f172a" rx="2" />
            <rect
              x="24"
              y="58"
              width="52"
              height="155"
              rx="12"
              fill="#0891b2"
            />
            <rect
              x="34"
              y="68"
              width="6"
              height="135"
              fill="#ffffff"
              opacity="0.4"
              rx="2"
            />
          </Box>

          {/* Cricket ball — large, mid-left */}
          <Box
            component="svg"
            viewBox="0 0 100 100"
            sx={{
              position: 'absolute',
              top: 220,
              left: -60,
              width: 200,
              height: 200,
              opacity: 0.13,
            }}
          >
            <circle cx="50" cy="50" r="46" fill="#b91c1c" />
            <path
              d="M 6 50 Q 50 22 94 50"
              stroke="#fef3c7"
              strokeWidth="2"
              fill="none"
              strokeDasharray="3 3"
            />
            <path
              d="M 6 50 Q 50 78 94 50"
              stroke="#fef3c7"
              strokeWidth="2"
              fill="none"
              strokeDasharray="3 3"
            />
          </Box>

          {/* Wickets/stumps — bottom right area */}
          <Box
            component="svg"
            viewBox="0 0 100 120"
            sx={{
              position: 'absolute',
              top: 380,
              right: '8%',
              width: 160,
              height: 200,
              opacity: 0.13,
            }}
          >
            <rect x="20" y="15" width="5" height="100" fill="#92400e" rx="2" />
            <rect
              x="47.5"
              y="15"
              width="5"
              height="100"
              fill="#92400e"
              rx="2"
            />
            <rect x="75" y="15" width="5" height="100" fill="#92400e" rx="2" />
            <rect x="14" y="10" width="17" height="5" fill="#d97706" rx="1" />
            <rect
              x="41.5"
              y="10"
              width="17"
              height="5"
              fill="#d97706"
              rx="1"
            />
            <rect x="69" y="10" width="17" height="5" fill="#d97706" rx="1" />
          </Box>

          {/* Small accent ball — top center-left */}
          <Box
            component="svg"
            viewBox="0 0 100 100"
            sx={{
              position: 'absolute',
              top: 60,
              left: '38%',
              width: 64,
              height: 64,
              opacity: 0.16,
            }}
          >
            <circle cx="50" cy="50" r="46" fill="#0891b2" />
            <path
              d="M 6 50 Q 50 22 94 50"
              stroke="#ffffff"
              strokeWidth="3"
              fill="none"
              strokeDasharray="3 3"
            />
            <path
              d="M 6 50 Q 50 78 94 50"
              stroke="#ffffff"
              strokeWidth="3"
              fill="none"
              strokeDasharray="3 3"
            />
          </Box>

          {/* Trophy silhouette — mid-page left */}
          <Box
            component="svg"
            viewBox="0 0 64 64"
            sx={{
              position: 'absolute',
              top: 540,
              left: '12%',
              width: 110,
              height: 110,
              opacity: 0.13,
            }}
          >
            <path
              d="M16 4h32v8c0 6-3 11-7 13v8h6v6h-22v-6h6v-8c-4-2-7-7-7-13v-8z"
              fill="#d97706"
            />
            <rect x="20" y="46" width="24" height="6" fill="#92400e" rx="2" />
            <rect x="14" y="52" width="36" height="6" fill="#92400e" rx="2" />
          </Box>

          {/* ── Lower-page motifs ────────────────────── */}
          {/* Second cricket bat — mid-right, opposite tilt */}
          <Box
            component="svg"
            viewBox="0 0 100 220"
            sx={{
              position: 'absolute',
              top: 900,
              left: -40,
              width: 200,
              height: 440,
              transform: 'rotate(-28deg)',
              opacity: 0.14,
            }}
          >
            <rect x="42" y="0" width="16" height="52" fill="#1e293b" rx="4" />
            <rect x="38" y="48" width="24" height="10" fill="#0f172a" rx="2" />
            <rect
              x="24"
              y="58"
              width="52"
              height="155"
              rx="12"
              fill="#f59e0b"
            />
            <rect
              x="34"
              y="68"
              width="6"
              height="135"
              fill="#ffffff"
              opacity="0.4"
              rx="2"
            />
          </Box>

          {/* Big ball — mid-page right */}
          <Box
            component="svg"
            viewBox="0 0 100 100"
            sx={{
              position: 'absolute',
              top: 1100,
              right: -50,
              width: 220,
              height: 220,
              opacity: 0.13,
            }}
          >
            <circle cx="50" cy="50" r="46" fill="#0891b2" />
            <path
              d="M 6 50 Q 50 22 94 50"
              stroke="#ffffff"
              strokeWidth="2"
              fill="none"
              strokeDasharray="3 3"
            />
            <path
              d="M 6 50 Q 50 78 94 50"
              stroke="#ffffff"
              strokeWidth="2"
              fill="none"
              strokeDasharray="3 3"
            />
          </Box>

          {/* Wickets — lower middle */}
          <Box
            component="svg"
            viewBox="0 0 100 120"
            sx={{
              position: 'absolute',
              top: 1500,
              left: '40%',
              width: 140,
              height: 180,
              opacity: 0.11,
            }}
          >
            <rect x="20" y="15" width="5" height="100" fill="#92400e" rx="2" />
            <rect
              x="47.5"
              y="15"
              width="5"
              height="100"
              fill="#92400e"
              rx="2"
            />
            <rect x="75" y="15" width="5" height="100" fill="#92400e" rx="2" />
            <rect x="14" y="10" width="17" height="5" fill="#d97706" rx="1" />
            <rect
              x="41.5"
              y="10"
              width="17"
              height="5"
              fill="#d97706"
              rx="1"
            />
            <rect x="69" y="10" width="17" height="5" fill="#d97706" rx="1" />
          </Box>

          {/* Trophy — far down */}
          <Box
            component="svg"
            viewBox="0 0 64 64"
            sx={{
              position: 'absolute',
              top: 1850,
              right: '15%',
              width: 100,
              height: 100,
              opacity: 0.12,
            }}
          >
            <path
              d="M16 4h32v8c0 6-3 11-7 13v8h6v6h-22v-6h6v-8c-4-2-7-7-7-13v-8z"
              fill="#0891b2"
            />
            <rect x="20" y="46" width="24" height="6" fill="#0e7490" rx="2" />
            <rect x="14" y="52" width="36" height="6" fill="#0e7490" rx="2" />
          </Box>

          {/* Third bat — far down right */}
          <Box
            component="svg"
            viewBox="0 0 100 220"
            sx={{
              position: 'absolute',
              top: 2100,
              right: -40,
              width: 200,
              height: 440,
              transform: 'rotate(20deg)',
              opacity: 0.12,
            }}
          >
            <rect x="42" y="0" width="16" height="52" fill="#1e293b" rx="4" />
            <rect x="38" y="48" width="24" height="10" fill="#0f172a" rx="2" />
            <rect
              x="24"
              y="58"
              width="52"
              height="155"
              rx="12"
              fill="#0891b2"
            />
            <rect
              x="34"
              y="68"
              width="6"
              height="135"
              fill="#ffffff"
              opacity="0.4"
              rx="2"
            />
          </Box>

          {/* ── Filler accents ───────────────────────── */}
          {/* Small ball — top right corner */}
          <Box
            component="svg"
            viewBox="0 0 100 100"
            sx={{
              position: 'absolute',
              top: 180,
              right: '14%',
              width: 50,
              height: 50,
              opacity: 0.13,
            }}
          >
            <circle cx="50" cy="50" r="46" fill="#dc2626" />
            <path
              d="M 6 50 Q 50 22 94 50"
              stroke="#ffffff"
              strokeWidth="3"
              fill="none"
              strokeDasharray="3 3"
            />
            <path
              d="M 6 50 Q 50 78 94 50"
              stroke="#ffffff"
              strokeWidth="3"
              fill="none"
              strokeDasharray="3 3"
            />
          </Box>

          {/* Small wickets — top mid */}
          <Box
            component="svg"
            viewBox="0 0 100 120"
            sx={{
              position: 'absolute',
              top: 120,
              left: '22%',
              width: 80,
              height: 100,
              opacity: 0.1,
            }}
          >
            <rect x="20" y="15" width="5" height="100" fill="#0e7490" rx="2" />
            <rect
              x="47.5"
              y="15"
              width="5"
              height="100"
              fill="#0e7490"
              rx="2"
            />
            <rect x="75" y="15" width="5" height="100" fill="#0e7490" rx="2" />
            <rect x="14" y="10" width="17" height="5" fill="#f59e0b" rx="1" />
            <rect
              x="41.5"
              y="10"
              width="17"
              height="5"
              fill="#f59e0b"
              rx="1"
            />
            <rect x="69" y="10" width="17" height="5" fill="#f59e0b" rx="1" />
          </Box>

          {/* Tiny ball — center upper */}
          <Box
            component="svg"
            viewBox="0 0 100 100"
            sx={{
              position: 'absolute',
              top: 340,
              left: '60%',
              width: 36,
              height: 36,
              opacity: 0.16,
            }}
          >
            <circle cx="50" cy="50" r="46" fill="#f59e0b" />
            <path
              d="M 6 50 Q 50 22 94 50"
              stroke="#ffffff"
              strokeWidth="4"
              fill="none"
              strokeDasharray="4 3"
            />
            <path
              d="M 6 50 Q 50 78 94 50"
              stroke="#ffffff"
              strokeWidth="4"
              fill="none"
              strokeDasharray="4 3"
            />
          </Box>

          {/* Small trophy — top right */}
          <Box
            component="svg"
            viewBox="0 0 64 64"
            sx={{
              position: 'absolute',
              top: 700,
              left: '55%',
              width: 70,
              height: 70,
              opacity: 0.12,
            }}
          >
            <path
              d="M16 4h32v8c0 6-3 11-7 13v8h6v6h-22v-6h6v-8c-4-2-7-7-7-13v-8z"
              fill="#fbbf24"
            />
            <rect x="20" y="46" width="24" height="6" fill="#b45309" rx="2" />
            <rect x="14" y="52" width="36" height="6" fill="#b45309" rx="2" />
          </Box>

          {/* Wickets — mid left */}
          <Box
            component="svg"
            viewBox="0 0 100 120"
            sx={{
              position: 'absolute',
              top: 760,
              left: '5%',
              width: 90,
              height: 110,
              opacity: 0.1,
            }}
          >
            <rect x="20" y="15" width="5" height="100" fill="#1e293b" rx="2" />
            <rect
              x="47.5"
              y="15"
              width="5"
              height="100"
              fill="#1e293b"
              rx="2"
            />
            <rect x="75" y="15" width="5" height="100" fill="#1e293b" rx="2" />
            <rect x="14" y="10" width="17" height="5" fill="#0891b2" rx="1" />
            <rect
              x="41.5"
              y="10"
              width="17"
              height="5"
              fill="#0891b2"
              rx="1"
            />
            <rect x="69" y="10" width="17" height="5" fill="#0891b2" rx="1" />
          </Box>

          {/* Small ball — mid right */}
          <Box
            component="svg"
            viewBox="0 0 100 100"
            sx={{
              position: 'absolute',
              top: 1300,
              left: '25%',
              width: 70,
              height: 70,
              opacity: 0.13,
            }}
          >
            <circle cx="50" cy="50" r="46" fill="#0891b2" />
            <path
              d="M 6 50 Q 50 22 94 50"
              stroke="#ffffff"
              strokeWidth="3"
              fill="none"
              strokeDasharray="3 3"
            />
            <path
              d="M 6 50 Q 50 78 94 50"
              stroke="#ffffff"
              strokeWidth="3"
              fill="none"
              strokeDasharray="3 3"
            />
          </Box>

          {/* Small bat — mid */}
          <Box
            component="svg"
            viewBox="0 0 100 220"
            sx={{
              position: 'absolute',
              top: 1380,
              right: '30%',
              width: 90,
              height: 200,
              transform: 'rotate(45deg)',
              opacity: 0.1,
            }}
          >
            <rect x="42" y="0" width="16" height="52" fill="#1e293b" rx="4" />
            <rect x="38" y="48" width="24" height="10" fill="#0f172a" rx="2" />
            <rect
              x="24"
              y="58"
              width="52"
              height="155"
              rx="12"
              fill="#dc2626"
            />
          </Box>

          {/* Tiny ball — lower */}
          <Box
            component="svg"
            viewBox="0 0 100 100"
            sx={{
              position: 'absolute',
              top: 1700,
              left: '8%',
              width: 50,
              height: 50,
              opacity: 0.14,
            }}
          >
            <circle cx="50" cy="50" r="46" fill="#dc2626" />
            <path
              d="M 6 50 Q 50 22 94 50"
              stroke="#ffffff"
              strokeWidth="3"
              fill="none"
              strokeDasharray="3 3"
            />
            <path
              d="M 6 50 Q 50 78 94 50"
              stroke="#ffffff"
              strokeWidth="3"
              fill="none"
              strokeDasharray="3 3"
            />
          </Box>

          {/* Wickets — far down left */}
          <Box
            component="svg"
            viewBox="0 0 100 120"
            sx={{
              position: 'absolute',
              top: 2000,
              left: '8%',
              width: 110,
              height: 140,
              opacity: 0.1,
            }}
          >
            <rect x="20" y="15" width="5" height="100" fill="#0e7490" rx="2" />
            <rect
              x="47.5"
              y="15"
              width="5"
              height="100"
              fill="#0e7490"
              rx="2"
            />
            <rect x="75" y="15" width="5" height="100" fill="#0e7490" rx="2" />
            <rect x="14" y="10" width="17" height="5" fill="#f59e0b" rx="1" />
            <rect
              x="41.5"
              y="10"
              width="17"
              height="5"
              fill="#f59e0b"
              rx="1"
            />
            <rect x="69" y="10" width="17" height="5" fill="#f59e0b" rx="1" />
          </Box>

          {/* Trophy — mid */}
          <Box
            component="svg"
            viewBox="0 0 64 64"
            sx={{
              position: 'absolute',
              top: 1620,
              right: '8%',
              width: 80,
              height: 80,
              opacity: 0.11,
            }}
          >
            <path
              d="M16 4h32v8c0 6-3 11-7 13v8h6v6h-22v-6h6v-8c-4-2-7-7-7-13v-8z"
              fill="#dc2626"
            />
            <rect x="20" y="46" width="24" height="6" fill="#7f1d1d" rx="2" />
            <rect x="14" y="52" width="36" height="6" fill="#7f1d1d" rx="2" />
          </Box>

          {/* Mini ball — far down */}
          <Box
            component="svg"
            viewBox="0 0 100 100"
            sx={{
              position: 'absolute',
              top: 2300,
              left: '40%',
              width: 60,
              height: 60,
              opacity: 0.12,
            }}
          >
            <circle cx="50" cy="50" r="46" fill="#f59e0b" />
            <path
              d="M 6 50 Q 50 22 94 50"
              stroke="#ffffff"
              strokeWidth="3"
              fill="none"
              strokeDasharray="3 3"
            />
            <path
              d="M 6 50 Q 50 78 94 50"
              stroke="#ffffff"
              strokeWidth="3"
              fill="none"
              strokeDasharray="3 3"
            />
          </Box>
        </Box>

        {/* ── Foreground content ───────────────────────────── */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Breadcrumbs />
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
