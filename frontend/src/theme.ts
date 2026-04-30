import { createTheme, alpha } from '@mui/material/styles';

export const teamColors: Record<string, string> = {
  TOT: '#FF5722',
  SOS: '#2196F3',
  COC: '#4CAF50',
  GOG: '#9C27B0',
  FOF: '#00BCD4',
};

// Auction-Chase-inspired light palette
const ACCENT = '#0891b2';        // cyan-600
const ACCENT_HOVER = '#06b6d4';  // cyan-500
const ACCENT_DEEP = '#0e7490';   // cyan-700
const SECONDARY = '#3b82f6';     // blue-500

const BG_PAGE = '#f8fafc';   // slate-50
const BG_CARD = '#ffffff';
const BORDER = '#e2e8f0';    // slate-200
const BORDER_SOFT = '#eef2f7';

const TEXT_PRIMARY = '#0f172a';   // slate-900
const TEXT_SECONDARY = '#475569'; // slate-600
const TEXT_MUTED = '#94a3b8';     // slate-400

const theme = createTheme({
  palette: {
    mode: 'light',
    primary:    { main: ACCENT, light: ACCENT_HOVER, dark: ACCENT_DEEP },
    secondary:  { main: SECONDARY, light: '#60a5fa', dark: '#2563eb' },
    background: { default: BG_PAGE, paper: BG_CARD },
    error:      { main: '#ef4444' },
    success:    { main: '#10b981' },
    warning:    { main: '#f59e0b' },
    info:       { main: SECONDARY },
    text: {
      primary:   TEXT_PRIMARY,
      secondary: TEXT_SECONDARY,
      disabled:  TEXT_MUTED,
    },
    divider: BORDER,
  },

  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.02em', color: TEXT_PRIMARY },
    h2: { fontWeight: 800, letterSpacing: '-0.02em', color: TEXT_PRIMARY },
    h3: { fontWeight: 700, letterSpacing: '-0.01em', color: TEXT_PRIMARY },
    h4: { fontWeight: 700, letterSpacing: '-0.01em', color: TEXT_PRIMARY },
    h5: { fontWeight: 600, color: TEXT_PRIMARY },
    h6: { fontWeight: 600, color: TEXT_PRIMARY },
    subtitle1: { fontWeight: 500, color: TEXT_SECONDARY },
    subtitle2: { fontWeight: 500, color: TEXT_MUTED, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' },
    button: { fontWeight: 600, letterSpacing: '0.01em' },
    body1: { lineHeight: 1.6, color: TEXT_PRIMARY },
    body2: { lineHeight: 1.5, color: TEXT_SECONDARY },
  },

  shape: { borderRadius: 12 },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: BG_PAGE,
          backgroundImage: `
            radial-gradient(ellipse 60% 40% at 15% 0%,  rgba(8,145,178,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 85% 0%,  rgba(59,130,246,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 50% 100%, rgba(8,145,178,0.05) 0%, transparent 60%)
          `,
          color: TEXT_PRIMARY,
          minHeight: '100vh',
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: BG_CARD,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 28px rgba(15,23,42,0.08)',
            borderColor: alpha(ACCENT, 0.35),
          },
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: BG_CARD,
          border: `1px solid ${BORDER}`,
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.18s ease',
          letterSpacing: '0.01em',
          boxShadow: 'none',
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DEEP} 100%)`,
          color: '#ffffff',
          boxShadow: '0 1px 2px rgba(8,145,178,0.18), 0 4px 14px rgba(8,145,178,0.18)',
          '&:hover': {
            background: `linear-gradient(135deg, ${ACCENT_HOVER} 0%, ${ACCENT} 100%)`,
            boxShadow: '0 6px 22px rgba(8,145,178,0.28)',
            transform: 'translateY(-1px)',
          },
          '&:active': { transform: 'translateY(0)' },
        },
        containedSecondary: {
          background: `linear-gradient(135deg, ${SECONDARY} 0%, #2563eb 100%)`,
          color: '#ffffff',
          boxShadow: '0 1px 2px rgba(59,130,246,0.18), 0 4px 14px rgba(59,130,246,0.2)',
          '&:hover': {
            background: `linear-gradient(135deg, #60a5fa 0%, ${SECONDARY} 100%)`,
            boxShadow: '0 6px 22px rgba(59,130,246,0.28)',
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderColor: BORDER,
          color: TEXT_PRIMARY,
          background: BG_CARD,
          '&:hover': {
            borderColor: alpha(ACCENT, 0.5),
            background: alpha(ACCENT, 0.04),
            transform: 'translateY(-1px)',
          },
        },
        text: {
          color: TEXT_PRIMARY,
          '&:hover': {
            background: alpha(ACCENT, 0.06),
          },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.7rem',
          letterSpacing: '0.05em',
          borderRadius: 6,
        },
        colorError: {
          background: alpha('#ef4444', 0.1),
          color: '#b91c1c',
          border: '1px solid rgba(239,68,68,0.25)',
        },
        colorSuccess: {
          background: alpha('#10b981', 0.1),
          color: '#047857',
          border: '1px solid rgba(16,185,129,0.25)',
        },
        colorWarning: {
          background: alpha('#f59e0b', 0.12),
          color: '#b45309',
          border: '1px solid rgba(245,158,11,0.3)',
        },
        colorPrimary: {
          background: alpha(ACCENT, 0.1),
          color: ACCENT_DEEP,
          border: `1px solid ${alpha(ACCENT, 0.3)}`,
        },
      },
    },

    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            background: BG_CARD,
            borderRadius: 10,
            transition: 'all 0.18s ease',
            '& fieldset': {
              borderColor: BORDER,
              transition: 'border-color 0.18s ease',
            },
            '&:hover fieldset': {
              borderColor: alpha(ACCENT, 0.45),
            },
            '&.Mui-focused fieldset': {
              borderColor: ACCENT,
              boxShadow: `0 0 0 3px ${alpha(ACCENT, 0.12)}`,
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: ACCENT,
          },
        },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: BORDER_SOFT,
            color: TEXT_SECONDARY,
            fontWeight: 700,
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            borderBottom: `1px solid ${BORDER}`,
          },
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background 0.15s ease',
          '&:hover': {
            backgroundColor: `${alpha(ACCENT, 0.04)} !important`,
          },
          '& .MuiTableCell-body': {
            borderBottom: `1px solid ${BORDER_SOFT}`,
          },
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: BORDER_SOFT,
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'saturate(140%) blur(18px)',
          WebkitBackdropFilter: 'saturate(140%) blur(18px)',
          color: TEXT_PRIMARY,
          borderBottom: `1px solid ${BORDER}`,
          boxShadow: 'none',
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          background: 'rgba(255,255,255,0.96)',
          borderRight: `1px solid ${BORDER}`,
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          padding: '8px 12px',
          transition: 'all 0.18s ease',
          color: TEXT_SECONDARY,
          '&:hover': {
            background: alpha(ACCENT, 0.06),
            color: TEXT_PRIMARY,
          },
          '&.Mui-selected': {
            background: alpha(ACCENT, 0.1),
            color: ACCENT_DEEP,
            '&:hover': {
              background: alpha(ACCENT, 0.14),
            },
          },
        },
      },
    },

    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 36,
          color: TEXT_MUTED,
          transition: 'color 0.18s ease',
        },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: BORDER,
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          border: '1px solid',
        },
        standardError: {
          background: alpha('#ef4444', 0.06),
          borderColor: alpha('#ef4444', 0.25),
          color: '#991b1b',
        },
        standardSuccess: {
          background: alpha('#10b981', 0.06),
          borderColor: alpha('#10b981', 0.25),
          color: '#065f46',
        },
        standardInfo: {
          background: alpha(SECONDARY, 0.06),
          borderColor: alpha(SECONDARY, 0.25),
          color: '#1e3a8a',
        },
        standardWarning: {
          background: alpha('#f59e0b', 0.08),
          borderColor: alpha('#f59e0b', 0.3),
          color: '#92400e',
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: '#0f172a',
          color: '#f1f5f9',
          fontSize: '0.78rem',
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
