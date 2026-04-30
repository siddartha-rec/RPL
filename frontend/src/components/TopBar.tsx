import { AppBar, Toolbar, Box } from '@mui/material';

const DRAWER_WIDTH = 240;

export default function TopBar() {
  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (t) => t.zIndex.drawer + 1,
        width: DRAWER_WIDTH,
        left: 0,
        right: 'auto',
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'saturate(160%) blur(18px)',
        WebkitBackdropFilter: 'saturate(160%) blur(18px)',
        borderBottom: '1px solid #e2e8f0',
        borderRight: '1px solid #eef2f7',
        boxShadow: 'none',
      }}
    >
      <Toolbar sx={{ minHeight: 60, px: 2.25, gap: 1.5 }}>
        <Box
          component="img"
          src="/recykal-logo.png"
          alt="Recykal"
          sx={{
            height: 22,
            opacity: 0.95,
          }}
        />
      </Toolbar>
    </AppBar>
  );
}
