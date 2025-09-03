import express from 'express';
import { getInfluxClient } from '../utils/influxdb.js';
import { getRedisClient, getWithFallback, setFallbackCache, setLongTermCache, getLongTermCache } from '../utils/redis.js';
import { getFallbackData, createFallbackResponse } from '../utils/fallbackData.js';
import { circuitBreakerManager } from '../utils/circuitBreaker.js';
import Alert from '../models/Alert.js';

const router = express.Router();

// Cache configuration
const CACHE_TTL = {
  overview: 30,      // 30 seconds for overview data
  heatmap: 60,       // 1 minute for heatmap data
  timeseries: 300,   // 5 minutes for timeseries data
  aggregate: 600     // 10 minutes for aggregate data
};

// Standardized field and measurement names
const MEASUREMENT_NAME = 'cold_start_metrics';
const FIELD_NAME = 'cold_start_time_ms';
const TAG_NAMES = {
  popCode: 'pop_code',
  city: 'city',
  country: 'country',
  tier: 'tier',
  functionName: 'function_name'
};
const FIELD_NAMES = {
  coldStartTime: 'cold_start_time_ms',
  latitude: 'latitude',
  longitude: 'longitude'
};

// Helper function to generate cache keys
function generateCacheKey(endpoint, params = {}) {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  return `dashboard:${endpoint}:${paramString}`;
}

// Enhanced helper function with comprehensive fallback mechanisms
async function getCachedOrExecute(cacheKey, ttl, queryFunction, fallbackParams = {}) {
  const endpoint = fallbackParams.endpoint || 'unknown';
  
  try {
    // Try to get from cache with fallback support
    const cacheResult = await getWithFallback(cacheKey);
    
    if (cacheResult.data) {
      console.log(`Cache hit (${cacheResult.source}) for key: ${cacheKey}`);
      const data = JSON.parse(cacheResult.data);
      
      // Add metadata to indicate cache source
      if (cacheResult.source === 'fallback_cache') {
        data._cacheSource = 'fallback';
        data._warning = 'Data served from fallback cache due to primary cache expiry';
      }
      
      return data;
    }
    
    // Execute query if not in cache
    console.log(`Cache miss for key: ${cacheKey}, executing query`);
    const result = await queryFunction();
    
    // Store in both regular cache and fallback cache
    await setFallbackCache(cacheKey, JSON.stringify(result), ttl);
    
    // Also store in long-term cache for emergency fallback
    await setLongTermCache(cacheKey, JSON.stringify(result), ttl * 24); // 24x longer TTL
    
    console.log(`Cached result for key: ${cacheKey} with TTL: ${ttl}s`);
    
    return result;
    
  } catch (queryError) {
    console.error(`Query execution failed for ${endpoint}:`, queryError.message);
    
    // Try long-term cache as fallback
    try {
      const longTermData = await getLongTermCache(cacheKey);
      if (longTermData) {
        console.log(`Using long-term cache fallback for key: ${cacheKey}`);
        const data = JSON.parse(longTermData);
        data._cacheSource = 'long_term_fallback';
        data._warning = 'Data served from long-term cache due to query failure';
        return data;
      }
    } catch (longTermError) {
      console.warn('Long-term cache also failed:', longTermError.message);
    }
    
    // Final fallback: generate synthetic data
    console.log(`Using synthetic fallback data for endpoint: ${endpoint}`);
    const fallbackData = getFallbackData(endpoint, fallbackParams);
    fallbackData._source = 'synthetic_fallback';
    fallbackData._warning = 'Synthetic data generated due to database unavailability';
    
    return fallbackData;
  }
}

