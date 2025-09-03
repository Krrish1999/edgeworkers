import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import {
  Box,
  Typography,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardContent
} from '@mui/material';
import { format } from 'date-fns';
import { useApi } from '../hooks/useApi';
import InfoTooltip from './InfoTooltip';

const RealtimeChart = ({ timeRange: initialTimeRange = '1h' }) => {
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const { data, loading, error } = useApi(`/dashboard/timeseries?range=${timeRange}`, {
    refreshInterval: timeRange === '1h' ? 30000 : 60000, // Slower refresh for longer ranges
    cacheKey: `timeseries-${timeRange}`,
    dependencies: [timeRange]
  });
  const [chartData, setChartData] = useState([]);

  const handleTimeRangeChange = (_, newTimeRange) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
    }
  };

  useEffect(() => {
    if (!data || !data.data || data.data.length === 0) return;

    // Process data for chart - use data.data since API returns {data: [...]}
    const processed = data.data.reduce((acc, item) => {
      const timeKey = format(new Date(item.timestamp), 'HH:mm');

      if (!acc[timeKey]) {
        acc[timeKey] = {
          time: timeKey,
          timestamp: item.timestamp,
          values: [],
          count: 0
        };
      }

      acc[timeKey].values.push(item.value);
      acc[timeKey].count++;

      return acc;
    }, {});

    const chartPoints = Object.values(processed)
      .map(point => ({
        time: point.time,
        timestamp: point.timestamp,
        average: point.values.reduce((a, b) => a + b, 0) / point.values.length,
        min: Math.min(...point.values),
        max: Math.max(...point.values),
        p95: calculatePercentile(point.values, 95)
      }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Only update if data actually changed
    setChartData(prevData => {
      if (JSON.stringify(prevData) !== JSON.stringify(chartPoints)) {
        return chartPoints;
      }
      return prevData;
    });
  }, [data]);

  const calculatePercentile = (values, percentile) => {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 2
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            {label}
          </Typography>
          {payload.map((entry, index) => (
            <Typography
              key={index}
              variant="body2"
              sx={{ color: entry.color }}
            >
              {entry.name}: {entry.value.toFixed(2)}ms
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  const CustomLegend = (props) => {
    const { payload } = props;

    return (
      <Box display="flex" alignItems="center" justifyContent="center" gap={2} flexWrap="wrap">
        <InfoTooltip
          content="components.realtimeChartLegend"
          placement="top"
          size="small"
        />
        {payload && payload.map((entry, index) => (
          <Box key={index} display="flex" alignItems="center" gap={0.5}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: entry.dataKey === 'min' ? 0 : 1,
                border: entry.dataKey === 'min' ? `2px dashed ${entry.color}` : 'none',
                backgroundColor: entry.dataKey === 'min' ? 'transparent' : entry.color
              }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
              {entry.value}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !chartData.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={300}>
        <Typography color="text.secondary">
          {error ? 'Failed to load chart data' : 'No data available'}
        </Typography>
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Chart Header with Tooltip */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6">
              Real-time Performance
            </Typography>
            <InfoTooltip
              content="components.realtimeChart"
              placement="right"
              size="small"
            />
          </Box>

          {/* Time Range Selector with Tooltip */}
          <Box display="flex" alignItems="center" gap={1}>
            <InfoTooltip
              content="components.realtimeTimeRange"
              placement="left"
              size="small"
            />
            <ToggleButtonGroup
              value={timeRange}
              exclusive
              onChange={handleTimeRangeChange}
              size="small"
              sx={{ height: 32 }}
            >
              <ToggleButton value="1h" sx={{ px: 2, fontSize: '0.8rem' }}>
                1H
              </ToggleButton>
              <ToggleButton value="6h" sx={{ px: 2, fontSize: '0.8rem' }}>
                6H
              </ToggleButton>
              <ToggleButton value="24h" sx={{ px: 2, fontSize: '0.8rem' }}>
                24H
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Chart Container */}
        <Box sx={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="averageGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="p95Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ff6b35" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="time"
                stroke="rgba(255,255,255,0.7)"
                fontSize={12}
              />
              <YAxis
                stroke="rgba(255,255,255,0.7)"
                fontSize={12}
                label={{
                  value: 'Cold Start Time (ms)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'rgba(255,255,255,0.7)' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Custom Legend with Tooltip */}
              <Legend
                content={<CustomLegend />}
                wrapperStyle={{ paddingTop: '20px' }}
              />

              <Area
                type="monotone"
                dataKey="p95"
                stroke="#ff6b35"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#p95Gradient)"
                name="95th Percentile"
              />

              <Area
                type="monotone"
                dataKey="average"
                stroke="#00d4ff"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#averageGradient)"
                name="Average"
              />

              <Line
                type="monotone"
                dataKey="min"
                stroke="#4caf50"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Minimum"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RealtimeChart;