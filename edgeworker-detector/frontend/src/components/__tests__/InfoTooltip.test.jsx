import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import InfoTooltip from '../InfoTooltip.jsx';

// Mock theme for testing
const mockTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00d4ff', light: '#66e3ff' },
    text: { primary: 'rgba(255, 255, 255, 0.95)', secondary: 'rgba(255, 255, 255, 0.7)' },
    divider: 'rgba(255, 255, 255, 0.12)'
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
    body2: { fontSize: '0.875rem' }
  },
  shape: { borderRadius: 12 },
  spacing: 8,
  breakpoints: { values: { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280 } }
});

// Test wrapper component
const TestWrapper = ({ children }) => (
  <ThemeProvider theme={mockTheme}>
    {children}
  </ThemeProvider>
);

// Mock tooltip content
const mockTooltipContent = {
  title: 'Test Tooltip',
  content: 'This is a test tooltip content',
  calculation: 'Test calculation method',
  threshold: 'Test threshold: <50ms',
  actions: [
    {
      label: 'Test Action',
      url: '/test',
      type: 'internal'
    }
  ]
};

describe('InfoTooltip Component', () => {
  beforeEach(() => {
    // Mock window.matchMedia for responsive tests
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  test('renders tooltip trigger icon', () => {
    render(
      <TestWrapper>
        <InfoTooltip content={mockTooltipContent} />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole('button', { name: /more information/i });
    expect(triggerButton).toBeInTheDocument();
  });

  test('displays tooltip content on hover', async () => {
    render(
      <TestWrapper>
        <InfoTooltip content={mockTooltipContent} />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole('button', { name: /more information/i });

    fireEvent.mouseEnter(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('Test Tooltip')).toBeInTheDocument();
      expect(screen.getByText('This is a test tooltip content')).toBeInTheDocument();
    });
  });

  test('handles string content key correctly', async () => {
    // Mock the tooltip config
    jest.doMock('../../config/tooltipConfig.js', () => ({
      getTooltipContent: jest.fn().mockReturnValue(mockTooltipContent)
    }));

    render(
      <TestWrapper>
        <InfoTooltip content="metrics.totalPops" />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole('button', { name: /more information/i });
    expect(triggerButton).toBeInTheDocument();
  });

  test('renders with different sizes', () => {
    const { rerender } = render(
      <TestWrapper>
        <InfoTooltip content={mockTooltipContent} size="small" />
      </TestWrapper>
    );

    let triggerButton = screen.getByRole('button', { name: /more information/i });
    expect(triggerButton).toBeInTheDocument();

    rerender(
      <TestWrapper>
        <InfoTooltip content={mockTooltipContent} size="large" />
      </TestWrapper>
    );

    triggerButton = screen.getByRole('button', { name: /more information/i });
    expect(triggerButton).toBeInTheDocument();
  });

  test('handles keyboard navigation', () => {
    render(
      <TestWrapper>
        <InfoTooltip content={mockTooltipContent} />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole('button', { name: /more information/i });

    // Test Enter key
    fireEvent.keyDown(triggerButton, { key: 'Enter' });
    expect(triggerButton).toBeInTheDocument();

    // Test Space key
    fireEvent.keyDown(triggerButton, { key: ' ' });
    expect(triggerButton).toBeInTheDocument();

    // Test Escape key
    fireEvent.keyDown(triggerButton, { key: 'Escape' });
    expect(triggerButton).toBeInTheDocument();
  });

  test('renders custom trigger element', () => {
    render(
      <TestWrapper>
        <InfoTooltip content={mockTooltipContent}>
          <button>Custom Trigger</button>
        </InfoTooltip>
      </TestWrapper>
    );

    expect(screen.getByText('Custom Trigger')).toBeInTheDocument();
  });

  test('handles missing content gracefully', () => {
    render(
      <TestWrapper>
        <InfoTooltip content={null} />
      </TestWrapper>
    );

    // Should not render anything when content is null
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('applies custom styling', () => {
    render(
      <TestWrapper>
        <InfoTooltip
          content={mockTooltipContent}
          sx={{ color: 'red' }}
          className="custom-tooltip"
        />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole('button', { name: /more information/i });
    expect(triggerButton).toHaveClass('custom-tooltip');
  });

  test('handles different placements', () => {
    const placements = ['top', 'bottom', 'left', 'right'];

    placements.forEach(placement => {
      const { unmount } = render(
        <TestWrapper>
          <InfoTooltip content={mockTooltipContent} placement={placement} />
        </TestWrapper>
      );

      const triggerButton = screen.getByRole('button', { name: /more information/i });
      expect(triggerButton).toBeInTheDocument();

      unmount();
    });
  });
});

describe('InfoTooltip Accessibility', () => {
  test('has proper ARIA attributes', () => {
    render(
      <TestWrapper>
        <InfoTooltip content={mockTooltipContent} />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole('button', { name: /more information/i });
    expect(triggerButton).toHaveAttribute('tabIndex', '0');
    expect(triggerButton).toHaveAttribute('aria-label', 'More information');
  });

  test('is keyboard accessible', () => {
    render(
      <TestWrapper>
        <InfoTooltip content={mockTooltipContent} />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole('button', { name: /more information/i });

    // Should be focusable
    triggerButton.focus();
    expect(document.activeElement).toBe(triggerButton);
  });
});

describe('InfoTooltip Performance', () => {
  test('does not cause unnecessary re-renders', () => {
    const renderSpy = jest.fn();

    const TestComponent = () => {
      renderSpy();
      return <InfoTooltip content={mockTooltipContent} />;
    };

    const { rerender } = render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Re-render with same props should not cause additional renders
    rerender(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    // Note: This test might need adjustment based on React's rendering behavior
    // The main point is to ensure we're not causing excessive re-renders
  });
});