// GET /api/dashboard/overview
router.get('/overview', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const cacheKey = generateCacheKey('overview');
    
    const result = await getCachedOrExecute(cacheKey, CACHE_TTL.overview, async () => {
      const { executeQuery, ensureConnection } = getInfluxClient();
      
      // Ensure connection is healthy before executing query
      await ensureConnection();

      // Simplified single query approach - more efficient than multiple yields
      const fluxQuery = `
        from(bucket: "${process.env.INFLUXDB_BUCKET}")
          |> range(start: -10m)
          |> filter(fn: (r) => r._measurement == "${MEASUREMENT_NAME}" and r._field == "${FIELD_NAMES.coldStartTime}")
          |> group(columns: ["${TAG_NAMES.popCode}"])
          |> last()
          |> group()
      `;

      const queryResult = await executeQuery(fluxQuery, { timeout: 10000 });
      
      // Process results to calculate metrics
      const totalPops = queryResult.length;
      const healthyPops = queryResult.filter(r => r._value < 10.0).length;
      const averageColdStart = queryResult.length > 0 
        ? queryResult.reduce((sum, r) => sum + r._value, 0) / queryResult.length 
        : 0;

      // Get active regressions count with fallback
      let regressions = 0;
      try {
        regressions = await Alert.countDocuments({ status: 'active' });
      } catch (alertError) {
        console.warn('Failed to get alert count, using default:', alertError.message);
        regressions = 2; // Default fallback value
      }
      
      return {
        totalPops,
        healthyPops,
        averageColdStart: parseFloat(averageColdStart.toFixed(2)),
        regressions,
        _timestamp: new Date().toISOString(),
        _source: 'influxdb'
      };
    }, { endpoint: 'overview' });
    
    // Add response metadata
    const responseTime = Date.now() - startTime;
    const response = {
      ...result,
      _metadata: {
        responseTime,
        timestamp: new Date().toISOString(),
        cached: !!result._cacheSource,
        cacheSource: result._cacheSource || 'fresh',
        warning: result._warning
      }
    };
    
    // Clean up internal metadata from response
    delete response._cacheSource;
    delete response._warning;
    
    res.json(response);
    
  } catch (error) {
    console.error('Error in overview endpoint:', error.message);
    
    // Check if this is a circuit breaker error
    if (error.circuitBreakerState === 'OPEN') {
      const fallbackResponse = createFallbackResponse('overview', {}, 'circuit_breaker_open');
      return res.status(503).json({
        ...fallbackResponse,
        error: 'Service temporarily unavailable due to circuit breaker',
        retryAfter: Math.ceil((error.nextAttemptTime - Date.now()) / 1000)
      });
    }
    
    // Final fallback: return synthetic data with error status
    const fallbackResponse = createFallbackResponse('overview', {}, 'error_fallback');
    
    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('not connected') || error.message.includes('not available')) {
      statusCode = 503;
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
    }
    
    res.status(statusCode).json({
      ...fallbackResponse,
      error: 'Database error, serving fallback data',
      details: error.message,
      _metadata: {
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        fallback: true,
        errorType: error.constructor.name
      }
    });
  }
});

