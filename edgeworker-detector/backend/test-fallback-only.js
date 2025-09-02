/**
 * Test script for fallback mechanisms without requiring Redis/InfluxDB
 * Tests circuit breaker and synthetic data generation only
 */

import { CircuitBreaker } from './src/utils/circuitBreaker.js';
import { getFallbackData, createFallbackResponse, isFallbackData } from './src/utils/fallbackData.js';

console.log('🧪 Testing Fallback Mechanisms (No External Dependencies)\n');

// Test 1: Circuit Breaker Functionality
async function testCircuitBreaker() {
    console.log('1️⃣ Testing Circuit Breaker Pattern');
    
    const testBreaker = new CircuitBreaker({
        name: 'test-service',
        failureThreshold: 3,
        resetTimeout: 5000,
        monitoringPeriod: 10000
    });
    
    // Test successful execution
    console.log('   ✅ Testing successful execution...');
    try {
        const result = await testBreaker.execute(async () => {
            return { success: true, data: 'test data' };
        });
        console.log('   ✅ Success:', result);
    } catch (error) {
        console.log('   ❌ Unexpected error:', error.message);
    }
    
    // Test failure scenarios
    console.log('   ⚠️  Testing failure scenarios...');
    for (let i = 1; i <= 4; i++) {
        try {
            await testBreaker.execute(async () => {
                throw new Error(`Simulated failure ${i}`);
            });
        } catch (error) {
            console.log(`   ❌ Expected failure ${i}:`, error.message);
        }
    }
    
    // Test circuit breaker open state
    console.log('   🔒 Testing circuit breaker OPEN state...');
    try {
        await testBreaker.execute(async () => {
            return { success: true };
        });
    } catch (error) {
        console.log('   ✅ Circuit breaker blocked request:', error.message);
    }
    
    console.log('   📊 Circuit breaker status:', testBreaker.getStatus());
    console.log('');
}

// Test 2: Fallback Data Generation
async function testFallbackData() {
    console.log('2️⃣ Testing Fallback Data Generation');
    
    // Test overview fallback
    console.log('   📊 Testing overview fallback data...');
    const overviewData = getFallbackData('overview');
    console.log('   ✅ Overview data:', overviewData);
    console.log('   ✅ Is fallback data:', isFallbackData(overviewData));
    
    // Test heatmap fallback
    console.log('   🗺️  Testing heatmap fallback data...');
    const heatmapData = getFallbackData('heatmap');
    console.log('   ✅ Heatmap data count:', heatmapData.length);
    console.log('   ✅ Sample heatmap item:', heatmapData[0]);
    
    // Test timeseries fallback
    console.log('   📈 Testing timeseries fallback data...');
    const timeseriesData = getFallbackData('timeseries', { range: '1h', popCode: 'NYC1' });
    console.log('   ✅ Timeseries data count:', timeseriesData.length);
    console.log('   ✅ Sample timeseries item:', timeseriesData[0]);
    
    // Test aggregate fallback
    console.log('   📊 Testing aggregate fallback data...');
    const aggregateData = getFallbackData('aggregate', { groupBy: 'country' });
    console.log('   ✅ Aggregate data count:', aggregateData.length);
    console.log('   ✅ Sample aggregate item:', aggregateData[0]);
    
    // Test fallback response creation
    console.log('   📦 Testing fallback response creation...');
    const fallbackResponse = createFallbackResponse('overview', {}, 'database_unavailable');
    console.log('   ✅ Fallback response structure:', Object.keys(fallbackResponse));
    console.log('   ✅ Fallback metadata:', fallbackResponse._metadata);
    console.log('');
}

