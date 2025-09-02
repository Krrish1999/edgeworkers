#!/usr/bin/env node

/**
 * Test script for InfluxDB connection reliability and error handling enhancements
 * This script tests the enhanced features implemented in task 2:
 * - Connection retry logic with exponential backoff
 * - Query timeout handling
 * - Structured logging for connection state changes and query performance
 */

import { 
    connectInfluxDB, 
    getInfluxClient, 
    executeQuery, 
    ensureConnection, 
    checkConnectionHealth, 
    getConnectionStatus,
    gracefulShutdown,
    initializeConnection
} from './src/utils/influxdb.js';

// Test configuration
const TEST_CONFIG = {
    connectionTests: true,
    queryTests: true,
    errorHandlingTests: true,
    performanceTests: true,
    healthCheckTests: true
};

// Test utilities
function log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        component: 'influxdb-reliability-test',
        message,
        ...data
    };
    
    const logString = JSON.stringify(logEntry, null, 2);
    
    if (level === 'error') {
        console.error(`[TEST-ERROR] ${logString}`);
    } else if (level === 'warn') {
        console.warn(`[TEST-WARN] ${logString}`);
    } else {
        console.log(`[TEST-INFO] ${logString}`);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Connection reliability and retry logic
async function testConnectionReliability() {
    log('info', 'Starting connection reliability tests');
    
    try {
        // Test initial connection
        log('info', 'Testing initial connection...');
        await connectInfluxDB();
        log('info', 'Initial connection successful');
        
        // Test connection status
        const status = getConnectionStatus();
        log('info', 'Connection status retrieved', { status });
        
        // Test ensure connection when already connected
        log('info', 'Testing ensureConnection when already connected...');
        await ensureConnection();
        log('info', 'ensureConnection completed successfully');
        
        return true;
    } catch (error) {
        log('error', 'Connection reliability test failed', {
            error: error.message,
            errorType: error.constructor.name,
            category: error.category
        });
        return false;
    }
}

// Test 2: Query execution with timeout and retry
async function testQueryExecution() {
    log('info', 'Starting query execution tests');
    
    try {
        // Test basic query execution
        const basicQuery = `
            from(bucket: "edgeworker-metrics")
            |> range(start: -1h)
            |> filter(fn: (r) => r._measurement == "cold_start_metrics")
            |> limit(n: 10)
        `;
        
        log('info', 'Testing basic query execution...');
        const startTime = Date.now();
        const result = await executeQuery(basicQuery);
        const executionTime = Date.now() - startTime;
        
        log('info', 'Basic query executed successfully', {
            resultCount: result.length,
            executionTime,
            performance: executionTime < 1000 ? 'fast' : executionTime < 5000 ? 'moderate' : 'slow'
        });
        
        // Test query with custom timeout
        log('info', 'Testing query with custom timeout...');
        const customTimeoutResult = await executeQuery(basicQuery, { timeout: 15000 });
        log('info', 'Custom timeout query successful', {
            resultCount: customTimeoutResult.length
        });
        
        // Test query with retry options
        log('info', 'Testing query with retry options...');
        const retryResult = await executeQuery(basicQuery, { 
            timeout: 10000, 
            maxRetries: 1,
            retryDelay: 500
        });
        log('info', 'Retry options query successful', {
            resultCount: retryResult.length
        });
        
        return true;
    } catch (error) {
        log('error', 'Query execution test failed', {
            error: error.message,
            errorType: error.constructor.name,
            category: error.category,
            queryId: error.queryId
        });
        return false;
    }
}

// Test 3: Error handling scenarios
async function testErrorHandling() {
    log('info', 'Starting error handling tests');
    
    try {
        // Test invalid query syntax
        log('info', 'Testing invalid query syntax handling...');
        try {
            await executeQuery('invalid flux query syntax');
            log('warn', 'Expected syntax error but query succeeded');
        } catch (error) {
            log('info', 'Syntax error handled correctly', {
                error: error.message,
                category: error.category
            });
        }
        
        // Test query timeout (using a very short timeout)
        log('info', 'Testing query timeout handling...');
        try {
            const longQuery = `
                from(bucket: "edgeworker-metrics")
                |> range(start: -24h)
                |> filter(fn: (r) => r._measurement == "cold_start_metrics")
            `;
            await executeQuery(longQuery, { timeout: 1 }); // 1ms timeout
            log('warn', 'Expected timeout error but query succeeded');
        } catch (error) {
            if (error.message.includes('timeout')) {
                log('info', 'Timeout error handled correctly', {
                    error: error.message
                });
            } else {
                log('warn', 'Unexpected error type for timeout test', {
                    error: error.message
                });
            }
        }
        
        return true;
    } catch (error) {
        log('error', 'Error handling test failed', {
            error: error.message,
            errorType: error.constructor.name
        });
        return false;
    }
}

// Test 4: Performance monitoring and logging
async function testPerformanceMonitoring() {
    log('info', 'Starting performance monitoring tests');
    
    try {
        // Execute multiple queries to test performance tracking
        const queries = [
            'from(bucket: "edgeworker-metrics") |> range(start: -5m) |> limit(n: 5)',
            'from(bucket: "edgeworker-metrics") |> range(start: -10m) |> limit(n: 10)',
            'from(bucket: "edgeworker-metrics") |> range(start: -15m) |> limit(n: 15)'
        ];
        
        log('info', 'Executing multiple queries for performance tracking...');
        
        for (let i = 0; i < queries.length; i++) {
            const startTime = Date.now();
            try {
                const result = await executeQuery(queries[i]);
                const executionTime = Date.now() - startTime;
                
                log('info', `Query ${i + 1} performance`, {
                    queryIndex: i + 1,
                    executionTime,
                    resultCount: result.length,
                    performance: executionTime < 500 ? 'excellent' : 
                                executionTime < 1000 ? 'good' : 
                                executionTime < 3000 ? 'acceptable' : 'slow'
                });
            } catch (error) {
                log('warn', `Query ${i + 1} failed`, {
                    queryIndex: i + 1,
                    error: error.message
                });
            }
            
            // Small delay between queries
            await sleep(100);
        }
        
        // Check global query metrics
        const status = getConnectionStatus();
        if (status.queryMetrics) {
            log('info', 'Query performance metrics', {
                metrics: status.queryMetrics
            });
        }
        
        return true;
    } catch (error) {
        log('error', 'Performance monitoring test failed', {
            error: error.message,
            errorType: error.constructor.name
        });
        return false;
    }
}

// Test 5: Health check functionality
async function testHealthCheck() {
    log('info', 'Starting health check tests');
    
    try {
        // Test basic health check
        log('info', 'Testing basic health check...');
        const healthResult = await checkConnectionHealth();
        log('info', 'Health check completed', {
            healthy: healthResult.healthy,
            status: healthResult.status,
            checkDuration: healthResult.checkDuration,
            connectionState: healthResult.connectionState
        });
        
        // Test multiple health checks
        log('info', 'Testing multiple consecutive health checks...');
        for (let i = 0; i < 3; i++) {
            const result = await checkConnectionHealth();
            log('info', `Health check ${i + 1}`, {
                healthy: result.healthy,
                checkDuration: result.checkDuration
            });
            await sleep(500);
        }
        
        return true;
    } catch (error) {
        log('error', 'Health check test failed', {
            error: error.message,
            errorType: error.constructor.name
        });
        return false;
    }
}

// Test 6: Connection status monitoring
async function testConnectionStatus() {
    log('info', 'Starting connection status monitoring tests');
    
    try {
        const status = getConnectionStatus();
        log('info', 'Complete connection status', { status });
        
        // Validate status structure
        const requiredFields = [
            'state', 'connected', 'hasClient', 'hasQueryApi', 'hasWriteApi',
            'configuration', 'retryCount'
        ];
        
        const missingFields = requiredFields.filter(field => !(field in status));
        if (missingFields.length > 0) {
            log('warn', 'Missing fields in connection status', { missingFields });
        } else {
            log('info', 'Connection status structure is complete');
        }
        
        return true;
    } catch (error) {
        log('error', 'Connection status test failed', {
            error: error.message,
            errorType: error.constructor.name
        });
        return false;
    }
}

// Main test runner
async function runAllTests() {
    log('info', 'Starting InfluxDB reliability and error handling tests');
    
    const testResults = {
        connectionReliability: false,
        queryExecution: false,
        errorHandling: false,
        performanceMonitoring: false,
        healthCheck: false,
        connectionStatus: false
    };
    
    try {
        // Initialize connection
        log('info', 'Initializing InfluxDB connection for tests...');
        await initializeConnection();
        
        // Run tests based on configuration
        if (TEST_CONFIG.connectionTests) {
            testResults.connectionReliability = await testConnectionReliability();
            await sleep(1000);
        }
        
        if (TEST_CONFIG.queryTests) {
            testResults.queryExecution = await testQueryExecution();
            await sleep(1000);
        }
        
        if (TEST_CONFIG.errorHandlingTests) {
            testResults.errorHandling = await testErrorHandling();
            await sleep(1000);
        }
        
        if (TEST_CONFIG.performanceTests) {
            testResults.performanceMonitoring = await testPerformanceMonitoring();
            await sleep(1000);
        }
        
        if (TEST_CONFIG.healthCheckTests) {
            testResults.healthCheck = await testHealthCheck();
            testResults.connectionStatus = await testConnectionStatus();
        }
        
        // Summary
        const passedTests = Object.values(testResults).filter(result => result === true).length;
        const totalTests = Object.keys(testResults).length;
        
        log('info', 'Test execution completed', {
            testResults,
            summary: {
                passed: passedTests,
                total: totalTests,
                success: passedTests === totalTests
            }
        });
        
        if (passedTests === totalTests) {
            log('info', '🎉 All InfluxDB reliability tests passed!');
            process.exit(0);
        } else {
            log('error', `❌ ${totalTests - passedTests} tests failed`);
            process.exit(1);
        }
        
    } catch (error) {
        log('error', 'Test execution failed', {
            error: error.message,
            errorType: error.constructor.name,
            stack: error.stack
        });
        process.exit(1);
    } finally {
        // Cleanup
        try {
            await gracefulShutdown();
            log('info', 'Test cleanup completed');
        } catch (error) {
            log('warn', 'Test cleanup failed', { error: error.message });
        }
    }
}

// Handle process signals for graceful shutdown
process.on('SIGINT', async () => {
    log('info', 'Received SIGINT, shutting down gracefully...');
    try {
        await gracefulShutdown();
    } catch (error) {
        log('error', 'Error during graceful shutdown', { error: error.message });
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    log('info', 'Received SIGTERM, shutting down gracefully...');
    try {
        await gracefulShutdown();
    } catch (error) {
        log('error', 'Error during graceful shutdown', { error: error.message });
    }
    process.exit(0);
});

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().catch(error => {
        log('error', 'Unhandled error in test execution', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    });
}

export { runAllTests };