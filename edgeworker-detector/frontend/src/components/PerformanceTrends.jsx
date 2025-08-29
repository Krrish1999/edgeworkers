import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const PerformanceTrends = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Performance Trends
        </Typography>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Performance trend analysis will be displayed here.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PerformanceTrends;
