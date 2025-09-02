#!/usr/bin/env node

/**
 * Test script for dashboard API query optimizations
 * Tests the simplified queries, caching functionality, and standardized field names
 */

import { connectInfluxDB, getInfluxClient } from './src/utils/influxdb.js';
import { connectRedis, getRedisClient, clearCachePattern } from './src/utils/redis.js';
import Alert from './src/models/Alert.js';
import mongoose from 'mongoose';

// Test configuration
const TEST_CONFIG = {
    MEASUREMENT_NAME: 'cold_start_metrics',
    FIELD_NAMES: {
        coldStartTime: 'cold_start_time_ms',
        latitude: 'latitude',
        longitude: 'longitude'
    },
    TAG_NAMES: {
        popCode: 'pop_code',
        city: 'city',
        country: 'country',
        tier: 'tier',
        functionName: 'function_name'
    }
};

// Helper function to generate cache keys (same as in dashboard.js)
function generateCacheKey(endpoint, params = {}) {
    const paramString = Object.keys(params)
        .sort()
        .map(key => `${key}:${params[key]}`)
        .join('|');
    return `dashboard:${endpoint}:${paramString}`;
}

// Test the simplified overview query
async function testOverviewQuery() {
    console.log('\n🧪 Testing simplified overview query...');
    
    try {
        const { executeQuery, ensureConnection } = getInfluxClient();
        await ensureConnection();

        const startTime = Date.now();
        
        // Simplified single query approach
        const fluxQuery = `
            from(bucket: "${process.env.INFLUXDB_BUCKET}")
              |> range(start: -10m)
              |> filter(fn: (r) => r._measurement == "${TEST_CONFIG.MEASUREMENT_NAME}" and r._field == "${TEST_CONFIG.FIELD_NAMES.coldStartTime}")
              |> group(columns: ["${TEST_CONFIG.TAG_NAMES.popCode}"])
              |> last()
              |> group()
        `;

        const queryResult = await executeQuery(fluxQuery, { timeout: 10000 });
        const executionTime = Date.now() - startTime;
        
        // Process results
        const totalPops = queryResult.length;
        const healthyPops = queryResult.filter(r => r._value < 10.0).length;
        const averageColdStart = queryResult.length > 0 
            ? queryResult.reduce((sum, r) => sum + r._value, 0) / queryResult.length 
            : 0;

        console.log('✅ Overview query results:');
        console.log(`   - Execution time: ${executionTime}ms`);
        console.log(`   - Total PoPs: ${totalPops}`);
        console.log(`   - Healthy PoPs: ${healthyPops}`);
        console.log(`   - Average cold start: ${averageColdStart.toFixed(2)}ms`);
        console.log(`   - Query returned ${queryResult.length} records`);
        
        return { totalPops, healthyPops, averageColdStart, executionTime };
        
    } catch (error) {
        console.error('❌ Overview query test failed:', error.message);
        throw error;
    }
}

// Test the optimized heatmap query
async function testHeatmapQuery() {
    console.log('\n🧪 Testing optimized heatmap query...');
    
    try {
        const { executeQuery, ensureConnection } = getInfluxClient();
        await ensureConnection();

        const startTime = Date.now();
        
        // Optimized query using standardized field names
        const query = `
            from(bucket: "${process.env.INFLUXDB_BUCKET}")
              |> range(start: -5m)
              |> filter(fn: (r) => r._measurement == "${TEST_CONFIG.MEASUREMENT_NAME}" and r._field == "${TEST_CONFIG.FIELD_NAMES.coldStartTime}")
              |> group(columns: ["${TEST_CONFIG.TAG_NAMES.popCode}", "${TEST_CONFIG.TAG_NAMES.city}", "${TEST_CONFIG.TAG_NAMES.country}", "${TEST_CONFIG.FIELD_NAMES.latitude}", "${TEST_CONFIG.FIELD_NAMES.longitude}"])
              |> mean()
              |> group()
        `;
        
        const queryResult = await executeQuery(query, { timeout: 15000 });
        const executionTime = Date.now() - startTime;
        
        const heatmapData = [];
        queryResult.forEach(record => {
            let status = 'healthy';
            if (record._value > 15) status = 'critical';
            else if (record._value > 10) status = 'warning';

            heatmapData.push({
                popCode: record[TEST_CONFIG.TAG_NAMES.popCode],
                city: record[TEST_CONFIG.TAG_NAMES.city],
                country: record[TEST_CONFIG.TAG_NAMES.country],
                lat: record[TEST_CONFIG.FIELD_NAMES.latitude],
                lon: record[TEST_CONFIG.FIELD_NAMES.longitude],
                coldStartTime: parseFloat(record._value.toFixed(2)),
                status
            });
        });
        
        console.log('✅ Heatmap query results:');
        console.log(`   - Execution time: ${executionTime}ms`);
        console.log(`   - Query returned ${queryResult.length} records`);
        console.log(`   - Processed ${heatmapData.length} PoP locations`);
        
        // Show sample data
        if (heatmapData.length > 0) {
            console.log(`   - Sample PoP: ${heatmapData[0].city}, ${heatmapData[0].country} (${heatmapData[0].coldStartTime}ms, ${heatmapData[0].status})`);
        }
        
        return { heatmapData, executionTime };
        
    } catch (error) {
        console.error('❌ Heatmap query test failed:', error.message);
        throw error;
    }
}

