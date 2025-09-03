
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
  const { data: popsData, loading } = useApi('/pops', { refreshInterval: 10000 });
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
    <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box mb={{ xs: 3, md: 4 }}>
        <Typography 
          variant="h3" 
          gutterBottom
          sx={{ 
            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
            fontWeight: 700,
            background: 'linear-gradient(135deg, #00d4ff 0%, #ff6b35 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Points of Presence
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}
        >
          Monitor performance across all Akamai EdgeWorker PoPs globally
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={{ xs: 2, md: 3 }} mb={{ xs: 3, md: 4 }}>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Box display="flex" alignItems="center" flexDirection={{ xs: 'column', sm: 'row' }}>
                <Language 
                  color="primary" 
                  sx={{ 
                    mr: { xs: 0, sm: 2 }, 
                    mb: { xs: 1, sm: 0 },
                    fontSize: { xs: '2rem', md: '2.5rem' }
                  }} 
                />
                <Box textAlign={{ xs: 'center', sm: 'left' }}>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontSize: { xs: '1.5rem', md: '2rem' },
                      fontWeight: 700,
                      color: 'primary.main'
                    }}
                  >
                    {stats.total}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                  >
                    Total PoPs
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Box display="flex" alignItems="center" flexDirection={{ xs: 'column', sm: 'row' }}>
                <Speed 
                  color="success" 
                  sx={{ 
                    mr: { xs: 0, sm: 2 }, 
                    mb: { xs: 1, sm: 0 },
                    fontSize: { xs: '2rem', md: '2.5rem' }
                  }} 
                />
                <Box textAlign={{ xs: 'center', sm: 'left' }}>
                  <Typography 
                    variant="h4"
                    sx={{ 
                      fontSize: { xs: '1.5rem', md: '2rem' },
                      fontWeight: 700,
                      color: 'success.main'
                    }}
                  >
                    {stats.avgPerformance}ms
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                  >
                    Avg Performance
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Box display="flex" alignItems="center" flexDirection={{ xs: 'column', sm: 'row' }}>
                <TrendingUp 
                  color="success" 
                  sx={{ 
                    mr: { xs: 0, sm: 2 }, 
                    mb: { xs: 1, sm: 0 },
                    fontSize: { xs: '2rem', md: '2.5rem' }
                  }} 
                />
                <Box textAlign={{ xs: 'center', sm: 'left' }}>
                  <Typography 
                    variant="h4"
                    sx={{ 
                      fontSize: { xs: '1.5rem', md: '2rem' },
                      fontWeight: 700,
                      color: 'success.main'
                    }}
                  >
                    {stats.healthy}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                  >
                    Healthy PoPs
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Box display="flex" alignItems="center" flexDirection={{ xs: 'column', sm: 'row' }}>
                <Box
                  sx={{
                    width: { xs: 32, md: 40 },
                    height: { xs: 32, md: 40 },
                    borderRadius: '50%',
                    bgcolor: stats.critical > 0 ? 'error.main' : 'warning.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: { xs: 0, sm: 2 },
                    mb: { xs: 1, sm: 0 }
                  }}
                >
                  <Typography 
                    variant="h6" 
                    color="white"
                    sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}
                  >
                    !
                  </Typography>
                </Box>
                <Box textAlign={{ xs: 'center', sm: 'left' }}>
                  <Typography 
                    variant="h4"
                    sx={{ 
                      fontSize: { xs: '1.5rem', md: '2rem' },
                      fontWeight: 700,
                      color: stats.critical > 0 ? 'error.main' : 'warning.main'
                    }}
                  >
                    {stats.warning + stats.critical}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                  >
                    Issues
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: { xs: 2, md: 3 } }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Grid container spacing={{ xs: 2, md: 3 }} alignItems="center">
            <Grid item xs={12} sm={12} md={6} lg={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search PoPs by city, country, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.08)'
                    }
                  }
                }}
              />
            </Grid>

            <Grid item xs={6} sm={6} md={3} lg={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.08)'
                    }
                  }}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="healthy">Healthy</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={6} md={3} lg={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Tier</InputLabel>
                <Select
                  value={tierFilter}
                  label="Tier"
                  onChange={(e) => setTierFilter(e.target.value)}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.08)'
                    }
                  }}
                >
                  <MenuItem value="all">All Tiers</MenuItem>
                  <MenuItem value="tier1">Tier 1</MenuItem>
                  <MenuItem value="tier2">Tier 2</MenuItem>
                  <MenuItem value="tier3">Tier 3</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={12} md={12} lg={4}>
              <Box display="flex" justifyContent={{ xs: 'center', lg: 'flex-end' }} gap={1}>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  Showing {filteredPops.length} of {pops.length} PoPs
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* PoPs Table */}
      <Card sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: { xs: '70vh', md: '80vh' } }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>PoP Code</TableCell>
                <TableCell sx={{ fontWeight: 600, minWidth: 150 }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 600, minWidth: 80, display: { xs: 'none', sm: 'table-cell' } }}>Tier</TableCell>
                <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>Performance</TableCell>
                <TableCell sx={{ fontWeight: 600, minWidth: 120, display: { xs: 'none', md: 'table-cell' } }}>Last Update</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPops.map((pop) => (
                <TableRow 
                  key={pop.code} 
                  hover
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(0, 212, 255, 0.05)',
                      transform: 'scale(1.01)',
                      transition: 'all 0.2s ease'
                    },
                    cursor: 'pointer'
                  }}
                >
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      fontWeight="bold"
                      sx={{ 
                        color: 'primary.main',
                        fontSize: { xs: '0.8rem', md: '0.875rem' }
                      }}
                    >
                      {pop.code.toUpperCase()}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Box>
                      <Typography 
                        variant="body2"
                        sx={{ 
                          fontWeight: 500,
                          fontSize: { xs: '0.8rem', md: '0.875rem' }
                        }}
                      >
                        {pop.city}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}
                      >
                        {pop.country}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Chip
                      label={pop.tier?.toUpperCase() || 'TIER1'}
                      color={getTierColor(pop.tier)}
                      size="small"
                      sx={{ 
                        fontSize: { xs: '0.7rem', md: '0.75rem' },
                        height: { xs: 24, md: 28 }
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={pop.status?.toUpperCase() || 'HEALTHY'}
                      color={getStatusColor(pop.status)}
                      size="small"
                      sx={{ 
                        fontSize: { xs: '0.7rem', md: '0.75rem' },
                        height: { xs: 24, md: 28 },
                        fontWeight: 600
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    <Box>
                      <Typography 
                        variant="body2"
                        color={pop.currentAverage > 10 ? 'error.main' : 
                               pop.currentAverage > 5 ? 'warning.main' : 'success.main'}
                        fontWeight="bold"
                        sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}
                      >
                        {pop.currentAverage?.toFixed(2) || '0.00'}ms
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ 
                          display: 'block',
                          fontSize: { xs: '0.65rem', md: '0.7rem' }
                        }}
                      >
                        {pop.currentAverage > 10 ? 'Slow' : 
                         pop.currentAverage > 5 ? 'Fair' : 'Fast'}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      {pop.lastUpdate ? new Date(pop.lastUpdate).toLocaleTimeString() : 'Unknown'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredPops.length === 0 && (
          <Box 
            p={{ xs: 3, md: 4 }} 
            textAlign="center"
            sx={{
              background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(255, 107, 53, 0.1) 100%)',
              borderRadius: 2,
              m: 2
            }}
          >
            <Typography 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}
            >
              No PoPs found matching your criteria
            </Typography>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              Try adjusting your search terms or filters
            </Typography>
          </Box>
        )}
      </Card>
    </Box>
  );
};

export default PopsPage;