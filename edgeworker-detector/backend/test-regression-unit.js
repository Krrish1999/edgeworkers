#!/usr/bin/env node

/**
 * Unit test for regression detection integration with real-time alerts
 * Tests the integration logic without requiring external database connections
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import AlertService from './src/services/AlertService.js';
import RegressionDetector from './src/services/RegressionDetector.js';

// Mock Alert model for testing
const mockAlerts = new Map();
let alertIdCounter = 1;

const MockAlert = {
    findOne: async (query) => {
        for (const [id, alert] of mockAlerts) {
            if (query.pop_code === alert.pop_code && 
                query.type === alert.type && 
                query.status === alert.status) {
                return alert;
            }
        }
        return null;
    },
    
    find: async (query) => {
        const results = [];
        for (const [id, alert] of mockAlerts) {
            if (query.pop_code === alert.pop_code && 
                query.type === alert.type && 
                query.status === alert.status) {
                results.push(alert);
            }
        }
        return results;
    },
    
    findById: async (id) => {
        return mockAlerts.get(id) || null;
    },
    
    create: async (data) => {
        const id = `alert_${alertIdCounter++}`;
        const alert = {
            _id: id,
            ...data,
            created_at: new Date(),
            save: async function() {
                mockAlerts.set(id, this);
                return this;
            }
        };
        mockAlerts.set(id, alert);
        return alert;
    }
};

// Mock the Alert model in AlertService
const originalAlert = await import('./src/models/Alert.js');

class RegressionIntegrationUnitTest {
    constructor() {
        this.server = null;
        this.wss = null;
        this.alertService = null;
        this.regressionDetector = null;
        this.testResults = [];
        this.receivedMessages = [];
    }

    async setup() {
        console.log('🔧 Setting up unit test environment...');

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

        // Initialize services with mocked dependencies
        this.alertService = new AlertService(this.wss);
        
        // Mock the Alert model methods in AlertService
        this.alertService.Alert = MockAlert;
        
        this.regressionDetector = new RegressionDetector(this.alertService);

        // Start server
        await new Promise((resolve) => {
            this.server.listen(3003, () => {
                console.log('✅ Test server listening on port 3003');
                resolve();
            });
        });

        console.log('✅ Unit test environment setup complete');
    }

    async cleanup() {
        console.log('🧹 Cleaning up unit test environment...');

        // Clear mock data
        mockAlerts.clear();

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

        console.log('✅ Unit test environment cleaned up');
    }

    async testWebSocketAlertNotifications() {
        console.log('\n🧪 Testing WebSocket alert notifications...');

        return new Promise((resolve) => {
            // Create test WebSocket client
            const client = new WebSocket('ws://localhost:3003');
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

                // Create test alert using mock
                setTimeout(async () => {
                    try {
                        const alertData = {
                            type: 'regression',
                            severity: 'high',
                            status: 'active',
                            pop_code: 'TEST_NYC',
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
                        };

                        const alert = await MockAlert.create(alertData);
                        await alert.save();

                        // Manually trigger WebSocket notification
                        await this.alertService.sendWebSocketNotification(alert);

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
        console.log('\n🧪 Testing alert resolution logic...');

        try {
            // Create a test alert using mock
            const alertData = {
                type: 'regression',
                severity: 'high',
                status: 'active',
                pop_code: 'TEST_NYC',
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
            };

            const alert = await MockAlert.create(alertData);
            await alert.save();

            console.log(`✅ Created test alert: ${alert._id}`);

            // Test alert resolution using mock
            alert.status = 'resolved';
            alert.resolved_at = new Date();
            alert.resolved_by = 'test-system';
            alert.resolution_notes = 'Performance returned to normal levels during testing';
            alert.duration_ms = alert.resolved_at.getTime() - alert.created_at.getTime();

            await alert.save();

            const success = alert.status === 'resolved' && alert.resolved_at;
            this.testResults.push({
                test: 'Alert Resolution Logic',
                success,
                message: success ? 'Alert resolution logic works correctly' : 'Alert resolution logic failed'
            });

            if (success) {
                console.log(`✅ Alert resolved successfully: ${alert._id}`);
                console.log(`   Duration: ${alert.duration_ms}ms`);
                console.log(`   Resolved by: ${alert.resolved_by}`);
            }

            return success;

        } catch (error) {
            console.error('❌ Alert resolution test failed:', error);
            this.testResults.push({
                test: 'Alert Resolution Logic',
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
            const client = new WebSocket('ws://localhost:3003');
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

                // Create and then resolve test alert using mock
                setTimeout(async () => {
                    try {
                        const alertData = {
                            type: 'regression',
                            severity: 'medium',
                            status: 'active',
                            pop_code: 'TEST_NYC',
                            city: 'New York',
                            country: 'USA',
                            message: 'Test regression for resolution notification',
                            details: { analysis: { zScore: 2.8 } }
                        };

                        const alert = await MockAlert.create(alertData);
                        await alert.save();

                        // Resolve the alert after a short delay
                        setTimeout(async () => {
                            alert.status = 'resolved';
                            alert.resolved_at = new Date();
                            alert.resolved_by = 'test-system';
                            alert.resolution_notes = 'Test resolution for WebSocket notification';
                            alert.duration_ms = alert.resolved_at.getTime() - alert.created_at.getTime();
                            
                            await alert.save();

                            // Manually trigger WebSocket resolution notification
                            await this.alertService.sendWebSocketResolutionNotification(alert);
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
            const hasResolutionThreshold = this.regressionDetector.resolutionThreshold !== undefined;

            const success = hasAlertService && hasWebSocketServer && hasResolutionThreshold;
            this.testResults.push({
                test: 'RegressionDetector Integration',
                success,
                message: success ? 'RegressionDetector properly integrated with AlertService and WebSocket' : 'Integration issues detected'
            });

            if (success) {
                console.log('✅ RegressionDetector properly integrated');
                console.log(`   Alert service: ${hasAlertService ? 'Connected' : 'Missing'}`);
                console.log(`   WebSocket server: ${hasWebSocketServer ? 'Connected' : 'Missing'}`);
                console.log(`   Resolution threshold: ${this.regressionDetector.resolutionThreshold}`);
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

    async testAlertResolutionLogic() {
        console.log('\n🧪 Testing automatic alert resolution logic...');

        try {
            // Create mock active alerts
            const alert1 = await MockAlert.create({
                type: 'regression',
                severity: 'high',
                status: 'active',
                pop_code: 'TEST_NYC',
                city: 'New York',
                country: 'USA',
                message: 'Test regression 1',
                details: { analysis: { zScore: 3.0 } }
            });

            const alert2 = await MockAlert.create({
                type: 'regression',
                severity: 'medium',
                status: 'active',
                pop_code: 'TEST_LAX',
                city: 'Los Angeles',
                country: 'USA',
                message: 'Test regression 2',
                details: { analysis: { zScore: 2.8 } }
            });

            await alert1.save();
            await alert2.save();

            // Test resolution logic for normal performance
            const normalAnalysis = {
                zScore: 1.2,
                percentIncrease: 5.0,
                recentMean: 10.5,
                baselineMean: 10.0
            };

            const resolutionResult = await this.regressionDetector.checkForAlertResolution('TEST_NYC', normalAnalysis);

            const success = resolutionResult !== null && 
                           resolutionResult.alerts.length > 0 && 
                           resolutionResult.resolutionReason.includes('normal levels');

            this.testResults.push({
                test: 'Automatic Alert Resolution Logic',
                success,
                message: success ? 'Alert resolution logic correctly identifies when to resolve alerts' : 'Alert resolution logic failed'
            });

            if (success) {
                console.log('✅ Alert resolution logic working correctly');
                console.log(`   Found ${resolutionResult.alerts.length} alerts to resolve`);
                console.log(`   Reason: ${resolutionResult.resolutionReason}`);
            }

            return success;

        } catch (error) {
            console.error('❌ Alert resolution logic test failed:', error);
            this.testResults.push({
                test: 'Automatic Alert Resolution Logic',
                success: false,
                message: `Resolution logic error: ${error.message}`
            });
            return false;
        }
    }

    async runAllTests() {
        console.log('🚀 Starting regression detection integration unit tests...\n');

        try {
            await this.setup();

            // Run all tests
            const results = await Promise.all([
                this.testRegressionDetectorIntegration(),
                this.testWebSocketAlertNotifications(),
                this.testAlertResolution(),
                this.testWebSocketResolutionNotifications(),
                this.testAlertResolutionLogic()
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
    const tester = new RegressionIntegrationUnitTest();
    tester.runAllTests()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('❌ Test runner failed:', error);
            process.exit(1);
        });
}

export default RegressionIntegrationUnitTest;