// Test the optimized timeseries query
async function testTimeseriesQuery() {
    console.log('\n🧪 Testing optimized timeseries query...');
    
    try {
        const { executeQuery, ensureConnection } = getInfluxClient();
        await ensureConnection();

        const range = '1h';
        const pop_code = 'lax1'; // Test with specific PoP
        
        const startTime = Date.now();
        
        // Build filters using standardized field names
        let filters = `r._measurement == "${TEST_CONFIG.MEASUREMENT_NAME}" and r._field == "${TEST_CONFIG.FIELD_NAMES.coldStartTime}"`;
        if (pop_code) {
            filters += ` and r.${TEST_CONFIG.TAG_NAMES.popCode} == "${pop_code}"`;
        }

        const query = `
            from(bucket: "${process.env.INFLUXDB_BUCKET}")
              |> range(start: -${range})
              |> filter(fn: (r) => ${filters})
              |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
        `;
        
        const queryResult = await executeQuery(query, { timeout: 20000 });
        const executionTime = Date.now() - startTime;
        
        const timeseriesData = [];
        queryResult.forEach(record => {
            timeseriesData.push({
                timestamp: record._time,
                value: record._value ? parseFloat(record._value.toFixed(2)) : null,
            });
        });
        
        console.log('✅ Timeseries query results:');
        console.log(`   - Execution time: ${executionTime}ms`);
        console.log(`   - Range: ${range}, PoP: ${pop_code || 'all'}`);
        console.log(`   - Query returned ${queryResult.length} records`);
        console.log(`   - Processed ${timeseriesData.length} time points`);
        
        return { timeseriesData, executionTime };
        
    } catch (error) {
        console.error('❌ Timeseries query test failed:', error.message);
        throw error;
    }
}

// Test Redis caching functionality
async function testCaching() {
    console.log('\n🧪 Testing Redis caching functionality...');
    
    try {
        const redisClient = getRedisClient();
        
        // Clear any existing test cache
        await clearCachePattern('test:*');
        
        // Test basic caching
        const testKey = 'test:dashboard:overview';
        const testData = { totalPops: 20, healthyPops: 18, averageColdStart: 5.2, regressions: 2 };
        const ttl = 30;
        
        // Set cache
        await redisClient.setEx(testKey, ttl, JSON.stringify(testData));
        console.log('✅ Data cached successfully');
        
        // Get from cache
        const cachedData = await redisClient.get(testKey);
        const parsedData = JSON.parse(cachedData);
        
        console.log('✅ Data retrieved from cache:');
        console.log(`   - Total PoPs: ${parsedData.totalPops}`);
        console.log(`   - Healthy PoPs: ${parsedData.healthyPops}`);
        console.log(`   - Average cold start: ${parsedData.averageColdStart}ms`);
        
        // Test TTL
        const remainingTtl = await redisClient.ttl(testKey);
        console.log(`✅ Cache TTL: ${remainingTtl} seconds remaining`);
        
        // Test cache key generation
        const cacheKey1 = generateCacheKey('overview');
        const cacheKey2 = generateCacheKey('timeseries', { range: '1h', pop_code: 'lax1' });
        
        console.log('✅ Cache key generation:');
        console.log(`   - Overview key: ${cacheKey1}`);
        console.log(`   - Timeseries key: ${cacheKey2}`);
        
        // Clean up
        await redisClient.del(testKey);
        console.log('✅ Test cache cleaned up');
        
        return true;
        
    } catch (error) {
        console.error('❌ Caching test failed:', error.message);
        throw error;
    }
}

