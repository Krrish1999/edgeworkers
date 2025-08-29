import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  Button
} from '@mui/material';
import {
  Warning,
  Error,
  Info,
  CheckCircle,
  ArrowForward
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

const AlertsWidget = ({ alerts = [] }) => {
  const navigate = useNavigate();

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <Error />;
      case 'high': return <Warning />;
      case 'medium': return <Info />;
      default: return <CheckCircle />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'success';
    }
  };

  return (
    <Card sx={{ height: 500, display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Recent Alerts
          </Typography>
          <Chip 
            label={alerts.length} 
            color={alerts.length > 0 ? 'error' : 'success'} 
            size="small" 
          />
        </Box>

        {alerts.length === 0 ? (
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            justifyContent="center" 
            flex={1}
            color="text.secondary"
          >
            <CheckCircle sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body2">
              No active alerts
            </Typography>
          </Box>
        ) : (
          <>
            <List sx={{ flex: 1, overflow: 'auto' }}>
              {alerts.map((alert, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ListItem 
                    alignItems="flex-start"
                    sx={{ 
                      px: 0,
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: 1
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar 
                        sx={{ 
                          bgcolor: `${getSeverityColor(alert.severity)}.main`,
                          width: 32,
                          height: 32
                        }}
                      >
                        {getSeverityIcon(alert.severity)}
                      </Avatar>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={
                        <Box>
                          <Typography variant="body2" component="span">
                            {alert.message || `Regression at ${alert.pop?.city}`}
                          </Typography>
                          <Chip 
                            label={alert.severity?.toUpperCase() || 'HIGH'} 
                            size="small" 
                            color={getSeverityColor(alert.severity)}
                            sx={{ ml: 1, fontSize: '0.7rem', height: 20 }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box mt={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            {alert.pop?.code} • {alert.analysis?.summary || 'Performance degradation detected'}
                          </Typography>
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            {alert.timestamp ? 
                              formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true }) :
                              'Just now'
                            }
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  
                  {index < alerts.length - 1 && <Divider variant="inset" component="li" />}
                </motion.div>
              ))}
            </List>

            <Box mt={2}>
              <Button
                fullWidth
                variant="outlined"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/alerts')}
                size="small"
              >
                View All Alerts
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsWidget;