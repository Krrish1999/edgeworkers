import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter
} from 'recharts';
import { useApi } from '../hooks/useApi';

const AnalyticsPage = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [timeRange, setTimeRange] = useState('24h');
  
  const { data: timeseriesData } = useApi(`/api/dashboard/timeseries?range=${timeRange}`);
  const { data: aggregateData } = useApi(`/api/metrics/aggregate?range=${timeRange}&groupBy=country`);

  // Mock historical data for trends
  const historicalData = [
    { date: '2024-01-01', avgColdStart: 4.2, p95: 8.1, throughput: 1240 },
    { date: '2024-01-02', avgColdStart: 3.8, p95: 7.5, throughput: 1350 },
    { date: '2024-01-03', avgColdStart: 4.5, p95: 9.2, throughput: 1180 },
    { date: '2024-01-04', avgColdStart: 3.9, p95: 7.8, throughput: 1420 },
    { date: '2024-01-05', avgColdStart: 4.1, p95: 8.3, throughput: 1380 },
    { date: '2024-01-06', avgColdStart: 3.7, p95: 7.2, throughput: 1450 },
    { date: '2024-01-07', avgColdStart: 4.0, p95: 8.0, throughput: 1400 }
  ];

  const correlationData = [
    { coldStart: 3.2, throughput: 1450, region: 'North America' },
    { coldStart: 4.1, throughput: 1380, region: 'Europe' },
    { coldStart: 5.2, throughput: 1200, region: 'Asia' },
    { coldStart: 6.1, throughput: 1100, region: 'South America' },
    { coldStart: 4.8, throughput: 1250, region: 'Australia' }
  ];

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" gutterBottom>
          Performance Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Deep insights into EdgeWorker performance patterns and trends
        </Typography>
      </Box>

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Time Range</InputLabel>
                <Select
                  value={timeRange}
                  label="Time Range"
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  <MenuItem value="1h">1 Hour</MenuItem>
                  <MenuItem value="6h">6 Hours</MenuItem>
                  <MenuItem value="24h">24 Hours</MenuItem>
                  <MenuItem value="7d">7 Days</MenuItem>
                  <MenuItem value="30d">30 Days</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={handleTabChange}>
          <Tab label="Performance Trends" />
          <Tab label="Regional Analysis" />
          <Tab label="Correlation Analysis" />
          <Tab label="Regression History" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {selectedTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Cold Start Performance Over Time
                </Typography>
                <Box sx={{ height: 400 }}>
                  <ResponsiveContainer>
                    <AreaChart data={historicalData}>
                      <defs>
                        <linearGradient id="avgGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="p95Gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ff6b35" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.7)" />
                      <YAxis stroke="rgba(255,255,255,0.7)" />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#1a1f2e',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 4
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="avgColdStart"
                        stroke="#00d4ff"
                        fillOpacity={1}
                        fill="url(#avgGradient)"
                        name="Average Cold Start (ms)"
                      />
                      <Area
                        type="monotone"
                        dataKey="p95"
                        stroke="#ff6b35"
                        fillOpacity={1}
                        fill="url(#p95Gradient)"
                        name="95th Percentile (ms)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Throughput Analysis
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer>
                    <LineChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.7)" />
                      <YAxis stroke="rgba(255,255,255,0.7)" />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#1a1f2e',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 4
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="throughput"
                        stroke="#4caf50"
                        strokeWidth={3}
                        dot={{ fill: '#4caf50', strokeWidth: 2, r: 4 }}
                        name="Requests/min"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {selectedTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance by Region
                </Typography>
                <Box sx={{ height: 400 }}>
                  <ResponsiveContainer>
                    <BarChart data={aggregateData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="country" stroke="rgba(255,255,255,0.7)" />
                      <YAxis stroke="rgba(255,255,255,0.7)" />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#1a1f2e',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 4
                        }}
                      />
                      <Bar 
                        dataKey="averageTime" 
                        fill="#00d4ff"
                        name="Average Cold Start (ms)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {selectedTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Cold Start vs Throughput Correlation
                </Typography>
                <Box sx={{ height: 400 }}>
                  <ResponsiveContainer>
                    <ScatterChart data={correlationData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis 
                        type="number" 
                        dataKey="coldStart" 
                        name="Cold Start"
                        unit="ms"
                        stroke="rgba(255,255,255,0.7)"
                      />
                      <YAxis 
                        type="number" 
                        dataKey="throughput" 
                        name="Throughput"
                        unit="req/min"
                        stroke="rgba(255,255,255,0.7)"
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{
                          backgroundColor: '#1a1f2e',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 4
                        }}
                      />
                      <Scatter 
                        dataKey="throughput" 
                        fill="#00d4ff"
                        name="Regions"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AnalyticsPage;