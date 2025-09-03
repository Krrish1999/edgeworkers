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
      elevation={0}
      sx={{ 
        background: 'linear-gradient(135deg, rgba(10, 14, 26, 0.95) 0%, rgba(26, 31, 46, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1300
      }}
    >
      <Toolbar sx={{ px: { xs: 2, md: 3 }, minHeight: { xs: 56, md: 64 } }}>
        {/* Logo/Brand */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mr: { xs: 2, md: 4 },
          minWidth: 'fit-content'
        }}>
          <Box
            sx={{
              width: { xs: 28, md: 36 },
              height: { xs: 28, md: 36 },
              background: 'linear-gradient(135deg, #00d4ff 0%, #ff6b35 100%)',
              borderRadius: '50%',
              mr: { xs: 1, md: 2 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 212, 255, 0.3)'
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'white', 
                fontWeight: 'bold',
                fontSize: { xs: '1rem', md: '1.25rem' }
              }}
            >
              A
            </Typography>
          </Box>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontWeight: 700,
              fontSize: { xs: '1rem', md: '1.25rem' },
              background: 'linear-gradient(135deg, #00d4ff 0%, #ff6b35 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: { xs: 'none', sm: 'block' }
            }}
          >
            EdgeWorker Monitor
          </Typography>
        </Box>

        {/* Navigation Items */}
        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          gap: { xs: 0.5, md: 1 },
          justifyContent: { xs: 'center', md: 'flex-start' },
          overflow: 'hidden'
        }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              startIcon={<Box sx={{ display: { xs: 'none', sm: 'flex' } }}>{item.icon}</Box>}
              onClick={() => navigate(item.path)}
              sx={{
                color: location.pathname === item.path ? 'primary.main' : 'text.primary',
                backgroundColor: location.pathname === item.path ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
                borderRadius: 2,
                px: { xs: 1, md: 2 },
                py: 1,
                minWidth: { xs: 'auto', md: 'auto' },
                fontSize: { xs: '0.75rem', md: '0.875rem' },
                fontWeight: location.pathname === item.path ? 600 : 500,
                border: location.pathname === item.path ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(0, 212, 255, 0.1)',
                  transform: 'translateY(-1px)',
                  border: '1px solid rgba(0, 212, 255, 0.2)'
                }
              }}
            >
              <Box sx={{ display: { xs: 'flex', sm: 'none' } }}>
                {item.icon}
              </Box>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                {item.label}
              </Box>
            </Button>
          ))}
        </Box>

        {/* Right Side Icons */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 1, md: 2 },
          minWidth: 'fit-content'
        }}>
          {/* Connection Status */}
          <Chip
            label={connectionStatus}
            color={getConnectionColor()}
            size="small"
            sx={{ 
              textTransform: 'capitalize',
              fontSize: { xs: '0.7rem', md: '0.75rem' },
              height: { xs: 24, md: 28 },
              display: { xs: 'none', md: 'flex' }
            }}
          />

          {/* Notifications */}
          <IconButton
            color="inherit"
            onClick={handleNotificationClick}
            sx={{
              p: { xs: 1, md: 1.5 },
              '&:hover': {
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                transform: 'scale(1.05)'
              }
            }}
          >
            <Badge 
              badgeContent={unreadAlerts} 
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: { xs: '0.6rem', md: '0.75rem' }
                }
              }}
            >
              <NotificationsIcon sx={{ fontSize: { xs: '1.2rem', md: '1.5rem' } }} />
            </Badge>
          </IconButton>

          {/* Settings */}
          <IconButton 
            color="inherit"
            sx={{
              p: { xs: 1, md: 1.5 },
              display: { xs: 'none', sm: 'flex' },
              '&:hover': {
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                transform: 'scale(1.05)'
              }
            }}
          >
            <SettingsIcon sx={{ fontSize: { xs: '1.2rem', md: '1.5rem' } }} />
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