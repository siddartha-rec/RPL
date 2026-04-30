import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupsIcon from '@mui/icons-material/Groups';
import PeopleIcon from '@mui/icons-material/People';
import GavelIcon from '@mui/icons-material/Gavel';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HistoryIcon from '@mui/icons-material/History';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 240;

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Typography
      sx={{
        fontSize: '0.62rem',
        fontWeight: 600,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: '#94a3b8',
        px: 2.25,
        pt: 2.5,
        pb: 0.75,
        lineHeight: 1,
      }}
    >
      {label}
    </Typography>
  );
}

function NavItemButton({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <ListItemButton
      selected={active}
      onClick={onClick}
      disableRipple
      sx={{
        position: 'relative',
        mx: 1,
        my: 0.15,
        px: 1.5,
        py: 0.85,
        borderRadius: '8px',
        transition: 'background 140ms ease, color 140ms ease',
        background: active ? 'rgba(8,145,178,0.08) !important' : 'transparent',

        '&::before': {
          content: '""',
          position: 'absolute',
          left: -1,
          top: 8,
          bottom: 8,
          width: 2,
          borderRadius: 999,
          background: active ? '#0891b2' : 'transparent',
          transition: 'background 140ms ease',
        },

        '& .MuiListItemIcon-root': {
          minWidth: 30,
          color: active ? '#0e7490' : '#94a3b8',
          transition: 'color 140ms ease',
        },
        '& .MuiListItemText-primary': {
          fontSize: '0.84rem',
          fontWeight: active ? 600 : 500,
          letterSpacing: '-0.005em',
          color: active ? '#0f172a' : '#475569',
          transition: 'color 140ms ease',
        },
        '&:hover': {
          background: active ? 'rgba(8,145,178,0.1) !important' : 'rgba(15,23,42,0.04)',
        },
        '&:hover .MuiListItemIcon-root': { color: '#475569' },
        '&:hover .MuiListItemText-primary': { color: '#0f172a' },
      }}
    >
      <ListItemIcon>{item.icon}</ListItemIcon>
      <ListItemText primary={item.label} />
    </ListItemButton>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.displayName ? user.displayName.charAt(0).toUpperCase() : '?';

  const isActive = (path: string) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname === path || location.pathname.startsWith(path + '/');

  const mainItems: NavItem[] = [
    { label: 'Dashboard',    icon: <DashboardIcon fontSize="small" />,    path: '/'        },
    { label: 'Teams',        icon: <GroupsIcon fontSize="small" />,       path: '/teams'   },
    { label: 'Players',      icon: <PeopleIcon fontSize="small" />,       path: '/players' },
    { label: 'Live Auction', icon: <GavelIcon fontSize="small" />,        path: '/auction' },
    { label: 'Results',      icon: <EmojiEventsIcon fontSize="small" />,  path: '/results' },
    { label: 'History',      icon: <HistoryIcon fontSize="small" />,      path: '/history' },
  ];

  const isAdmin = hasPermission('user:CREATE') || hasPermission('league:CREATE');
  const isOwner = hasPermission('auction:BID') && !isAdmin;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          overflowX: 'hidden',
          background: 'rgba(255,255,255,0.95)',
          borderRight: '1px solid #e2e8f0',
          position: 'fixed',
        },
      }}
    >
      {/* ── Cricket decoration layer ────────────────── */}
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
        {/* Small bat — top right */}
        <Box
          component="svg"
          viewBox="0 0 100 220"
          sx={{
            position: 'absolute',
            top: 70,
            right: -26,
            width: 80,
            height: 180,
            transform: 'rotate(28deg)',
            opacity: 0.08,
          }}
        >
          <rect x="42" y="0" width="16" height="52" fill="#1e293b" rx="4" />
          <rect x="38" y="48" width="24" height="10" fill="#0f172a" rx="2" />
          <rect x="24" y="58" width="52" height="155" rx="12" fill="#0891b2" />
          <rect x="34" y="68" width="6" height="135" fill="#ffffff" opacity="0.4" rx="2" />
        </Box>

        {/* Cricket ball — middle left */}
        <Box
          component="svg"
          viewBox="0 0 100 100"
          sx={{
            position: 'absolute',
            top: '40%',
            left: -28,
            width: 80,
            height: 80,
            opacity: 0.08,
          }}
        >
          <circle cx="50" cy="50" r="46" fill="#dc2626" />
          <path d="M 6 50 Q 50 22 94 50" stroke="#fef3c7" strokeWidth="3" fill="none" strokeDasharray="3 3" />
          <path d="M 6 50 Q 50 78 94 50" stroke="#fef3c7" strokeWidth="3" fill="none" strokeDasharray="3 3" />
        </Box>

        {/* Wickets — lower right */}
        <Box
          component="svg"
          viewBox="0 0 100 120"
          sx={{
            position: 'absolute',
            top: '62%',
            right: -10,
            width: 70,
            height: 90,
            opacity: 0.08,
          }}
        >
          <rect x="20" y="15" width="5" height="100" fill="#0e7490" rx="2" />
          <rect x="47.5" y="15" width="5" height="100" fill="#0e7490" rx="2" />
          <rect x="75" y="15" width="5" height="100" fill="#0e7490" rx="2" />
          <rect x="14" y="10" width="17" height="5" fill="#f59e0b" rx="1" />
          <rect x="41.5" y="10" width="17" height="5" fill="#f59e0b" rx="1" />
          <rect x="69" y="10" width="17" height="5" fill="#f59e0b" rx="1" />
        </Box>

        {/* Tiny ball — top left */}
        <Box
          component="svg"
          viewBox="0 0 100 100"
          sx={{
            position: 'absolute',
            top: 28,
            left: 18,
            width: 30,
            height: 30,
            opacity: 0.12,
          }}
        >
          <circle cx="50" cy="50" r="46" fill="#0891b2" />
          <path d="M 6 50 Q 50 22 94 50" stroke="#ffffff" strokeWidth="4" fill="none" strokeDasharray="4 3" />
          <path d="M 6 50 Q 50 78 94 50" stroke="#ffffff" strokeWidth="4" fill="none" strokeDasharray="4 3" />
        </Box>

        {/* Trophy — bottom area */}
        <Box
          component="svg"
          viewBox="0 0 64 64"
          sx={{
            position: 'absolute',
            bottom: 110,
            left: 14,
            width: 56,
            height: 56,
            opacity: 0.09,
          }}
        >
          <path
            d="M16 4h32v8c0 6-3 11-7 13v8h6v6h-22v-6h6v-8c-4-2-7-7-7-13v-8z"
            fill="#d97706"
          />
          <rect x="20" y="46" width="24" height="6" fill="#92400e" rx="2" />
          <rect x="14" y="52" width="36" height="6" fill="#92400e" rx="2" />
        </Box>
      </Box>

      {/* Foreground wrapper so nav stays above decorations */}
      <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box sx={{ height: 60 }} />

      <SectionLabel label="Main" />
      <List disablePadding sx={{ pt: 0.25 }}>
        {mainItems.map((item) => (
          <NavItemButton
            key={item.path}
            item={item}
            active={isActive(item.path)}
            onClick={() => navigate(item.path)}
          />
        ))}
      </List>

      {isOwner && (
        <>
          <SectionLabel label="Owner" />
          <List disablePadding sx={{ pt: 0.25 }}>
            <NavItemButton
              item={{ label: 'My Team', icon: <GroupsIcon fontSize="small" />, path: '/my-team' }}
              active={isActive('/my-team')}
              onClick={() => navigate('/my-team')}
            />
          </List>
        </>
      )}

      {isAdmin && (
        <>
          <SectionLabel label="Admin" />
          <List disablePadding sx={{ pt: 0.25 }}>
            <NavItemButton
              item={{
                label: 'Admin Panel',
                icon: <AdminPanelSettingsIcon fontSize="small" />,
                path: '/admin',
              }}
              active={isActive('/admin') && !location.pathname.startsWith('/admin/audit')}
              onClick={() => navigate('/admin')}
            />
            <NavItemButton
              item={{
                label: 'Audit Logs',
                icon: <SecurityIcon fontSize="small" />,
                path: '/admin/audit',
              }}
              active={isActive('/admin/audit')}
              onClick={() => navigate('/admin/audit')}
            />
          </List>
        </>
      )}

      <Box sx={{ flexGrow: 1 }} />

      {/* User pill — bottom of sidebar */}
      {user && (
        <Box
          sx={{
            mx: 1.25,
            mb: 1.25,
            mt: 1,
            pt: 1.25,
            borderTop: '1px solid #eef2f7',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1,
            py: 1,
            borderRadius: '10px',
            transition: 'background 160ms ease',
            '&:hover': { background: 'rgba(15,23,42,0.03)' },
            '&:hover .signout-btn': { opacity: 1 },
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', lineHeight: 1 }}>
              {initials}
            </Typography>
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#0f172a',
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.displayName}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.6rem',
                color: '#94a3b8',
                letterSpacing: '0.04em',
                lineHeight: 1,
                mt: 0.25,
              }}
            >
              Member
            </Typography>
          </Box>
          <Box
            className="signout-btn"
            onClick={handleLogout}
            title="Sign out"
            sx={{
              opacity: 0,
              flexShrink: 0,
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#94a3b8',
              transition: 'opacity 160ms ease, color 140ms ease, background 140ms ease',
              '&:hover': {
                color: '#b91c1c',
                background: 'rgba(239,68,68,0.08)',
              },
            }}
          >
            <LogoutIcon sx={{ fontSize: 16 }} />
          </Box>
        </Box>
      )}
      </Box>
    </Drawer>
  );
}
