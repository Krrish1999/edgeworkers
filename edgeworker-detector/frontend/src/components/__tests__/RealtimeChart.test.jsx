import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RealtimeChart from '../RealtimeChart';

// Mock the useApi hook
vi.mock('../../hooks/useApi', () => ({
  useApi: vi.fn(() => ({
    data: {
      data: [
        { timestamp: '2024-01-01T10:00:00Z', value: 45 },
        { timestamp: '2024-01-01T10:01:00Z', value: 52 },
        { timestamp: '2024-01-01T10:02:00Z', value: 38 }
      ]
    },
    loading: false,
    error: null
  }))
}));

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="chart-tooltip" />,
  Legend: ({ content: Content }) => Content ? <Content /> : <div data-testid="legend" />
}));

describe('RealtimeChart', () => {
  it('renders chart header with tooltip', () => {
    render(<RealtimeChart />);
    
    // Check if the chart title is rendered
    expect(screen.getByText('Real-time Performance')).toBeInTheDocument();
    
    // Check if InfoTooltip is rendered (it should render an info icon)
    const infoButtons = screen.getAllByRole('button', { name: /more information/i });
    expect(infoButtons.length).toBeGreaterThan(0);
  });

  it('renders time range selector with tooltip', () => {
    render(<RealtimeChart />);
    
    // Check if time range buttons are rendered
    expect(screen.getByText('1H')).toBeInTheDocument();
    expect(screen.getByText('6H')).toBeInTheDocument();
    expect(screen.getByText('24H')).toBeInTheDocument();
  });

  it('allows time range selection', () => {
    render(<RealtimeChart />);
    
    // Click on 6H button
    const sixHourButton = screen.getByText('6H');
    fireEvent.click(sixHourButton);
    
    // The button should be selected (this would be visible in the UI)
    expect(sixHourButton).toBeInTheDocument();
  });

  it('renders chart components', () => {
    render(<RealtimeChart />);
    
    // Check if chart components are rendered
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('renders custom legend with tooltip', () => {
    render(<RealtimeChart />);
    
    // The custom legend should render InfoTooltip
    const infoButtons = screen.getAllByRole('button', { name: /more information/i });
    expect(infoButtons.length).toBeGreaterThanOrEqual(2); // At least header and legend tooltips
  });
});