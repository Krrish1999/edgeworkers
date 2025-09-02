#!/usr/bin/env node

/**
 * Test script for WebSocket improvements
 * Tests connection state management, error recovery, and graceful disconnection
 */

import WebSocket from 'ws';
import { setTimeout } from 'timers/promises';

const WS_URL = 'ws://localhost:3001';
const TEST_DURATION = 30000; // 30 seconds

class WebSocketTester {
  constructor(clientId) {
    this.clientId = clientId;
    this.ws = null;
    this.messageCount = 0;
    this.errorCount = 0;
    this.connected = false;
    this.startTime = Date.now();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`[${this.clientId}] Connecting to ${WS_URL}...`);
      
      this.ws = new WebSocket(WS_URL);
      
      this.ws.on('open', () => {
        console.log(`[${this.clientId}] ✅ Connected`);
        this.connected = true;
        
        // Send subscription message
        this.ws.send(JSON.stringify({
          type: 'subscribe',
          topics: ['metrics', 'alerts']
        }));
        
        resolve();
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.messageCount++;
          
          console.log(`[${this.clientId}] 📨 Received: ${message.type}`);
          
          if (message.type === 'welcome') {
            console.log(`[${this.clientId}] 👋 Welcome message: ${message.data.message}`);
          } else if (message.type === 'metrics_update') {
            console.log(`[${this.clientId}] 📊 Metrics: ${JSON.stringify(message.data)}`);
          } else if (message.type === 'error') {
            console.log(`[${this.clientId}] ❌ Server error: ${message.data.message}`);
          }
          
        } catch (error) {
          console.error(`[${this.clientId}] ❌ Failed to parse message:`, error.message);
          this.errorCount++;
        }
      });
      
      this.ws.on('close', (code, reason) => {
        console.log(`[${this.clientId}] 🔌 Disconnected: ${code} - ${reason}`);
        this.connected = false;
      });
      
      this.ws.on('error', (error) => {
        console.error(`[${this.clientId}] ❌ WebSocket error:`, error.message);
        this.errorCount++;
        if (!this.connected) {
          reject(error);
        }
      });
      
      this.ws.on('ping', () => {
        console.log(`[${this.clientId}] 🏓 Received ping`);
      });
      
      this.ws.on('pong', () => {
        console.log(`[${this.clientId}] 🏓 Received pong`);
      });
    });
  }

  sendPing() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
      console.log(`[${this.clientId}] 🏓 Sent ping`);
    }
  }

  disconnect() {
    if (this.ws) {
      console.log(`[${this.clientId}] 🔌 Disconnecting...`);
      this.ws.close(1000, 'Test completed');
    }
  }

  getStats() {
    const duration = Date.now() - this.startTime;
    return {
      clientId: this.clientId,
      duration: duration,
      messageCount: this.messageCount,
      errorCount: this.errorCount,
      messagesPerSecond: (this.messageCount / (duration / 1000)).toFixed(2)
    };
  }
}

async function testWebSocketImprovements() {
  console.log('🚀 Starting WebSocket improvements test...\n');
  
  const clients = [];
  const numClients = 3;
  
  try {
    // Test 1: Multiple client connections
    console.log('📋 Test 1: Multiple client connections');
    for (let i = 1; i <= numClients; i++) {
      const client = new WebSocketTester(`Client-${i}`);
      clients.push(client);
      await client.connect();
      await setTimeout(1000); // Stagger connections
    }
    
    console.log(`✅ All ${numClients} clients connected\n`);
    
    // Test 2: Periodic ping/pong
    console.log('📋 Test 2: Periodic ping/pong');
    const pingInterval = setInterval(() => {
      clients.forEach(client => client.sendPing());
    }, 5000);
    
    // Test 3: Wait for metrics broadcasts
    console.log('📋 Test 3: Waiting for metrics broadcasts...');
    await setTimeout(15000); // Wait 15 seconds for broadcasts
    
    // Test 4: Simulate client disconnection and reconnection
    console.log('\n📋 Test 4: Client disconnection and reconnection');
    if (clients.length > 0) {
      const testClient = clients[0];
      testClient.disconnect();
      await setTimeout(2000);
      
      // Reconnect
      await testClient.connect();
      console.log('✅ Client reconnected successfully');
    }
    
    // Test 5: Check WebSocket status endpoint
    console.log('\n📋 Test 5: Checking WebSocket status endpoint');
    try {
      const response = await fetch('http://localhost:3001/api/websocket/status');
      const status = await response.json();
      console.log('📊 WebSocket Status:', JSON.stringify(status, null, 2));
    } catch (error) {
      console.error('❌ Failed to fetch WebSocket status:', error.message);
    }
    
    clearInterval(pingInterval);
    
    // Final stats
    console.log('\n📊 Final Statistics:');
    clients.forEach(client => {
      const stats = client.getStats();
      console.log(`${stats.clientId}: ${stats.messageCount} messages, ${stats.errorCount} errors, ${stats.messagesPerSecond} msg/s`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up...');
    clients.forEach(client => client.disconnect());
    await setTimeout(1000);
    console.log('✅ Test completed');
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3001/health');
    if (response.ok) {
      console.log('✅ Server is running');
      return true;
    }
  } catch (error) {
    console.error('❌ Server is not running. Please start the backend server first.');
    console.log('Run: cd edgeworker-detector/backend && npm start');
    return false;
  }
}

// Main execution
if (await checkServer()) {
  await testWebSocketImprovements();
} else {
  process.exit(1);
}