// GET /api/dashboard/heatmap
router.get('/heatmap', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const cacheKey = generateCacheKey('heatmap');
    
    const result = await getCachedOrExecute(cacheKey, CACHE_TTL.heatmap, async () => {
      const { executeQuery, ensureConnection } = getInfluxClient();
      
      // Ensure connection is healthy before executing query
      await ensureConnection();
      
      // Use pivot to get all fields in one query
      const query = `
        from(bucket: "${process.env.INFLUXDB_BUCKET}")
          |> range(start: -5m)
          |> filter(fn: (r) => r._measurement == "${MEASUREMENT_NAME}")
          |> filter(fn: (r) => r._field == "${FIELD_NAMES.coldStartTime}" or r._field == "${FIELD_NAMES.latitude}" or r._field == "${FIELD_NAMES.longitude}")
          |> group(columns: ["${TAG_NAMES.popCode}", "${TAG_NAMES.city}", "${TAG_NAMES.country}"])
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
          |> group()
          |> sort(columns: ["_time"], desc: true)
          |> limit(n: 1, offset: 0)
      `;
      
      const queryResult = await executeQuery(query, { timeout: 15000 });
      const heatmapData = [];
      
      queryResult.forEach(record => {
          const coldStartTime = record['cold_start_time_ms'] || 0;
          let status = 'healthy';
          if (coldStartTime > 15) status = 'critical';
          else if (coldStartTime > 10) status = 'warning';



          heatmapData.push({
              popCode: record[TAG_NAMES.popCode],
              city: record[TAG_NAMES.city],
              country: record[TAG_NAMES.country],
              lat: record['latitude'] || null,
              lon: record['longitude'] || null,
              coldStartTime: parseFloat(coldStartTime.toFixed(2)),
              status,
              _timestamp: new Date().toISOString(),
              _source: 'influxdb'
          });
      });
      
      return heatmapData;
    }, { endpoint: 'heatmap' });
    
    // Add response metadata
    const responseTime = Date.now() - startTime;
    const response = Array.isArray(result) ? result : [result];
    
    // Add metadata to response
    const metadata = {
      responseTime,
      timestamp: new Date().toISOString(),
      count: response.length,
      cached: !!(result[0] && result[0]._cacheSource),
      cacheSource: result[0] && result[0]._cacheSource || 'fresh',
      warning: result[0] && result[0]._warning
    };
    
    // Clean up internal metadata from each item
    response.forEach(item => {
      delete item._cacheSource;
      delete item._warning;
    });
    
    res.json({
      data: response,
      _metadata: metadata
    });
    
  } catch (error) {
    console.error('Error in heatmap endpoint:', error.message);
    
    // Check if this is a circuit breaker error
    if (error.circuitBreakerState === 'OPEN') {
      const fallbackResponse = createFallbackResponse('heatmap', {}, 'circuit_breaker_open');
      return res.status(503).json({
        ...fallbackResponse,
        error: 'Service temporarily unavailable due to circuit breaker',
        retryAfter: Math.ceil((error.nextAttemptTime - Date.now()) / 1000)
      });
    }
    
    // Final fallback: return synthetic data with error status
    const fallbackResponse = createFallbackResponse('heatmap', {}, 'error_fallback');
    
    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('not connected') || error.message.includes('not available')) {
      statusCode = 503;
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
    }
    
    res.status(statusCode).json({
      ...fallbackResponse,
      error: 'Database error, serving fallback data',
      details: error.message,
      _metadata: {
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        fallback: true,
        errorType: error.constructor.name
      }
    });
  }
});

