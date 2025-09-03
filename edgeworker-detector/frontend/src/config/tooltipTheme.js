/**
 * Tooltip theme integration for Material-UI
 * Extends the existing theme with tooltip-specific styling and responsive behavior
 */

/**
 * Get tooltip theme overrides for Material-UI theme
 * @param {Object} baseTheme - Base Material-UI theme object
 * @returns {Object} Theme overrides for tooltips
 */
export const getTooltipThemeOverrides = (baseTheme) => ({
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: baseTheme.palette.mode === 'dark' 
          ? 'rgba(0, 0, 0, 0.95)' 
          : 'rgba(255, 255, 255, 0.98)',
        color: baseTheme.palette.text.primary,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${baseTheme.palette.divider}`,
        borderRadius: baseTheme.shape.borderRadius,
        fontSize: baseTheme.typography.body2.fontSize,
        fontFamily: baseTheme.typography.fontFamily,
        lineHeight: 1.5,
        padding: baseTheme.spacing(1), // Provide default padding
        boxShadow: baseTheme.shadows[8],
        maxWidth: 320, // Set reasonable default max width
        
        // Responsive font sizing
        [baseTheme.breakpoints.down('sm')]: {
          fontSize: '0.8rem',
          maxWidth: '90vw'
        },
        
        // Enhanced contrast for accessibility
        '&.MuiTooltip-tooltipPlacementTop': {
          marginBottom: '8px !important'
        },
        '&.MuiTooltip-tooltipPlacementBottom': {
          marginTop: '8px !important'
        },
        '&.MuiTooltip-tooltipPlacementLeft': {
          marginRight: '8px !important'
        },
        '&.MuiTooltip-tooltipPlacementRight': {
          marginLeft: '8px !important'
        }
      },
      
      arrow: {
        color: baseTheme.palette.mode === 'dark' 
          ? 'rgba(0, 0, 0, 0.95)' 
          : 'rgba(255, 255, 255, 0.98)',
        '&::before': {
          border: `1px solid ${baseTheme.palette.divider}`,
          backgroundColor: 'inherit'
        }
      },
      
      // Touch-friendly sizing for mobile
      touch: {
        fontSize: '0.875rem',
        padding: baseTheme.spacing(1.5),
        [baseTheme.breakpoints.down('sm')]: {
          fontSize: '0.8rem',
          padding: baseTheme.spacing(1)
        }
      }
    }
  },
  
  // Enhanced IconButton styling for tooltip triggers
  MuiIconButton: {
    styleOverrides: {
      root: {
        // Add specific styling for tooltip trigger buttons
        '&.tooltip-trigger': {
          color: baseTheme.palette.text.secondary,
          transition: 'all 0.2s ease',
          
          '&:hover': {
            color: baseTheme.palette.primary.light,
            backgroundColor: 'rgba(0, 212, 255, 0.08)',
            transform: 'scale(1.1)'
          },
          
          '&:focus': {
            outline: `2px solid ${baseTheme.palette.primary.main}`,
            outlineOffset: 2,
            backgroundColor: 'rgba(0, 212, 255, 0.08)'
          },
          
          '&:active': {
            transform: 'scale(0.95)'
          },
          
          // Mobile touch targets
          [baseTheme.breakpoints.down('md')]: {
            minWidth: 44,
            minHeight: 44,
            padding: baseTheme.spacing(1)
          }
        }
      }
    }
  }
});

/**
 * Tooltip-specific breakpoints for responsive behavior
 */
export const tooltipBreakpoints = {
  mobile: '(max-width: 768px)',
  tablet: '(min-width: 769px) and (max-width: 1024px)',
  desktop: '(min-width: 1025px)',
  touch: '(hover: none) and (pointer: coarse)',
  hover: '(hover: hover) and (pointer: fine)'
};

/**
 * Tooltip positioning utilities
 */
export const tooltipPositioning = {
  /**
   * Get optimal tooltip placement based on trigger element position
   * @param {DOMRect} triggerRect - Bounding rect of trigger element
   * @param {string} preferredPlacement - Preferred placement
   * @returns {string} Optimal placement
   */
  getOptimalPlacement: (triggerRect, preferredPlacement = 'top') => {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    const space = {
      top: triggerRect.top,
      bottom: viewport.height - triggerRect.bottom,
      left: triggerRect.left,
      right: viewport.width - triggerRect.right
    };
    
    // Minimum space required for tooltip
    const minSpace = 200;
    
    // Check if preferred placement has enough space
    if (space[preferredPlacement] >= minSpace) {
      return preferredPlacement;
    }
    
    // Find placement with most space
    return Object.keys(space).reduce((a, b) => 
      space[a] > space[b] ? a : b
    );
  },
  
  /**
   * Check if element is in viewport
   * @param {DOMRect} rect - Element bounding rect
   * @returns {boolean} True if element is visible
   */
  isInViewport: (rect) => {
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }
};

/**
 * Accessibility utilities for tooltips
 */
export const tooltipAccessibility = {
  /**
   * Generate ARIA attributes for tooltip trigger
   * @param {string} tooltipId - Unique tooltip ID
   * @param {boolean} isOpen - Whether tooltip is open
   * @returns {Object} ARIA attributes
   */
  getTriggerAttributes: (tooltipId, isOpen = false) => ({
    'aria-describedby': isOpen ? tooltipId : undefined,
    'aria-expanded': isOpen,
    'aria-haspopup': 'dialog',
    'role': 'button',
    'tabIndex': 0
  }),
  
  /**
   * Generate ARIA attributes for tooltip content
   * @param {string} tooltipId - Unique tooltip ID
   * @returns {Object} ARIA attributes
   */
  getTooltipAttributes: (tooltipId) => ({
    'id': tooltipId,
    'role': 'tooltip',
    'aria-live': 'polite'
  })
};

/**
 * Performance optimization utilities
 */
export const tooltipPerformance = {
  /**
   * Debounce function for tooltip interactions
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  /**
   * Throttle function for scroll/resize events
   * @param {Function} func - Function to throttle
   * @param {number} limit - Limit in milliseconds
   * @returns {Function} Throttled function
   */
  throttle: (func, limit) => {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

export default {
  getTooltipThemeOverrides,
  tooltipBreakpoints,
  tooltipPositioning,
  tooltipAccessibility,
  tooltipPerformance
};