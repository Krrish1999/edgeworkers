// @ts-nocheck
// @ts-nocheck
import cron from 'node-cron';
import { getInfluxClient } from '../utils/influxdb.js';
import { getRedisClient } from '../utils/redis.js';
import AlertService from './AlertService.js';
import Alert from '../models/Alert.js';
import * as stats from 'simple-statistics';

class RegressionDetector {
    constructor(alertService = null) {
        this.isRunning = false;
        this.detectionInterval = process.env.DETECTION_INTERVAL || '*/30 * * * * *'; // Every 30 seconds
        this.alertService = alertService || new AlertService();
        this.regressionThreshold = 2.5; // Standard deviations for anomaly detection
        this.minSampleSize = 10;
        this.cronJob = null;
        this.resolutionThreshold = 1.5; // Z-score threshold for resolving alerts
    }

    async start() {
        if (this.isRunning) {
            console.log('⚠️  Regression detector already running');
            return;
        }

        console.log('🔍 Starting regression detection service...');

        // Run initial detection
        await this.runDetection();

        // Schedule recurring detection
        this.cronJob = cron.schedule(this.detectionInterval, async () => {
            await this.runDetection();
        }, {
            scheduled: true
        });

        //this.cronJob.start();
        this.isRunning = true;

        console.log(`✅ Regression detector started (interval: ${this.detectionInterval})`);
    }

    async stop() {
        if (!this.isRunning) return;

        console.log('🛑 Stopping regression detection service...');

        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
        }