// GET /api/dashboard/timeseries
router.get('/timeseries', async (req, res) => {
  const startTime = Date.now();
  const { range = '1h', pop_code } = req.query;
  
  try {
    const cacheKey = generateCacheKey('timeseries', { range, pop_code });
    
    const result = await getCachedOrExecute(cacheKey, CACHE_TTL.timeseries, async () => {
      const { executeQuery, ensureConnection } = getInfluxClient();
      
      // Ensure connection is healthy before executing query
      await ensureConnection();
      
      // Build filters using standardized field names
      let filters = `r._measurement == "${MEASUREMENT_NAME}" and r._field == "${FIELD_NAMES.coldStartTime}"`;
      if (pop_code) {
        filters += ` and r.${TAG_NAMES.popCode} == "${pop_code}"`;
      }

      const query = `
        from(bucket: "${process.env.INFLUXDB_BUCKET}")
          |> range(start: -${range})
          |> filter(fn: (r) => ${filters})
          |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
      `;
      
      const queryResult = await executeQuery(query, { timeout: 20000 });
      const timeseriesData = [];
      
      queryResult.forEach(record => {
          timeseriesData.push({
              timestamp: record._time,
              value: record._value ? parseFloat(record._value.toFixed(2)) : null,
              _source: 'influxdb'
          });
      });

      return timeseriesData;
    }, { endpoint: 'timeseries', range, popCode: pop_code });
    
    // Add response metadata
    const responseTime = Date.now() - startTime;
    const response = Array.isArray(result) ? result : [result];
    
    // Add metadata to response
    const metadata = {
      responseTime,
      timestamp: new Date().toISOString(),
      count: response.length,
      range,
      popCode: pop_code || 'all',
      cached: !!(result[0] && result[0]._cacheSource),
      cacheSource: result[0] && result[0]._cacheSource || 'fresh',
      warning: result[0] && result[0]._warning
    };
    
    // Clean up internal metadata from each item
    response.forEach(item => {
      delete item._cacheSource;
      delete item._warning;
    });
    
    res.json({
      data: response,
      _metadata: metadata
    });
    
  } catch (error) {
    console.error('Error in timeseries endpoint:', error.message);
    
    // Check if this is a circuit breaker error
    if (error.circuitBreakerState === 'OPEN') {
      const fallbackResponse = createFallbackResponse('timeseries', { range, popCode: pop_code }, 'circuit_breaker_open');
      return res.status(503).json({
        ...fallbackResponse,
        error: 'Service temporarily unavailable due to circuit breaker',
        retryAfter: Math.ceil((error.nextAttemptTime - Date.now()) / 1000)
      });
    }
    
    // Final fallback: return synthetic data with error status
    const fallbackResponse = createFallbackResponse('timeseries', { range, popCode: pop_code }, 'error_fallback');
    
    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('not connected') || error.message.includes('not available')) {
      statusCode = 503;
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
    }
    
    res.status(statusCode).json({
      ...fallbackResponse,
      error: 'Database error, serving fallback data',
      details: error.message,
      _metadata: {
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        fallback: true,
        errorType: error.constructor.name,
        range,
        popCode: pop_code || 'all'
      }
    });
  }
});

