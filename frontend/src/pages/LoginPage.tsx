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
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',

        /* Deep gradient background */
        background: `
          radial-gradient(ellipse at 30% 20%, rgba(245,158,11,0.06) 0%, transparent 50%),
          radial-gradient(ellipse at 70% 80%, rgba(59,130,246,0.05) 0%, transparent 50%),
          linear-gradient(160deg, #0a0a1a 0%, #0f0f23 50%, #0a0a1a 100%)
        `,
      }}
    >
      {/* ── Background decorative grid ──────────────────── */}
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

      {/* ── Floating orbs ───────────────────────────────── */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)',
          top: '-10%',
          left: '-5%',
          pointerEvents: 'none',
        }}
      />
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
          bottom: '-5%',
          right: '5%',
          pointerEvents: 'none',
        }}
      />

      {/* ── Login card ──────────────────────────────────── */}
      <Box
        sx={{
          width: { xs: '90%', sm: 420 },
          animation: 'slideUp 0.5s ease forwards',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            background: 'rgba(26,26,46,0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 3,
            p: { xs: 3.5, sm: 5 },
            boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,158,11,0.05)',
          }}
        >
          {/* ── Logo / Title ─────────────────────────── */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            {/* Cricket ball icon */}
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2.5,
                boxShadow: '0 0 30px rgba(245,158,11,0.4)',
                animation: 'glow 3s ease-in-out infinite',
              }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#0a0a1a" strokeWidth="1.5" fill="none" />
                <path d="M5 12 Q8 8 12 12 Q16 16 19 12" stroke="#0a0a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <path d="M5 12 Q8 16 12 12 Q16 8 19 12" stroke="#0a0a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </Box>

            <Typography
              variant="h3"
              sx={{
                fontWeight: 900,
                fontSize: '2.6rem',
                letterSpacing: '0.04em',
                background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 40%, #f59e0b 80%, #d97706 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmer 3s linear infinite',
                mb: 0.75,
              }}
            >
              RPL 2025
            </Typography>

            <Typography
              sx={{
                fontSize: '0.78rem',
                fontWeight: 500,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#475569',
              }}
            >
              Cricket Auction Platform
            </Typography>

            {/* Decorative divider */}
            <Box
              sx={{
                mt: 2.5,
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
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </Box>

          {/* ── Footer note ──────────────────────────── */}
          <Typography
            sx={{
              textAlign: 'center',
              mt: 3,
              fontSize: '0.72rem',
              color: '#334155',
              letterSpacing: '0.04em',
            }}
          >
            RPL 2025 · Powered by Cricket
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
