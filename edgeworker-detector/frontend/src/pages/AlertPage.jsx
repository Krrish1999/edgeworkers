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
  const { data: alertsData, refetch } = useApi('/alerts?limit=100');
  const { patch, loading: actionLoading } = useApiPost();
  
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, type: null });
  const [actionForm, setActionForm] = useState({ notes: '', resolvedBy: '' });
  const [filterStatus, setFilterStatus] = useState('all');

  const allAlerts = alertsData?.alerts || alerts || [];
  
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
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" gutterBottom>
          Alert Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
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
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="acknowledged">Acknowledged</MenuItem>
            <MenuItem value="resolved">Resolved</MenuItem>
          </Select>
        </FormControl>
        
        <Button variant="outlined" onClick={refetch}>
          Refresh
        </Button>
      </Box>
    </CardContent>
  </Card>

  {/* Alerts Table */}
  <Card>
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Severity</TableCell>
            <TableCell>Message</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredAlerts.map((alert, index) => (
            <TableRow key={alert._id || alert.id || index} hover>
              <TableCell>
                <Box display="flex" alignItems="center">
                  {getSeverityIcon(alert.severity)}
                  <Chip 
                    label={alert.severity?.toUpperCase() || 'HIGH'} 
                    color={getSeverityColor(alert.severity)}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Box>
              </TableCell>
              
              <TableCell>
                <Typography variant="body2">
                  {alert.message || `Regression at ${alert.pop?.city}`}
                </Typography>
                {alert.analysis?.summary && (
                  <Typography variant="caption" color="text.secondary">
                    {alert.analysis.summary}
                  </Typography>
                )}
              </TableCell>
              
              <TableCell>
                <Box>
                  <Typography variant="body2">
                    {alert.city || alert.pop?.city}, {alert.country || alert.pop?.country}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {alert.pop_code || alert.pop?.code}
                  </Typography>
                </Box>
              </TableCell>
              
              <TableCell>
                <Chip 
                  label={alert.status?.toUpperCase() || 'ACTIVE'} 
                  color={getStatusColor(alert.status)}
                  size="small"
                />
              </TableCell>
              
              <TableCell>
                <Typography variant="body2">
                  {alert.created_at || alert.timestamp ? 
                    formatDistanceToNow(new Date(alert.created_at || alert.timestamp), { addSuffix: true }) :
                    'Just now'
                  }
                </Typography>
              </TableCell>
              
              <TableCell>
                <Box display="flex" gap={1}>
                  <Tooltip title="View Details">
                    <IconButton size="small" onClick={() => setSelectedAlert(alert)}>
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  
                  {alert.status === 'active' && (
                    <Tooltip title="Acknowledge">
                      <IconButton 
                        size="small" 
                        onClick={() => openActionDialog(alert, 'acknowledge')}
                      >
                        <CheckCircle />
                      </IconButton>
                    </Tooltip>
                  )}
                  
                  {(alert.status === 'active' || alert.status === 'acknowledged') && (
                    <Tooltip title="Resolve">
                      <IconButton 
                        size="small" 
                        onClick={() => openActionDialog(alert, 'resolve')}
                      >
                        <Edit />
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
