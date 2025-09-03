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

  const [overview, setOverview] = useState(null);

  const { data: overviewData, loading: overviewLoading, error: overviewError } = useApi('/dashboard/overview', { 
    refreshInterval: 30000, // Reduced from 10s to 30s
    cacheKey: 'dashboard-overview'
  });
  const { data: heatmapData, loading: heatmapLoading } = useApi('/dashboard/heatmap', { 
    refreshInterval: 60000, // Reduced from 10s to 60s
    cacheKey: 'dashboard-heatmap'
  });
  const { data: alertsData } = useApi('/alerts?limit=10&status=all', { 
    refreshInterval: 45000, // Reduced from 15s to 45s
    cacheKey: 'dashboard-alerts'
  });
  
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');

  // Combine WebSocket alerts with API alerts, prioritizing WebSocket for real-time updates
  const allAlerts = alerts.length > 0 ? alerts : (alertsData?.alerts || []);
  
  // Calculate metrics for display
  const activeAlerts = allAlerts.filter(alert => alert.status === 'active').length;
  const criticalAlerts = allAlerts.filter(alert => alert.severity === 'critical').length;

  useEffect(() => {
    if (overviewData) {
      setOverview(overviewData);
    }
  }, [overviewData]);

  useEffect(() => {
    // Update overview data whenever a new WebSocket message arrives
    if (realtimeMetrics && Object.keys(realtimeMetrics).length > 0) {
      setOverview(realtimeMetrics);
    }
  }, [realtimeMetrics]);

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
            tooltip="metrics.totalPops"
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
            tooltip="metrics.avgColdStart"
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
            tooltip="metrics.activeAlerts"
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
            tooltip="metrics.healthyPops"
          />
        </Grid>
      </Grid>

      {/* Main Content Row */}
      <Grid container spacing={3}>
        {/* Global Heat Map */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 500 }}>
            <CardContent>
              {heatmapLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" height={400}>
                  <CircularProgress />
                </Box>
              ) : (
                <GlobalHeatMap data={heatmapData?.data || []} />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Alerts Widget */}
        <Grid item xs={12} lg={4}>
          <AlertsWidget alerts={allAlerts.slice(0, 10)} />
        </Grid>

        {/* Real-time Performance Chart */}
        <Grid item xs={12}>
          <RealtimeChart timeRange={selectedTimeRange} />
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