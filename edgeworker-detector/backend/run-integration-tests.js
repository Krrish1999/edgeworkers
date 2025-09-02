#!/usr/bin/env node

/**
 * Integration Test Runner
 * Runs all end-to-end integration tests for task 8
 * Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2
 */

import EndToEndIntegrationTest from './test-end-to-end-integration.js';
import WebSocketMultiClientTest from './test-websocket-multiclient.js';
import ErrorScenariosTest from './test-error-scenarios.js';

class IntegrationTestRunner {
    constructor() {
        this.testSuites = [
            {
                name: 'End-to-End Integration Tests',
                class: EndToEndIntegrationTest,
                requirements: ['1.1', '1.2', '1.3', '1.4', '3.1', '3.2']
            },
            {
                name: 'WebSocket Multi-Client Tests',
                class: WebSocketMultiClientTest,
                requirements: ['3.1', '3.2', '3.3', '3.4']
            },
            {
                name: 'Error Scenarios Tests',
                class: ErrorScenariosTest,
                requirements: ['2.1', '2.2', '2.3', '2.4']
            }
        ];
        this.results = [];
    }

    async runAllTestSuites() {
        console.log('🚀 Starting Comprehensive Integration Test Suite');
        console.log('='.repeat(60));
        console.log('Task 8: Create integration tests to verify end-to-end data flow');
        console.log('');
        console.log('Test Coverage:');
        console.log('✅ Data flows from generator through InfluxDB to API responses');
        console.log('✅ WebSocket broadcasting with multiple connected clients');
        console.log('✅ Error scenarios including InfluxDB downtime and network issues');
        console.log('');
        console.log('Requirements Coverage:');
        console.log('✅ 1.1: Dashboard APIs return real-time metrics from InfluxDB');
        console.log('✅ 1.2: APIs return current metrics within 30 seconds');
        console.log('✅ 1.3: Heatmap returns current PoP status');
        console.log('✅ 1.4: Timeseries returns time-series data from InfluxDB');
        console.log('✅ 2.1: System returns appropriate error responses when InfluxDB is unavailable');
        console.log('✅ 2.2: System logs detailed error information for debugging');
        console.log('✅ 2.3: System attempts to reconnect automatically when connection is lost');
        console.log('✅ 2.4: System handles timeouts gracefully and returns error responses');
        console.log('✅ 3.1: WebSocket clients receive updated overview metrics within 10 seconds');
        console.log('✅ 3.2: WebSocket clients receive updated regression counts');
        console.log('✅ 3.3: WebSocket broadcasts handle failures gracefully');
        console.log('✅ 3.4: System optimizes performance when no clients are connected');
        console.log('');
        console.log('='.repeat(60));
        console.log('');

        let totalPassed = 0;
        let totalTests = 0;

        for (const suite of this.testSuites) {
            console.log(`🧪 Running ${suite.name}...`);
            console.log(`📋 Testing Requirements: ${suite.requirements.join(', ')}`);
            console.log('');

            try {
                const testInstance = new suite.class();
                const startTime = Date.now();
                const success = await testInstance.runAllTests();
                const duration = Date.now() - startTime;

                const result = {
                    name: suite.name,
                    success,
                    duration,
                    requirements: suite.requirements
                };

                this.results.push(result);

                if (success) {
                    totalPassed++;
                    console.log(`✅ ${suite.name} PASSED (${duration}ms)`);
                } else {
                    console.log(`❌ ${suite.name} FAILED (${duration}ms)`);
                }

                totalTests++;

            } catch (error) {
                console.error(`💥 ${suite.name} crashed:`, error.message);
                this.results.push({
                    name: suite.name,
                    success: false,
                    duration: 0,
                    requirements: suite.requirements,
                    error: error.message
                });
                totalTests++;
            }

            console.log('');
            console.log('-'.repeat(40));
            console.log('');
        }

        // Print final summary
        this.printFinalSummary(totalPassed, totalTests);

        return totalPassed === totalTests;
    }

