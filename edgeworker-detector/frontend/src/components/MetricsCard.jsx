import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const MetricsCard = ({ title, value, icon, color, change, trend }) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp sx={{ fontSize: 16 }} />;
      case 'down': return <TrendingDown sx={{ fontSize: 16 }} />;
      default: return <TrendingFlat sx={{ fontSize: 16 }} />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return color === 'warning' ? 'error.main' : 'success.main';
      case 'down': return color === 'warning' ? 'success.main' : 'error.main';
      default: return 'text.secondary';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card 
        sx={{ 
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, var(--mui-palette-${color}-main), var(--mui-palette-${color}-light))`
          }
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box flex={1}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {title}
              </Typography>
              <Typography variant="h4" component="div" fontWeight="bold">
                {value}
              </Typography>
              
              {change && (
                <Box display="flex" alignItems="center" mt={1}>
                  <Box color={getTrendColor()}>
                    {getTrendIcon()}
                  </Box>
                  <Typography 
                    variant="body2" 
                    color={getTrendColor()}
                    ml={0.5}
                  >
                    {change}
                  </Typography>
                </Box>
              )}
            </Box>
            
            <Avatar 
              sx={{ 
                bgcolor: `${color}.light`,
                color: `${color}.contrastText`,
                width: 56,
                height: 56
              }}
            >
              {icon}
            </Avatar>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MetricsCard;