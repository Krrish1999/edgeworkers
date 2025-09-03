import React, { useState, useEffect } from 'react';
import {
  Tooltip,
  IconButton,
  Box,
  Typography,
  Link,
  Chip,
  useTheme,
  useMediaQuery,
  Fade
} from '@mui/material';
import {
  InfoOutlined,
  OpenInNew,
  Launch
} from '@mui/icons-material';
import { getTooltipContent } from '../config/tooltipConfig.js';

/**
 * InfoTooltip Component
 * 
 * A reusable tooltip component that displays contextual help information
 * with Material-UI integration and responsive behavior.
 * 
 * @param {Object} props - Component props
 * @param {string|Object} props.content - Tooltip content (config key or content object)
 * @param {string} props.placement - Tooltip placement (top, bottom, left, right)
 * @param {string} props.size - Icon size (small, medium, large)
 * @param {string} props.variant - Display variant (icon, text, custom)
 * @param {number} props.maxWidth - Maximum tooltip width in pixels
 * @param {boolean} props.interactive - Whether tooltip should be interactive
 * @param {string} props.mobile - Mobile behavior (tap, hover, disabled)
 * @param {React.ReactNode} props.children - Custom trigger element
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.sx - Material-UI sx prop for styling
 */
const InfoTooltip = ({
  content,
  placement = 'top',
  size = 'small',
  variant = 'icon',
  maxWidth = 320,
  interactive = true,
  mobile = 'tap',
  children,
  className,
  sx = {},
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);
  const [tooltipContent, setTooltipContent] = useState(null);

  // Load tooltip content
  useEffect(() => {
    if (typeof content === 'string') {
      const loadedContent = getTooltipContent(content);
      setTooltipContent(loadedContent);
    } else if (typeof content === 'object') {
      setTooltipContent(content);
    } else {
      console.warn('InfoTooltip: Invalid content prop type');
      setTooltipContent(getTooltipContent('fallback'));
    }
  }, [content]);

  // Handle mobile interactions
  const handleMobileInteraction = (event) => {
    if (isMobile && mobile === 'tap') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(prev => !prev);
      
      // Auto-close after 5 seconds on mobile
      if (!open) {
        setTimeout(() => setOpen(false), 5000);
      }
    }
  };

  // Handle keyboard interactions
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(prev => !prev);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  // Get optimal placement based on viewport
  const getOptimalPlacement = () => {
    // For mobile, prefer bottom placement to avoid keyboard issues
    if (isMobile) {
      return placement === 'top' ? 'bottom' : placement;
    }
    return placement;
  };

  // Render tooltip content
  const renderTooltipContent = () => {
    if (!tooltipContent) return null;

    return (
      <Box sx={{ p: 1, maxWidth: maxWidth }}>
        {/* Title */}
        {tooltipContent.title && (
          <Typography 
            variant="subtitle2" 
            sx={{ 
              fontWeight: 600, 
              mb: 1,
              color: theme.palette.primary.light
            }}
          >
            {tooltipContent.title}
          </Typography>
        )}

        {/* Main content */}
        {tooltipContent.content && (
          <Typography 
            variant="body2" 
            sx={{ 
              mb: tooltipContent.calculation || tooltipContent.threshold ? 1 : 0,
              lineHeight: 1.5
            }}
          >
            {tooltipContent.content}
          </Typography>
        )}

        {/* Calculation method */}
        {tooltipContent.calculation && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 500, color: theme.palette.text.secondary }}>
              Calculation:
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', mt: 0.5 }}>
              {tooltipContent.calculation}
            </Typography>
          </Box>
        )}

        {/* Thresholds */}
        {tooltipContent.threshold && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 500, color: theme.palette.text.secondary }}>
              Thresholds:
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', mt: 0.5 }}>
              {tooltipContent.threshold}
            </Typography>
          </Box>
        )}

        {/* Color coding */}
        {tooltipContent.colorCoding && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 500, color: theme.palette.text.secondary, mb: 0.5, display: 'block' }}>
              Color Coding:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {Object.entries(tooltipContent.colorCoding).map(([color, meaning]) => (
                <Chip
                  key={color}
                  label={meaning}
                  size="small"
                  sx={{
                    fontSize: '0.7rem',
                    height: 20,
                    backgroundColor: getColorForStatus(color),
                    color: theme.palette.getContrastText(getColorForStatus(color))
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Actions */}
        {tooltipContent.actions && tooltipContent.actions.length > 0 && (
          <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
            {tooltipContent.actions.map((action, index) => (
              <Link
                key={index}
                href={action.url}
                target={action.type === 'external' ? '_blank' : '_self'}
                rel={action.type === 'external' ? 'noopener noreferrer' : undefined}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontSize: '0.8rem',
                  textDecoration: 'none',
                  color: theme.palette.primary.light,
                  '&:hover': {
                    textDecoration: 'underline'
                  },
                  mb: index < tooltipContent.actions.length - 1 ? 0.5 : 0
                }}
              >
                {action.label}
                {action.type === 'external' ? (
                  <OpenInNew sx={{ fontSize: 12 }} />
                ) : (
                  <Launch sx={{ fontSize: 12 }} />
                )}
              </Link>
            ))}
          </Box>
        )}

        {/* Learn more link */}
        {tooltipContent.learnMore && (
          <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Link
              href={tooltipContent.learnMore}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: '0.8rem',
                textDecoration: 'none',
                color: theme.palette.primary.light,
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              Learn More
              <Launch sx={{ fontSize: 12 }} />
            </Link>
          </Box>
        )}
      </Box>
    );
  };

  // Get color for status indicators
  const getColorForStatus = (status) => {
    const colorMap = {
      green: theme.palette.success.main,
      yellow: theme.palette.warning.main,
      orange: theme.palette.warning.dark,
      red: theme.palette.error.main,
      gray: theme.palette.text.disabled,
      blue: theme.palette.info.main
    };
    return colorMap[status.toLowerCase()] || theme.palette.text.secondary;
  };

  // Get icon size
  const getIconSize = () => {
    const sizeMap = {
      small: 16,
      medium: 20,
      large: 24
    };
    return sizeMap[size] || 16;
  };

  // Render trigger element
  const renderTrigger = () => {
    if (children) {
      return children;
    }

    if (variant === 'icon') {
      return (
        <IconButton
          size={size}
          sx={{
            padding: size === 'small' ? '2px' : '4px',
            color: theme.palette.text.secondary,
            '&:hover': {
              color: theme.palette.primary.light,
              backgroundColor: 'rgba(0, 212, 255, 0.08)'
            },
            '&:focus': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2
            },
            ...sx
          }}
          className={className}
          onClick={handleMobileInteraction}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          aria-label="More information"
          {...props}
        >
          <InfoOutlined sx={{ fontSize: getIconSize() }} />
        </IconButton>
      );
    }

    return (
      <Box
        component="span"
        sx={{
          cursor: 'pointer',
          color: theme.palette.primary.light,
          '&:hover': {
            color: theme.palette.primary.main
          },
          ...sx
        }}
        className={className}
        onClick={handleMobileInteraction}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label="More information"
        {...props}
      >
        <InfoOutlined sx={{ fontSize: getIconSize() }} />
      </Box>
    );
  };

  // Don't render if no content
  if (!tooltipContent) {
    return null;
  }

  // Handle mobile disabled state
  if (isMobile && mobile === 'disabled') {
    return null;
  }

  return (
    <Tooltip
      title={renderTooltipContent()}
      placement={getOptimalPlacement()}
      arrow
      interactive={interactive}
      open={isMobile && mobile === 'tap' ? open : undefined}
      onClose={() => setOpen(false)}
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 300 }}
      componentsProps={{
        tooltip: {
          sx: {
            maxWidth: maxWidth,
            padding: 0, // Remove default padding since we handle it in content
            '& .MuiTooltip-tooltip': {
              padding: 0
            }
          }
        }
      }}
    >
      {renderTrigger()}
    </Tooltip>
  );
};

export default InfoTooltip;