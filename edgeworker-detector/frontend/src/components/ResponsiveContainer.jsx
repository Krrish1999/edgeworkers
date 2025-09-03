import React from 'react';
import { Container, Box } from '@mui/material';

const ResponsiveContainer = ({ children, maxWidth = 'xl', ...props }) => {
  return (
    <Container
      maxWidth={maxWidth}
      sx={{
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, md: 3 },
        width: '100%',
        ...props.sx
      }}
      {...props}
    >
      <Box sx={{ width: '100%', overflow: 'hidden' }}>
        {children}
      </Box>
    </Container>
  );
};

export default ResponsiveContainer;