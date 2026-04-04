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

/* ── Floating auction icons scattered across the full background ── */
const floatingIcons = [
  { Icon: GavelIcon, top: '8%', left: '6%', size: 48, delay: 0, color: '#f59e0b' },
  { Icon: SportsCricketIcon, top: '15%', right: '12%', size: 40, delay: 1.2, color: '#60a5fa' },
  { Icon: EmojiEventsIcon, bottom: '12%', left: '10%', size: 44, delay: 0.6, color: '#fbbf24' },
  { Icon: GroupsIcon, bottom: '20%', right: '7%', size: 38, delay: 1.8, color: '#a78bfa' },
  { Icon: GavelIcon, top: '50%', left: '3%', size: 32, delay: 2.4, color: '#34d399' },
  { Icon: SportsCricketIcon, top: '35%', right: '4%', size: 36, delay: 0.3, color: '#f59e0b' },
  { Icon: EmojiEventsIcon, top: '5%', right: '35%', size: 30, delay: 1.5, color: '#60a5fa' },
  { Icon: GroupsIcon, bottom: '8%', left: '35%', size: 34, delay: 2.0, color: '#fbbf24' },
  { Icon: GavelIcon, top: '70%', right: '18%', size: 28, delay: 0.9, color: '#a78bfa' },
  { Icon: SportsCricketIcon, bottom: '35%', left: '18%', size: 26, delay: 1.6, color: '#34d399' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: `
          radial-gradient(ellipse at 20% 20%, rgba(245,158,11,0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, rgba(59,130,246,0.06) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.04) 0%, transparent 60%),
          linear-gradient(160deg, #0a0a1a 0%, #0f0f23 40%, #111128 70%, #0a0a1a 100%)
        `,
      }}
    >
      {/* ── Background grid pattern ─────────────────────── */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(245,158,11,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,158,11,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Floating auction icons across full page ──────── */}
      {floatingIcons.map(({ Icon, top, left, right, bottom, size, delay, color }, i) => (
        <Box
          key={i}
          aria-hidden="true"
          sx={{
            position: 'absolute',
            top, left, right, bottom,
            animation: `float${i} ${5 + (i % 3)}s ease-in-out ${delay}s infinite`,
            [`@keyframes float${i}`]: {
              '0%, 100%': { transform: 'translateY(0px) rotate(0deg)', opacity: 0.12 },
              '50%': { transform: `translateY(-${15 + (i % 5) * 4}px) rotate(${(i % 2 === 0 ? 1 : -1) * (8 + i * 2)}deg)`, opacity: 0.25 },
            },
            pointerEvents: 'none',
          }}
        >
          <Icon sx={{ fontSize: size, color }} />
        </Box>
      ))}

      {/* ── Ambient glow orbs ───────────────────────────── */}
      <Box aria-hidden="true" sx={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)', top: '-15%', left: '-10%', pointerEvents: 'none' }} />
      <Box aria-hidden="true" sx={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)', bottom: '-10%', right: '-5%', pointerEvents: 'none' }} />
      <Box aria-hidden="true" sx={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)', top: '40%', right: '15%', pointerEvents: 'none' }} />

      {/* ══════════════════════════════════════════════════════
          CENTER — Login Card
         ══════════════════════════════════════════════════════ */}
      <Box
        sx={{
          width: { xs: '92%', sm: 440 },
          animation: 'slideUp 0.6s ease forwards',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Glass card */}
        <Box
          sx={{
            background: 'rgba(15,15,35,0.75)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 4,
            p: { xs: 4, sm: 5 },
            boxShadow: `
              0 32px 100px rgba(0,0,0,0.5),
              0 0 0 1px rgba(245,158,11,0.06),
              inset 0 1px 0 rgba(255,255,255,0.04)
            `,
          }}
        >
          {/* ── Recykal Logo (gold) ───────────────────── */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              component="img"
              src="/recykal-logo.png"
              alt="Recykal"
              sx={{
                height: 32,
                mx: 'auto',
                mb: 2.5,
                display: 'block',
                filter: 'brightness(0) saturate(100%) invert(70%) sepia(60%) saturate(500%) hue-rotate(5deg) brightness(100%)',
              }}
            />

            <Typography
              variant="h3"
              sx={{
                fontWeight: 900,
                fontSize: '2.4rem',
                letterSpacing: '0.06em',
                background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 40%, #f59e0b 80%, #d97706 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmer 3s linear infinite',
                mb: 0.5,
              }}
            >
              RPL
            </Typography>

            <Typography
              sx={{
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#475569',
              }}
            >
              Cricket Auction Platform
            </Typography>

            <Box
              sx={{
                mt: 2.5,
                mx: 'auto',
                width: 50,
                height: 2,
                borderRadius: 1,
                background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent)',
              }}
            />
          </Box>

          {/* ── Quick stats row ──────────────────────── */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 3,
              mb: 4,
              py: 2,
              borderTop: '1px solid rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            {[
              { value: '5', label: 'Teams', Icon: GroupsIcon, color: '#f59e0b' },
              { value: '85+', label: 'Players', Icon: SportsCricketIcon, color: '#60a5fa' },
              { value: 'LIVE', label: 'Auction', Icon: GavelIcon, color: '#ef4444' },
            ].map(({ value, label, Icon, color }) => (
              <Box key={label} sx={{ textAlign: 'center' }}>
                <Icon sx={{ fontSize: 18, color, mb: 0.3 }} />
                <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#e2e8f0', lineHeight: 1.2 }}>
                  {value}
                </Typography>
                <Typography sx={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  {label}
                </Typography>
              </Box>
            ))}
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
                py: 1.5,
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                boxShadow: '0 4px 24px rgba(245,158,11,0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  boxShadow: '0 8px 32px rgba(245,158,11,0.5)',
                },
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </Box>

          {/* ── Team color dots ──────────────────────── */}
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', mt: 3.5 }}>
            {['#FF5722', '#2196F3', '#4CAF50', '#9C27B0', '#F44336'].map((color) => (
              <Box
                key={color}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: color,
                  boxShadow: `0 0 8px ${color}50`,
                }}
              />
            ))}
          </Box>

          {/* ── Footer ───────────────────────────────── */}
          <Typography
            sx={{
              textAlign: 'center',
              mt: 2.5,
              fontSize: '0.68rem',
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
