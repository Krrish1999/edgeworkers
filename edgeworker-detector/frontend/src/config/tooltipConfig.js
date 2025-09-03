/**
 * Centralized tooltip configuration for the EdgeWorker monitoring dashboard
 * This file contains all tooltip content definitions organized by component type
 */

export const tooltipConfig = {
  // Metrics card tooltips
  metrics: {
    totalPops: {
      title: "Total Points of Presence",
      content: "The total number of Akamai edge locations currently monitored by the EdgeWorker detection system. Each PoP represents a geographical location where EdgeWorker functions can be deployed and executed.",
      calculation: "Real-time count of active monitoring endpoints",
      threshold: "Typical range: 50-200 PoPs globally",
      learnMore: "/docs/pops-overview"
    },
    avgColdStart: {
      title: "Average Cold Start Time",
      content: "Mean time for EdgeWorker functions to initialize when invoked after a period of inactivity. Cold starts occur when functions need to be loaded into memory and initialized.",
      calculation: "Calculated from the last 1000 function executions across all PoPs",
      threshold: "Target: <50ms, Warning: 50-100ms, Critical: >100ms",
      actions: [
        {
          label: "Optimize Functions",
          url: "/docs/cold-start-optimization",
          type: "internal"
        }
      ]
    },
    activeAlerts: {
      title: "Active Alerts",
      content: "Current number of unresolved alerts across all monitored EdgeWorker functions and PoPs. Alerts are triggered when performance thresholds are exceeded or errors are detected.",
      calculation: "Real-time count of alerts with status 'active' or 'firing'",
      threshold: "Target: 0, Warning: 1-5, Critical: >5",
      actions: [
        {
          label: "View All Alerts",
          url: "/alerts",
          type: "internal"
        }
      ]
    },
    healthyPops: {
      title: "Healthy PoPs",
      content: "Number of Points of Presence currently operating within normal performance parameters. A PoP is considered healthy when response times are below thresholds and error rates are minimal.",
      calculation: "Count of PoPs with response time <100ms and error rate <1%",
      threshold: "Target: >95% of total PoPs",
      colorCoding: {
        green: "Healthy (>95%)",
        yellow: "Warning (90-95%)",
        red: "Critical (<90%)"
      }
    }
  },

  // Component-specific tooltips
  components: {
    heatmap: {
      title: "Global Performance Heat Map",
      content: "Visual representation of EdgeWorker performance across all geographical locations. Colors indicate the health status of each Point of Presence based on response times and error rates.",
      colorCoding: {
        green: "Healthy (0-50ms response time)",
        yellow: "Warning (50-100ms response time)",
        orange: "Degraded (100-200ms response time)",
        red: "Critical (>200ms response time)",
        gray: "No data available"
      },
      interactions: "Click on a PoP to view detailed metrics and recent alerts for that location.",
      actions: [
        {
          label: "View PoPs Details",
          url: "/pops",
          type: "internal"
        }
      ]
    },
    heatmapLegend: {
      title: "Performance Legend",
      content: "Color-coded performance indicators showing EdgeWorker cold start times at each Point of Presence. Marker size also indicates relative performance impact.",
      colorCoding: {
        green: "Excellent (< 5ms cold start)",
        yellow: "Good (5-10ms cold start)", 
        orange: "Warning (10-15ms cold start)",
        red: "Critical (> 15ms cold start)"
      },
      calculation: "Based on average cold start times from the last 1000 function executions at each PoP",
      threshold: "Target: <5ms, Acceptable: <10ms, Action Required: >15ms",
      interactions: "Larger markers indicate higher cold start times. Click any marker to see detailed PoP information including recent performance trends."
    },
    heatmapInteractions: {
      title: "Map Interactions",
      content: "Interactive features available on the global heat map for exploring EdgeWorker performance data.",
      interactions: "• Click markers to view detailed PoP information\n• Zoom and pan to explore different regions\n• Hover over markers for quick performance summary\n• Use legend to understand color coding",
      threshold: "Performance thresholds: Excellent <5ms, Good 5-10ms, Warning 10-15ms, Critical >15ms",
      actions: [
        {
          label: "PoP Management Guide",
          url: "/docs/pop-management",
          type: "internal"
        }
      ]
    },
    alertsWidget: {
      title: "Recent Alerts",
      content: "Latest alerts from EdgeWorker monitoring system, showing the most critical issues that require attention. Alerts are automatically generated when performance degrades or errors occur.",
      severityLevels: {
        critical: "Immediate action required - service impact likely",
        high: "Performance degradation detected - monitor closely", 
        medium: "Minor performance issue - review when convenient",
        low: "Informational - no immediate action needed"
      },
      statusMeanings: {
        firing: "Alert is currently active and conditions are met",
        resolved: "Alert conditions no longer met - issue resolved",
        acknowledged: "Alert has been seen by operations team"
      },
      colorCoding: {
        red: "Critical/High severity alerts",
        yellow: "Medium severity alerts", 
        green: "Low severity or resolved alerts",
        gray: "Acknowledged alerts"
      },
      interactions: "Click on individual alerts to view detailed information. Use the 'View All Alerts' button to access the full alerts dashboard with filtering and management options.",
      actions: [
        {
          label: "View All Alerts",
          url: "/alerts",
          type: "internal"
        },
        {
          label: "Alert Management Guide",
          url: "/docs/alert-management",
          type: "internal"
        }
      ]
    },
    realtimeChart: {
      title: "Real-time Performance Metrics",
      content: "Live performance data showing EdgeWorker cold start times over time. This chart displays average, 95th percentile, and minimum cold start times to provide comprehensive performance visibility.",
      metrics: {
        average: "Average cold start time across all EdgeWorker executions",
        p95: "95th percentile cold start time - represents worst-case performance",
        minimum: "Minimum cold start time - best-case performance"
      },
      timeRanges: {
        "5m": "Last 5 minutes - high resolution data points",
        "1h": "Last hour - 1-minute aggregated intervals",
        "6h": "Last 6 hours - 5-minute aggregated intervals",
        "24h": "Last 24 hours - 15-minute aggregated intervals"
      },
      thresholds: {
        excellent: "< 50ms - Optimal performance",
        good: "50-100ms - Acceptable performance", 
        warning: "100-200ms - Performance degradation",
        critical: "> 200ms - Immediate attention required"
      },
      interactions: "Hover over data points for exact values. The chart updates automatically every 30 seconds with the latest performance data.",
      calculation: "Data points are calculated from EdgeWorker execution telemetry across all monitored PoPs, aggregated by time interval based on selected range."
    },
    realtimeChartLegend: {
      title: "Chart Legend",
      content: "Performance metrics displayed on the real-time chart with different visualization styles to distinguish between metric types.",
      colorCoding: {
        "#00d4ff": "Average Cold Start Time - Filled area chart showing typical performance",
        "#ff6b35": "95th Percentile - Filled area showing worst-case performance impact",
        "#4caf50": "Minimum Time - Dashed line showing best-case performance"
      },
      interpretation: "The gap between average and 95th percentile indicates performance consistency. Larger gaps suggest more variable performance that may need optimization."
    },
    realtimeTimeRange: {
      title: "Time Range Selection",
      content: "Select different time periods to analyze EdgeWorker performance patterns. Shorter ranges provide higher resolution data for immediate troubleshooting.",
      ranges: {
        "1h": "Ideal for real-time monitoring and immediate issue detection",
        "6h": "Good for identifying recent performance trends and patterns",
        "24h": "Useful for daily performance analysis and capacity planning"
      },
      dataResolution: "Data resolution automatically adjusts based on selected range to balance detail with chart readability.",
      autoRefresh: "Chart data refreshes automatically every 30 seconds when viewing recent time ranges (1h or less)."
    },
    performanceTrends: {
      title: "Performance Trends Analysis",
      content: "Historical performance data showing trends and patterns in EdgeWorker execution over extended periods. Use this to identify performance improvements or degradations over time.",
      metrics: {
        avgResponseTime: "Mean cold start time trend over selected period",
        p95ResponseTime: "95th percentile cold start time - captures worst-case performance trends",
        errorRate: "Error rate percentage trend across all EdgeWorker executions",
        throughput: "Request volume trend showing EdgeWorker invocation patterns"
      },
      timeRanges: {
        "1d": "Last 24 hours - hourly aggregation for recent trend analysis",
        "7d": "Last 7 days - daily aggregation for weekly pattern identification",
        "30d": "Last 30 days - daily aggregation for monthly trend analysis",
        "90d": "Last 90 days - weekly aggregation for quarterly performance review"
      },
      thresholds: {
        responseTime: "Target: <50ms average, Warning: >100ms sustained, Critical: >200ms trend",
        errorRate: "Target: <0.1% sustained, Warning: >1% trend, Critical: >5% sustained",
        availability: "Target: >99.9% uptime, Warning: <99.5%, Critical: <99%"
      },
      analysis: "Look for sustained trends rather than temporary spikes. Gradual performance degradation may indicate the need for function optimization or infrastructure scaling.",
      actions: [
        {
          label: "Performance Optimization Guide",
          url: "/docs/performance-optimization",
          type: "internal"
        }
      ]
    },
    performanceTrendsLegend: {
      title: "Trends Legend",
      content: "Performance trend indicators showing different metrics and their significance for long-term EdgeWorker health monitoring.",
      colorCoding: {
        blue: "Average Performance - Primary trend line showing typical behavior",
        orange: "95th Percentile - Worst-case performance trend indicating outliers",
        green: "Error Rate - Percentage of failed executions over time",
        purple: "Throughput - Volume of EdgeWorker invocations per time period"
      },
      interpretation: "Consistent trends indicate stable performance. Sudden changes or gradual degradation patterns may require investigation and optimization."
    },
    performanceThresholds: {
      title: "Performance Thresholds",
      content: "Visual indicators on the chart showing performance boundaries and targets for EdgeWorker cold start times.",
      thresholdLines: {
        green: "Target threshold (50ms) - Optimal performance boundary",
        yellow: "Warning threshold (100ms) - Performance attention needed",
        red: "Critical threshold (200ms) - Immediate action required"
      },
      usage: "These horizontal reference lines help quickly identify when performance crosses important boundaries and requires attention.",
      calculation: "Thresholds are based on EdgeWorker best practices and typical user experience requirements for edge computing applications."
    }
  },

  // General UI tooltips
  ui: {
    refreshButton: {
      title: "Refresh Data",
      content: "Manually refresh all dashboard data. The dashboard automatically updates every 30 seconds, but you can use this to get the latest data immediately."
    },
    timeRangeSelector: {
      title: "Time Range Selection",
      content: "Select the time period for historical data display. Shorter ranges provide higher resolution data, while longer ranges show broader trends."
    },
    exportButton: {
      title: "Export Data",
      content: "Download current dashboard data in CSV or JSON format for further analysis or reporting."
    },
    settingsButton: {
      title: "Dashboard Settings",
      content: "Customize dashboard appearance, notification preferences, and data refresh intervals."
    }
  },

  // Error states and fallbacks
  fallback: {
    title: "Information",
    content: "Additional information about this component is not currently available.",
    actions: [
      {
        label: "Contact Support",
        url: "/support",
        type: "internal"
      }
    ]
  }
};

/**
 * Get tooltip content by key path (e.g., 'metrics.totalPops')
 * @param {string} key - Dot-notation path to tooltip content
 * @returns {object|null} Tooltip content object or null if not found
 */
export const getTooltipContent = (key) => {
  try {
    const keys = key.split('.');
    let content = tooltipConfig;
    
    for (const k of keys) {
      content = content[k];
      if (!content) {
        console.warn(`Tooltip content not found for key: ${key}`);
        return tooltipConfig.fallback;
      }
    }
    
    return content;
  } catch (error) {
    console.error(`Error retrieving tooltip content for key: ${key}`, error);
    return tooltipConfig.fallback;
  }
};

/**
 * Check if tooltip content exists for a given key
 * @param {string} key - Dot-notation path to tooltip content
 * @returns {boolean} True if content exists, false otherwise
 */
export const hasTooltipContent = (key) => {
  try {
    const keys = key.split('.');
    let content = tooltipConfig;
    
    for (const k of keys) {
      content = content[k];
      if (!content) return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

export default tooltipConfig;