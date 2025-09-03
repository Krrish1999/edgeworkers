import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip
} from '@mui/material';
import {
  Language,
  Speed,
  Warning,
  CheckCircle
} from '@mui/icons-material';
import InfoTooltip from './InfoTooltip.jsx';

/**
 * Example component demonstrating InfoTooltip usage
 * This component shows how to integrate tooltips with various UI elements
 */
const TooltipExample = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Tooltip Examples
      </Typography>

      <Grid container spacing={3}>
        {/* Metrics Cards with Tooltips */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Language color="primary" />
                  <Typography variant="h6">Total PoPs</Typography>
                </Box>
                <InfoTooltip content="metrics.totalPops" size="small" />
              </Box>
              <Typography variant="h3" color="primary">
                142
              </Typography>
              <Typography variant="body2" color="text.secondary">
                +2 this week
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Speed color="warning" />
                  <Typography variant="h6">Avg Cold Start</Typography>
                </Box>
                <InfoTooltip content="metrics.avgColdStart" size="small" />
              </Box>
              <Typography variant="h3" color="warning.main">
                47ms
              </Typography>
              <Typography variant="body2" color="text.secondary">
                -5ms from last hour
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Warning color="error" />
                  <Typography variant="h6">Active Alerts</Typography>
                </Box>
                <InfoTooltip content="metrics.activeAlerts" size="small" />
              </Box>
              <Typography variant="h3" color="error.main">
                3
              </Typography>
              <Typography variant="body2" color="text.secondary">
                2 critical, 1 warning
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircle color="success" />
                  <Typography variant="h6">Healthy PoPs</Typography>
                </Box>
                <InfoTooltip content="metrics.healthyPops" size="small" />
              </Box>
              <Typography variant="h3" color="success.main">
                138
              </Typography>
              <Typography variant="body2" color="text.secondary">
                97.2% healthy
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Component Examples */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>

                <InfoTooltip content="components.heatmap" placement="left" />
              </Box>
              <Box
                sx={{
                  height: 200,
                  backgroundColor: 'rgba(0, 212, 255, 0.1)',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  Heat Map Visualization Area
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Different Tooltip Variants */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tooltip Variants
              </Typography>

              <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                {/* Small tooltip */}
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Small:</Typography>
                  <InfoTooltip
                    content={{
                      title: "Small Tooltip",
                      content: "This is a small tooltip example"
                    }}
                    size="small"
                  />
                </Box>

                {/* Medium tooltip */}
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Medium:</Typography>
                  <InfoTooltip
                    content={{
                      title: "Medium Tooltip",
                      content: "This is a medium tooltip example with more content"
                    }}
                    size="medium"
                  />
                </Box>

                {/* Large tooltip */}
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Large:</Typography>
                  <InfoTooltip
                    content={{
                      title: "Large Tooltip",
                      content: "This is a large tooltip example with extensive content and details"
                    }}
                    size="large"
                  />
                </Box>

                {/* Interactive tooltip */}
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Interactive:</Typography>
                  <InfoTooltip
                    content={{
                      title: "Interactive Tooltip",
                      content: "This tooltip has interactive elements",
                      actions: [
                        {
                          label: "Learn More",
                          url: "/docs",
                          type: "internal"
                        },
                        {
                          label: "External Link",
                          url: "https://example.com",
                          type: "external"
                        }
                      ]
                    }}
                    interactive={true}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Placement Examples */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tooltip Placements
              </Typography>

              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                sx={{ minHeight: 200, position: 'relative' }}
              >
                {/* Center element */}
                <Box
                  sx={{
                    width: 100,
                    height: 100,
                    backgroundColor: 'primary.main',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="body2" color="white">
                    Center
                  </Typography>
                </Box>

                {/* Top tooltip */}
                <Box sx={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)' }}>
                  <InfoTooltip
                    content={{
                      title: "Top Placement",
                      content: "Tooltip positioned at the top"
                    }}
                    placement="top"
                  />
                </Box>

                {/* Bottom tooltip */}
                <Box sx={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)' }}>
                  <InfoTooltip
                    content={{
                      title: "Bottom Placement",
                      content: "Tooltip positioned at the bottom"
                    }}
                    placement="bottom"
                  />
                </Box>

                {/* Left tooltip */}
                <Box sx={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)' }}>
                  <InfoTooltip
                    content={{
                      title: "Left Placement",
                      content: "Tooltip positioned to the left"
                    }}
                    placement="left"
                  />
                </Box>

                {/* Right tooltip */}
                <Box sx={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)' }}>
                  <InfoTooltip
                    content={{
                      title: "Right Placement",
                      content: "Tooltip positioned to the right"
                    }}
                    placement="right"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Custom Trigger Examples */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Custom Triggers
              </Typography>

              <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                {/* Chip with tooltip */}
                <InfoTooltip
                  content={{
                    title: "Status Chip",
                    content: "This chip shows the current system status"
                  }}
                >
                  <Chip
                    label="Healthy"
                    color="success"
                    sx={{ cursor: 'pointer' }}
                  />
                </InfoTooltip>

                {/* Text with tooltip */}
                <InfoTooltip
                  content={{
                    title: "Hover Text",
                    content: "This text has a tooltip when you hover over it"
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      color: 'primary.main'
                    }}
                  >
                    Hover over this text
                  </Typography>
                </InfoTooltip>

                {/* Icon with tooltip */}
                <InfoTooltip
                  content={{
                    title: "Warning Icon",
                    content: "This icon indicates a warning condition"
                  }}
                >
                  <Warning
                    color="warning"
                    sx={{ cursor: 'pointer' }}
                  />
                </InfoTooltip>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TooltipExample;