router.get('/metrics/aggregate', async (req, res) => {
  const startTime = Date.now();
  const { range = '24h', groupBy = 'country' } = req.query;
  
  try {
    // Validate groupBy parameter against standardized tag names
    const validGroupByFields = Object.values(TAG_NAMES);
    if (!validGroupByFields.includes(groupBy)) {
      return res.status(400).json({ 
        error: 'Invalid groupBy parameter', 
        validOptions: validGroupByFields,
        _metadata: {
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const cacheKey = generateCacheKey('aggregate', { range, groupBy });
    
    const result = await getCachedOrExecute(cacheKey, CACHE_TTL.aggregate, async () => {
      const { executeQuery, ensureConnection } = getInfluxClient();
      
      // Ensure connection is healthy before executing query
      await ensureConnection();

      // Simplified single query approach instead of multiple yields
      const fluxQuery = `
        from(bucket: "${process.env.INFLUXDB_BUCKET}")
          |> range(start: -${range})
          |> filter(fn: (r) => r._measurement == "${MEASUREMENT_NAME}" and r._field == "${FIELD_NAMES.coldStartTime}")
          |> group(columns: ["${groupBy}"])
      `;

      const results = await executeQuery(fluxQuery, { timeout: 25000 });
      const aggregatedData = {};

      // Process results to calculate both count and average
      results.forEach(row => {
          const key = row[groupBy];
          if (!aggregatedData[key]) {
              aggregatedData[key] = { 
                [groupBy]: key,
                values: [],
                totalRequests: 0,
                averageTime: 0,
                _source: 'influxdb'
              };
          }
          aggregatedData[key].values.push(row._value);
          aggregatedData[key].totalRequests++;
      });

      // Calculate averages
      Object.values(aggregatedData).forEach(group => {
          if (group.values.length > 0) {
              group.averageTime = parseFloat(
                (group.values.reduce((sum, val) => sum + val, 0) / group.values.length).toFixed(2)
              );
          }
          delete group.values; // Remove temporary values array
      });

      return Object.values(aggregatedData);
    }, { endpoint: 'aggregate', range, groupBy });
    
    // Add response metadata
    const responseTime = Date.now() - startTime;
    const response = Array.isArray(result) ? result : [result];
    
    // Add metadata to response
    const metadata = {
      responseTime,
      timestamp: new Date().toISOString(),
      count: response.length,
      range,
      groupBy,
      cached: !!(result[0] && result[0]._cacheSource),
      cacheSource: result[0] && result[0]._cacheSource || 'fresh',
      warning: result[0] && result[0]._warning
    };
    
    // Clean up internal metadata from each item
    response.forEach(item => {
      delete item._cacheSource;
      delete item._warning;
    });
    
    res.json({
      data: response,
      _metadata: metadata
    });
    
  } catch (error) {
    console.error('Error in aggregate endpoint:', error.message);
    
    // Check if this is a circuit breaker error
    if (error.circuitBreakerState === 'OPEN') {
      const fallbackResponse = createFallbackResponse('aggregate', { range, groupBy }, 'circuit_breaker_open');
      return res.status(503).json({
        ...fallbackResponse,
        error: 'Service temporarily unavailable due to circuit breaker',
        retryAfter: Math.ceil((error.nextAttemptTime - Date.now()) / 1000)
      });
    }
    
    // Final fallback: return synthetic data with error status
    const fallbackResponse = createFallbackResponse('aggregate', { range, groupBy }, 'error_fallback');
    
    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('not connected') || error.message.includes('not available')) {
      statusCode = 503;
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
    }
    
    res.status(statusCode).json({
      ...fallbackResponse,
      error: 'Database error, serving fallback data',
      details: error.message,
      _metadata: {
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        fallback: true,
        errorType: error.constructor.name,
        range,
        groupBy
      }
    });
  }
});

// GET /api/dashboard/trends - Performance trends over time
router.get('/trends', async (req, res) => {
  const startTime = Date.now();
  const { range = '7d' } = req.query;
  
  try {
    const cacheKey = generateCacheKey('trends', { range });
    
    const result = await getCachedOrExecute(cacheKey, CACHE_TTL.timeseries, async () => {
      const { executeQuery, ensureConnection } = getInfluxClient();
      
      // Ensure connection is healthy before executing query
      await ensureConnection();
      
      // Determine aggregation window based on range
      let windowSize = '1h';
      if (range === '1d') windowSize = '1h';
      else if (range === '7d') windowSize = '6h';
      else if (range === '30d') windowSize = '1d';
      else if (range === '90d') windowSize = '1d';
      
      const query = `
        from(bucket: "${process.env.INFLUXDB_BUCKET}")
          |> range(start: -${range})
          |> filter(fn: (r) => r._measurement == "${MEASUREMENT_NAME}" and r._field == "${FIELD_NAMES.coldStartTime}")
          |> aggregateWindow(every: ${windowSize}, fn: mean, createEmpty: false)
          |> group()
          |> sort(columns: ["_time"])
      `;
      
      const queryResult = await executeQuery(query, { timeout: 30000 });
      const trendsData = [];
      
      queryResult.forEach(record => {
        trendsData.push({
          timestamp: record._time,
          avgResponseTime: record._value ? parseFloat(record._value.toFixed(2)) : null,
          p95ResponseTime: record._value ? parseFloat((record._value * 1.5).toFixed(2)) : null, // Estimated p95
          errorRate: Math.random() * 0.5, // Placeholder - would come from actual error metrics
          throughput: Math.floor(Math.random() * 1000) + 500, // Placeholder - would come from actual throughput metrics
          _source: 'influxdb'
        });
      });

      return trendsData;
    }, { endpoint: 'trends', range });
    
    // Add response metadata
    const responseTime = Date.now() - startTime;
    const response = Array.isArray(result) ? result : [result];
    
    // Add metadata to response
    const metadata = {
      responseTime,
      timestamp: new Date().toISOString(),
      count: response.length,
      range,
      windowSize: range === '1d' ? '1h' : range === '7d' ? '6h' : '1d',
      cached: !!(result[0] && result[0]._cacheSource),
      cacheSource: result[0] && result[0]._cacheSource || 'fresh',
      warning: result[0] && result[0]._warning
    };
    
    // Clean up internal metadata from each item
    response.forEach(item => {
      delete item._cacheSource;
      delete item._warning;
    });
    
    res.json({
      data: response,
      _metadata: metadata
    });
    
  } catch (error) {
    console.error('Error in trends endpoint:', error.message);
    
    // Check if this is a circuit breaker error
    if (error.circuitBreakerState === 'OPEN') {
      const fallbackResponse = createFallbackResponse('trends', { range }, 'circuit_breaker_open');
      return res.status(503).json({
        ...fallbackResponse,
        error: 'Service temporarily unavailable due to circuit breaker',
        retryAfter: Math.ceil((error.nextAttemptTime - Date.now()) / 1000)
      });
    }
    
    // Final fallback: return synthetic data with error status
    const fallbackResponse = createFallbackResponse('trends', { range }, 'error_fallback');
    
    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('not connected') || error.message.includes('not available')) {
      statusCode = 503;
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
    }
    
    res.status(statusCode).json({
      ...fallbackResponse,
      error: 'Database error, serving fallback data',
      details: error.message,
      _metadata: {
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        fallback: true,
        errorType: error.constructor.name,
        range
      }
    });
  }
});

// GET /api/dashboard/health - Health check endpoint with circuit breaker status
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Get circuit breaker status
    const circuitBreakerStatus = circuitBreakerManager.getAllStatus();
    
    // Check InfluxDB connection status
    let influxStatus = { healthy: false, error: 'Not available' };
    try {
      const { checkConnectionHealth } = getInfluxClient();
      influxStatus = await checkConnectionHealth();
    } catch (error) {
      influxStatus = { healthy: false, error: error.message };
    }
    
    // Check Redis connection status
    let redisStatus = { healthy: false, error: 'Not available' };
    try {
      const { healthCheck } = await import('../utils/redis.js');
      redisStatus = await healthCheck();
    } catch (error) {
      redisStatus = { healthy: false, error: error.message };
    }
    
    // Overall health assessment
    const overallHealthy = influxStatus.healthy && redisStatus.healthy;
    
    const healthReport = {
      status: overallHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      services: {
        influxdb: influxStatus,
        redis: redisStatus
      },
      circuitBreakers: circuitBreakerStatus,
      fallbackSystems: {
        cacheEnabled: true,
        syntheticDataEnabled: true,
        longTermCacheEnabled: true
      },
      _metadata: {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };
    
    // Return appropriate status code
    const statusCode = overallHealthy ? 200 : 503;
    res.status(statusCode).json(healthReport);
    
  } catch (error) {
    console.error('Error in health check endpoint:', error.message);
    
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      error: 'Health check failed',
      details: error.message
    });
  }
});

// GET /api/dashboard/circuit-breaker/reset - Reset circuit breakers (for admin use)
router.post('/circuit-breaker/reset', async (req, res) => {
  try {
    const { breaker } = req.body;
    
    if (breaker && breaker !== 'all') {
      const circuitBreaker = circuitBreakerManager.getBreaker(breaker);
      circuitBreaker.reset();
      
      res.json({
        message: `Circuit breaker '${breaker}' reset successfully`,
        timestamp: new Date().toISOString(),
        breaker: circuitBreaker.getStatus()
      });
    } else {
      // Reset all circuit breakers
      circuitBreakerManager.resetAll();
      
      res.json({
        message: 'All circuit breakers reset successfully',
        timestamp: new Date().toISOString(),
        breakers: circuitBreakerManager.getAllStatus()
      });
    }
    
  } catch (error) {
    console.error('Error resetting circuit breaker:', error.message);
    
    res.status(500).json({
      error: 'Failed to reset circuit breaker',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;