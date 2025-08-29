import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  TrendingUp,
  Warning,
  CheckCircle,
  Speed,
  Language,
  Timer
} from '@mui/icons-material';
import { motion } from 'framer-motion';

// Components
import MetricsCard from '../components/MetricsCard';
import GlobalHeatMap from '../components/GlobalHeatMap';
import RealtimeChart from '../components/RealtimeChart';
import AlertsWidget from '../components/AlertsWidget';
import PerformanceTrends from '../components/PerformanceTrends';

// Hooks
import { useWebSocket } from '../hooks/useWebSockets';
import { useApi } from '../hooks/useApi';

const Dashboard = () => {
  const { alerts, realtimeMetrics, connectionStatus } = useWebSocket();
  const { data: overview, loading: overviewLoading, error: overviewError } = useApi('/api/dashboard/overview');
  const { data: heatmapData, loading: heatmapLoading } = useApi('/api/dashboard/heatmap');
  
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');

  // Calculate metrics for display
  const activeAlerts = alerts.filter(alert => alert.status === 'active').length;
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical').length;

  if (overviewLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (overviewError) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load dashboard data: {overviewError.message}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" gutterBottom>
          EdgeWorker Performance Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Real-time monitoring of cold-start performance across Akamai PoPs worldwide
        </Typography>
        
        {/* Connection Status */}
        <Box mt={2}>
          <Chip
            icon={connectionStatus === 'connected' ? <CheckCircle /> : <Warning />}
            label={`Real-time updates: ${connectionStatus}`}
            color={connectionStatus === 'connected' ? 'success' : 'error'}
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Key Metrics Row */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Total PoPs"
            value={overview?.totalPops || 0}
            icon={<Language />}
            color="primary"
            change="+2 this week"
            trend="up"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Avg Cold Start"
            value={`${overview?.averageColdStart || 0}ms`}
            icon={<Timer />}
            color="success"
            change="-0.3ms from yesterday"
            trend="down"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Active Alerts"
            value={activeAlerts}
            icon={<Warning />}
            color="warning"
            change={`${criticalAlerts} critical`}
            trend={criticalAlerts > 0 ? "up" : "neutral"}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Healthy PoPs"
            value={`${overview?.healthyPops || 0}/${overview?.totalPops || 0}`}
            icon={<CheckCircle />}
            color="success"
            change="98.5% uptime"
            trend="up"
          />
        </Grid>
      </Grid>

      {/* Main Content Row */}
      <Grid container spacing={3}>
        {/* Global Heat Map */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 500 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Global Performance Heat Map
              </Typography>
              {heatmapLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" height={400}>
                  <CircularProgress />
                </Box>
              ) : (
                <GlobalHeatMap data={heatmapData} />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Alerts Widget */}
        <Grid item xs={12} lg={4}>
          <AlertsWidget alerts={alerts.slice(0, 10)} />
        </Grid>

        {/* Real-time Performance Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Real-time Performance Metrics
                </Typography>
                <Box>
                  {['1h', '6h', '24h'].map((range) => (
                    <Chip
                      key={range}
                      label={range}
                      onClick={() => setSelectedTimeRange(range)}
                      color={selectedTimeRange === range ? 'primary' : 'default'}
                      variant={selectedTimeRange === range ? 'filled' : 'outlined'}
                      sx={{ ml: 1 }}
                    />
                  ))}
                </Box>
              </Box>
              <RealtimeChart timeRange={selectedTimeRange} />
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Trends */}
        <Grid item xs={12}>
          <PerformanceTrends />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;