import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [alerts, setAlerts] = useState([]);
  const [realtimeMetrics, setRealtimeMetrics] = useState({});
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectInterval = useRef(null);

  const connect = () => {
    try {
      // FIX: Use a relative URL that can be proxied by Vite
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${protocol}://${window.location.host}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setConnectionStatus('connected');
        setSocket(ws);
        reconnectAttempts.current = 0;

        // Subscribe to relevant channels
        ws.send(JSON.stringify({
          type: 'subscribe',
          topics: ['alerts', 'metrics', 'regressions']
        }));

        toast.success('Connected to real-time updates');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setConnectionStatus('disconnected');
        setSocket(null);

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          setConnectionStatus('connecting');
          reconnectInterval.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          toast.error('Lost connection to server');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('❌ Failed to connect WebSocket:', error);
      setConnectionStatus('error');
    }
  };

  const handleMessage = (data) => {
    switch (data.type) {
      case 'welcome':
        console.log('👋 WebSocket welcome:', data.message);
        break;

      case 'alert':
        console.log('🚨 New alert received:', data.data);
        handleNewAlert(data.data);
        break;

      case 'metrics_update':
        console.log('📊 Metrics update:', data.data);
        setRealtimeMetrics(prev => ({
          ...prev,
          ...data.data
        }));
        break;

      case 'regression_detected':
        console.log('🔥 Regression detected:', data.data);
        handleRegressionAlert(data.data);
        break;

      case 'subscription_confirmed':
        console.log('✅ Subscribed to topics:', data.topics);
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.log('📨 Unknown message type:', data.type);
    }
  };

  const handleNewAlert = (alertData) => {
    // Add to alerts list
    setAlerts(prev => [alertData, ...prev.slice(0, 49)]); // Keep last 50 alerts

    // Show toast notification
    const severityEmojis = {
      low: '🟡',
      medium: '🟠',
      high: '🔴',
      critical: '🚨'
    };

    const emoji = severityEmojis[alertData.analysis?.severity] || '⚠️';
    toast.error(`${emoji} ${alertData.pop?.city} (${alertData.pop?.code}): Performance regression detected`, {
      duration: 6000
    });
  };

  const handleRegressionAlert = (regressionData) => {
    const { pop, analysis } = regressionData;
    
    setAlerts(prev => [{
      type: 'regression_detected',
      severity: analysis.severity,
      pop,
      analysis,
      message: `Cold-start regression detected at ${pop.city}`,
      timestamp: new Date().toISOString(),
      status: 'active'
    }, ...prev.slice(0, 49)]);

    // Show detailed toast
    toast.error(
      `🔥 Regression at ${pop.city}: ${analysis.summary}`,
      { duration: 8000 }
    );
  };

  const sendMessage = (message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('⚠️  WebSocket not connected, message not sent');
    }
  };

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (socket && connectionStatus === 'connected') {
      const heartbeat = setInterval(() => {
        sendMessage({ type: 'ping' });
      }, 30000);

      return () => clearInterval(heartbeat);
    }
  }, [socket, connectionStatus]);

 

  const value = {
    socket,
    connectionStatus,
    alerts,
    realtimeMetrics,
    sendMessage,
    reconnect: connect
  };

   // Initial connection
  useEffect(() => {
    connect();

    return () => {
      if (socket) {
        socket.close();
      }
      if (reconnectInterval.current) {
        clearTimeout(reconnectInterval.current);
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};