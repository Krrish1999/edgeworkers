#!/usr/bin/env node

/**
 * Verification test for regression detection integration
 * Checks code structure and integration without external dependencies
 */

import { WebSocketServer } from 'ws';
import http from 'http';
import AlertService from './src/services/AlertService.js';
import RegressionDetector from './src/services/RegressionDetector.js';

class IntegrationVerificationTest {
    constructor() {
        this.testResults = [];
    }

    async testAlertServiceIntegration() {
        console.log('🧪 Testing AlertService WebSocket integration...');

        try {
            // Create mock WebSocket server
            const server = http.createServer();
            const wss = new WebSocketServer({ server });
            
            // Add broadcast method
            wss.broadcast = function(data) {
                return { totalClients: 0, successfulBroadcasts: 0, failedBroadcasts: 0 };
            };

            // Test AlertService initialization with WebSocket
            const alertService = new AlertService(wss);
            
            const hasWebSocketServer = alertService.webSocketServer !== null;
            const hasWebSocketServer2 = alertService.webSocketServer === wss;
            const hasSendWebSocketNotification = typeof alertService.sendWebSocketNotification === 'function';
            const hasResolveAlert = typeof alertService.resolveAlert === 'function';
            const hasSendWebSocketResolutionNotification = typeof alertService.sendWebSocketResolutionNotification === 'function';

            const success = hasWebSocketServer && hasWebSocketServer2 && hasSendWebSocketNotification && hasResolveAlert && hasSendWebSocketResolutionNotification;

            this.testResults.push({
                test: 'AlertService WebSocket Integration',
                success,
                details: {
                    hasWebSocketServer,
                    hasWebSocketServer2,
                    hasSendWebSocketNotification,
                    hasResolveAlert,
                    hasSendWebSocketResolutionNotification
                }
            });

            server.close();
            return success;

        } catch (error) {
            this.testResults.push({
                test: 'AlertService WebSocket Integration',
                success: false,
                error: error.message
            });
            return false;
        }
    }

    async testRegressionDetectorIntegration() {
        console.log('🧪 Testing RegressionDetector AlertService integration...');

        try {
            // Create mock WebSocket server
            const server = http.createServer();
            const wss = new WebSocketServer({ server });
            wss.broadcast = function(data) {
                return { totalClients: 0, successfulBroadcasts: 0, failedBroadcasts: 0 };
            };

            // Test RegressionDetector initialization with AlertService
            const alertService = new AlertService(wss);
            const regressionDetector = new RegressionDetector(alertService);

            const hasAlertService = regressionDetector.alertService !== null;
            const hasCorrectAlertService = regressionDetector.alertService === alertService;
            const hasResolutionThreshold = regressionDetector.resolutionThreshold !== undefined;
            const hasCheckForAlertResolution = typeof regressionDetector.checkForAlertResolution === 'function';
            const hasProcessAlertResolutions = typeof regressionDetector.processAlertResolutions === 'function';
            const hasEnhancedRunDetection = regressionDetector.runDetection.toString().includes('resolutionResults');

            const success = hasAlertService && hasCorrectAlertService && hasResolutionThreshold && 
                           hasCheckForAlertResolution && hasProcessAlertResolutions && hasEnhancedRunDetection;

            this.testResults.push({
                test: 'RegressionDetector AlertService Integration',
                success,
                details: {
                    hasAlertService,
                    hasCorrectAlertService,
                    hasResolutionThreshold: hasResolutionThreshold ? regressionDetector.resolutionThreshold : false,
                    hasCheckForAlertResolution,
                    hasProcessAlertResolutions,
                    hasEnhancedRunDetection
                }
            });

            server.close();
            return success;

        } catch (error) {
            this.testResults.push({
                test: 'RegressionDetector AlertService Integration',
                success: false,
                error: error.message
            });
            return false;
        }
    }

