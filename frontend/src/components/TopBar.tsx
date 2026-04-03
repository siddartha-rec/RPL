import { AppBar, Toolbar, Typography, Chip, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <Typography
          variant="h6"
          component="div"
          sx={{ color: '#f59e0b', fontWeight: 700, mr: 2 }}
        >
          RPL 2025
        </Typography>
        <Chip
          label="AUCTION"
          color="error"
          size="small"
          sx={{ mr: 2 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        {user ? (
          <>
            <Typography variant="body2" sx={{ mr: 2 }}>
              {user.displayName}
            </Typography>
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </>
        ) : (
          <Button color="inherit" onClick={() => navigate('/login')}>
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
