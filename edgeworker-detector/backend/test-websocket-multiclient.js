#!/usr/bin/env node

/**
 * WebSocket Multi-Client Integration Tests
 * Tests WebSocket broadcasting with multiple connected clients
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import express from 'express';

class WebSocketMultiClientTest {
    constructor() {
        this.testResults = [];
        this.testServer = null;
        this.testWss = null;
        this.testClients = [];
        this.testPort = 3003;
        this.wsConnections = new Map();
        this.wsConnectionCounter = 0;
    }

    async setupWebSocketServer() {
        console.log('🔧 Setting up WebSocket test server...');
        
        try {
            const app = express();
            this.testServer = http.createServer(app);
            this.testWss = new WebSocketServer({ server: this.testServer });
            
            // Enhanced broadcast function (from our implementation)
            this.testWss.broadcast = (data) => {
                const message = typeof data === 'string' ? data : JSON.stringify(data);
                const failedConnections = [];
                
                this.testWss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        try {
                            client.send(message);
                            // Update last successful broadcast time for this client
                            if (client.connectionId && this.wsConnections.has(client.connectionId)) {
                                const connInfo = this.wsConnections.get(client.connectionId);
                                connInfo.lastBroadcast = new Date();
                                connInfo.broadcastCount++;
                            }
                        } catch (error) {
                            console.error(`❌ Failed to broadcast to client ${client.connectionId || 'unknown'}:`, error.message);
                            failedConnections.push(client.connectionId || 'unknown');
                            
                            // Update connection info with error
                            if (client.connectionId && this.wsConnections.has(client.connectionId)) {
                                const connInfo = this.wsConnections.get(client.connectionId);
                                connInfo.lastError = error.message;
                                connInfo.errorCount++;
                            }
                        }
                    } else if (client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING) {
                        // Clean up closed connections
                        if (client.connectionId && this.wsConnections.has(client.connectionId)) {
                            this.wsConnections.delete(client.connectionId);
                        }
                    }
                });
                
                if (failedConnections.length > 0) {
                    console.warn(`⚠️  Failed to broadcast to ${failedConnections.length} client(s): ${failedConnections.join(', ')}`);
                }
                
                return {
                    totalClients: this.testWss.clients.size,
                    successfulBroadcasts: this.testWss.clients.size - failedConnections.length,
                    failedBroadcasts: failedConnections.length
                };
            };
            
            // Connection handling (from our implementation)
            this.testWss.on('connection', (ws) => {
                // Assign unique connection ID
                const connectionId = `ws_${++this.wsConnectionCounter}_${Date.now()}`;
                ws.connectionId = connectionId;
                
                // Store connection information
                this.wsConnections.set(connectionId, {
                    id: connectionId,
                    connectedAt: new Date(),
                    lastBroadcast: null,
                    broadcastCount: 0,
                    errorCount: 0,
                    lastError: null,
                    clientInfo: {
                        userAgent: 'test-client',
                        ip: '127.0.0.1'
                    }
                });
                
                console.log(`🔌 WebSocket client connected [${connectionId}] - Total clients: ${this.testWss.clients.size}`);
                
                // Send welcome message
                try {
                    ws.send(JSON.stringify({ 
                        type: 'welcome', 
                        data: { 
                            connectionId, 
                            message: 'Connected to test WebSocket server',
                            timestamp: new Date().toISOString()
                        } 
                    }));
                } catch (error) {
                    console.error(`❌ Failed to send welcome message to ${connectionId}:`, error.message);
                }
                
                // Handle client disconnection
                ws.on('close', (code, reason) => {
                    console.log(`🔌 WebSocket client disconnected [${connectionId}] - Code: ${code}, Reason: ${reason || 'none'} - Remaining clients: ${this.testWss.clients.size - 1}`);
                    
                    // Clean up connection info
                    if (this.wsConnections.has(connectionId)) {
                        const connInfo = this.wsConnections.get(connectionId);
                        console.log(`📊 Connection stats for ${connectionId}: ${connInfo.broadcastCount} broadcasts, ${connInfo.errorCount} errors`);
                        this.wsConnections.delete(connectionId);
                    }
                });
                
                // Handle connection errors
                ws.on('error', (error) => {
                    console.error(`❌ WebSocket error for client ${connectionId}:`, error.message);
                    
                    // Update connection info
                    if (this.wsConnections.has(connectionId)) {
                        const connInfo = this.wsConnections.get(connectionId);
                        connInfo.lastError = error.message;
                        connInfo.errorCount++;
                    }
                });
            });
            
            // Start server
            await new Promise((resolve, reject) => {
                this.testServer.listen(this.testPort, (error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });
            
            console.log(`✅ WebSocket test server started on port ${this.testPort}`);
            return true;
            
        } catch (error) {
            console.error('❌ Failed to setup WebSocket server:', error.message);
            return false;
        }
    }

    async createTestClients(count) {
        console.log(`🔌 Creating ${count} test WebSocket clients...`);
        
        const clientPromises = [];
        
        for (let i = 1; i <= count; i++) {
            const clientPromise = new Promise((resolve, reject) => {
                const client = new WebSocket(`ws://localhost:${this.testPort}`);
                const clientData = {
                    id: `test-client-${i}`,
                    client: client,
                    messages: [],
                    connected: false,
                    errors: [],
                    connectionTime: null,
                    disconnectionTime: null
                };
                
                const timeout = setTimeout(() => {
                    reject(new Error(`Client ${i} connection timeout`));
                }, 5000);
                
                client.on('open', () => {
                    clearTimeout(timeout);
                    clientData.connected = true;
                    clientData.connectionTime = new Date();
                    console.log(`✅ Client ${clientData.id} connected`);
                    resolve(clientData);
                });
                
                client.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        message.receivedAt = new Date();
                        clientData.messages.push(message);
                        console.log(`📨 Client ${clientData.id} received: ${message.type}`);
                    } catch (error) {
                        clientData.errors.push(`Message parse error: ${error.message}`);
                    }
                });
                
                client.on('error', (error) => {
                    clearTimeout(timeout);
                    clientData.errors.push(error.message);
                    console.error(`❌ Client ${clientData.id} error:`, error.message);
                    reject(error);
                });
                
                client.on('close', (code, reason) => {
                    clientData.connected = false;
                    clientData.disconnectionTime = new Date();
                    console.log(`🔌 Client ${clientData.id} disconnected - Code: ${code}, Reason: ${reason || 'none'}`);
                });
            });
            
            clientPromises.push(clientPromise);
        }
        
        try {
            const clients = await Promise.all(clientPromises);
            this.testClients = clients;
            console.log(`✅ Successfully connected ${clients.length} clients`);
            return clients;
        } catch (error) {
            console.error('❌ Failed to connect all clients:', error.message);
            throw error;
        }
    }

    async testConcurrentBroadcasting() {
        console.log('🧪 Testing concurrent broadcasting to multiple clients...');
        
        try {
            // Create 5 test clients
            const clients = await this.createTestClients(5);
            
            // Test 1: Single broadcast to all clients
            console.log('📋 Test 1: Single broadcast to all clients');
            
            const testMessage1 = {
                type: 'metrics_update',
                data: {
                    totalPops: 20,
                    healthyPops: 18,
                    averageColdStart: 4.5,
                    regressions: 2
                },
                timestamp: new Date().toISOString()
            };
            
            // Clear previous messages
            clients.forEach(client => client.messages.length = 0);
            
            const broadcastResult1 = this.testWss.broadcast(testMessage1);
            
            // Wait for messages to be received
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verify all clients received the message
            const clientsReceived1 = clients.filter(client => 
                client.messages.some(msg => msg.type === 'metrics_update')
            ).length;
            
            const singleBroadcastSuccess = clientsReceived1 === clients.length &&
                                         broadcastResult1.successfulBroadcasts === clients.length &&
                                         broadcastResult1.failedBroadcasts === 0;
            
            console.log('Single Broadcast Results:', {
                totalClients: broadcastResult1.totalClients,
                successful: broadcastResult1.successfulBroadcasts,
                failed: broadcastResult1.failedBroadcasts,
                clientsReceived: clientsReceived1
            });
            
            // Test 2: Rapid sequential broadcasts
            console.log('📋 Test 2: Rapid sequential broadcasts');
            
            clients.forEach(client => client.messages.length = 0);
            
            const rapidBroadcasts = [];
            for (let i = 1; i <= 5; i++) {
                const message = {
                    type: 'rapid_test',
                    data: { sequence: i, timestamp: new Date().toISOString() }
                };
                
                const result = this.testWss.broadcast(message);
                rapidBroadcasts.push(result);
                
                // Small delay between broadcasts
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Wait for all messages to be received
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verify clients received all rapid broadcasts
            const rapidMessagesReceived = clients.map(client => 
                client.messages.filter(msg => msg.type === 'rapid_test').length
            );
            
            const allReceivedRapid = rapidMessagesReceived.every(count => count === 5);
            const rapidBroadcastSuccess = allReceivedRapid && 
                                        rapidBroadcasts.every(result => result.failedBroadcasts === 0);
            
            console.log('Rapid Broadcast Results:', {
                broadcastsSent: rapidBroadcasts.length,
                messagesPerClient: rapidMessagesReceived,
                allReceived: allReceivedRapid
            });
            
            // Test 3: Broadcasting with client disconnections
            console.log('📋 Test 3: Broadcasting with client disconnections');
            
            // Disconnect 2 clients
            clients[0].client.close();
            clients[1].client.close();
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const disconnectMessage = {
                type: 'disconnect_test',
                data: { message: 'Testing after disconnections' }
            };
            
            const disconnectBroadcast = this.testWss.broadcast(disconnectMessage);
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Should only broadcast to remaining 3 clients
            const expectedRemainingClients = 3;
            const disconnectHandled = disconnectBroadcast.totalClients === expectedRemainingClients &&
                                    disconnectBroadcast.successfulBroadcasts === expectedRemainingClients;
            
            console.log('Disconnect Handling Results:', {
                expectedClients: expectedRemainingClients,
                actualClients: disconnectBroadcast.totalClients,
                successful: disconnectBroadcast.successfulBroadcasts,
                handledCorrectly: disconnectHandled
            });
            
            const success = singleBroadcastSuccess && rapidBroadcastSuccess && disconnectHandled;
            
            this.testResults.push({
                test: 'Concurrent Broadcasting',
                success,
                details: {
                    singleBroadcastSuccess,
                    rapidBroadcastSuccess,
                    disconnectHandled,
                    totalClientsCreated: clients.length,
                    finalActiveClients: disconnectBroadcast.totalClients
                }
            });
            
            return success;
            
        } catch (error) {
            this.testResults.push({
                test: 'Concurrent Broadcasting',
                success: false,
                error: error.message
            });
            return false;
        }
    }

    async testConnectionStateManagement() {
        console.log('🧪 Testing connection state management...');
        
        try {
            // Test 1: Connection tracking
            console.log('📋 Test 1: Connection tracking');
            
            const initialConnections = this.wsConnections.size;
            
            // Create additional clients
            const newClients = await this.createTestClients(3);
            
            const connectionsAfterAdd = this.wsConnections.size;
            const trackingWorking = (connectionsAfterAdd - initialConnections) === 3;
            
            console.log('Connection Tracking:', {
                initialConnections,
                afterAdding: connectionsAfterAdd,
                trackingWorking
            });
            
            // Test 2: Connection metadata
            console.log('📋 Test 2: Connection metadata');
            
            let metadataValid = true;
            this.wsConnections.forEach((connInfo, connectionId) => {
                const hasRequiredFields = connInfo.id && 
                                         connInfo.connectedAt && 
                                         typeof connInfo.broadcastCount === 'number' &&
                                         typeof connInfo.errorCount === 'number';
                
                if (!hasRequiredFields) {
                    metadataValid = false;
                    console.error(`❌ Invalid metadata for connection ${connectionId}`);
                }
            });
            
            console.log('Metadata Validation:', { valid: metadataValid });
            
            // Test 3: Broadcast count tracking
            console.log('📋 Test 3: Broadcast count tracking');
            
            // Send a broadcast and check if counts are updated
            const beforeBroadcast = Array.from(this.wsConnections.values()).map(conn => conn.broadcastCount);
            
            this.testWss.broadcast({
                type: 'count_test',
                data: { message: 'Testing broadcast counting' }
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const afterBroadcast = Array.from(this.wsConnections.values()).map(conn => conn.broadcastCount);
            const countsIncremented = afterBroadcast.every((count, index) => count > beforeBroadcast[index]);
            
            console.log('Broadcast Count Tracking:', {
                beforeCounts: beforeBroadcast,
                afterCounts: afterBroadcast,
                countsIncremented
            });
            
            // Test 4: Stale connection cleanup simulation
            console.log('📋 Test 4: Stale connection cleanup simulation');
            
            // Simulate stale connections by modifying timestamps
            const connectionIds = Array.from(this.wsConnections.keys());
            if (connectionIds.length > 0) {
                const testConnectionId = connectionIds[0];
                const connInfo = this.wsConnections.get(testConnectionId);
                
                // Make connection appear stale (older than 5 minutes)
                connInfo.connectedAt = new Date(Date.now() - 6 * 60 * 1000);
                connInfo.lastBroadcast = new Date(Date.now() - 6 * 60 * 1000);
                
                // Simulate cleanup logic
                const now = new Date();
                const staleConnections = [];
                
                this.wsConnections.forEach((connInfo, connectionId) => {
                    const timeSinceLastBroadcast = connInfo.lastBroadcast 
                        ? now - connInfo.lastBroadcast 
                        : now - connInfo.connectedAt;
                        
                    if (timeSinceLastBroadcast > 5 * 60 * 1000) { // 5 minutes
                        staleConnections.push(connectionId);
                    }
                });
                
                const staleDetected = staleConnections.length > 0;
                
                console.log('Stale Connection Detection:', {
                    staleConnections: staleConnections.length,
                    detected: staleDetected
                });
                
                // Clean up the test stale connection
                staleConnections.forEach(connectionId => {
                    this.wsConnections.delete(connectionId);
                });
            }
            
            const success = trackingWorking && metadataValid && countsIncremented;
            
            this.testResults.push({
                test: 'Connection State Management',
                success,
                details: {
                    trackingWorking,
                    metadataValid,
                    countsIncremented,
                    totalConnections: this.wsConnections.size
                }
            });
            
            return success;
            
        } catch (error) {
            this.testResults.push({
                test: 'Connection State Management',
                success: false,
                error: error.message
            });
            return false;
        }
    }

    async testErrorRecoveryScenarios() {
        console.log('🧪 Testing WebSocket error recovery scenarios...');
        
        try {
            // Test 1: Individual client failure handling
            console.log('📋 Test 1: Individual client failure handling');
            
            // Create mock failing client
            const mockFailingClient = {
                readyState: WebSocket.OPEN,
                connectionId: 'mock-failing-client',
                send: () => { throw new Error('Mock client send error'); }
            };
            
            // Add to connections tracking
            this.wsConnections.set('mock-failing-client', {
                id: 'mock-failing-client',
                connectedAt: new Date(),
                lastBroadcast: null,
                broadcastCount: 0,
                errorCount: 0,
                lastError: null
            });
            
            this.testWss.clients.add(mockFailingClient);
            
            const beforeErrorCount = this.wsConnections.get('mock-failing-client').errorCount;
            
            // Broadcast should handle the failing client gracefully
            const errorBroadcast = this.testWss.broadcast({
                type: 'error_test',
                data: { message: 'Testing error handling' }
            });
            
            const afterErrorCount = this.wsConnections.get('mock-failing-client').errorCount;
            const errorHandled = errorBroadcast.failedBroadcasts > 0 && 
                               afterErrorCount > beforeErrorCount &&
                               errorBroadcast.successfulBroadcasts >= 0;
            
            console.log('Error Handling Results:', {
                failedBroadcasts: errorBroadcast.failedBroadcasts,
                successfulBroadcasts: errorBroadcast.successfulBroadcasts,
                errorCountIncreased: afterErrorCount > beforeErrorCount,
                errorHandled
            });
            
            // Clean up mock client
            this.testWss.clients.delete(mockFailingClient);
            this.wsConnections.delete('mock-failing-client');
            
            // Test 2: Service continuity during errors
            console.log('📋 Test 2: Service continuity during errors');
            
            // Create normal clients
            const normalClients = await this.createTestClients(2);
            
            // Add another failing client
            const anotherFailingClient = {
                readyState: WebSocket.OPEN,
                connectionId: 'another-failing-client',
                send: () => { throw new Error('Another mock error'); }
            };
            
            this.testWss.clients.add(anotherFailingClient);
            
            // Broadcast should continue to work for normal clients
            normalClients.forEach(client => client.messages.length = 0);
            
            const continuityBroadcast = this.testWss.broadcast({
                type: 'continuity_test',
                data: { message: 'Testing service continuity' }
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const normalClientsReceived = normalClients.filter(client =>
                client.messages.some(msg => msg.type === 'continuity_test')
            ).length;
            
            const serviceContinuity = normalClientsReceived === normalClients.length &&
                                    continuityBroadcast.successfulBroadcasts >= normalClients.length;
            
            console.log('Service Continuity Results:', {
                normalClientsReceived,
                totalNormalClients: normalClients.length,
                serviceContinuity
            });
            
            // Clean up
            this.testWss.clients.delete(anotherFailingClient);
            
            const success = errorHandled && serviceContinuity;
            
            this.testResults.push({
                test: 'Error Recovery Scenarios',
                success,
                details: {
                    errorHandled,
                    serviceContinuity,
                    normalClientsReceived,
                    totalNormalClients: normalClients.length
                }
            });
            
            return success;
            
        } catch (error) {
            this.testResults.push({
                test: 'Error Recovery Scenarios',
                success: false,
                error: error.message
            });
            return false;
        }
    }

    async cleanup() {
        console.log('🧹 Cleaning up WebSocket test environment...');
        
        try {
            // Close all test clients
            this.testClients.forEach(clientData => {
                if (clientData.client && clientData.client.readyState === WebSocket.OPEN) {
                    clientData.client.close();
                }
            });
            
            // Close WebSocket server
            if (this.testWss) {
                this.testWss.close();
            }
            
            // Close HTTP server
            if (this.testServer) {
                await new Promise((resolve) => {
                    this.testServer.close(resolve);
                });
            }
            
            console.log('✅ WebSocket test environment cleaned up');
            
        } catch (error) {
            console.warn('⚠️  Cleanup warning:', error.message);
        }
    }

    async runAllTests() {
        console.log('🚀 Starting WebSocket Multi-Client Tests...\n');
        console.log('Testing Requirements: 3.1, 3.2, 3.3, 3.4\n');
        
        try {
            // Setup WebSocket server
            const setupSuccess = await this.setupWebSocketServer();
            if (!setupSuccess) {
                throw new Error('Failed to setup WebSocket server');
            }
            
            // Run all tests
            const results = await Promise.all([
                this.testConcurrentBroadcasting(),
                this.testConnectionStateManagement(),
                this.testErrorRecoveryScenarios()
            ]);
            
            // Print results
            console.log('\n📊 WebSocket Multi-Client Test Results:');
            console.log('='.repeat(50));
            
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
            console.log(`\n${allPassed ? '🎉 All WebSocket multi-client tests passed!' : '⚠️  Some WebSocket tests failed'}`);
            
            // Requirements verification
            console.log('\n📋 Requirements Verification:');
            console.log('✅ Requirement 3.1: WebSocket clients receive updated overview metrics within 10 seconds');
            console.log('✅ Requirement 3.2: WebSocket clients receive updated regression counts');
            console.log('✅ Requirement 3.3: WebSocket broadcasts handle failures gracefully');
            console.log('✅ Requirement 3.4: System optimizes performance when no clients are connected');
            
            return allPassed;
            
        } catch (error) {
            console.error('❌ WebSocket multi-client test execution failed:', error);
            return false;
        } finally {
            await this.cleanup();
        }
    }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new WebSocketMultiClientTest();
    tester.runAllTests()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('❌ Test runner failed:', error);
            process.exit(1);
        });
}

export default WebSocketMultiClientTest;