    printFinalSummary(totalPassed, totalTests) {
        console.log('📊 FINAL INTEGRATION TEST RESULTS');
        console.log('='.repeat(60));
        console.log('');

        // Test suite results
        this.results.forEach(result => {
            const status = result.success ? '✅ PASS' : '❌ FAIL';
            const duration = result.duration ? `(${result.duration}ms)` : '';
            console.log(`${status} ${result.name} ${duration}`);
            console.log(`   Requirements: ${result.requirements.join(', ')}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
            console.log('');
        });

        // Overall summary
        const successRate = (totalPassed / totalTests) * 100;
        console.log(`📈 Overall Results: ${totalPassed}/${totalTests} test suites passed (${successRate.toFixed(1)}%)`);
        console.log('');

        // Requirements coverage summary
        const allRequirements = new Set();
        const passedRequirements = new Set();

        this.results.forEach(result => {
            result.requirements.forEach(req => {
                allRequirements.add(req);
                if (result.success) {
                    passedRequirements.add(req);
                }
            });
        });

        console.log('📋 Requirements Coverage:');
        Array.from(allRequirements).sort().forEach(req => {
            const status = passedRequirements.has(req) ? '✅' : '❌';
            console.log(`${status} Requirement ${req}`);
        });

        console.log('');
        console.log(`📊 Requirements Coverage: ${passedRequirements.size}/${allRequirements.size} requirements verified`);
        console.log('');

        // Task completion status
        const taskComplete = totalPassed === totalTests;
        if (taskComplete) {
            console.log('🎉 TASK 8 COMPLETED SUCCESSFULLY!');
            console.log('');
            console.log('✅ All integration tests verify end-to-end data flow');
            console.log('✅ Data flows from generator through InfluxDB to API responses');
            console.log('✅ WebSocket broadcasting with multiple connected clients works correctly');
            console.log('✅ Error scenarios including InfluxDB downtime and network issues are handled');
            console.log('✅ All specified requirements have been verified');
        } else {
            console.log('⚠️  TASK 8 PARTIALLY COMPLETED');
            console.log('');
            console.log(`❌ ${totalTests - totalPassed} test suite(s) failed`);
            console.log(`❌ ${allRequirements.size - passedRequirements.size} requirement(s) not fully verified`);
            console.log('');
            console.log('Please review the failed tests and fix any issues before considering the task complete.');
        }

        console.log('');
        console.log('='.repeat(60));
    }

    async runQuickHealthCheck() {
        console.log('🏥 Running Quick Health Check...');
        console.log('');

        const healthChecks = [
            {
                name: 'InfluxDB Connection',
                check: async () => {
                    try {
                        const { getInfluxClient } = await import('./src/utils/influxdb.js');
                        const { checkConnectionHealth } = getInfluxClient();
                        const health = await checkConnectionHealth();
                        return { healthy: health.healthy, details: health.status };
                    } catch (error) {
                        return { healthy: false, details: error.message };
                    }
                }
            },
            {
                name: 'Redis Connection',
                check: async () => {
                    try {
                        const { getRedisClient } = await import('./src/utils/redis.js');
                        const redisClient = getRedisClient();
                        if (redisClient) {
                            await redisClient.ping();
                            return { healthy: true, details: 'Connected' };
                        } else {
                            return { healthy: false, details: 'Client not available' };
                        }
                    } catch (error) {
                        return { healthy: false, details: error.message };
                    }
                }
            },
            {
                name: 'MongoDB Connection',
                check: async () => {
                    try {
                        const Alert = (await import('./src/models/Alert.js')).default;
                        await Alert.countDocuments({});
                        return { healthy: true, details: 'Connected' };
                    } catch (error) {
                        return { healthy: false, details: error.message };
                    }
                }
            }
        ];

        let healthyServices = 0;
        
        for (const healthCheck of healthChecks) {
            try {
                const result = await healthCheck.check();
                const status = result.healthy ? '✅' : '❌';
                console.log(`${status} ${healthCheck.name}: ${result.details}`);
                if (result.healthy) healthyServices++;
            } catch (error) {
                console.log(`❌ ${healthCheck.name}: ${error.message}`);
            }
        }

        console.log('');
        console.log(`📊 Health Check: ${healthyServices}/${healthChecks.length} services healthy`);
        console.log('');

        if (healthyServices < healthChecks.length) {
            console.log('⚠️  Some services are not healthy. Integration tests may fail or use fallback mechanisms.');
            console.log('   This is expected behavior and tests should still verify fallback functionality.');
            console.log('');
        }

        return healthyServices >= 1; // At least one service should be healthy
    }
}

// Main execution
async function main() {
    const runner = new IntegrationTestRunner();
    
    try {
        // Run health check first
        console.log('🔍 Pre-flight Health Check');
        console.log('='.repeat(30));
        const healthOk = await runner.runQuickHealthCheck();
        
        if (!healthOk) {
            console.log('⚠️  Health check indicates potential issues, but continuing with tests...');
            console.log('   Tests are designed to handle service unavailability gracefully.');
            console.log('');
        }

        // Run all test suites
        const success = await runner.runAllTestSuites();
        
        // Exit with appropriate code
        process.exit(success ? 0 : 1);
        
    } catch (error) {
        console.error('💥 Integration test runner failed:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default IntegrationTestRunner;