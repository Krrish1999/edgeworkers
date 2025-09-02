/**
 * Fallback Data Provider
 * Provides default response data when databases are unavailable
 * Ensures API endpoints remain functional during outages
 */

// Sample PoP data for fallback responses
const SAMPLE_POPS = [
    { popCode: 'NYC1', city: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060, tier: 'tier1' },
    { popCode: 'LAX1', city: 'Los Angeles', country: 'United States', lat: 34.0522, lon: -118.2437, tier: 'tier1' },
    { popCode: 'LHR1', city: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278, tier: 'tier1' },
    { popCode: 'NRT1', city: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503, tier: 'tier1' },
    { popCode: 'FRA1', city: 'Frankfurt', country: 'Germany', lat: 50.1109, lon: 8.6821, tier: 'tier1' },
    { popCode: 'SYD1', city: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093, tier: 'tier2' },
    { popCode: 'SIN1', city: 'Singapore', country: 'Singapore', lat: 1.3521, lon: 103.8198, tier: 'tier1' },
    { popCode: 'CDG1', city: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, tier: 'tier1' },
    { popCode: 'AMS1', city: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lon: 4.9041, tier: 'tier2' },
    { popCode: 'HKG1', city: 'Hong Kong', country: 'Hong Kong', lat: 22.3193, lon: 114.1694, tier: 'tier2' },
    { popCode: 'BOM1', city: 'Mumbai', country: 'India', lat: 19.0760, lon: 72.8777, tier: 'tier2' },
    { popCode: 'GRU1', city: 'São Paulo', country: 'Brazil', lat: -23.5505, lon: -46.6333, tier: 'tier2' },
    { popCode: 'YYZ1', city: 'Toronto', country: 'Canada', lat: 43.6532, lon: -79.3832, tier: 'tier2' },
    { popCode: 'ICN1', city: 'Seoul', country: 'South Korea', lat: 37.5665, lon: 126.9780, tier: 'tier2' },
    { popCode: 'DXB1', city: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lon: 55.2708, tier: 'tier2' }
];

/**
 * Generate realistic cold start times with some variation
 * @param {string} tier - PoP tier (tier1, tier2)
 * @param {number} baseTime - Base time in milliseconds
 * @returns {number} - Generated cold start time
 */
function generateColdStartTime(tier = 'tier1', baseTime = null) {
    // Base times by tier
    const baseTimes = {
        tier1: 8.5,  // Tier 1 PoPs have better performance
        tier2: 12.0  // Tier 2 PoPs have slightly higher latency
    };
    
    const base = baseTime || baseTimes[tier] || baseTimes.tier2;
    
    // Add some realistic variation (±20%)
    const variation = (Math.random() - 0.5) * 0.4 * base;
    const result = base + variation;
    
    // Ensure minimum of 5ms and maximum of 25ms
    return Math.max(5.0, Math.min(25.0, parseFloat(result.toFixed(2))));
}

/**
 * Generate fallback overview data
 * @param {Object} options - Generation options
 * @returns {Object} - Overview data
 */
function generateFallbackOverview(options = {}) {
    const totalPops = options.totalPops || SAMPLE_POPS.length;
    const healthyPercentage = options.healthyPercentage || 0.85; // 85% healthy by default
    const healthyPops = Math.floor(totalPops * healthyPercentage);
    const averageColdStart = options.averageColdStart || generateColdStartTime('tier1', 9.2);
    const regressions = options.regressions || Math.floor(totalPops * 0.1); // 10% regression rate
    
    const data = {
        totalPops,
        healthyPops,
        averageColdStart,
        regressions,
        _fallback: true,
        _timestamp: new Date().toISOString(),
        _source: 'fallback-data-generator'
    };
    
    console.log('Generated fallback overview data:', data);
    return data;
}

/**
 * Generate fallback heatmap data
 * @param {Object} options - Generation options
 * @returns {Array} - Heatmap data array
 */
function generateFallbackHeatmap(options = {}) {
    const includeUnhealthy = options.includeUnhealthy !== false; // Include unhealthy by default
    const unhealthyPercentage = options.unhealthyPercentage || 0.15; // 15% unhealthy
    
    const heatmapData = SAMPLE_POPS.map((pop, index) => {
        let coldStartTime = generateColdStartTime(pop.tier);
        let status = 'healthy';
        
        // Make some PoPs unhealthy for realistic data
        if (includeUnhealthy && Math.random() < unhealthyPercentage) {
            coldStartTime = generateColdStartTime(pop.tier, 15.0); // Higher base time for unhealthy
            if (coldStartTime > 15) {
                status = 'critical';
            } else if (coldStartTime > 10) {
                status = 'warning';
            }
        }
        
        return {
            popCode: pop.popCode,
            city: pop.city,
            country: pop.country,
            lat: pop.lat,
            lon: pop.lon,
            coldStartTime,
            status,
            _fallback: true
        };
    });
    
    console.log(`Generated fallback heatmap data with ${heatmapData.length} PoPs`);
    return heatmapData;
}

