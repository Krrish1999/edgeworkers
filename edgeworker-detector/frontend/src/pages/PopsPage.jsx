
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress
} from '@mui/material';
import { Search, Language, Speed, TrendingUp } from '@mui/icons-material';
import { useApi } from '../hooks/useApi';

const PopsPage = () => {
  const { data: popsData, loading } = useApi('/pops');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');

  const pops = popsData?.pops || [];

  const filteredPops = pops.filter(pop => {
    const matchesSearch = pop.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pop.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pop.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || pop.status === statusFilter;
    const matchesTier = tierFilter === 'all' || pop.tier === tierFilter;
    
    return matchesSearch && matchesStatus && matchesTier;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'tier1': return 'primary';
      case 'tier2': return 'secondary';
      case 'tier3': return 'default';
      default: return 'default';
    }
  };

  // Calculate summary stats
  const stats = {
    total: pops.length,
    healthy: pops.filter(p => p.status === 'healthy').length,
    warning: pops.filter(p => p.status === 'warning').length,
    critical: pops.filter(p => p.status === 'critical').length,
    avgPerformance: pops.length > 0 ? 
      Math.round((pops.reduce((sum, p) => sum + (p.currentAverage || 0), 0) / pops.length) * 100) / 100 : 0
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h3" gutterBottom>Points of Presence</Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" gutterBottom>
          Points of Presence
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor performance across all Akamai EdgeWorker PoPs globally
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Language color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.total}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total PoPs
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Speed color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.avgPerformance}ms</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Performance
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUp color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.healthy}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Healthy PoPs
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: stats.critical > 0 ? 'error.main' : 'warning.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2
                  }}
                >
                  <Typography variant="h6" color="white">
                    !
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4">{stats.warning + stats.critical}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Issues
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search PoPs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12} sm={3} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="healthy">Healthy</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={3} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Tier</InputLabel>
                <Select
                  value={tierFilter}
                  label="Tier"
                  onChange={(e) => setTierFilter(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="tier1">Tier 1</MenuItem>
                  <MenuItem value="tier2">Tier 2</MenuItem>
                  <MenuItem value="tier3">Tier 3</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* PoPs Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>PoP Code</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Tier</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Current Avg</TableCell>
                <TableCell>Last Update</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPops.map((pop) => (
                <TableRow key={pop.code} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {pop.code.toUpperCase()}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {pop.city}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pop.country}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={pop.tier?.toUpperCase() || 'TIER1'}
                      color={getTierColor(pop.tier)}
                      size="small"
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={pop.status?.toUpperCase() || 'HEALTHY'}
                      color={getStatusColor(pop.status)}
                      size="small"
                    />
                  </TableCell>

                  <TableCell>
                    <Typography 
                      variant="body2"
                      color={pop.currentAverage > 10 ? 'error.main' : 
                             pop.currentAverage > 5 ? 'warning.main' : 'success.main'}
                      fontWeight="bold"
                    >
                      {pop.currentAverage?.toFixed(2) || '0.00'}ms
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {pop.lastUpdate ? new Date(pop.lastUpdate).toLocaleTimeString() : 'Unknown'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredPops.length === 0 && (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">
              No PoPs found matching your criteria
            </Typography>
          </Box>
        )}
      </Card>
    </Box>
  );
};

export default PopsPage;