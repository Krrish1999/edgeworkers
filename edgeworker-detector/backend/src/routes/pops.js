import express from 'express';
import { getInfluxClient } from '../utils/influxdb.js';

const router = express.Router();

// Get all PoPs with their current status
router.get('/', async (req, res) => {
    try {
        const { queryApi } = getInfluxClient();
        
        // Get recent data for all PoPs
        const query = `
            from(bucket: "${process.env.INFLUXDB_BUCKET}")
            |> range(start: -1h)
            |> filter(fn: (r) => r._measurement == "cold_start_metrics")
            |> filter(fn: (r) => r._field == "cold_start_time_ms")
            |> group(columns: ["pop_code", "city", "country", "tier", "latitude", "longitude"])
            |> mean()
            |> group()
        `;
        
        const queryResult = await queryApi.collectRows(query);
        const pops = queryResult.map(record => {
            let status = 'healthy';
            if (record._value > 15) status = 'critical';
            else if (record._value > 10) status = 'warning';
            
            return {
                code: record.pop_code,
                city: record.city,
                country: record.country,
                tier: record.tier,
                latitude: record.latitude,
                longitude: record.longitude,
                currentAverage: Math.round(record._value * 100) / 100,
                status,
                lastUpdate: record._time
            };
        });
        
       
        
        res.json({
            total: pops.length,
            pops: pops.sort((a, b) => a.city.localeCompare(b.city))
        });
        
    } catch (error) {
        console.error('❌ Get PoPs error:', error);
        res.status(500).json({ error: 'Failed to fetch PoPs' });
    }
});

// Get detailed PoP information
router.get('/:popCode', async (req, res) => {
    try {
        const { popCode } = req.params;
        const { queryApi } = getInfluxClient();
        
        // Get PoP details and recent metrics
        const query = `
            from(bucket: "${process.env.INFLUXDB_BUCKET}")
            |> range(start: -24h)
            |> filter(fn: (r) => r._measurement == "cold_start_metrics")
            |> filter(fn: (r) => r.pop_code == "${popCode}")
            |> filter(fn: (r) => r._field == "cold_start_time_ms")
        `;
        
        const queryResult = await queryApi.collectRows(query);

        if (!queryResult || queryResult.length === 0) {
            return res.status(404).json({ error: 'PoP not found' });
        }

        const popInfo = {
            code: queryResult[0].pop_code,
            city: queryResult[0].city,
            country: queryResult[0].country,
            tier: queryResult[0].tier,
            latitude: queryResult[0].latitude,
            longitude: queryResult[0].longitude
        };

        const metrics = queryResult.map(record => ({
            timestamp: record._time,
            value: record._value,
            function_name: record.function_name
        }));
        
        // Calculate statistics
        const values = metrics.map(m => m.value);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        res.json({
            ...popInfo,
            statistics: {
                average: Math.round(avg * 100) / 100,
                minimum: Math.round(min * 100) / 100,
                maximum: Math.round(max * 100) / 100,
                totalMeasurements: metrics.length
            },
            recentMetrics: metrics.slice(-100) // Last 100 measurements
        });
        
    } catch (error) {
        console.error('❌ Get PoP details error:', error);
        res.status(500).json({ error: 'Failed to fetch PoP details' });
    }
});

export default router;