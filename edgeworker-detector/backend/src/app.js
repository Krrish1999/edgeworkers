import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

// Route and Util Imports
import dashboardRoutes from './routes/dashboard.js';
import alertRoutes from './routes/alert.js';
import popsRoutes from './routes/pops.js';
import { connectMongoDB } from './utils/database.js';
import { connectInfluxDB, getInfluxClient } from './utils/influxdb.js';
import { connectRedis } from './utils/redis.js';
import Alert from './models/Alert.js';

const app = express();
const port = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// --- API Routes ---
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/pops', popsRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.json({ message: 'Edgeworker backend running' });
});

// --- Server and WebSocket Setup ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Add a broadcast function to the WebSocket server
wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

// --- Real-time Metrics Broadcaster ---
const broadcastMetrics = async () => {
  if (wss.clients.size === 0) return; // Don't query if no one is listening
  try {
    const { queryApi } = getInfluxClient();
    
    const popQuery = `
      from(bucket: "${process.env.INFLUXDB_BUCKET}") |> range(start: -24h) |> filter(fn: (r) => r._measurement == "cold_start_metrics") |> keep(columns: ["pop_code"]) |> group() |> distinct(column: "pop_code") |> count()
    `;
    const totalPopsResult = await queryApi.collectRows(popQuery);
    const totalPops = totalPopsResult.length > 0 ? totalPopsResult[0]._value : 0;

    const avgColdStartQuery = `
      from(bucket: "${process.env.INFLUXDB_BUCKET}") |> range(start: -1m) |> filter(fn: (r) => r._measurement == "cold_start_metrics" and r._field == "cold_start_time_ms") |> mean()
    `;
    const avgColdStartResult = await queryApi.collectRows(avgColdStartQuery);
    const averageColdStart = avgColdStartResult.length > 0 ? parseFloat(avgColdStartResult[0]._value.toFixed(2)) : 0;

    const regressions = await Alert.countDocuments({ status: 'active' });
    const healthyPops = totalPops - regressions;

    const overview = { totalPops, averageColdStart, healthyPops, regressions };
    
    wss.broadcast(JSON.stringify({ type: 'metrics_update', data: overview }));
  } catch (error) {
    console.error('Error broadcasting metrics:', error.message);
  }
};

wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');
  broadcastMetrics(); // Send initial data right away
  ws.on('close', () => console.log('🔌 WebSocket client disconnected'));
});

// --- Server Startup Logic ---
async function startServer() {
  try {
    await Promise.all([connectMongoDB(), connectInfluxDB(), connectRedis()]);
    server.listen(port, () => {
      console.log(`✅ Backend listening on port ${port}`);
      // Start broadcasting metrics every 5 seconds
      setInterval(broadcastMetrics, 5000);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

