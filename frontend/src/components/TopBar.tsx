import { AppBar, Toolbar, Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLeague } from '../context/LeagueContext';

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { activeLeague } = useLeague();
  const leagueName = activeLeague?.name ?? 'RPL';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : '?';

  return (
    <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
      <Toolbar sx={{ minHeight: 64, px: 3, gap: 2 }}>
        {/* ── Logo ─────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mr: 2 }}>
          {/* Cricket ball icon */}
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(245,158,11,0.5)',
              flexShrink: 0,
              animation: 'glow 3s ease-in-out infinite',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#0a0a1a" strokeWidth="1.5" fill="none" />
              <path d="M5 12 Q8 8 12 12 Q16 16 19 12" stroke="#0a0a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <path d="M5 12 Q8 16 12 12 Q16 8 19 12" stroke="#0a0a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </Box>

          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 800,
              fontSize: '1.25rem',
              letterSpacing: '0.02em',
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'shimmer 3s linear infinite',
              userSelect: 'none',
            }}
          >
            {leagueName}
          </Typography>
        </Box>

        {/* ── LIVE Badge ───────────────────────────────────────── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.25,
            py: 0.4,
            borderRadius: 20,
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
          }}
        >
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#ef4444',
              animation: 'pulseDot 1.5s ease-in-out infinite',
            }}
          />
          <Typography
            sx={{
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: '#ef4444',
              lineHeight: 1,
            }}
          >
            LIVE AUCTION
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* ── User Section ─────────────────────────────────────── */}
        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Name + role */}
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography
                sx={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#f1f5f9',
                  lineHeight: 1.2,
                }}
              >
                {user.displayName}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.68rem',
                  color: '#64748b',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Member
              </Typography>
            </Box>

            {/* Avatar circle */}
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(245,158,11,0.25) 0%, rgba(245,158,11,0.1) 100%)',
                border: '1.5px solid rgba(245,158,11,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  border: '1.5px solid rgba(245,158,11,0.8)',
                  boxShadow: '0 0 12px rgba(245,158,11,0.3)',
                },
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#f59e0b',
                  lineHeight: 1,
                }}
              >
                {initials}
              </Typography>
            </Box>

            {/* Logout */}
            <Button
              variant="outlined"
              size="small"
              onClick={handleLogout}
              sx={{
                borderColor: 'rgba(255,255,255,0.12)',
                color: '#94a3b8',
                fontSize: '0.78rem',
                px: 1.5,
                py: 0.5,
                minWidth: 0,
                '&:hover': {
                  borderColor: 'rgba(239,68,68,0.5)',
                  color: '#ef4444',
                  background: 'rgba(239,68,68,0.06)',
                  transform: 'none',
                },
              }}
            >
              Sign out
            </Button>
          </Box>
        ) : (
          <Button
            variant="contained"
            size="small"
            onClick={() => navigate('/login')}
          >
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
