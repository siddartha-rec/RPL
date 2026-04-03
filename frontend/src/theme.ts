import { createTheme } from '@mui/material/styles';

export const teamColors: Record<string, string> = {
  TOT: '#FF5722', SOS: '#2196F3', COC: '#4CAF50', GOG: '#9C27B0', FOF: '#F44336',
};

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#f59e0b' },
    secondary: { main: '#60a5fa' },
    background: { default: '#0f0f1a', paper: '#1a1a2e' },
    error: { main: '#F44336' },
    success: { main: '#4CAF50' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
});

export default theme;