    async testWebSocketBroadcastMethods() {
        console.log('🧪 Testing WebSocket broadcast methods...');

        try {
            // Create mock WebSocket server
            const server = http.createServer();
            const wss = new WebSocketServer({ server });
            
            let broadcastCalled = false;
            let broadcastData = null;
            
            wss.broadcast = function(data) {
                broadcastCalled = true;
                broadcastData = data;
                return { totalClients: 1, successfulBroadcasts: 1, failedBroadcasts: 0 };
            };

            const alertService = new AlertService(wss);

            // Test alert notification method
            const mockAlert = {
                _id: 'test_alert_123',
                type: 'regression',
                severity: 'high',
                status: 'active',
                pop_code: 'TEST_NYC',
                city: 'New York',
                country: 'USA',
                message: 'Test alert message',
                created_at: new Date(),
                details: { analysis: { zScore: 3.0 } }
            };

            // Add a mock client to trigger broadcast
            wss.clients = new Set([{ readyState: 1 }]); // WebSocket.OPEN = 1

            await alertService.sendWebSocketNotification(mockAlert);

            const alertNotificationSent = broadcastCalled && broadcastData && broadcastData.type === 'alert_created';

            // Reset for resolution test
            broadcastCalled = false;
            broadcastData = null;

            // Test resolution notification method
            const mockResolvedAlert = {
                ...mockAlert,
                status: 'resolved',
                resolved_at: new Date(),
                resolved_by: 'test-system',
                resolution_notes: 'Test resolution',
                duration_ms: 5000
            };

            await alertService.sendWebSocketResolutionNotification(mockResolvedAlert);

            const resolutionNotificationSent = broadcastCalled && broadcastData && broadcastData.type === 'alert_resolved';

            const success = alertNotificationSent && resolutionNotificationSent;

            this.testResults.push({
                test: 'WebSocket Broadcast Methods',
                success,
                details: {
                    alertNotificationSent,
                    resolutionNotificationSent,
                    lastBroadcastType: broadcastData?.type
                }
            });

            server.close();
            return success;

        } catch (error) {
            this.testResults.push({
                test: 'WebSocket Broadcast Methods',
                success: false,
                error: error.message
            });
            return false;
        }
    }

    async testAppJsIntegration() {
        console.log('🧪 Testing app.js integration pattern...');

        try {
            // Read app.js file to verify integration pattern
            const fs = await import('fs');
            const appJsContent = fs.readFileSync('./src/app.js', 'utf8');

            const hasAlertServiceImport = appJsContent.includes('import AlertService from');
            const hasRegressionDetectorImport = appJsContent.includes('import RegressionDetector from');
            const hasAlertServiceInitialization = appJsContent.includes('new AlertService(wss)');
            const hasRegressionDetectorInitialization = appJsContent.includes('new RegressionDetector(alertService)');
            const hasRegressionDetectorStart = appJsContent.includes('regressionDetector.start()');

            const success = hasAlertServiceImport && hasRegressionDetectorImport && 
                           hasAlertServiceInitialization && hasRegressionDetectorInitialization && 
                           hasRegressionDetectorStart;

            this.testResults.push({
                test: 'App.js Integration Pattern',
                success,
                details: {
                    hasAlertServiceImport,
                    hasRegressionDetectorImport,
                    hasAlertServiceInitialization,
                    hasRegressionDetectorInitialization,
                    hasRegressionDetectorStart
                }
            });

            return success;

        } catch (error) {
            this.testResults.push({
                test: 'App.js Integration Pattern',
                success: false,
                error: error.message
            });
            return false;
        }
    }

    async runAllTests() {
        console.log('🚀 Starting integration verification tests...\n');

        try {
            // Run all tests
            const results = await Promise.all([
                this.testAlertServiceIntegration(),
                this.testRegressionDetectorIntegration(),
                this.testWebSocketBroadcastMethods(),
                this.testAppJsIntegration()
            ]);

            // Print results
            console.log('\n📊 Verification Results:');
            console.log('========================');

            let passedTests = 0;
            this.testResults.forEach((result, index) => {
                const status = result.success ? '✅ PASS' : '❌ FAIL';
                console.log(`${status} ${result.test}`);
                
                if (result.details) {
                    Object.entries(result.details).forEach(([key, value]) => {
                        const checkMark = value ? '✓' : '✗';
                        console.log(`   ${checkMark} ${key}: ${value}`);
                    });
                }
                
                if (result.error) {
                    console.log(`   Error: ${result.error}`);
                }
                
                if (result.success) passedTests++;
                console.log('');
            });

            console.log(`📈 Summary: ${passedTests}/${this.testResults.length} tests passed`);

            const allPassed = passedTests === this.testResults.length;
            console.log(`\n${allPassed ? '🎉 All integration checks passed!' : '⚠️  Some integration checks failed'}`);

            return allPassed;

        } catch (error) {
            console.error('❌ Test execution failed:', error);
            return false;
        }
    }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new IntegrationVerificationTest();
    tester.runAllTests()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('❌ Test runner failed:', error);
            process.exit(1);
        });
}

export default IntegrationVerificationTest;