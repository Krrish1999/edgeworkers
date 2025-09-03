import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error,
  Visibility,
  Edit
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useWebSocket } from '../hooks/useWebSockets';
import { useApi, useApiPost } from '../hooks/useApi';
import toast from 'react-hot-toast';

const AlertsPage = () => {
  const { alerts } = useWebSocket();
  const { data: alertsData, refetch } = useApi('/alerts?limit=100&status=all', { refreshInterval: 15000 });
  const { patch, loading: actionLoading } = useApiPost();
  
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, type: null });
  const [actionForm, setActionForm] = useState({ notes: '', resolvedBy: '' });
  const [filterStatus, setFilterStatus] = useState('all');

  const allAlerts = alertsData?.alerts || [];
  
  const filteredAlerts = allAlerts.filter(alert => 
    filterStatus === 'all' || alert.status === filterStatus
  );

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <Error color="error" />;
      case 'high': return <Warning color="error" />;
      case 'medium': return <Warning color="warning" />;
      default: return <CheckCircle color="success" />;
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'error';
      case 'acknowledged': return 'warning';
      case 'resolved': return 'success';
      default: return 'default';
    }
  };

  const handleAcknowledge = async (alert) => {
    try {
      await patch(`/api/alerts/${alert._id || alert.id}/acknowledge`, {
        acknowledged_by: 'Current User',
        notes: actionForm.notes
      });
      
      toast.success('Alert acknowledged');
      refetch();
      setActionDialog({ open: false, type: null });
      setActionForm({ notes: '', resolvedBy: '' });
    } catch (error) {
      toast.error('Failed to acknowledge alert');
    }
  };

  const handleResolve = async (alert) => {
    try {
      await patch(`/api/alerts/${alert._id || alert.id}/resolve`, {
        resolved_by: actionForm.resolvedBy,
        resolution_notes: actionForm.notes
      });
      
      toast.success('Alert resolved');
      refetch();
      setActionDialog({ open: false, type: null });
      setActionForm({ notes: '', resolvedBy: '' });
    } catch (error) {
      toast.error('Failed to resolve alert');
    }
  };

  const openActionDialog = (alert, type) => {
    setSelectedAlert(alert);
    setActionDialog({ open: true, type });
    setActionForm({ notes: '', resolvedBy: '' });
  };

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
          Alert Management
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}
        >
          Monitor and manage performance alerts across all EdgeWorker PoPs
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Box mb={3}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Showing {filteredAlerts.length} alerts • {alerts.filter(a => a.status === 'active').length} active • 
          {alerts.filter(a => a.severity === 'critical').length} critical
        </Alert>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: { xs: 2, md: 3 } }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box 
            display="flex" 
            gap={{ xs: 1, md: 2 }} 
            alignItems="center"
            flexDirection={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
          >
            <Box display="flex" gap={{ xs: 1, md: 2 }} alignItems="center" flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: { xs: 100, md: 140 } }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.08)'
                    }
                  }}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="acknowledged">Acknowledged</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                </Select>
              </FormControl>
              
              <Button 
                variant="outlined" 
                onClick={refetch}
                sx={{
                  borderRadius: 2,
                  px: { xs: 2, md: 3 },
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                  }
                }}
              >
                Refresh
              </Button>
            </Box>

            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: '0.8rem', md: '0.875rem' },
                textAlign: { xs: 'center', sm: 'right' }
              }}
            >
              Auto-refresh every 15 seconds
            </Typography>
          </Box>
        </CardContent>
      </Card>

  {/* Alerts Table */}
  <Card sx={{ overflow: 'hidden' }}>
    <TableContainer sx={{ maxHeight: { xs: '70vh', md: '80vh' } }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, minWidth: 140 }}>Severity</TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 250 }}>Message</TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 150, display: { xs: 'none', md: 'table-cell' } }}>Location</TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 120, display: { xs: 'none', sm: 'table-cell' } }}>Created</TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredAlerts.map((alert, index) => (
            <TableRow 
              key={alert._id || alert.id || index} 
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
                <Box display="flex" alignItems="center" gap={1}>
                  {getSeverityIcon(alert.severity)}
                  <Chip 
                    label={alert.severity?.toUpperCase() || 'HIGH'} 
                    color={getSeverityColor(alert.severity)}
                    size="small"
                    sx={{ 
                      fontSize: { xs: '0.7rem', md: '0.75rem' },
                      height: { xs: 24, md: 28 },
                      fontWeight: 600
                    }}
                  />
                </Box>
              </TableCell>
              
              <TableCell>
                <Box>
                  <Typography 
                    variant="body2"
                    sx={{ 
                      fontWeight: 500,
                      fontSize: { xs: '0.8rem', md: '0.875rem' },
                      lineHeight: 1.4
                    }}
                  >
                    {alert.message || `Regression at ${alert.pop?.city}`}
                  </Typography>
                  {alert.analysis?.summary && (
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ 
                        display: 'block',
                        mt: 0.5,
                        fontSize: { xs: '0.7rem', md: '0.75rem' }
                      }}
                    >
                      {alert.analysis.summary}
                    </Typography>
                  )}
                  {/* Show location on mobile when location column is hidden */}
                  <Box sx={{ display: { xs: 'block', md: 'none' }, mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {alert.city || alert.pop?.city}, {alert.country || alert.pop?.country} ({alert.pop_code || alert.pop?.code})
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                <Box>
                  <Typography 
                    variant="body2"
                    sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}
                  >
                    {alert.city || alert.pop?.city}, {alert.country || alert.pop?.country}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}
                  >
                    {alert.pop_code || alert.pop?.code}
                  </Typography>
                </Box>
              </TableCell>
              
              <TableCell>
                <Chip 
                  label={alert.status?.toUpperCase() || 'ACTIVE'} 
                  color={getStatusColor(alert.status)}
                  size="small"
                  sx={{ 
                    fontSize: { xs: '0.7rem', md: '0.75rem' },
                    height: { xs: 24, md: 28 },
                    fontWeight: 600
                  }}
                />
              </TableCell>
              
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                <Typography 
                  variant="body2"
                  sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}
                >
                  {alert.created_at || alert.timestamp ? 
                    formatDistanceToNow(new Date(alert.created_at || alert.timestamp), { addSuffix: true }) :
                    'Just now'
                  }
                </Typography>
              </TableCell>
              
              <TableCell>
                <Box display="flex" gap={0.5} flexWrap="wrap">
                  <Tooltip title="View Details">
                    <IconButton 
                      size="small" 
                      onClick={() => setSelectedAlert(alert)}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'rgba(0, 212, 255, 0.1)',
                          transform: 'scale(1.1)'
                        }
                      }}
                    >
                      <Visibility sx={{ fontSize: { xs: '1rem', md: '1.2rem' } }} />
                    </IconButton>
                  </Tooltip>
                  
                  {alert.status === 'active' && (
                    <Tooltip title="Acknowledge">
                      <IconButton 
                        size="small" 
                        onClick={() => openActionDialog(alert, 'acknowledge')}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            transform: 'scale(1.1)'
                          }
                        }}
                      >
                        <CheckCircle sx={{ fontSize: { xs: '1rem', md: '1.2rem' } }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  
                  {(alert.status === 'active' || alert.status === 'acknowledged') && (
                    <Tooltip title="Resolve">
                      <IconButton 
                        size="small" 
                        onClick={() => openActionDialog(alert, 'resolve')}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'rgba(255, 152, 0, 0.1)',
                            transform: 'scale(1.1)'
                          }
                        }}
                      >
                        <Edit sx={{ fontSize: { xs: '1rem', md: '1.2rem' } }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>

    {filteredAlerts.length === 0 && (
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
          No alerts found matching your criteria
        </Typography>
        <Typography 
          variant="caption" 
          color="text.secondary"
          sx={{ mt: 1, display: 'block' }}
        >
          All systems are running smoothly
        </Typography>
      </Box>
    )}
  </Card>

  {/* Action Dialog */}
  <Dialog 
    open={actionDialog.open} 
    onClose={() => setActionDialog({ open: false, type: null })}
    maxWidth="sm"
    fullWidth
  >
    <DialogTitle>
      {actionDialog.type === 'acknowledge' ? 'Acknowledge Alert' : 'Resolve Alert'}
    </DialogTitle>
    <DialogContent>
      <Box sx={{ pt: 1 }}>
        {actionDialog.type === 'resolve' && (
          <TextField
            fullWidth
            label="Resolved By"
            value={actionForm.resolvedBy}
            onChange={(e) => setActionForm(prev => ({ ...prev, resolvedBy: e.target.value }))}
            sx={{ mb: 2 }}
            required
          />
        )}
        
        <TextField
          fullWidth
          multiline
          rows={3}
          label={actionDialog.type === 'acknowledge' ? 'Notes' : 'Resolution Notes'}
          value={actionForm.notes}
          onChange={(e) => setActionForm(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Add any relevant notes or resolution details..."
        />
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => setActionDialog({ open: false, type: null })}>
        Cancel
      </Button>
      <Button 
        onClick={() => {
          if (actionDialog.type === 'acknowledge') {
            handleAcknowledge(selectedAlert);
          } else {
            handleResolve(selectedAlert);
          }
        }}
        variant="contained"
        disabled={actionLoading || (actionDialog.type === 'resolve' && !actionForm.resolvedBy)}
      >
        {actionDialog.type === 'acknowledge' ? 'Acknowledge' : 'Resolve'}
      </Button>
    </DialogActions>
  </Dialog>
</Box>
);
};

export default AlertsPage;
