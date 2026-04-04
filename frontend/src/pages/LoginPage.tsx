import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import GavelIcon from '@mui/icons-material/Gavel';
import GroupsIcon from '@mui/icons-material/Groups';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/* ── Floating auction-themed icons ─────────────────────── */
const floatingIcons = [
  { Icon: GavelIcon, top: '12%', left: '8%', size: 44, delay: 0, color: '#f59e0b' },
  { Icon: SportsCricketIcon, top: '22%', right: '10%', size: 38, delay: 1.2, color: '#60a5fa' },
  { Icon: EmojiEventsIcon, bottom: '18%', left: '12%', size: 42, delay: 0.6, color: '#fbbf24' },
  { Icon: GroupsIcon, bottom: '25%', right: '8%', size: 36, delay: 1.8, color: '#a78bfa' },
  { Icon: GavelIcon, top: '55%', left: '5%', size: 30, delay: 2.4, color: '#34d399' },
  { Icon: SportsCricketIcon, top: '40%', right: '6%', size: 32, delay: 0.3, color: '#f59e0b' },
  { Icon: EmojiEventsIcon, top: '8%', left: '45%', size: 28, delay: 1.5, color: '#60a5fa' },
  { Icon: GroupsIcon, bottom: '10%', right: '40%', size: 34, delay: 2.0, color: '#fbbf24' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch {
      setError('Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: '#0a0a1a',
      }}
    >
      {/* ══════════════════════════════════════════════════════
          LEFT SIDE — Auction Showcase
         ══════════════════════════════════════════════════════ */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: '50%',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          background: `
            radial-gradient(ellipse at 30% 30%, rgba(245,158,11,0.12) 0%, transparent 60%),
            radial-gradient(ellipse at 70% 70%, rgba(59,130,246,0.08) 0%, transparent 60%),
            linear-gradient(135deg, #0a0a1a 0%, #111128 50%, #0a0a1a 100%)
          `,
          overflow: 'hidden',
        }}
      >
        {/* Grid pattern */}
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(245,158,11,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(245,158,11,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
          }}
        />

        {/* Floating auction icons */}
        {floatingIcons.map(({ Icon, top, left, right, bottom, size, delay, color }, i) => (
          <Box
            key={i}
            aria-hidden="true"
            sx={{
              position: 'absolute',
              top, left, right, bottom,
              animation: `float ${4 + (i % 3)}s ease-in-out ${delay}s infinite`,
              '@keyframes float': {
                '0%, 100%': { transform: 'translateY(0px) rotate(0deg)', opacity: 0.15 },
                '50%': { transform: `translateY(-${12 + (i % 4) * 5}px) rotate(${5 + i * 3}deg)`, opacity: 0.3 },
              },
            }}
          >
            <Icon sx={{ fontSize: size, color, opacity: 0.2 }} />
          </Box>
        ))}

        {/* Center content — Auction showcase */}
        <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', px: 6 }}>
          {/* Large gavel icon */}
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)',
              border: '2px solid rgba(245,158,11,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 4,
              animation: 'goldGlow 3s ease-in-out infinite',
            }}
          >
            <GavelIcon sx={{ fontSize: 48, color: '#f59e0b' }} />
          </Box>

          <Typography
            variant="h3"
            sx={{
              fontWeight: 900,
              fontSize: '2.5rem',
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 40%, #f59e0b 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'shimmer 3s linear infinite',
              mb: 2,
            }}
          >
            Cricket Premier League
          </Typography>

          <Typography
            sx={{
              fontSize: '1.1rem',
              color: '#94a3b8',
              lineHeight: 1.6,
              maxWidth: 400,
              mx: 'auto',
              mb: 4,
            }}
          >
            Live auctions, real-time bidding, team management — your cricket league platform
          </Typography>

          {/* Showcase stats */}
          <Box sx={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {[
              { value: '5', label: 'Teams', icon: <GroupsIcon sx={{ fontSize: 20 }} /> },
              { value: '85+', label: 'Players', icon: <SportsCricketIcon sx={{ fontSize: 20 }} /> },
              { value: 'LIVE', label: 'Auction', icon: <GavelIcon sx={{ fontSize: 20 }} /> },
            ].map((stat) => (
              <Box key={stat.label} sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 1,
                    color: '#f59e0b',
                  }}
                >
                  {stat.icon}
                </Box>
                <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: '#e2e8f0' }}>
                  {stat.value}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {stat.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Team color dots */}
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', mt: 4 }}>
            {['#FF5722', '#2196F3', '#4CAF50', '#9C27B0', '#F44336'].map((color) => (
              <Box
                key={color}
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: color,
                  boxShadow: `0 0 10px ${color}60`,
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>

      {/* ══════════════════════════════════════════════════════
          RIGHT SIDE — Login Form
         ══════════════════════════════════════════════════════ */}
      <Box
        sx={{
          width: { xs: '100%', md: '50%' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: { xs: 3, sm: 5 },
          position: 'relative',
          background: `
            linear-gradient(180deg, rgba(26,26,46,0.95) 0%, rgba(15,15,35,0.98) 100%)
          `,
          borderLeft: { md: '1px solid rgba(255,255,255,0.05)' },
        }}
      >
        {/* Subtle glow at top */}
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 300,
            height: 200,
            background: 'radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <Box
          sx={{
            width: '100%',
            maxWidth: 360,
            animation: 'slideUp 0.5s ease forwards',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* ── Recykal Logo (gold-tinted) ───────────── */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              component="img"
              src="/recykal-logo.png"
              alt="Recykal"
              sx={{
                height: 36,
                mx: 'auto',
                mb: 3,
                display: 'block',
                filter: 'brightness(0) saturate(100%) invert(70%) sepia(60%) saturate(500%) hue-rotate(5deg) brightness(100%)',
              }}
            />

            <Typography
              variant="h4"
              sx={{
                fontWeight: 900,
                fontSize: '2rem',
                background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 40%, #f59e0b 80%, #d97706 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmer 3s linear infinite',
                mb: 0.75,
              }}
            >
              RPL
            </Typography>

            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 500,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#475569',
              }}
            >
              Cricket Auction Platform
            </Typography>

            <Box
              sx={{
                mt: 2,
                mx: 'auto',
                width: 48,
                height: 2,
                borderRadius: 1,
                background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent)',
              }}
            />
          </Box>

          {/* ── Error Alert ──────────────────────────── */}
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, animation: 'fadeIn 0.3s ease' }}>
              {error}
            </Alert>
          )}

          {/* ── Form ─────────────────────────────────── */}
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              fullWidth
              label="Username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />

            <TextField
              fullWidth
              label="Password"
              type={showPass ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPass(!showPass)}
                      edge="end"
                      size="small"
                      sx={{ color: '#475569', '&:hover': { color: '#f59e0b' } }}
                    >
                      {showPass ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              fullWidth
              variant="contained"
              type="submit"
              size="large"
              disabled={loading}
              sx={{
                mt: 1,
                py: 1.6,
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  boxShadow: '0 6px 30px rgba(245,158,11,0.5)',
                },
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </Box>

          {/* ── Footer ───────────────────────────────── */}
          <Typography
            sx={{
              textAlign: 'center',
              mt: 4,
              fontSize: '0.7rem',
              color: '#334155',
              letterSpacing: '0.06em',
            }}
          >
            RPL - Powered by Recykal
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
