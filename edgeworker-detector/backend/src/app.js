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
import { initializeConnection, getInfluxClient } from './utils/influxdb.js';
import { connectRedis } from './utils/redis.js';
import Alert from './models/Alert.js';
import AlertService from './services/AlertService.js';
import RegressionDetector from './services/RegressionDetector.js';

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

app.get('/health', async (req, res) => {
  try {
    const { checkConnectionHealth, getConnectionStatus } = getInfluxClient();
    const influxHealth = await checkConnectionHealth();
    const connectionStatus = getConnectionStatus();
    
    const overallHealth = {
      status: influxHealth.healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        influxdb: {
          healthy: influxHealth.healthy,
          status: influxHealth.status || 'unknown',
          connectionState: connectionStatus.state,
          lastConnectionAttempt: connectionStatus.lastConnectionAttempt,
          retryCount: connectionStatus.retryCount
        },
        mongodb: {
          healthy: true, // Assume healthy if we can respond
          status: 'connected'
        },
        redis: {
          healthy: true, // Assume healthy if we can respond  
          status: 'connected'
        },
        websocket: {
          healthy: true,
          activeConnections: wss.clients.size,
          totalConnectionsTracked: wsConnections.size
        }
      }
    };
    
    const statusCode = influxHealth.healthy ? 200 : 503;
    res.status(statusCode).json(overallHealth);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        influxdb: { healthy: false, error: error.message },
        websocket: { 
          healthy: false, 
          activeConnections: wss?.clients?.size || 0,
          error: 'Health check failed'
        }
      }
    });
  }
});