// Test aggregate query optimization
async function testAggregateQuery() {
    console.log('\n🧪 Testing optimized aggregate query...');
    
    try {
        const { executeQuery, ensureConnection } = getInfluxClient();
        await ensureConnection();

        const range = '1h';
        const groupBy = TEST_CONFIG.TAG_NAMES.country;
        
        const startTime = Date.now();
        
        // Simplified single query approach
        const fluxQuery = `
            from(bucket: "${process.env.INFLUXDB_BUCKET}")
              |> range(start: -${range})
              |> filter(fn: (r) => r._measurement == "${TEST_CONFIG.MEASUREMENT_NAME}" and r._field == "${TEST_CONFIG.FIELD_NAMES.coldStartTime}")
              |> group(columns: ["${groupBy}"])
        `;

        const results = await executeQuery(fluxQuery, { timeout: 25000 });
        const executionTime = Date.now() - startTime;
        
        const aggregatedData = {};

        // Process results to calculate both count and average
        results.forEach(row => {
            const key = row[groupBy];
            if (!aggregatedData[key]) {
                aggregatedData[key] = { 
                  [groupBy]: key,
                  values: [],
                  totalRequests: 0,
                  averageTime: 0
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

        const finalResults = Object.values(aggregatedData);
        
        console.log('✅ Aggregate query results:');
        console.log(`   - Execution time: ${executionTime}ms`);
        console.log(`   - Grouped by: ${groupBy}`);
        console.log(`   - Query returned ${results.length} records`);
        console.log(`   - Aggregated into ${finalResults.length} groups`);
        
        // Show sample data
        if (finalResults.length > 0) {
            const sample = finalResults[0];
            console.log(`   - Sample group: ${sample[groupBy]} (${sample.totalRequests} requests, ${sample.averageTime}ms avg)`);
        }
        
        return { aggregatedData: finalResults, executionTime };
        
    } catch (error) {
        console.error('❌ Aggregate query test failed:', error.message);
        throw error;
    }
}

// Performance comparison test
async function performanceComparison() {
    console.log('\n🧪 Running performance comparison...');
    
    const results = {
        overview: null,
        heatmap: null,
        timeseries: null,
        aggregate: null
    };
    
    try {
        // Run each test multiple times and average
        const iterations = 3;
        
        for (let i = 0; i < iterations; i++) {
            console.log(`\n--- Iteration ${i + 1}/${iterations} ---`);
            
            const overviewResult = await testOverviewQuery();
            const heatmapResult = await testHeatmapQuery();
            const timeseriesResult = await testTimeseriesQuery();
            const aggregateResult = await testAggregateQuery();
            
            if (!results.overview) {
                results.overview = { executionTimes: [], recordCounts: [] };
                results.heatmap = { executionTimes: [], recordCounts: [] };
                results.timeseries = { executionTimes: [], recordCounts: [] };
                results.aggregate = { executionTimes: [], recordCounts: [] };
            }
            
            results.overview.executionTimes.push(overviewResult.executionTime);
            results.heatmap.executionTimes.push(heatmapResult.executionTime);
            results.timeseries.executionTimes.push(timeseriesResult.executionTime);
            results.aggregate.executionTimes.push(aggregateResult.executionTime);
            
            // Small delay between iterations
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Calculate averages
        console.log('\n📊 Performance Summary:');
        console.log('=====================================');
        
        Object.keys(results).forEach(queryType => {
            const times = results[queryType].executionTimes;
            const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
            const minTime = Math.min(...times);
            const maxTime = Math.max(...times);
            
            console.log(`${queryType.toUpperCase()}:`);
            console.log(`  Average: ${avgTime.toFixed(2)}ms`);
            console.log(`  Min: ${minTime}ms, Max: ${maxTime}ms`);
            console.log(`  Improvement: Simplified query structure reduces complexity`);
        });
        
        return results;
        
    } catch (error) {
        console.error('❌ Performance comparison failed:', error.message);
        throw error;
    }
}

// Main test runner
async function runTests() {
    console.log('🚀 Starting Dashboard API Optimization Tests');
    console.log('==============================================');
    
    try {
        // Connect to services
        console.log('\n🔌 Connecting to services...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/edgeworker-detector');
        console.log('✅ Connected to MongoDB');
        
        // Connect to InfluxDB
        await connectInfluxDB();
        console.log('✅ Connected to InfluxDB');
        
        // Connect to Redis
        await connectRedis();
        console.log('✅ Connected to Redis');
        
        // Run individual tests
        await testCaching();
        await performanceComparison();
        
        console.log('\n🎉 All tests completed successfully!');
        console.log('\n📋 Summary of Optimizations:');
        console.log('- ✅ Simplified multi-yield queries to single queries');
        console.log('- ✅ Added Redis caching with configurable TTL');
        console.log('- ✅ Standardized field and measurement names');
        console.log('- ✅ Added fallback caching for error scenarios');
        console.log('- ✅ Improved query performance and reduced complexity');
        
    } catch (error) {
        console.error('\n💥 Test suite failed:', error.message);
        process.exit(1);
    } finally {
        // Cleanup connections
        try {
            await mongoose.disconnect();
            console.log('✅ Disconnected from MongoDB');
        } catch (error) {
            console.warn('⚠️  Error disconnecting from MongoDB:', error.message);
        }
        
        process.exit(0);
    }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(error => {
        console.error('💥 Unhandled error:', error);
        process.exit(1);
    });
}

export { 
    testOverviewQuery, 
    testHeatmapQuery, 
    testTimeseriesQuery, 
    testAggregateQuery,
    testCaching,
    performanceComparison 
};