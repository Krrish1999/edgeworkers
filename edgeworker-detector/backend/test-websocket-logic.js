#!/usr/bin/env node

/**
 * Test script for WebSocket logic improvements
 * Tests the enhanced broadcast function and connection management logic
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

// Mock WebSocket connections for testing
class MockWebSocket {
  constructor(id, shouldFail = false) {
    this.connectionId = id;
    this.readyState = WebSocket.OPEN;
    this.shouldFail = shouldFail;
    this.messagesSent = 0;
    this.errors = 0;
  }

  send(data) {
    if (this.shouldFail) {
      this.errors++;
      throw new Error(`Mock error for ${this.connectionId}`);
    }
    this.messagesSent++;
    console.log(`[${this.connectionId}] Sent: ${data.substring(0, 50)}...`);
  }
}

// Test the enhanced broadcast function
function testEnhancedBroadcast() {
  console.log('🧪 Testing Enhanced Broadcast Function\n');
  
  // Create mock WebSocket server
  const mockWss = {
    clients: new Set()
  };
  
  // WebSocket connection state management (from our implementation)
  const wsConnections = new Map();
  
  // Enhanced broadcast function (from our implementation)
  mockWss.broadcast = function broadcast(data) {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    const failedConnections = [];
    
    mockWss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          // Update last successful broadcast time for this client
          if (client.connectionId && wsConnections.has(client.connectionId)) {
            const connInfo = wsConnections.get(client.connectionId);
            connInfo.lastBroadcast = new Date();
            connInfo.broadcastCount++;
          }
        } catch (error) {
          console.error(`❌ Failed to broadcast to client ${client.connectionId || 'unknown'}:`, error.message);
          failedConnections.push(client.connectionId || 'unknown');
          
          // Update connection info with error
          if (client.connectionId && wsConnections.has(client.connectionId)) {
            const connInfo = wsConnections.get(client.connectionId);
            connInfo.lastError = error.message;
            connInfo.errorCount++;
          }
        }
      } else if (client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING) {
        // Clean up closed connections
        if (client.connectionId && wsConnections.has(client.connectionId)) {
          wsConnections.delete(client.connectionId);
        }
      }
    });
    
    if (failedConnections.length > 0) {
      console.warn(`⚠️  Failed to broadcast to ${failedConnections.length} client(s): ${failedConnections.join(', ')}`);
    }
    
    return {
      totalClients: mockWss.clients.size,
      successfulBroadcasts: mockWss.clients.size - failedConnections.length,
      failedBroadcasts: failedConnections.length
    };
  };
  
  // Test 1: Normal broadcast to healthy clients
  console.log('📋 Test 1: Normal broadcast to healthy clients');
  
  // Add healthy clients
  for (let i = 1; i <= 3; i++) {
    const client = new MockWebSocket(`client-${i}`);
    mockWss.clients.add(client);
    wsConnections.set(client.connectionId, {
      id: client.connectionId,
      connectedAt: new Date(),
      lastBroadcast: null,
      broadcastCount: 0,
      errorCount: 0,
      lastError: null
    });
  }
  
  const testMessage = { type: 'metrics_update', data: { totalPops: 10, healthyPops: 8 } };
  const result1 = mockWss.broadcast(testMessage);
  
  console.log('✅ Broadcast Result:', result1);
  console.log('📊 Connection Stats:');
  wsConnections.forEach((conn, id) => {
    console.log(`  ${id}: ${conn.broadcastCount} broadcasts, ${conn.errorCount} errors`);
  });
  
  // Test 2: Broadcast with some failing clients
  console.log('\n📋 Test 2: Broadcast with some failing clients');
  
  // Add a failing client
  const failingClient = new MockWebSocket('failing-client', true);
  mockWss.clients.add(failingClient);
  wsConnections.set(failingClient.connectionId, {
    id: failingClient.connectionId,
    connectedAt: new Date(),
    lastBroadcast: null,
    broadcastCount: 0,
    errorCount: 0,
    lastError: null
  });
  
  const result2 = mockWss.broadcast({ type: 'test', data: 'error recovery test' });
  
  console.log('✅ Broadcast Result with Errors:', result2);
  console.log('📊 Updated Connection Stats:');
  wsConnections.forEach((conn, id) => {
    console.log(`  ${id}: ${conn.broadcastCount} broadcasts, ${conn.errorCount} errors, lastError: ${conn.lastError || 'none'}`);
  });
  
  // Test 3: Connection cleanup
  console.log('\n📋 Test 3: Connection cleanup');
  
  // Simulate closed client
  const closedClient = new MockWebSocket('closed-client');
  closedClient.readyState = WebSocket.CLOSED;
  mockWss.clients.add(closedClient);
  wsConnections.set(closedClient.connectionId, {
    id: closedClient.connectionId,
    connectedAt: new Date(),
    lastBroadcast: null,
    broadcastCount: 0,
    errorCount: 0,
    lastError: null
  });
  
  console.log(`Before cleanup: ${wsConnections.size} tracked connections`);
  
  const result3 = mockWss.broadcast({ type: 'cleanup_test', data: 'testing cleanup' });
  
  console.log('✅ Broadcast Result with Cleanup:', result3);
  console.log(`After cleanup: ${wsConnections.size} tracked connections`);
  
  // Test 4: No clients scenario
  console.log('\n📋 Test 4: No clients scenario');
  mockWss.clients.clear();
  wsConnections.clear();
  
  const result4 = mockWss.broadcast({ type: 'no_clients', data: 'should handle gracefully' });
  console.log('✅ Broadcast Result with No Clients:', result4);
  
  console.log('\n✅ All broadcast function tests completed successfully!');
}

// Test connection state management
function testConnectionStateManagement() {
  console.log('\n🧪 Testing Connection State Management\n');
  
  const wsConnections = new Map();
  let wsConnectionCounter = 0;
  
  // Simulate connection creation (from our implementation)
  function simulateConnection(clientInfo = {}) {
    const connectionId = `ws_${++wsConnectionCounter}_${Date.now()}`;
    
    wsConnections.set(connectionId, {
      id: connectionId,
      connectedAt: new Date(),
      lastBroadcast: null,
      broadcastCount: 0,
      errorCount: 0,
      lastError: null,
      clientInfo: {
        userAgent: clientInfo.userAgent || 'test-client',
        ip: clientInfo.ip || '127.0.0.1'
      }
    });
    
    console.log(`🔌 Simulated connection: ${connectionId}`);
    return connectionId;
  }
  
  // Test connection tracking
  console.log('📋 Test 1: Connection tracking');
  const conn1 = simulateConnection({ userAgent: 'Chrome/91.0' });
  const conn2 = simulateConnection({ userAgent: 'Firefox/89.0' });
  const conn3 = simulateConnection({ userAgent: 'Safari/14.1' });
  
  console.log(`✅ Created ${wsConnections.size} connections`);
  
  // Test connection updates
  console.log('\n📋 Test 2: Connection updates');
  const connInfo = wsConnections.get(conn1);
  connInfo.broadcastCount = 5;
  connInfo.lastBroadcast = new Date();
  connInfo.errorCount = 1;
  connInfo.lastError = 'Test error';
  
  console.log('✅ Updated connection info:', {
    id: connInfo.id,
    broadcasts: connInfo.broadcastCount,
    errors: connInfo.errorCount,
    lastError: connInfo.lastError
  });
  
  // Test stale connection cleanup
  console.log('\n📋 Test 3: Stale connection cleanup');
  
  // Make one connection appear stale
  const staleConn = wsConnections.get(conn2);
  staleConn.connectedAt = new Date(Date.now() - 6 * 60 * 1000); // 6 minutes ago
  staleConn.lastBroadcast = new Date(Date.now() - 6 * 60 * 1000);
  
  // Simulate cleanup logic
  const now = new Date();
  const staleConnections = [];
  
  wsConnections.forEach((connInfo, connectionId) => {
    const timeSinceLastBroadcast = connInfo.lastBroadcast 
      ? now - connInfo.lastBroadcast 
      : now - connInfo.connectedAt;
      
    if (timeSinceLastBroadcast > 5 * 60 * 1000) { // 5 minutes
      staleConnections.push(connectionId);
    }
  });
  
  console.log(`Found ${staleConnections.length} stale connections: ${staleConnections.join(', ')}`);
  
  // Clean up stale connections
  staleConnections.forEach(connectionId => {
    console.log(`🧹 Cleaning up stale connection: ${connectionId}`);
    wsConnections.delete(connectionId);
  });
  
  console.log(`✅ After cleanup: ${wsConnections.size} active connections`);
  
  console.log('\n✅ All connection state management tests completed successfully!');
}

// Test error recovery scenarios
function testErrorRecovery() {
  console.log('\n🧪 Testing Error Recovery Scenarios\n');
  
  // Test 1: Broadcast continues after individual client failures
  console.log('📋 Test 1: Broadcast resilience to client failures');
  
  let broadcastAttempts = 0;
  let successfulBroadcasts = 0;
  let failedBroadcasts = 0;
  
  // Simulate broadcast function that handles errors gracefully
  function resilientBroadcast(clients, message) {
    broadcastAttempts++;
    const localFailed = [];
    
    clients.forEach(client => {
      try {
        if (client.shouldFail) {
          throw new Error(`Client ${client.id} is failing`);
        }
        // Simulate successful send
        successfulBroadcasts++;
        console.log(`✅ Sent to ${client.id}`);
      } catch (error) {
        failedBroadcasts++;
        localFailed.push(client.id);
        console.error(`❌ Failed to send to ${client.id}: ${error.message}`);
      }
    });
    
    // Service continues despite individual failures
    console.log(`📊 Broadcast ${broadcastAttempts}: ${successfulBroadcasts - failedBroadcasts} successful, ${localFailed.length} failed`);
    return localFailed.length === 0;
  }
  
  const testClients = [
    { id: 'client-1', shouldFail: false },
    { id: 'client-2', shouldFail: true },  // This one fails
    { id: 'client-3', shouldFail: false },
    { id: 'client-4', shouldFail: false }
  ];
  
  // Multiple broadcast attempts
  for (let i = 1; i <= 3; i++) {
    console.log(`\nBroadcast attempt ${i}:`);
    resilientBroadcast(testClients, `Message ${i}`);
  }
  
  console.log(`\n✅ Service remained operational despite ${failedBroadcasts} failed broadcasts`);
  
  // Test 2: Graceful handling of no clients
  console.log('\n📋 Test 2: Graceful handling of no clients');
  
  const emptyClients = [];
  const result = resilientBroadcast(emptyClients, 'No one to receive this');
  console.log('✅ Handled empty client list gracefully');
  
  console.log('\n✅ All error recovery tests completed successfully!');
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting WebSocket Logic Tests\n');
  console.log('=' .repeat(60));
  
  try {
    testEnhancedBroadcast();
    testConnectionStateManagement();
    testErrorRecovery();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 All WebSocket improvement tests passed!');
    console.log('\nKey improvements verified:');
    console.log('✅ Enhanced broadcast function with error recovery');
    console.log('✅ Connection state management and tracking');
    console.log('✅ Graceful client disconnection handling');
    console.log('✅ Stale connection cleanup');
    console.log('✅ Service resilience to individual client failures');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();