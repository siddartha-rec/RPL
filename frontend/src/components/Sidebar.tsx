import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Divider, Toolbar } from '@mui/material';
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

const DRAWER_WIDTH = 240;

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const publicItems = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { label: 'Teams', icon: <GroupsIcon />, path: '/teams' },
    { label: 'Players', icon: <PeopleIcon />, path: '/players' },
    { label: 'Live Auction', icon: <GavelIcon />, path: '/auction' },
    { label: 'Results', icon: <EmojiEventsIcon />, path: '/results' },
    { label: 'History', icon: <HistoryIcon />, path: '/history' },
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
        },
      }}
    >
      <Toolbar />
      <List>
        {publicItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={isActive(item.path)}
            onClick={() => navigate(item.path)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>

      {isOwner && (
        <>
          <Divider />
          <List>
            <ListItemButton
              selected={isActive('/my-team')}
              onClick={() => navigate('/my-team')}
            >
              <ListItemIcon><GroupsIcon /></ListItemIcon>
              <ListItemText primary="My Team" />
            </ListItemButton>
          </List>
        </>
      )}

      {isAdmin && (
        <>
          <Divider />
          <List>
            <ListItemButton
              selected={isActive('/admin')}
              onClick={() => navigate('/admin')}
            >
              <ListItemIcon><AdminPanelSettingsIcon /></ListItemIcon>
              <ListItemText primary="Admin Panel" />
            </ListItemButton>
            <ListItemButton
              selected={isActive('/admin/audit')}
              onClick={() => navigate('/admin/audit')}
            >
              <ListItemIcon><SecurityIcon /></ListItemIcon>
              <ListItemText primary="Audit Logs" />
            </ListItemButton>
          </List>
        </>
      )}
    </Drawer>
  );
}
