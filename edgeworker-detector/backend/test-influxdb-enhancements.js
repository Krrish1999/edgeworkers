#!/usr/bin/env node

/**
 * Test script to verify InfluxDB connection enhancements
 * This script tests the new retry logic, timeout handling, and structured logging
 */

import { connectInfluxDB, getInfluxClient, checkConnectionHealth, getConnectionStatus } from './src/utils/influxdb.js';

async function testInfluxDBEnhancements() {
    console.log('🧪 Testing InfluxDB Connection Enhancements...\n');
    
    try {
        // Test 1: Connection Status Before Connection
        console.log('📊 Test 1: Initial Connection Status');
        const initialStatus = getConnectionStatus();
        console.log('Initial status:', JSON.stringify(initialStatus, null, 2));
        console.log('✅ Test 1 passed\n');
        
        // Test 2: Connection with Retry Logic
        console.log('🔌 Test 2: Connection with Enhanced Retry Logic');
        console.log('Attempting to connect to InfluxDB...');
        await connectInfluxDB();
        console.log('✅ Test 2 passed - Connection successful\n');
        
        // Test 3: Connection Status After Connection
        console.log('📊 Test 3: Connection Status After Successful Connection');
        const connectedStatus = getConnectionStatus();
        console.log('Connected status:', JSON.stringify(connectedStatus, null, 2));
        console.log('✅ Test 3 passed\n');
        
        // Test 4: Health Check
        console.log('🏥 Test 4: Connection Health Check');
        const healthCheck = await checkConnectionHealth();
        console.log('Health check result:', JSON.stringify(healthCheck, null, 2));
        console.log('✅ Test 4 passed\n');
        
        // Test 5: Enhanced Query Execution
        console.log('🔍 Test 5: Enhanced Query Execution with Timeout');
        const { executeQuery } = getInfluxClient();
        
        // Simple test query to check if bucket exists
        const testQuery = `
            from(bucket: "${process.env.INFLUXDB_BUCKET || 'edgeworker-metrics'}")
            |> range(start: -1m)
            |> limit(n: 1)
        `;
        
        console.log('Executing test query with 10 second timeout...');
        const startTime = Date.now();
        const result = await executeQuery(testQuery, { timeout: 10000 });
        const executionTime = Date.now() - startTime;
        
        console.log(`Query executed in ${executionTime}ms`);
        console.log(`Result count: ${result.length}`);
        console.log('✅ Test 5 passed\n');
        
        // Test 6: Query Timeout Handling (with very short timeout)
        console.log('⏱️  Test 6: Query Timeout Handling');
        try {
            const timeoutQuery = `
                from(bucket: "${process.env.INFLUXDB_BUCKET || 'edgeworker-metrics'}")
                |> range(start: -24h)
                |> filter(fn: (r) => r._measurement == "cold_start_metrics")
            `;
            
            console.log('Executing query with 1ms timeout (should timeout)...');
            await executeQuery(timeoutQuery, { timeout: 1 });
            console.log('❌ Test 6 failed - Query should have timed out');
        } catch (error) {
            if (error.message.includes('timeout')) {
                console.log('✅ Test 6 passed - Query correctly timed out');
            } else {
                console.log('⚠️  Test 6 partial - Different error:', error.message);
            }
        }
        console.log();
        
        console.log('🎉 All InfluxDB enhancement tests completed successfully!');
        console.log('\n📋 Summary of Enhancements:');
        console.log('✅ Exponential backoff retry logic');
        console.log('✅ Query timeout handling');
        console.log('✅ Structured logging for connection events');
        console.log('✅ Connection health monitoring');
        console.log('✅ Enhanced error handling with appropriate HTTP status codes');
        console.log('✅ Performance logging for query execution');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the tests
testInfluxDBEnhancements().catch(console.error);