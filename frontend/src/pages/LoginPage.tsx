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
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import { useAuth, isViewerPermissions } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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
      const u = await login(username, password);
      navigate(isViewerPermissions(u.permissions) ? '/viewer' : '/');
    } catch {
      setError('Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        backgroundImage: 'url(/login-hero.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 3, md: 4 },
        pt: { xs: 8, md: 16 },
        pb: { xs: 4, md: 6 },
      }}
    >
      {/* Soft dim overlay so the banner card has good contrast */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, rgba(15,23,42,0.55) 0%, rgba(30,41,59,0.42) 50%, rgba(15,23,42,0.55) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Banner Card ───────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 960,
          minHeight: { md: 540 },
          borderRadius: '24px',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow:
            '0 32px 80px rgba(15,23,42,0.45), 0 0 0 1px rgba(255,255,255,0.5)',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
          animation: 'fadeIn 0.5s ease',
          '@keyframes fadeIn': {
            from: { opacity: 0, transform: 'translateY(12px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        {/* ─── Left: Photo brand panel ─── */}
        <Box
          sx={{
            position: 'relative',
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: 5,
            color: '#ffffff',
            backgroundImage: 'url(/login-card.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            overflow: 'hidden',
          }}
        >
          {/* Tinted gradient overlay for legibility */}
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(135deg, rgba(8,145,178,0.78) 0%, rgba(14,116,144,0.55) 45%, rgba(12,74,110,0.85) 100%)',
              pointerEvents: 'none',
            }}
          />
          {/* Soft glow blob top-right */}
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              top: -80,
              right: -80,
              width: 280,
              height: 280,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(253,224,71,0.28) 0%, rgba(253,224,71,0) 70%)',
              pointerEvents: 'none',
            }}
          />
          {/* Decorative dots grid */}
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              top: 40,
              right: 32,
              width: 80,
              height: 80,
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.4) 1.5px, transparent 1.5px)',
              backgroundSize: '14px 14px',
              opacity: 0.7,
              pointerEvents: 'none',
            }}
          />

          {/* Top: brand */}
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.6,
                py: 0.85,
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.16)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.28)',
                mb: 4,
              }}
            >
              <Box
                component="img"
                src="/recykal-logo.png"
                alt="Recykal"
                sx={{ height: 18, filter: 'invert(1) brightness(2)' }}
              />
              <Typography
                sx={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  letterSpacing: '0.2em',
                  color: '#ffffff',
                  textTransform: 'uppercase',
                }}
              >
                Premier League
              </Typography>
            </Box>
          </Box>

          {/* Middle: hero copy */}
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.4,
                py: 0.55,
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.18)',
                border: '1px solid rgba(255,255,255,0.32)',
                mb: 2.5,
              }}
            >
              <EmojiEventsIcon sx={{ fontSize: 14, color: '#fde68a' }} />
              <Typography
                sx={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.18em',
                  color: '#fef3c7',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                }}
              >
                RPL 2025 · Champions
              </Typography>
            </Box>
            <Typography
              sx={{
                fontSize: { md: '2.4rem', lg: '2.7rem' },
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
                mb: 1.5,
              }}
            >
              Where every
              <br />
              bid counts.
            </Typography>
            <Typography
              sx={{
                fontSize: '0.95rem',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.88)',
                lineHeight: 1.55,
                maxWidth: 360,
              }}
            >
              The Recykal Premier League — built for fierce auctions,
              unforgettable wins, and the stories teams tell next season.
            </Typography>
          </Box>

          {/* Bottom: feature row */}
          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2.5,
              pt: 4,
              borderTop: '1px solid rgba(255,255,255,0.18)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SportsCricketIcon sx={{ fontSize: 18, color: '#fde68a' }} />
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.92)',
                }}
              >
                Live Auctions
              </Typography>
            </Box>
            <Box
              sx={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.4)',
              }}
            />
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              {['#FF5722', '#2196F3', '#4CAF50', '#9C27B0', '#00BCD4'].map(
                (c) => (
                  <Box
                    key={c}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: c,
                      boxShadow: `0 0 8px ${c}aa`,
                    }}
                  />
                )
              )}
            </Box>
            <Typography
              sx={{
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.92)',
              }}
            >
              5 Teams
            </Typography>
          </Box>
        </Box>

        {/* ─── Right: Form panel ─── */}
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            p: { xs: 4, sm: 5, md: 5.5 },
            background: '#ffffff',
          }}
        >
          {/* Mobile-only mini brand pill */}
          <Box
            sx={{
              display: { xs: 'inline-flex', md: 'none' },
              alignSelf: 'flex-start',
              alignItems: 'center',
              gap: 1,
              px: 1.4,
              py: 0.7,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
              mb: 2.5,
            }}
          >
            <Box
              component="img"
              src="/recykal-logo.png"
              alt="Recykal"
              sx={{ height: 14, filter: 'invert(1) brightness(2)' }}
            />
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 800,
                letterSpacing: '0.2em',
                color: '#ffffff',
                textTransform: 'uppercase',
              }}
            >
              Premier League
            </Typography>
          </Box>

          <Typography
            sx={{
              fontSize: '0.62rem',
              fontWeight: 800,
              letterSpacing: '0.22em',
              color: '#0891b2',
              textTransform: 'uppercase',
              mb: 1,
            }}
          >
            Welcome back
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: '1.55rem', md: '1.85rem' },
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              mb: 0.75,
            }}
          >
            Sign in to{' '}
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              RPL
            </Box>
          </Typography>
          <Typography
            sx={{ fontSize: '0.9rem', color: '#64748b', mb: 3.5 }}
          >
            Enter your credentials to access the auction.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}
          >
            <TextField
              fullWidth
              label="Username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  background: '#f8fafc',
                  '& fieldset': { borderColor: '#e2e8f0' },
                  '&:hover fieldset': { borderColor: '#cbd5e1' },
                  '&.Mui-focused fieldset': { borderColor: '#0891b2' },
                },
              }}
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
                      sx={{
                        color: '#94a3b8',
                        '&:hover': { color: '#0891b2' },
                      }}
                    >
                      {showPass ? (
                        <VisibilityOffIcon fontSize="small" />
                      ) : (
                        <VisibilityIcon fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  background: '#f8fafc',
                  '& fieldset': { borderColor: '#e2e8f0' },
                  '&:hover fieldset': { borderColor: '#cbd5e1' },
                  '&.Mui-focused fieldset': { borderColor: '#0891b2' },
                },
              }}
            />

            <Button
              fullWidth
              variant="contained"
              type="submit"
              size="large"
              disabled={loading}
              sx={{
                mt: 1.5,
                py: 1.5,
                fontSize: '0.95rem',
                fontWeight: 800,
                letterSpacing: '0.02em',
                textTransform: 'none',
                borderRadius: '12px',
                background:
                  'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
                boxShadow: '0 6px 18px rgba(8,145,178,0.32)',
                '&:hover': {
                  background:
                    'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                  boxShadow: '0 8px 24px rgba(8,145,178,0.45)',
                },
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </Box>

          <Typography
            sx={{
              textAlign: 'center',
              mt: 4,
              fontSize: '0.7rem',
              color: '#94a3b8',
              letterSpacing: '0.08em',
            }}
          >
            RPL · Powered by Recykal
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
