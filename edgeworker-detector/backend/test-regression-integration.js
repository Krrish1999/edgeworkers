#!/usr/bin/env node

/**
 * Test script for regression detection integration with real-time alerts
 * Tests WebSocket notifications and automatic alert resolution
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import AlertService from './src/services/AlertService.js';
import RegressionDetector from './src/services/RegressionDetector.js';
import Alert from './src/models/Alert.js';
import { connectMongoDB } from './src/utils/database.js';
import { initializeConnection } from './src/utils/influxdb.js';
import { connectRedis } from './src/utils/redis.js';

// Test configuration
const TEST_PORT = 3002;
const TEST_POP = 'TEST_NYC';

class RegressionIntegrationTest {
    constructor() {
        this.server = null;
        this.wss = null;
        this.alertService = null;
        this.regressionDetector = null;
        this.testResults = [];
        this.receivedMessages = [];
    }

    async setup() {
        console.log('🔧 Setting up test environment...');

        // Initialize database connections
        await Promise.all([
            connectMongoDB(),
            initializeConnection(),
            connectRedis()
        ]);

        // Create test HTTP server and WebSocket server
        this.server = http.createServer();
        this.wss = new WebSocketServer({ server: this.server });

        // Add broadcast method to WebSocket server
        this.wss.broadcast = function broadcast(data) {
            const message = typeof data === 'string' ? data : JSON.stringify(data);
            let successCount = 0;
            let failCount = 0;

            this.clients.forEach(function each(client) {
                if (client.readyState === WebSocket.OPEN) {
                    try {
                        client.send(message);
                        successCount++;
                    } catch (error) {
                        console.error('Broadcast error:', error.message);
                        failCount++;
                    }
                }
            });

            return {
                totalClients: this.clients.size,
                successfulBroadcasts: successCount,
                failedBroadcasts: failCount
            };
        };

        // Initialize services
        this.alertService = new AlertService(this.wss);
        this.regressionDetector = new RegressionDetector(this.alertService);

        // Start server
        await new Promise((resolve) => {
            this.server.listen(TEST_PORT, () => {
                console.log(`✅ Test server listening on port ${TEST_PORT}`);
                resolve();
            });
        });

        console.log('✅ Test environment setup complete');
    }

    async cleanup() {
        console.log('🧹 Cleaning up test environment...');

        // Clean up test alerts
        await Alert.deleteMany({ pop_code: TEST_POP });

        // Stop regression detector
        if (this.regressionDetector) {
            await this.regressionDetector.stop();
        }

        // Close WebSocket server
        if (this.wss) {
            this.wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.close();
                }
            });
        }

        // Close HTTP server
        if (this.server) {
            this.server.close();
        }

        console.log('✅ Test environment cleaned up');
    }

    async testWebSocketAlertNotifications() {
        console.log('\n🧪 Testing WebSocket alert notifications...');

        return new Promise((resolve) => {
            // Create test WebSocket client
            const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
            let alertReceived = false;

            client.on('open', async () => {
                console.log('📡 Test client connected');

                // Listen for messages
                client.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        this.receivedMessages.push(message);

                        if (message.type === 'alert_created') {
                            console.log('🚨 Received alert notification:', message.data.message);
                            alertReceived = true;
                            client.close();
                        }
                    } catch (error) {
                        console.error('❌ Failed to parse WebSocket message:', error);
                    }
                });

                // Create test alert
                setTimeout(async () => {
                    try {
                        await this.alertService.createAlert({
                            type: 'regression',
                            severity: 'high',
                            pop_code: TEST_POP,
                            city: 'New York',
                            country: 'USA',
                            message: 'Test regression detected in NYC PoP',
                            details: {
                                analysis: {
                                    zScore: 3.2,
                                    percentIncrease: 45.5,
                                    recentMean: 15.2,
                                    baselineMean: 10.5
                                }
                            }
                        });
                    } catch (error) {
                        console.error('❌ Failed to create test alert:', error);
                        client.close();
                    }
                }, 1000);
            });

            client.on('close', () => {
                const success = alertReceived;
                this.testResults.push({
                    test: 'WebSocket Alert Notifications',
                    success,
                    message: success ? 'Alert notification received successfully' : 'Alert notification not received'
                });
                resolve(success);
            });

            client.on('error', (error) => {
                console.error('❌ WebSocket client error:', error);
                this.testResults.push({
                    test: 'WebSocket Alert Notifications',
                    success: false,
                    message: `WebSocket error: ${error.message}`
                });
                resolve(false);
            });
        });
    }

    async testAlertResolution() {
        console.log('\n🧪 Testing automatic alert resolution...');

        try {
            // Create a test alert first
            const alert = await this.alertService.createAlert({
                type: 'regression',
                severity: 'high',
                pop_code: TEST_POP,
                city: 'New York',
                country: 'USA',
                message: 'Test regression for resolution testing',
                details: {
                    analysis: {
                        zScore: 3.0,
                        percentIncrease: 30.0,
                        recentMean: 13.0,
                        baselineMean: 10.0
                    }
                }
            });

            console.log(`✅ Created test alert: ${alert._id}`);

            // Test alert resolution
            const resolvedAlert = await this.alertService.resolveAlert(
                alert._id,
                'test-system',
                'Performance returned to normal levels during testing'
            );

            const success = resolvedAlert.status === 'resolved' && resolvedAlert.resolved_at;
            this.testResults.push({
                test: 'Alert Resolution',
                success,
                message: success ? 'Alert resolved successfully' : 'Alert resolution failed'
            });

            if (success) {
                console.log(`✅ Alert resolved successfully: ${resolvedAlert._id}`);
                console.log(`   Duration: ${resolvedAlert.duration_ms}ms`);
                console.log(`   Resolved by: ${resolvedAlert.resolved_by}`);
            }

            return success;

        } catch (error) {
            console.error('❌ Alert resolution test failed:', error);
            this.testResults.push({
                test: 'Alert Resolution',
                success: false,
                message: `Alert resolution error: ${error.message}`
            });
            return false;
        }
    }

    async testWebSocketResolutionNotifications() {
        console.log('\n🧪 Testing WebSocket alert resolution notifications...');

        return new Promise((resolve) => {
            // Create test WebSocket client
            const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
            let resolutionReceived = false;

            client.on('open', async () => {
                console.log('📡 Test client connected for resolution test');

                // Listen for messages
                client.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        this.receivedMessages.push(message);

                        if (message.type === 'alert_resolved') {
                            console.log('✅ Received alert resolution notification:', message.data.resolution_notes);
                            resolutionReceived = true;
                            client.close();
                        }
                    } catch (error) {
                        console.error('❌ Failed to parse WebSocket message:', error);
                    }
                });

                // Create and then resolve test alert
                setTimeout(async () => {
                    try {
                        const alert = await this.alertService.createAlert({
                            type: 'regression',
                            severity: 'medium',
                            pop_code: TEST_POP,
                            city: 'New York',
                            country: 'USA',
                            message: 'Test regression for resolution notification',
                            details: { analysis: { zScore: 2.8 } }
                        });

                        // Resolve the alert after a short delay
                        setTimeout(async () => {
                            await this.alertService.resolveAlert(
                                alert._id,
                                'test-system',
                                'Test resolution for WebSocket notification'
                            );
                        }, 500);

                    } catch (error) {
                        console.error('❌ Failed to create/resolve test alert:', error);
                        client.close();
                    }
                }, 1000);
            });

            client.on('close', () => {
                const success = resolutionReceived;
                this.testResults.push({
                    test: 'WebSocket Resolution Notifications',
                    success,
                    message: success ? 'Resolution notification received successfully' : 'Resolution notification not received'
                });
                resolve(success);
            });

            client.on('error', (error) => {
                console.error('❌ WebSocket client error:', error);
                this.testResults.push({
                    test: 'WebSocket Resolution Notifications',
                    success: false,
                    message: `WebSocket error: ${error.message}`
                });
                resolve(false);
            });
        });
    }

    async testRegressionDetectorIntegration() {
        console.log('\n🧪 Testing RegressionDetector service integration...');

        try {
            // Verify RegressionDetector is properly initialized with AlertService
            const hasAlertService = this.regressionDetector.alertService !== null;
            const hasWebSocketServer = this.regressionDetector.alertService.webSocketServer !== null;

            const success = hasAlertService && hasWebSocketServer;
            this.testResults.push({
                test: 'RegressionDetector Integration',
                success,
                message: success ? 'RegressionDetector properly integrated with AlertService and WebSocket' : 'Integration issues detected'
            });

            if (success) {
                console.log('✅ RegressionDetector properly integrated');
                console.log(`   Alert service: ${hasAlertService ? 'Connected' : 'Missing'}`);
                console.log(`   WebSocket server: ${hasWebSocketServer ? 'Connected' : 'Missing'}`);
            }

            return success;

        } catch (error) {
            console.error('❌ RegressionDetector integration test failed:', error);
            this.testResults.push({
                test: 'RegressionDetector Integration',
                success: false,
                message: `Integration error: ${error.message}`
            });
            return false;
        }
    }

    async runAllTests() {
        console.log('🚀 Starting regression detection integration tests...\n');

        try {
            await this.setup();

            // Run all tests
            const results = await Promise.all([
                this.testRegressionDetectorIntegration(),
                this.testWebSocketAlertNotifications(),
                this.testAlertResolution(),
                this.testWebSocketResolutionNotifications()
            ]);

            // Print results
            console.log('\n📊 Test Results:');
            console.log('================');

            let passedTests = 0;
            this.testResults.forEach((result, index) => {
                const status = result.success ? '✅ PASS' : '❌ FAIL';
                console.log(`${status} ${result.test}: ${result.message}`);
                if (result.success) passedTests++;
            });

            console.log(`\n📈 Summary: ${passedTests}/${this.testResults.length} tests passed`);

            if (this.receivedMessages.length > 0) {
                console.log('\n📡 WebSocket Messages Received:');
                this.receivedMessages.forEach((msg, index) => {
                    console.log(`   ${index + 1}. ${msg.type}: ${msg.data?.message || 'No message'}`);
                });
            }

            const allPassed = passedTests === this.testResults.length;
            console.log(`\n${allPassed ? '🎉 All tests passed!' : '⚠️  Some tests failed'}`);

            return allPassed;

        } catch (error) {
            console.error('❌ Test execution failed:', error);
            return false;
        } finally {
            await this.cleanup();
        }
    }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new RegressionIntegrationTest();
    tester.runAllTests()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('❌ Test runner failed:', error);
            process.exit(1);
        });
}

export default RegressionIntegrationTest;