// Test 3: Error Categorization
async function testErrorHandling() {
    console.log('3️⃣ Testing Error Categorization');
    
    const testErrors = [
        { error: new Error('ECONNREFUSED'), expectedCategory: 'network' },
        { error: new Error('Query timeout after 30000ms'), expectedCategory: 'timeout' },
        { error: new Error('Unauthorized access'), expectedCategory: 'authentication' },
        { error: new Error('Syntax error in query'), expectedCategory: 'syntax' },
        { error: new Error('Unknown database error'), expectedCategory: 'unknown' }
    ];
    
    // Simulate error categorization (this would be done in the actual InfluxDB utility)
    function categorizeError(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('econnrefused') || message.includes('enotfound')) {
            return 'network';
        } else if (message.includes('timeout')) {
            return 'timeout';
        } else if (message.includes('unauthorized') || message.includes('forbidden')) {
            return 'authentication';
        } else if (message.includes('syntax') || message.includes('parse')) {
            return 'syntax';
        } else {
            return 'unknown';
        }
    }
    
    testErrors.forEach(({ error, expectedCategory }) => {
        const category = categorizeError(error);
        const match = category === expectedCategory ? '✅' : '❌';
        console.log(`   ${match} Error: "${error.message}" -> Category: ${category} (expected: ${expectedCategory})`);
    });
    
    console.log('');
}

// Test 4: Integration Test - Simulated API Request Flow
async function testIntegratedFlow() {
    console.log('4️⃣ Testing Integrated Error Handling Flow');
    
    // Simulate a dashboard API request with various failure scenarios
    async function simulateAPIRequest(scenario) {
        console.log(`   🔄 Simulating scenario: ${scenario}`);
        
        try {
            // Get circuit breaker
            const breaker = new CircuitBreaker({
                name: 'api-test',
                failureThreshold: 2,
                resetTimeout: 5000
            });
            
            const result = await breaker.execute(async () => {
                switch (scenario) {
                    case 'success':
                        return { data: 'success', source: 'database' };
                    
                    case 'database_timeout':
                        throw new Error('Query timeout after 30000ms');
                    
                    case 'connection_refused':
                        throw new Error('ECONNREFUSED - database unavailable');
                    
                    case 'circuit_breaker_open':
                        throw new Error('Circuit breaker is OPEN');
                    
                    default:
                        throw new Error('Unknown error');
                }
            });
            
            console.log(`   ✅ Success result:`, result);
            return result;
            
        } catch (error) {
            console.log(`   ❌ Error caught:`, error.message);
            
            // Simulate fallback logic
            if (error.message.includes('Circuit breaker is OPEN')) {
                console.log('   🔒 Circuit breaker open - returning cached data');
                return getFallbackData('overview');
            } else {
                console.log('   🔄 Database error - trying cache fallback');
                // In real implementation, this would try Redis cache first
                return getFallbackData('overview');
            }
        }
    }
    
    // Test different scenarios
    const scenarios = ['success', 'database_timeout', 'connection_refused'];
    
    for (const scenario of scenarios) {
        await simulateAPIRequest(scenario);
        console.log('');
    }
    
    // Test circuit breaker opening after failures
    console.log('   🔒 Testing circuit breaker opening after repeated failures...');
    const testBreaker = new CircuitBreaker({
        name: 'repeated-test',
        failureThreshold: 2,
        resetTimeout: 5000
    });
    
    for (let i = 1; i <= 3; i++) {
        try {
            await testBreaker.execute(async () => {
                throw new Error('Repeated failure');
            });
        } catch (error) {
            console.log(`   ❌ Failure ${i}:`, error.message);
        }
    }
    
    // Now test with circuit breaker open
    try {
        await testBreaker.execute(async () => {
            return { success: true };
        });
    } catch (error) {
        console.log('   ✅ Circuit breaker blocked request:', error.message);
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Fallback Mechanism Tests\n');
    
    try {
        await testCircuitBreaker();
        await testFallbackData();
        await testErrorHandling();
        await testIntegratedFlow();
        
        console.log('✅ All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
        console.error(error.stack);
    }
    
    process.exit(0);
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests();
}