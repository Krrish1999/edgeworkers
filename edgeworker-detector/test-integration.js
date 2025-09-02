#!/usr/bin/env node

/**
 * Integration Test Script
 * Tests the data flow from generator -> InfluxDB -> Backend APIs -> Frontend
 */

const axios = require('axios');
const WebSocket = require('ws');

const BACKEND_URL = 'http://localhost:3001';
const GENERATOR_URL = 'http://localhost:8080';

async function testIntegration() {
    console.log('🧪 Starting Integration Test...\n');

    // Test 1: Check if data generator is running and healthy
    console.log('1️⃣ Testing Data Generator Health...');
    try {
        const response = await axios.get(`${GENERATOR_URL}/health`);
        console.log('✅ Data Generator Status:', response.data.status);
        console.log('📊 Generator Metrics:', {
            totalWrites: response.data.metrics.total_writes,
            successRate: response.data.metrics.success_rate_percent,
            influxStatus: response.data.influxdb.connection_status
        });
    } catch (error) {
        console.log('❌ Data Generator Health Check Failed:', error.message);
        return;
    }

    // Test 2: Check backend health
    console.log('\n2️⃣ Testing Backend Health...');
    try {
        const response = await axios.get(`${BACKEND_URL}/health`);
        console.log('✅ Backend Status:', response.data.status);
        console.log('🔗 InfluxDB Connection:', response.data.services.influxdb.healthy ? 'Healthy' : 'Unhealthy');
    } catch (error) {
        console.log('❌ Backend Health Check Failed:', error.message);
        return;
    }

    // Test 3: Test API endpoints
    console.log('\n3️⃣ Testing API Endpoints...');
    
    // Test overview endpoint
    try {
        const response = await axios.get(`${BACKEND_URL}/api/dashboard/overview`);
        console.log('✅ Overview API Response:', {
            totalPops: response.data.totalPops,
            averageColdStart: response.data.averageColdStart,
            healthyPops: response.data.healthyPops,
            regressions: response.data.regressions,
            source: response.data._source,
            cached: response.data._metadata?.cached
        });
    } catch (error) {
        console.log('❌ Overview API Failed:', error.message);
    }

    // Test heatmap endpoint
    try {
        const response = await axios.get(`${BACKEND_URL}/api/dashboard/heatmap`);
        const heatmapData = response.data.data || response.data;
        console.log('✅ Heatmap API Response:', {
            popCount: Array.isArray(heatmapData) ? heatmapData.length : 0,
            samplePop: Array.isArray(heatmapData) && heatmapData.length > 0 ? {
                popCode: heatmapData[0].popCode,
                city: heatmapData[0].city,
                coldStartTime: heatmapData[0].coldStartTime,
                status: heatmapData[0].status
            } : 'No data',
            cached: response.data._metadata?.cached
        });
    } catch (error) {
        console.log('❌ Heatmap API Failed:', error.message);
    }

    // Test 4: WebSocket Connection
    console.log('\n4️⃣ Testing WebSocket Connection...');
    return new Promise((resolve) => {
        const ws = new WebSocket(`ws://localhost:3001`);
        let messageReceived = false;

        ws.on('open', () => {
            console.log('✅ WebSocket Connected');
            
            // Subscribe to updates
            ws.send(JSON.stringify({
                type: 'subscribe',
                topics: ['metrics', 'alerts']
            }));
        });

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('📨 WebSocket Message Received:', {
                    type: message.type,
                    hasData: !!message.data,
                    dataKeys: message.data ? Object.keys(message.data) : []
                });
                
                if (message.type === 'metrics_update') {
                    messageReceived = true;
                    console.log('✅ Real-time metrics update received:', message.data);
                }
            } catch (error) {
                console.log('❌ Failed to parse WebSocket message:', error.message);
            }
        });

        ws.on('error', (error) => {
            console.log('❌ WebSocket Error:', error.message);
        });

        ws.on('close', () => {
            console.log('🔌 WebSocket Disconnected');
        });

        // Wait for 15 seconds to receive a metrics update
        setTimeout(() => {
            if (messageReceived) {
                console.log('✅ Integration Test PASSED - Real-time data flow working!');
            } else {
                console.log('⚠️  Integration Test PARTIAL - WebSocket connected but no metrics update received in 15s');
                console.log('   This might be normal if the generator cycle hasn\'t occurred yet.');
            }
            
            ws.close();
            resolve();
        }, 15000);
    });
}

// Run the test
testIntegration().catch(console.error);