import { createTheme, alpha } from '@mui/material/styles';

export const teamColors: Record<string, string> = {
  TOT: '#FF5722',
  SOS: '#2196F3',
  COC: '#4CAF50',
  GOG: '#9C27B0',
  FOF: '#00BCD4',
};

const GOLD   = '#f59e0b';
const BLUE   = '#3b82f6';
const BG_DEEP = '#0a0a1a';
const BG_DARK = '#0f0f23';
const BG_CARD = '#1a1a2e';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: GOLD,     light: '#fbbf24', dark: '#d97706'  },
    secondary:  { main: BLUE,     light: '#60a5fa', dark: '#2563eb'  },
    background: { default: BG_DARK, paper: BG_CARD },
    error:      { main: '#ef4444' },
    success:    { main: '#10b981' },
    warning:    { main: GOLD },
    info:       { main: BLUE },
    text: {
      primary:   '#f1f5f9',
      secondary: '#94a3b8',
      disabled:  '#64748b',
    },
    divider: 'rgba(255,255,255,0.06)',
  },

  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.01em' },
    h4: { fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500, color: '#94a3b8' },
    subtitle2: { fontWeight: 500, color: '#64748b', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' },
    button: { fontWeight: 600, letterSpacing: '0.02em' },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.5, color: '#94a3b8' },
  },

  shape: { borderRadius: 12 },

  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.4)',
    '0 2px 6px rgba(0,0,0,0.5)',
    '0 4px 12px rgba(0,0,0,0.5)',
    '0 6px 16px rgba(0,0,0,0.5)',
    '0 8px 24px rgba(0,0,0,0.5)',
    '0 10px 28px rgba(0,0,0,0.5)',
    '0 12px 32px rgba(0,0,0,0.6)',
    '0 14px 36px rgba(0,0,0,0.6)',
    '0 16px 40px rgba(0,0,0,0.6)',
    '0 18px 44px rgba(0,0,0,0.6)',
    '0 20px 48px rgba(0,0,0,0.6)',
    '0 22px 52px rgba(0,0,0,0.6)',
    '0 24px 56px rgba(0,0,0,0.6)',
    '0 26px 60px rgba(0,0,0,0.6)',
    '0 28px 64px rgba(0,0,0,0.6)',
    '0 30px 68px rgba(0,0,0,0.6)',
    '0 32px 72px rgba(0,0,0,0.6)',
    '0 34px 76px rgba(0,0,0,0.6)',
    '0 36px 80px rgba(0,0,0,0.6)',
    '0 38px 84px rgba(0,0,0,0.7)',
    '0 40px 88px rgba(0,0,0,0.7)',
    '0 42px 92px rgba(0,0,0,0.7)',
    '0 44px 96px rgba(0,0,0,0.7)',
    '0 46px 100px rgba(0,0,0,0.7)',
  ],

  components: {
    /* ── MuiCssBaseline ──────────────────────────────── */
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: BG_DARK,
          backgroundImage: `
            radial-gradient(ellipse at 20% 0%,  rgba(245,158,11,0.04) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 0%,  rgba(59,130,246,0.04) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 100%,rgba(26,26,46,0.8)   0%, transparent 60%)
          `,
          minHeight: '100vh',
        },
      },
    },

    /* ── MuiCard ─────────────────────────────────────── */
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: `rgba(26,26,46,0.8)`,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.05)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,158,11,0.08)`,
          },
        },
      },
    },

    /* ── MuiPaper ────────────────────────────────────── */
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: BG_CARD,
          border: '1px solid rgba(255,255,255,0.05)',
        },
      },
    },

    /* ── MuiButton ───────────────────────────────────── */
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.2s ease',
          letterSpacing: '0.02em',
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${GOLD} 0%, #d97706 100%)`,
          color: '#0a0a1a',
          boxShadow: `0 4px 15px rgba(245,158,11,0.3)`,
          '&:hover': {
            background: `linear-gradient(135deg, #fbbf24 0%, ${GOLD} 100%)`,
            boxShadow: `0 6px 25px rgba(245,158,11,0.5)`,
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        containedSecondary: {
          background: `linear-gradient(135deg, ${BLUE} 0%, #2563eb 100%)`,
          boxShadow: `0 4px 15px rgba(59,130,246,0.3)`,
          '&:hover': {
            background: `linear-gradient(135deg, #60a5fa 0%, ${BLUE} 100%)`,
            boxShadow: `0 6px 25px rgba(59,130,246,0.5)`,
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderColor: 'rgba(255,255,255,0.12)',
          '&:hover': {
            borderColor: alpha(GOLD, 0.5),
            background: alpha(GOLD, 0.06),
            transform: 'translateY(-1px)',
          },
        },
        text: {
          '&:hover': {
            background: alpha(GOLD, 0.08),
          },
        },
      },
    },

    /* ── MuiChip ─────────────────────────────────────── */
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.7rem',
          letterSpacing: '0.05em',
          borderRadius: 6,
        },
        colorError: {
          background: 'rgba(239,68,68,0.15)',
          color: '#ef4444',
          border: '1px solid rgba(239,68,68,0.3)',
        },
        colorSuccess: {
          background: 'rgba(16,185,129,0.15)',
          color: '#10b981',
          border: '1px solid rgba(16,185,129,0.3)',
        },
        colorWarning: {
          background: `rgba(245,158,11,0.15)`,
          color: GOLD,
          border: `1px solid rgba(245,158,11,0.3)`,
        },
        colorPrimary: {
          background: `rgba(245,158,11,0.15)`,
          color: GOLD,
          border: `1px solid rgba(245,158,11,0.3)`,
        },
      },
    },

    /* ── MuiTextField ────────────────────────────────── */
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            background: 'rgba(15,15,35,0.6)',
            borderRadius: 10,
            transition: 'all 0.2s ease',
            '& fieldset': {
              borderColor: 'rgba(255,255,255,0.1)',
              transition: 'border-color 0.2s ease',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(245,158,11,0.4)',
            },
            '&.Mui-focused fieldset': {
              borderColor: GOLD,
              boxShadow: `0 0 0 3px rgba(245,158,11,0.12)`,
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: GOLD,
          },
        },
      },
    },

    /* ── MuiTableHead ────────────────────────────────── */
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: 'rgba(15,15,35,0.8)',
            color: '#64748b',
            fontWeight: 700,
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          },
        },
      },
    },

    /* ── MuiTableRow ─────────────────────────────────── */
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background 0.15s ease',
          '&:hover': {
            backgroundColor: 'rgba(245,158,11,0.04) !important',
          },
          '& .MuiTableCell-body': {
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          },
        },
      },
    },

    /* ── MuiTableCell ────────────────────────────────── */
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255,255,255,0.04)',
        },
      },
    },

    /* ── MuiAppBar ───────────────────────────────────── */
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: `linear-gradient(90deg, ${BG_DEEP} 0%, rgba(15,15,35,0.97) 100%)`,
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 1px 30px rgba(0,0,0,0.5)',
        },
      },
    },

    /* ── MuiDrawer ───────────────────────────────────── */
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          background: `linear-gradient(180deg, ${BG_DEEP} 0%, rgba(10,10,26,0.98) 100%)`,
          borderRight: '1px solid rgba(255,255,255,0.05)',
        },
      },
    },

    /* ── MuiListItemButton ───────────────────────────── */
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          padding: '8px 12px',
          transition: 'all 0.2s ease',
          '&:hover': {
            background: 'rgba(245,158,11,0.06)',
          },
          '&.Mui-selected': {
            background: 'rgba(245,158,11,0.08)',
            borderLeft: `3px solid ${GOLD}`,
            paddingLeft: 9,
            '&:hover': {
              background: 'rgba(245,158,11,0.12)',
            },
          },
        },
      },
    },

    /* ── MuiListItemIcon ─────────────────────────────── */
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 36,
          color: '#64748b',
          transition: 'color 0.2s ease',
        },
      },
    },

    /* ── MuiDivider ──────────────────────────────────── */
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255,255,255,0.06)',
        },
      },
    },

    /* ── MuiAlert ────────────────────────────────────── */
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          border: '1px solid',
        },
        standardError: {
          background: 'rgba(239,68,68,0.1)',
          borderColor: 'rgba(239,68,68,0.25)',
          color: '#fca5a5',
        },
        standardSuccess: {
          background: 'rgba(16,185,129,0.1)',
          borderColor: 'rgba(16,185,129,0.25)',
          color: '#6ee7b7',
        },
      },
    },

    /* ── MuiTooltip ──────────────────────────────────── */
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: 'rgba(26,26,46,0.97)',
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: '0.78rem',
          borderRadius: 8,
          backdropFilter: 'blur(10px)',
        },
      },
    },
  },
});

export default theme;
