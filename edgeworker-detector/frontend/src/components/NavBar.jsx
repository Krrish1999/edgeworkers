import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Chip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Warning as AlertIcon,
  Language as PopsIcon,
  Analytics as AnalyticsIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSockets';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { alerts, connectionStatus } = useWebSocket();
  const [notificationAnchor, setNotificationAnchor] = useState(null);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/alerts', label: 'Alerts', icon: <AlertIcon /> },
    { path: '/pops', label: 'PoPs', icon: <PopsIcon /> },
    { path: '/analytics', label: 'Analytics', icon: <AnalyticsIcon /> }
  ];

  const unreadAlerts = alerts.filter(alert => alert.status === 'active').length;

  const handleNotificationClick = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'disconnected': return 'error';
      default: return 'default';
    }
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <Toolbar>
        {/* Logo/Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              background: 'linear-gradient(135deg, #00d4ff 0%, #ff6b35 100%)',
              borderRadius: '50%',
              mr: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
              A
            </Typography>
          </Box>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            EdgeWorker Monitor
          </Typography>
        </Box>

        {/* Navigation Items */}
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              sx={{
                color: location.pathname === item.path ? 'primary.main' : 'text.primary',
                backgroundColor: location.pathname === item.path ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(0, 212, 255, 0.05)'
                }
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* Right Side Icons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Connection Status */}
          <Chip
            label={connectionStatus}
            color={getConnectionColor()}
            size="small"
            sx={{ textTransform: 'capitalize' }}
          />

          {/* Notifications */}
          <IconButton
            color="inherit"
            onClick={handleNotificationClick}
          >
            <Badge badgeContent={unreadAlerts} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* Settings */}
          <IconButton color="inherit">
            <SettingsIcon />
          </IconButton>
        </Box>

        {/* Notification Menu */}
        <Menu
          anchorEl={notificationAnchor}
          open={Boolean(notificationAnchor)}
          onClose={handleNotificationClose}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 300,
              maxHeight: 400,
              background: '#1a1f2e',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          {alerts.length === 0 ? (
            <MenuItem disabled>
              <Typography variant="body2">No alerts</Typography>
            </MenuItem>
          ) : (
            alerts.slice(0, 5).map((alert, index) => (
              <MenuItem
                key={index}
                onClick={() => {
                  navigate('/alerts');
                  handleNotificationClose();
                }}
                sx={{ whiteSpace: 'normal', py: 1.5 }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {alert.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {alert.pop?.city} ({alert.pop?.code})
                  </Typography>
                </Box>
              </MenuItem>
            ))
          )}
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;