/**
 * Generate fallback timeseries data
 * @param {Object} options - Generation options
 * @returns {Array} - Timeseries data array
 */
function generateFallbackTimeseries(options = {}) {
    const range = options.range || '1h';
    const popCode = options.popCode;
    
    // Parse range to determine data points
    const rangeMap = {
        '15m': { points: 3, interval: 5 },   // 3 points, 5 min intervals
        '1h': { points: 12, interval: 5 },   // 12 points, 5 min intervals
        '6h': { points: 36, interval: 10 },  // 36 points, 10 min intervals
        '24h': { points: 48, interval: 30 }, // 48 points, 30 min intervals
        '7d': { points: 168, interval: 60 }  // 168 points, 1 hour intervals
    };
    
    const config = rangeMap[range] || rangeMap['1h'];
    const now = new Date();
    const timeseriesData = [];
    
    // Find the PoP for tier-based generation
    const pop = popCode ? SAMPLE_POPS.find(p => p.popCode === popCode) : SAMPLE_POPS[0];
    const tier = pop ? pop.tier : 'tier1';
    
    for (let i = config.points - 1; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - (i * config.interval * 60 * 1000));
        const value = generateColdStartTime(tier);
        
        timeseriesData.push({
            timestamp: timestamp.toISOString(),
            value,
            _fallback: true
        });
    }
    
    console.log(`Generated fallback timeseries data: ${timeseriesData.length} points for range ${range}${popCode ? ` (PoP: ${popCode})` : ''}`);
    return timeseriesData;
}

/**
 * Generate fallback aggregate data
 * @param {Object} options - Generation options
 * @returns {Array} - Aggregate data array
 */
function generateFallbackAggregate(options = {}) {
    const groupBy = options.groupBy || 'country';
    const range = options.range || '24h';
    
    // Group sample PoPs by the specified field
    const groups = {};
    SAMPLE_POPS.forEach(pop => {
        const key = pop[groupBy];
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(pop);
    });
    
    const aggregateData = Object.entries(groups).map(([key, pops]) => {
        // Calculate average tier for the group
        const tier1Count = pops.filter(p => p.tier === 'tier1').length;
        const avgTier = tier1Count > pops.length / 2 ? 'tier1' : 'tier2';
        
        // Generate realistic metrics
        const totalRequests = Math.floor(Math.random() * 10000) + 1000; // 1K-11K requests
        const averageTime = generateColdStartTime(avgTier);
        
        return {
            [groupBy]: key,
            totalRequests,
            averageTime,
            popCount: pops.length,
            _fallback: true
        };
    });
    
    console.log(`Generated fallback aggregate data: ${aggregateData.length} groups by ${groupBy} for range ${range}`);
    return aggregateData;
}

/**
 * Get fallback data based on endpoint and parameters
 * @param {string} endpoint - API endpoint name
 * @param {Object} params - Request parameters
 * @returns {Object|Array} - Fallback data
 */
function getFallbackData(endpoint, params = {}) {
    const timestamp = new Date().toISOString();
    
    console.log(`Generating fallback data for endpoint: ${endpoint}`, params);
    
    switch (endpoint) {
        case 'overview':
            return generateFallbackOverview(params);
            
        case 'heatmap':
            return generateFallbackHeatmap(params);
            
        case 'timeseries':
            return generateFallbackTimeseries(params);
            
        case 'aggregate':
            return generateFallbackAggregate(params);
            
        default:
            console.warn(`Unknown endpoint for fallback data: ${endpoint}`);
            return {
                error: 'Unknown endpoint',
                endpoint,
                _fallback: true,
                _timestamp: timestamp
            };
    }
}

/**
 * Create a fallback response with appropriate metadata
 * @param {string} endpoint - API endpoint name
 * @param {Object} params - Request parameters
 * @param {string} reason - Reason for fallback
 * @returns {Object} - Fallback response with metadata
 */
function createFallbackResponse(endpoint, params = {}, reason = 'database_unavailable') {
    const data = getFallbackData(endpoint, params);
    
    // Add fallback metadata
    const response = {
        data,
        _metadata: {
            fallback: true,
            reason,
            timestamp: new Date().toISOString(),
            endpoint,
            params,
            warning: 'This data is generated fallback data and may not reflect actual system state'
        }
    };
    
    return response;
}

/**
 * Check if data is fallback data
 * @param {Object} data - Data to check
 * @returns {boolean} - True if data is fallback data
 */
function isFallbackData(data) {
    return data && (data._fallback === true || (data._metadata && data._metadata.fallback === true));
}

/**
 * Get sample PoP data for testing
 * @returns {Array} - Sample PoP data
 */
function getSamplePops() {
    return [...SAMPLE_POPS]; // Return a copy
}

export {
    generateFallbackOverview,
    generateFallbackHeatmap,
    generateFallbackTimeseries,
    generateFallbackAggregate,
    getFallbackData,
    createFallbackResponse,
    isFallbackData,
    getSamplePops
};