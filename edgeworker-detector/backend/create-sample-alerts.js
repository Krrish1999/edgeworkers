#!/usr/bin/env node

/**
 * Script to create sample alerts for testing the AlertPage
 */

import mongoose from 'mongoose';
import Alert from './src/models/Alert.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/edgeworker?authSource=admin';

async function createSampleAlerts() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Sample PoPs data
        const pops = [
            { code: 'nyc1', city: 'New York', country: 'USA' },
            { code: 'lax1', city: 'Los Angeles', country: 'USA' },
            { code: 'lhr1', city: 'London', country: 'UK' },
            { code: 'nrt1', city: 'Tokyo', country: 'Japan' },
            { code: 'dxb1', city: 'Dubai', country: 'UAE' }
        ];

        // Create sample alerts
        const sampleAlerts = [
            {
                type: 'regression',
                severity: 'critical',
                status: 'active',
                pop_code: 'nyc1',
                city: 'New York',
                country: 'USA',
                message: 'Critical performance regression detected',
                details: {
                    threshold: 10.0,
                    currentValue: 18.5,
                    previousValue: 4.2
                },
                created_at: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
            },
            {
                type: 'threshold',
                severity: 'high',
                status: 'acknowledged',
                pop_code: 'lax1',
                city: 'Los Angeles',
                country: 'USA',
                message: 'Cold start time exceeding threshold',
                details: {
                    threshold: 15.0,
                    currentValue: 16.8
                },
                created_at: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
                acknowledged_at: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
                acknowledged_by: 'System Admin',
                notes: 'Investigating network latency issues'
            },
            {
                type: 'anomaly',
                severity: 'medium',
                status: 'active',
                pop_code: 'lhr1',
                city: 'London',
                country: 'UK',
                message: 'Unusual performance pattern detected',
                details: {
                    anomalyScore: 0.85,
                    pattern: 'spike'
                },
                created_at: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
            },
            {
                type: 'regression',
                severity: 'high',
                status: 'resolved',
                pop_code: 'nrt1',
                city: 'Tokyo',
                country: 'Japan',
                message: 'Performance regression resolved',
                details: {
                    threshold: 10.0,
                    peakValue: 22.1,
                    resolvedValue: 5.8
                },
                created_at: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
                resolved_at: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
                resolved_by: 'Auto-Resolution',
                resolution_notes: 'Performance returned to normal levels automatically'
            },
            {
                type: 'system',
                severity: 'low',
                status: 'active',
                pop_code: 'dxb1',
                city: 'Dubai',
                country: 'UAE',
                message: 'Minor performance degradation',
                details: {
                    degradationPercent: 15
                },
                created_at: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
            }
        ];

        // Clear existing alerts
        await Alert.deleteMany({});
        console.log('🧹 Cleared existing alerts');

        // Insert sample alerts
        const createdAlerts = await Alert.insertMany(sampleAlerts);
        console.log(`✅ Created ${createdAlerts.length} sample alerts`);

        // Display summary
        const alertStats = await Alert.aggregate([
            {
                $group: {
                    _id: { status: '$status', severity: '$severity' },
                    count: { $sum: 1 }
                }
            }
        ]);

        console.log('\n📊 Alert Summary:');
        alertStats.forEach(stat => {
            console.log(`   ${stat._id.status} (${stat._id.severity}): ${stat.count}`);
        });

        console.log('\n🎯 Sample alerts created successfully!');
        console.log('   You can now test the AlertPage at http://localhost:3000/alerts');

    } catch (error) {
        console.error('❌ Error creating sample alerts:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the script
createSampleAlerts();