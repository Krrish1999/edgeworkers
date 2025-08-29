import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';


import dashboardRoutes from './routes/dashboard.js';
import alertsRoutes from './routes/alert.js';
import popsRoutes from './routes/pops.js';
import { connectMongoDB } from './utils/database.js';
import { connectInfluxDB } from './utils/influxdb.js';
import { connectRedis } from './utils/redis.js';


const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertsRoutes);
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

wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');
  ws.on('message', (message) => {
    console.log('Received WebSocket message:', message.toString());
  });
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });
});


async function startServer() {
  try {
    // Connect to all databases first
    await Promise.all([
      connectMongoDB(),
      connectInfluxDB(),
      connectRedis()
    ]);

    // Start the server only after successful connections
    server.listen(port, () => {
      console.log(`✅ Backend listening on port ${port}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();