// WebSocket status endpoint
app.get('/api/websocket/status', (req, res) => {
  try {
    const connections = Array.from(wsConnections.values()).map(conn => ({
      id: conn.id,
      connectedAt: conn.connectedAt,
      broadcastCount: conn.broadcastCount,
      errorCount: conn.errorCount,
      lastBroadcast: conn.lastBroadcast,
      lastError: conn.lastError,
      clientInfo: conn.clientInfo
    }));
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      summary: {
        activeConnections: wss.clients.size,
        trackedConnections: wsConnections.size,
        totalBroadcasts: connections.reduce((sum, conn) => sum + conn.broadcastCount, 0),
        totalErrors: connections.reduce((sum, conn) => sum + conn.errorCount, 0)
      },
      connections
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Edgeworker backend running' });
});

// --- Server and WebSocket Setup ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket connection state management
const wsConnections = new Map();
let wsConnectionCounter = 0;

// Enhanced broadcast function with error recovery
wss.broadcast = function broadcast(data) {
  const message = typeof data === 'string' ? data : JSON.stringify(data);
  const failedConnections = [];
  
  wss.clients.forEach(function each(client) {
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
    totalClients: wss.clients.size,
    successfulBroadcasts: wss.clients.size - failedConnections.length,
    failedBroadcasts: failedConnections.length
  };
};

// --- Cache Warming Function ---
const warmCache = async () => {
  try {
    console.log('🔥 Warming cache with frequently accessed data...');
    
    // Warm overview cache
    const overviewResponse = await fetch(`http://localhost:${port}/api/dashboard/overview`);
    if (overviewResponse.ok) {
      console.log('✅ Overview cache warmed');
    }
    
    // Warm heatmap cache
    const heatmapResponse = await fetch(`http://localhost:${port}/api/dashboard/heatmap`);
    if (heatmapResponse.ok) {
      console.log('✅ Heatmap cache warmed');
    }
    
    // Warm common timeseries cache
    const timeseriesResponse = await fetch(`http://localhost:${port}/api/dashboard/timeseries?range=1h`);
    if (timeseriesResponse.ok) {
      console.log('✅ Timeseries cache warmed');
    }
    
    console.log('🔥 Cache warming completed');
  } catch (error) {
    console.warn('⚠️  Cache warming failed:', error.message);
  }
};

// --- Real-time Metrics Broadcaster ---
const broadcastMetrics = async () => {
  if (wss.clients.size === 0) {
    console.log('📡 No WebSocket clients connected, skipping broadcast');
    return; // Don't query if no one is listening
  }
  
  try {
    const { executeQuery, ensureConnection } = getInfluxClient();
    
    // Ensure connection is healthy before executing queries
    await ensureConnection();
    
    // Use optimized queries consistent with dashboard endpoints
    const MEASUREMENT_NAME = 'cold_start_metrics';
    const FIELD_NAME = 'cold_start_time_ms';
    
    // Simplified overview query for broadcasting
    const overviewQuery = `
      from(bucket: "${process.env.INFLUXDB_BUCKET}")
        |> range(start: -10m)
        |> filter(fn: (r) => r._measurement == "${MEASUREMENT_NAME}" and r._field == "${FIELD_NAME}")
        |> group(columns: ["pop_code"])
        |> last()
        |> group()
    `;
    
    const queryResult = await executeQuery(overviewQuery, { timeout: 10000 });
    
    // Process results to calculate metrics (same logic as dashboard overview)
    const totalPops = queryResult.length;
    const healthyPops = queryResult.filter(r => r._value < 10.0).length;
    const averageColdStart = queryResult.length > 0 
      ? queryResult.reduce((sum, r) => sum + r._value, 0) / queryResult.length 
      : 0;

    const regressions = await Alert.countDocuments({ status: 'active' });

    const overview = { 
      totalPops, 
      healthyPops,
      averageColdStart: parseFloat(averageColdStart.toFixed(2)), 
      regressions 
    };
    
    const broadcastResult = wss.broadcast({ type: 'metrics_update', data: overview });
    console.log(`📡 Metrics broadcast completed: ${broadcastResult.successfulBroadcasts}/${broadcastResult.totalClients} clients`);
    
  } catch (error) {
    console.error('❌ Error broadcasting metrics:', error.message);
    
    // Send error notification to connected clients (if any)
    if (wss.clients.size > 0) {
      try {
        wss.broadcast({ 
          type: 'error', 
          data: { 
            message: 'Metrics temporarily unavailable', 
            timestamp: new Date().toISOString() 
          } 
        });
      } catch (broadcastError) {
        console.error('❌ Failed to broadcast error message:', broadcastError.message);
      }
    }
    
    // Don't throw error to prevent stopping the broadcast interval
  }
};

wss.on('connection', (ws) => {
  // Assign unique connection ID
  const connectionId = `ws_${++wsConnectionCounter}_${Date.now()}`;
  ws.connectionId = connectionId;
  
  // Store connection information
  wsConnections.set(connectionId, {
    id: connectionId,
    connectedAt: new Date(),
    lastBroadcast: null,
    broadcastCount: 0,
    errorCount: 0,
    lastError: null,
    clientInfo: {
      userAgent: ws.upgradeReq?.headers['user-agent'] || 'unknown',
      ip: ws.upgradeReq?.connection?.remoteAddress || 'unknown'
    }
  });
  
  console.log(`🔌 WebSocket client connected [${connectionId}] - Total clients: ${wss.clients.size}`);
  
  // Send welcome message
  try {
    ws.send(JSON.stringify({ 
      type: 'welcome', 
      data: { 
        connectionId, 
        message: 'Connected to EdgeWorker monitoring system',
        timestamp: new Date().toISOString()
      } 
    }));
  } catch (error) {
    console.error(`❌ Failed to send welcome message to ${connectionId}:`, error.message);
  }
  
  // Send initial data right away
  broadcastMetrics();
  
  // Handle client messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      handleClientMessage(ws, data);
    } catch (error) {
      console.error(`❌ Failed to parse message from ${connectionId}:`, error.message);
      try {
        ws.send(JSON.stringify({ 
          type: 'error', 
          data: { message: 'Invalid message format' } 
        }));
      } catch (sendError) {
        console.error(`❌ Failed to send error response to ${connectionId}:`, sendError.message);
      }
    }
  });
  
  // Handle client disconnection
  ws.on('close', (code, reason) => {
    console.log(`🔌 WebSocket client disconnected [${connectionId}] - Code: ${code}, Reason: ${reason || 'none'} - Remaining clients: ${wss.clients.size - 1}`);
    
    // Clean up connection info
    if (wsConnections.has(connectionId)) {
      const connInfo = wsConnections.get(connectionId);
      console.log(`📊 Connection stats for ${connectionId}: ${connInfo.broadcastCount} broadcasts, ${connInfo.errorCount} errors`);
      wsConnections.delete(connectionId);
    }
  });
  
  // Handle connection errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for client ${connectionId}:`, error.message);
    
    // Update connection info
    if (wsConnections.has(connectionId)) {
      const connInfo = wsConnections.get(connectionId);
      connInfo.lastError = error.message;
      connInfo.errorCount++;
    }
  });
  
  // Handle ping/pong for connection health
  ws.on('pong', () => {
    if (wsConnections.has(connectionId)) {
      wsConnections.get(connectionId).lastPong = new Date();
    }
  });
});

// Handle client messages
const handleClientMessage = (ws, data) => {
  const connectionId = ws.connectionId;
  
  switch (data.type) {
    case 'ping':
      try {
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      } catch (error) {
        console.error(`❌ Failed to send pong to ${connectionId}:`, error.message);
      }
      break;
      
    case 'subscribe':
      // Handle subscription requests (for future use)
      console.log(`📡 Client ${connectionId} subscribed to topics:`, data.topics);
      try {
        ws.send(JSON.stringify({ 
          type: 'subscription_confirmed', 
          topics: data.topics || ['metrics', 'alerts'] 
        }));
      } catch (error) {
        console.error(`❌ Failed to confirm subscription for ${connectionId}:`, error.message);
      }
      break;
      
    default:
      console.log(`📨 Unknown message type from ${connectionId}:`, data.type);
  }
};

