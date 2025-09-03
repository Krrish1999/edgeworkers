import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { tooltipPerformance } from '../config/tooltipTheme.js';

/**
 * Custom hook for managing tooltip state and behavior
 * Provides responsive tooltip handling with performance optimizations
 * 
 * @param {Object} options - Hook configuration options
 * @param {string} options.placement - Preferred tooltip placement
 * @param {number} options.delay - Delay before showing tooltip (ms)
 * @param {number} options.hideDelay - Delay before hiding tooltip (ms)
 * @param {boolean} options.interactive - Whether tooltip should be interactive
 * @param {string} options.trigger - Trigger type ('hover', 'click', 'focus', 'manual')
 * @returns {Object} Tooltip state and handlers
 */
export const useTooltip = ({
    placement = 'top',
    delay = 500,
    hideDelay = 200,
    interactive = true,
    trigger = 'hover'
} = {}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isTouch = useMediaQuery('(hover: none) and (pointer: coarse)');

    const [open, setOpen] = useState(false);
    const [actualPlacement, setActualPlacement] = useState(placement);
    const [triggerElement, setTriggerElement] = useState(null);

    const showTimeoutRef = useRef(null);
    const hideTimeoutRef = useRef(null);
    const triggerRef = useRef(null);

    // Clear timeouts on unmount
    useEffect(() => {
        return () => {
            if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        };
    }, []);

    // Determine optimal placement based on trigger position
    const updatePlacement = useCallback(() => {
        if (!triggerElement) return;

        const rect = triggerElement.getBoundingClientRect();
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        const space = {
            top: rect.top,
            bottom: viewport.height - rect.bottom,
            left: rect.left,
            right: viewport.width - rect.right
        };

        // Minimum space required (approximate tooltip size)
        const minSpace = 150;

        // Check if preferred placement has enough space
        if (space[placement] >= minSpace) {
            setActualPlacement(placement);
            return;
        }

        // Find placement with most available space
        const optimalPlacement = Object.keys(space).reduce((a, b) =>
            space[a] > space[b] ? a : b
        );

        setActualPlacement(optimalPlacement);
    }, [triggerElement, placement]);

    // Show tooltip with delay
    const showTooltip = useCallback(() => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }

        if (!open) {
            showTimeoutRef.current = setTimeout(() => {
                setOpen(true);
                updatePlacement();
            }, delay);
        }
    }, [open, delay, updatePlacement]);

    // Hide tooltip with delay
    const hideTooltip = useCallback(() => {
        if (showTimeoutRef.current) {
            clearTimeout(showTimeoutRef.current);
            showTimeoutRef.current = null;
        }

        if (open) {
            hideTimeoutRef.current = setTimeout(() => {
                setOpen(false);
            }, hideDelay);
        }
    }, [open, hideDelay]);

    // Immediate show/hide without delays
    const showImmediately = useCallback(() => {
        if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        setOpen(true);
        updatePlacement();
    }, [updatePlacement]);

    const hideImmediately = useCallback(() => {
        if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        setOpen(false);
    }, []);

    // Toggle tooltip (for click/tap interactions)
    const toggleTooltip = useCallback(() => {
        if (open) {
            hideImmediately();
        } else {
            showImmediately();
        }
    }, [open, showImmediately, hideImmediately]);

    // Handle mouse events
    const handleMouseEnter = useCallback(() => {
        if (!isMobile && !isTouch && (trigger === 'hover' || trigger === 'focus')) {
            showTooltip();
        }
    }, [isMobile, isTouch, trigger, showTooltip]);

    const handleMouseLeave = useCallback(() => {
        if (!isMobile && !isTouch && (trigger === 'hover' || trigger === 'focus')) {
            hideTooltip();
        }
    }, [isMobile, isTouch, trigger, hideTooltip]);

    // Handle click events
    const handleClick = useCallback((event) => {
        if (trigger === 'click' || (isMobile && trigger === 'hover')) {
            event.preventDefault();
            event.stopPropagation();
            toggleTooltip();
        }
    }, [trigger, isMobile, toggleTooltip]);

    // Handle focus events
    const handleFocus = useCallback(() => {
        if (trigger === 'focus' || trigger === 'hover') {
            showTooltip();
        }
    }, [trigger, showTooltip]);

    const handleBlur = useCallback(() => {
        if (trigger === 'focus' || trigger === 'hover') {
            hideTooltip();
        }
    }, [trigger, hideTooltip]);

    // Handle keyboard events
    const handleKeyDown = useCallback((event) => {
        switch (event.key) {
            case 'Enter':
            case ' ':
                if (trigger === 'click' || trigger === 'focus') {
                    event.preventDefault();
                    toggleTooltip();
                }
                break;
            case 'Escape':
                if (open) {
                    event.preventDefault();
                    hideImmediately();
                }
                break;
            default:
                break;
        }
    }, [trigger, open, toggleTooltip, hideImmediately]);

    // Handle outside clicks (for mobile)
    useEffect(() => {
        if (!open || !isMobile) return;

        const handleOutsideClick = (event) => {
            if (triggerRef.current && !triggerRef.current.contains(event.target)) {
                hideImmediately();
            }
        };

        document.addEventListener('touchstart', handleOutsideClick);
        document.addEventListener('click', handleOutsideClick);

        return () => {
            document.removeEventListener('touchstart', handleOutsideClick);
            document.removeEventListener('click', handleOutsideClick);
        };
    }, [open, isMobile, hideImmediately]);

    // Auto-hide on mobile after timeout
    useEffect(() => {
        if (open && isMobile) {
            const autoHideTimeout = setTimeout(() => {
                hideImmediately();
            }, 5000); // Auto-hide after 5 seconds on mobile

            return () => clearTimeout(autoHideTimeout);
        }
    }, [open, isMobile, hideImmediately]);

    // Update placement on window resize
    useEffect(() => {
        if (!open) return;

        const handleResize = tooltipPerformance.throttle(() => {
            updatePlacement();
        }, 100);

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize);
        };
    }, [open, updatePlacement]);

    // Set trigger element ref
    const setTriggerRef = useCallback((element) => {
        triggerRef.current = element;
        setTriggerElement(element);
    }, []);

    return {
        // State
        open,
        placement: actualPlacement,
        isMobile,
        isTouch,

        // Refs
        triggerRef: setTriggerRef,

        // Handlers
        showTooltip,
        hideTooltip,
        showImmediately,
        hideImmediately,
        toggleTooltip,

        // Event handlers
        handleMouseEnter,
        handleMouseLeave,
        handleClick,
        handleFocus,
        handleBlur,
        handleKeyDown,

        // Utilities
        updatePlacement
    };
};

/**
 * Hook for managing multiple tooltips with coordination
 * Ensures only one tooltip is open at a time
 */
export const useTooltipGroup = () => {
    const [activeTooltip, setActiveTooltip] = useState(null);

    const registerTooltip = useCallback((id) => {
        return {
            isActive: activeTooltip === id,
            setActive: () => setActiveTooltip(id),
            setInactive: () => setActiveTooltip(null)
        };
    }, [activeTooltip]);

    return {
        activeTooltip,
        registerTooltip,
        clearActive: () => setActiveTooltip(null)
    };
};

export default useTooltip;