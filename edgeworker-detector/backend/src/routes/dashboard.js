import express from 'express';
import { getInfluxClient } from '../utils/influxdb.js';
import { getRedisClient } from '../utils/redis.js';
import Alert from '../models/Alert.js';

const router = express.Router();

// GET /api/dashboard/overview
router.get('/overview', async (req, res) => {
  try {
    const { queryApi } = getInfluxClient();

    // FIX: Corrected the Flux query syntax for yielding multiple results.
    const fluxQuery = `
      // Base query for the last known state of each PoP
      lastStates = from(bucket: "${process.env.INFLUXDB_BUCKET}")
        |> range(start: -10m)
        |> filter(fn: (r) => r._measurement == "cold_start_metrics" and r._field == "cold_start_time_ms")
        |> last()

      // Calculate total PoPs that have reported in the last 10m
      lastStates
        |> group()
        |> count(column: "_value")
        |> yield(name: "total")
      
      // Calculate healthy PoPs from the last known states
      lastStates
        |> filter(fn: (r) => r._value < 10.0) // Define "healthy" as < 10ms
        |> group()
        |> count(column: "_value")
        |> yield(name: "healthy")

      // Calculate the overall average cold start time in the last minute
      from(bucket: "${process.env.INFLUXDB_BUCKET}")
        |> range(start: -1m)
        |> filter(fn: (r) => r._measurement == "cold_start_metrics" and r._field == "cold_start_time_ms")
        |> mean()
        |> yield(name: "avgColdStart")
    `;

    const queryResult = await queryApi.collectRows(fluxQuery);
    
    const totalPops = queryResult.find(r => r.result === 'total')?._value || 0;
    const healthyPops = queryResult.find(r => r.result === 'healthy')?._value || 0;
    const averageColdStart = queryResult.find(r => r.result === 'avgColdStart')?._value?.toFixed(2) || 0;

    const regressions = await Alert.countDocuments({ status: 'active' });
    
    res.json({
      totalPops,
      healthyPops,
      averageColdStart: parseFloat(averageColdStart),
      regressions,
    });
    
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
});

// GET /api/dashboard/heatmap
router.get('/heatmap', async (req, res) => {
  try {
    const { queryApi } = getInfluxClient();
    const query = `
        from(bucket: "${process.env.INFLUXDB_BUCKET}")
        |> range(start: -5m)
        |> filter(fn: (r) => r._measurement == "cold_start_metrics" and r._field == "cold_start_time_ms")
        |> group(columns: ["pop_code", "city", "country", "latitude", "longitude"])
        |> mean()
        |> group()
    `;
    const heatmapData = [];
    const queryResult = await queryApi.collectRows(query);
    
    queryResult.forEach(record => {
        let status = 'healthy';
        if (record._value > 15) status = 'critical';
        else if (record._value > 10) status = 'warning';

        heatmapData.push({
            popCode: record.pop_code,
            city: record.city,
            country: record.country,
            lat: record.latitude,
            lon: record.longitude,
            coldStartTime: parseFloat(record._value.toFixed(2)),
            status
        });
    });
    
    res.json(heatmapData);
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
});

// GET /api/dashboard/timeseries
router.get('/timeseries', async (req, res) => {
  try {
    const { range = '1h', pop_code } = req.query;
    const { queryApi } = getInfluxClient();
    
    let filters = `r._measurement == "cold_start_metrics" and r._field == "cold_start_time_ms"`;
    if (pop_code) {
      filters += ` and r.pop_code == "${pop_code}"`;
    }

    const query = `
      from(bucket: "${process.env.INFLUXDB_BUCKET}")
      |> range(start: -${range})
      |> filter(fn: (r) => ${filters})
      |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
      |> yield(name: "mean")
    `;
    const timeseriesData = [];
    const queryResult = await queryApi.collectRows(query);
    
    queryResult.forEach(record => {
        timeseriesData.push({
            timestamp: record._time,
            value: record._value ? parseFloat(record._value.toFixed(2)) : null,
        });
    });

    res.json(timeseriesData);
  } catch (error) {
    console.error('Error fetching timeseries data:', error);
    res.status(500).json({ error: 'Failed to fetch timeseries data' });
  }
});

router.get('/metrics/aggregate', async (req, res) => {
  try {
    const { range = '24h', groupBy = 'country' } = req.query;
    const { queryApi } = getInfluxClient();

    const fluxQuery = `
      from(bucket: "${process.env.INFLUXDB_BUCKET}")
      |> range(start: -${range})
      |> filter(fn: (r) => r._measurement == "cold_start_metrics" and r._field == "cold_start_time_ms")
      |> group(columns: ["${groupBy}"])
      |> map(fn: (r) => ({
          _value: r._value,
          _field: "count",
          _time: r._time,
          groupBy: r.${groupBy}
        }))
      |> count()
      |> group(columns: ["groupBy"])
      |> yield(name: "totalRequests")

      from(bucket: "${process.env.INFLUXDB_BUCKET}")
      |> range(start: -${range})
      |> filter(fn: (r) => r._measurement == "cold_start_metrics" and r._field == "cold_start_time_ms")
      |> group(columns: ["${groupBy}"])
      |> mean()
      |> group(columns: ["${groupBy}"])
      |> yield(name: "averageTime")
    `;

    const results = await queryApi.collectRows(fluxQuery);
    
    const aggregatedData = {};

    results.forEach(row => {
        const key = row[groupBy];
        if (!aggregatedData[key]) {
            aggregatedData[key] = { [groupBy]: key };
        }
        if (row.result === 'averageTime') {
            aggregatedData[key].averageTime = parseFloat(row._value.toFixed(2));
        } else if (row.result === 'totalRequests') {
            aggregatedData[key].totalRequests = row._value;
        }
    });

    res.json(Object.values(aggregatedData));
  } catch (error) {
    console.error('Error fetching aggregate metrics:', error);
    res.status(500).json({ error: 'Failed to fetch aggregate metrics' });
  }
});

export default router;