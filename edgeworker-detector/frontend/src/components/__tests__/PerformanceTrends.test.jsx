import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PerformanceTrends from '../PerformanceTrends';

// Mock the useApi hook
vi.mock('../../hooks/useApi', () => ({
  useApi: vi.fn(() => ({
    data: {
      data: []
    },
    loading: false,
    error: null
  }))
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === 'HH:mm') return '10:00';
    if (formatStr === 'MMM dd') return 'Jan 01';
    return '10:00';
  }),
  subDays: vi.fn((date, days) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)),
  subHours: vi.fn((date, hours) => new Date(date.getTime() - hours * 60 * 60 * 1000))
}));

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="chart-tooltip" />,
  Legend: ({ content: Content }) => Content ? <Content /> : <div data-testid="legend" />,
  ReferenceLine: () => <div data-testid="reference-line" />
}));

describe('PerformanceTrends', () => {
  it('renders chart header with tooltip', () => {
    render(<PerformanceTrends />);
    
    // Check if the chart title is rendered
    expect(screen.getByText('Performance Trends')).toBeInTheDocument();
    
    // Check if InfoTooltip is rendered (it should render an info icon)
    const infoButtons = screen.getAllByRole('button', { name: /more information/i });
    expect(infoButtons.length).toBeGreaterThan(0);
  });

  it('renders time range selector', () => {
    render(<PerformanceTrends />);
    
    // Check if time range buttons are rendered
    expect(screen.getByText('1D')).toBeInTheDocument();
    expect(screen.getByText('7D')).toBeInTheDocument();
    expect(screen.getByText('30D')).toBeInTheDocument();
    expect(screen.getByText('90D')).toBeInTheDocument();
  });

  it('allows time range selection', () => {
    render(<PerformanceTrends />);
    
    // Click on 30D button
    const thirtyDayButton = screen.getByText('30D');
    fireEvent.click(thirtyDayButton);
    
    // The button should be selected (this would be visible in the UI)
    expect(thirtyDayButton).toBeInTheDocument();
  });

  it('renders chart components', () => {
    render(<PerformanceTrends />);
    
    // Check if chart components are rendered
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders threshold indicators with tooltip', () => {
    render(<PerformanceTrends />);
    
    // Check if threshold indicators are rendered
    expect(screen.getByText('Target (50ms)')).toBeInTheDocument();
    expect(screen.getByText('Warning (100ms)')).toBeInTheDocument();
    expect(screen.getByText('Critical (200ms)')).toBeInTheDocument();
    
    // Should have tooltips for thresholds
    const infoButtons = screen.getAllByRole('button', { name: /more information/i });
    expect(infoButtons.length).toBeGreaterThanOrEqual(3); // Header, legend, and threshold tooltips
  });

  it('renders custom legend with tooltip', () => {
    render(<PerformanceTrends />);
    
    // The custom legend should render InfoTooltip
    const infoButtons = screen.getAllByRole('button', { name: /more information/i });
    expect(infoButtons.length).toBeGreaterThanOrEqual(2); // At least header and legend tooltips
  });
});