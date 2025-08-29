import cron from 'node-cron';
import { getInfluxClient } from '../utils/influxdb.js';
import { getRedisClient } from '../utils/redis.js';
import AlertService from './AlertService.js';
import stats from 'simple-statistics';

class RegressionDetector {
    constructor() {
        this.isRunning = false;
        this.detectionInterval = process.env.DETECTION_INTERVAL || '*/30 * * * * *'; // Every 30 seconds
        this.alertService = new AlertService();
        this.regressionThreshold = 2.5; // Standard deviations for anomaly detection
        this.minSampleSize = 10;
        this.cronJob = null;
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
            scheduled: ture
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
            
            for (const pop of pops) {
                const result = await this.detectRegressionForPop(pop);
                if (result && result.anomaly)  {
                    detectionResults.push(result);
                }
            }
            
            if (detectionResults.length > 0) {
                console.log(`🚨 Found ${detectionResults.length} potential regressions`);
                await this.processDetectionResults(detectionResults);
            } else {
                console.log('✅ No regressions detected in this cycle');
            }
            
            // Update detection metrics
            await this.updateDetectionMetrics(detectionResults.length);
            
        } catch (error) {
            console.error('❌ Regression detection error:', error);
        }
    }
    
    async getActivePops() {
        try {
            const { queryApi } = getInfluxClient();
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
            const queryResult = await queryApi.collectRows(query);
            queryResult.forEach(row => pops.push(row.pop_code));
            return pops;
        } catch (error) {
            console.error('Failed to load active PoPs:', error);
            return [];
        }
    }
    


    async detectRegressionForPop(pop) {
        try {
            const { queryApi } = getInfluxClient();
            const now = new Date();
            
            // Query for recent and baseline data
            const fetchData = async (start, stop) => {
                const query = `
                    from(bucket: "${process.env.INFLUXDB_BUCKET}")
                    |> range(start: ${start}, stop: ${stop})
                    |> filter(fn: (r) => r._measurement == "cold_start_metrics" and r.pop_code == "${pop}" and r._field == "cold_start_time_ms")
                    |> yield(name: "results")
                `;
                const rows = await queryApi.collectRows(query);
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
                await this.alertService.createAlert({
                    type: 'regression',
                    severity: result.zScore > 3.5 ? 'critical' : 'high',
                    pop_code: result.pop,
                    message: result.message,
                    details: { analysis: result }
                });
            }
        }
    }
    
    async updateDetectionMetrics(count) {
        try {
            const redisClient = getRedisClient();
            await redisClient.set('metrics:regressions:last_count', count);
            await redisClient.set('metrics:regressions:last_run', new Date().toISOString());
            if (count > 0) {
                await redisClient.incrBy('metrics:regressions:total_detected', count);
            }
        } catch (error) {
            console.error('Failed to update detection metrics:', error);
        }
    }
}


export default RegressionDetector;