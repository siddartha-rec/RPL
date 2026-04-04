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
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLeague } from '../context/LeagueContext';

const DRAWER_WIDTH = 248;

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
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: '#334155',
        px: 2.5,
        pt: 2.5,
        pb: 0.75,
        lineHeight: 1,
      }}
    >
      {label}
    </Typography>
  );
}

function NavItemButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <ListItemButton
      selected={active}
      onClick={onClick}
      sx={{
        borderLeft: active ? '3px solid #f59e0b' : '3px solid transparent',
        '& .MuiListItemIcon-root': {
          color: active ? '#f59e0b' : '#475569',
        },
        '& .MuiListItemText-primary': {
          color: active ? '#f1f5f9' : '#94a3b8',
          fontWeight: active ? 600 : 400,
          fontSize: '0.875rem',
        },
        '&:hover .MuiListItemIcon-root': {
          color: '#f59e0b',
        },
        '&:hover .MuiListItemText-primary': {
          color: '#f1f5f9',
        },
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
  const { hasPermission } = useAuth();
  const { activeLeague } = useLeague();

  const isActive = (path: string) => location.pathname === path;

  const mainItems: NavItem[] = [
    { label: 'Dashboard',    icon: <DashboardIcon fontSize="small" />,    path: '/'        },
    { label: 'Teams',        icon: <GroupsIcon fontSize="small" />,       path: '/teams'   },
    { label: 'Players',      icon: <PeopleIcon fontSize="small" />,       path: '/players' },
    { label: 'Live Auction', icon: <GavelIcon fontSize="small" />,        path: '/auction' },
    { label: 'Results',      icon: <EmojiEventsIcon fontSize="small" />,  path: '/results' },
    { label: 'History',      icon: <HistoryIcon fontSize="small" />,      path: '/history' },
  ];

  const isOwner = hasPermission('auction:BID');
  const isAdmin = hasPermission('user:CREATE') || hasPermission('league:CREATE');

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
        },
      }}
    >
      {/* ── Spacer for TopBar ───────────────────────── */}
      <Box sx={{ height: 64 }} />

      {/* ── MAIN navigation ────────────────────────── */}
      <SectionLabel label="Main" />
      <List disablePadding>
        {mainItems.map((item) => (
          <NavItemButton
            key={item.path}
            item={item}
            active={isActive(item.path)}
            onClick={() => navigate(item.path)}
          />
        ))}
      </List>

      {/* ── OWNER section ──────────────────────────── */}
      {isOwner && (
        <>
          <SectionLabel label="Owner" />
          <List disablePadding>
            <NavItemButton
              item={{ label: 'My Team', icon: <GroupsIcon fontSize="small" />, path: '/my-team' }}
              active={isActive('/my-team')}
              onClick={() => navigate('/my-team')}
            />
          </List>
        </>
      )}

      {/* ── ADMIN section ──────────────────────────── */}
      {isAdmin && (
        <>
          <SectionLabel label="Admin" />
          <List disablePadding>
            <NavItemButton
              item={{ label: 'Admin Panel', icon: <AdminPanelSettingsIcon fontSize="small" />, path: '/admin' }}
              active={isActive('/admin')}
              onClick={() => navigate('/admin')}
            />
            <NavItemButton
              item={{ label: 'Audit Logs', icon: <SecurityIcon fontSize="small" />, path: '/admin/audit' }}
              active={isActive('/admin/audit')}
              onClick={() => navigate('/admin/audit')}
            />
          </List>
        </>
      )}

      {/* ── Bottom gradient fade ────────────────────── */}
      <Box sx={{ flexGrow: 1 }} />
      <Box
        sx={{
          height: 80,
          background: 'linear-gradient(to top, rgba(10,10,26,0.9) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
    </Drawer>
  );
}