// --- Server Startup Logic ---
async function startServer() {
  try {
    // Initialize database connections with enhanced error handling
    await Promise.all([
      connectMongoDB(), 
      initializeConnection(), // Enhanced InfluxDB initialization with auto-retry
      connectRedis()
    ]);
    
    server.listen(port, async () => {
      console.log(`✅ Backend listening on port ${port}`);
      
      // Initialize AlertService with WebSocket server for real-time notifications
      const alertService = new AlertService(wss);
      
      // Initialize and start regression detection service with enhanced AlertService
      const regressionDetector = new RegressionDetector(alertService);
      await regressionDetector.start();
      
      // Start broadcasting metrics every 10 seconds (aligned with data generation)
      setInterval(broadcastMetrics, 10000);
      
      // WebSocket connection health monitoring and cleanup
      setInterval(() => {
        const now = new Date();
        const staleConnections = [];
        
        // Check for stale connections (no activity for 5 minutes)
        wsConnections.forEach((connInfo, connectionId) => {
          const timeSinceLastBroadcast = connInfo.lastBroadcast 
            ? now - connInfo.lastBroadcast 
            : now - connInfo.connectedAt;
            
          if (timeSinceLastBroadcast > 5 * 60 * 1000) { // 5 minutes
            staleConnections.push(connectionId);
          }
        });
        
        // Clean up stale connections
        staleConnections.forEach(connectionId => {
          console.log(`🧹 Cleaning up stale WebSocket connection: ${connectionId}`);
          wsConnections.delete(connectionId);
        });
        
        // Send ping to all connected clients to check health
        if (wss.clients.size > 0) {
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              try {
                client.ping();
              } catch (error) {
                console.error(`❌ Failed to ping client ${client.connectionId}:`, error.message);
              }
            }
          });
        }
        
        // Log connection stats every 5 minutes
        if (wsConnections.size > 0) {
          console.log(`📊 WebSocket Stats: ${wss.clients.size} active, ${wsConnections.size} tracked connections`);
        }
      }, 60000); // Run every minute
      
      // Warm cache after a short delay to allow server to fully start
      setTimeout(warmCache, 5000);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    // Don't exit immediately - let auto-reconnection handle InfluxDB issues
    if (error.message.includes('InfluxDB')) {
      console.log('🔄 Server starting without InfluxDB - will retry connection automatically');
      server.listen(port, async () => {
        console.log(`✅ Backend listening on port ${port} (InfluxDB will reconnect automatically)`);
        
        // Initialize AlertService with WebSocket server for real-time notifications
        const alertService = new AlertService(wss);
        
        // Initialize and start regression detection service with enhanced AlertService
        const regressionDetector = new RegressionDetector(alertService);
        await regressionDetector.start();
        
        setInterval(broadcastMetrics, 10000);
        
        // WebSocket connection health monitoring and cleanup (same as above)
        setInterval(() => {
          const now = new Date();
          const staleConnections = [];
          
          wsConnections.forEach((connInfo, connectionId) => {
            const timeSinceLastBroadcast = connInfo.lastBroadcast 
              ? now - connInfo.lastBroadcast 
              : now - connInfo.connectedAt;
              
            if (timeSinceLastBroadcast > 5 * 60 * 1000) {
              staleConnections.push(connectionId);
            }
          });
          
          staleConnections.forEach(connectionId => {
            console.log(`🧹 Cleaning up stale WebSocket connection: ${connectionId}`);
            wsConnections.delete(connectionId);
          });
          
          if (wss.clients.size > 0) {
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                try {
                  client.ping();
                } catch (error) {
                  console.error(`❌ Failed to ping client ${client.connectionId}:`, error.message);
                }
              }
            });
          }
          
          if (wsConnections.size > 0) {
            console.log(`📊 WebSocket Stats: ${wss.clients.size} active, ${wsConnections.size} tracked connections`);
          }
        }, 60000);
        
        // Warm cache after a delay even if InfluxDB is not initially available
        setTimeout(warmCache, 10000);
      });
    } else {
      process.exit(1);
    }
  }
}

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`🛑 Received ${signal}, shutting down gracefully...`);
  
  try {
    // Close all WebSocket connections gracefully
    if (wss && wss.clients.size > 0) {
      console.log(`🔌 Closing ${wss.clients.size} WebSocket connections...`);
      
      // Send shutdown notification to all clients
      wss.broadcast({ 
        type: 'server_shutdown', 
        data: { 
          message: 'Server is shutting down', 
          timestamp: new Date().toISOString() 
        } 
      });
      
      // Close all connections
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.close(1001, 'Server shutdown');
        }
      });
      
      // Clear connection tracking
      wsConnections.clear();
      console.log('✅ WebSocket connections closed');
    }
    
    // Close HTTP server
    if (server) {
      server.close(() => {
        console.log('✅ HTTP server closed');
      });
    }
    
    // Shutdown InfluxDB client
    const { gracefulShutdown: influxShutdown } = await import('./utils/influxdb.js');
    await influxShutdown();
    console.log('✅ InfluxDB client shutdown completed');
    
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error.message);
  }
  
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();

