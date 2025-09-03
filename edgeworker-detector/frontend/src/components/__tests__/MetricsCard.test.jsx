import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MetricsCard from '../MetricsCard';
import { Language } from '@mui/icons-material';

// Mock InfoTooltip component
jest.mock('../InfoTooltip', () => {
  return function MockInfoTooltip({ content }) {
    return <div data-testid="info-tooltip" data-content={content}>i</div>;
  };
});

const theme = createTheme();

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('MetricsCard', () => {
  const defaultProps = {
    title: 'Test Metric',
    value: '100',
    icon: <Language />,
    color: 'primary',
    change: '+5%',
    trend: 'up'
  };

  it('renders without tooltip when tooltip prop is not provided', () => {
    renderWithTheme(<MetricsCard {...defaultProps} />);
    
    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('+5%')).toBeInTheDocument();
    expect(screen.queryByTestId('info-tooltip')).not.toBeInTheDocument();
  });

  it('renders with tooltip when tooltip prop is provided', () => {
    renderWithTheme(
      <MetricsCard {...defaultProps} tooltip="metrics.totalPops" />
    );
    
    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByTestId('info-tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('info-tooltip')).toHaveAttribute('data-content', 'metrics.totalPops');
  });

  it('renders all metric types with correct tooltip configurations', () => {
    const metricTypes = [
      { tooltip: 'metrics.totalPops', title: 'Total PoPs' },
      { tooltip: 'metrics.avgColdStart', title: 'Avg Cold Start' },
      { tooltip: 'metrics.activeAlerts', title: 'Active Alerts' },
      { tooltip: 'metrics.healthyPops', title: 'Healthy PoPs' }
    ];

    metricTypes.forEach(({ tooltip, title }) => {
      const { unmount } = renderWithTheme(
        <MetricsCard {...defaultProps} title={title} tooltip={tooltip} />
      );
      
      expect(screen.getByText(title)).toBeInTheDocument();
      expect(screen.getByTestId('info-tooltip')).toHaveAttribute('data-content', tooltip);
      
      unmount();
    });
  });

  it('maintains proper layout with tooltip icon', () => {
    renderWithTheme(
      <MetricsCard {...defaultProps} tooltip="metrics.totalPops" />
    );
    
    // Check that title and tooltip are in the same container
    const titleContainer = screen.getByText('Test Metric').closest('div');
    const tooltipElement = screen.getByTestId('info-tooltip');
    
    expect(titleContainer).toContainElement(tooltipElement);
  });
});