        this.isRunning = false;
        console.log('✅ Regression detector stopped');
    }

    async runDetection() {
        try {
            console.log('🔍 Running regression detection cycle...');

            const pops = await this.getActivePops();
            const detectionResults = [];
            const resolutionResults = [];

            for (const pop of pops) {
                const result = await this.detectRegressionForPop(pop);
                if (result) {
                    if (result.anomaly) {
                        detectionResults.push(result);
                    } else {
                        // Check if this PoP has active alerts that should be resolved
                        const resolutionResult = await this.checkForAlertResolution(pop, result);
                        if (resolutionResult) {
                            resolutionResults.push(resolutionResult);
                        }
                    }
                }
            }

            // Process new regressions
            if (detectionResults.length > 0) {
                console.log(`🚨 Found ${detectionResults.length} potential regressions`);
                await this.processDetectionResults(detectionResults);
            } else {
                console.log('✅ No regressions detected in this cycle');
            }

            // Process alert resolutions
            if (resolutionResults.length > 0) {
                console.log(`✅ Found ${resolutionResults.length} alerts to resolve`);
                await this.processAlertResolutions(resolutionResults);
            }

            // Update detection metrics
            await this.updateDetectionMetrics(detectionResults.length, resolutionResults.length);

        } catch (error) {
            console.error('❌ Regression detection error:', error);
        }
    }

    async getActivePops() {
        try {
            const { executeQuery, ensureConnection } = getInfluxClient();

            // Ensure connection is healthy before executing query
            await ensureConnection();

            // TODO: query InfluxDB for distinct active PoPs
            const query = `
            from(bucket: "${process.env.INFLUXDB_BUCKET}")
            |> range(start: -1h)
            |> filter(fn: (r) => r._measurement == "cold_start_metrics")
            |> keyValues(keyColumns: ["pop_code"])
            |> group()
            |> distinct(column: "pop_code")
            `;
            const pops = [];
            const queryResult = await executeQuery(query, { timeout: 15000 });
            queryResult.forEach(row => pops.push(row.pop_code));
            return pops;
        } catch (error) {
            console.error('Failed to load active PoPs:', error.message);
            return [];
        }
    }



    async detectRegressionForPop(pop) {
        try {
            const { executeQuery, ensureConnection } = getInfluxClient();

            // Ensure connection is healthy before executing queries
            await ensureConnection();

            const now = new Date();

            // Query for recent and baseline data
            const fetchData = async (start, stop) => {
                const query = `
                    from(bucket: "${process.env.INFLUXDB_BUCKET}")
                    |> range(start: ${start}, stop: ${stop})
                    |> filter(fn: (r) => r._measurement == "cold_start_metrics" and r.pop_code == "${pop}" and r._field == "cold_start_time_ms")
                    |> yield(name: "results")
                `;
                const rows = await executeQuery(query, { timeout: 20000 });
                return rows.map(r => r._value);
            };

            const recentData = await fetchData(new Date(now.getTime() - 15 * 60000).toISOString(), now.toISOString());
            const baselineData = await fetchData(new Date(now.getTime() - 24 * 3600 * 1000 - 15 * 60000).toISOString(), new Date(now.getTime() - 24 * 3600 * 1000).toISOString());

            if (recentData.length < this.minSampleSize || baselineData.length < this.minSampleSize) {
                console.log(`Skipping regression check for ${pop}: insufficient data.`);
                return null;
            }

            // Statistical analysis
            const recentMean = stats.mean(recentData);
            const baselineMean = stats.mean(baselineData);
            const baselineStdDev = stats.standardDeviation(baselineData);

            if (baselineStdDev === 0) return null; // Avoid division by zero

            const zScore = (recentMean - baselineMean) / baselineStdDev;
            const percentIncrease = ((recentMean - baselineMean) / baselineMean) * 100;

            const analysis = {
                pop,
                timestamp: now,
                anomaly: zScore > this.regressionThreshold && recentMean > baselineMean,
                zScore: parseFloat(zScore.toFixed(2)),
                percentIncrease: parseFloat(percentIncrease.toFixed(2)),
                recentMean: parseFloat(recentMean.toFixed(2)),
                baselineMean: parseFloat(baselineMean.toFixed(2)),
                sampleSize: recentData.length
            };

            if (analysis.anomaly) {
                analysis.message = `Regression in ${pop}: Cold start time increased by ${analysis.percentIncrease}% to ${analysis.recentMean}ms (Z-score: ${analysis.zScore}).`;
            }

            return analysis;

        } catch (error) {
            console.error(`Error detecting regression for PoP ${pop}:`, error);
            return null;
        }
    }

    async processDetectionResults(results) {
        for (const result of results) {
            if (result.anomaly) {
                // Check if there's already an active alert for this PoP to avoid duplicates
                const existingAlert = await Alert.findOne({
                    pop_code: result.pop,
                    type: 'regression',
                    status: 'active'
                });

                if (!existingAlert) {
                    await this.alertService.createAlert({
                        type: 'regression',
                        severity: result.zScore > 3.5 ? 'critical' : 'high',
                        pop_code: result.pop,
                        message: result.message,
                        details: { analysis: result }
                    });
                } else {
                    console.log(`ℹ️  Active alert already exists for PoP ${result.pop}, skipping duplicate`);
                }
            }
        }
    }

    async checkForAlertResolution(pop, analysisResult) {
        try {
            // Find active regression alerts for this PoP
            const activeAlerts = await Alert.find({
                pop_code: pop,
                type: 'regression',
                status: 'active'
            });

            if (activeAlerts.length === 0) {
                return null; // No active alerts to resolve
            }

            // Check if performance has returned to normal levels
            const shouldResolve = analysisResult.zScore < this.resolutionThreshold && 
                                 analysisResult.percentIncrease < 10; // Less than 10% increase from baseline

            if (shouldResolve) {
                return {
                    pop,
                    alerts: activeAlerts,
                    analysis: analysisResult,
                    resolutionReason: `Performance returned to normal levels (Z-score: ${analysisResult.zScore}, Change: ${analysisResult.percentIncrease}%)`
                };
            }

            return null;

        } catch (error) {
            console.error(`❌ Error checking alert resolution for PoP ${pop}:`, error);
            return null;
        }
    }

    async processAlertResolutions(resolutionResults) {
        for (const resolution of resolutionResults) {
            for (const alert of resolution.alerts) {
                try {
                    await this.alertService.resolveAlert(
                        alert._id,
                        'regression-detector',
                        resolution.resolutionReason
                    );
                } catch (error) {
                    console.error(`❌ Failed to resolve alert ${alert._id}:`, error);
                }
            }
        }
    }

    async updateDetectionMetrics(detectionCount, resolutionCount = 0) {
        try {
            const redisClient = getRedisClient();
            await redisClient.set('metrics:regressions:last_count', detectionCount);
            await redisClient.set('metrics:regressions:last_run', new Date().toISOString());
            
            if (detectionCount > 0) {
                await redisClient.incrBy('metrics:regressions:total_detected', detectionCount);
            }
            
            if (resolutionCount > 0) {
                await redisClient.incrBy('metrics:regressions:total_resolved', resolutionCount);
                await redisClient.set('metrics:regressions:last_resolution_count', resolutionCount);
            }
        } catch (error) {
            console.error('Failed to update detection metrics:', error);
        }
    }
}


export default RegressionDetector;