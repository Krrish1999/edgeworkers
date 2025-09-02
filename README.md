# EdgeWorker Detector

A comprehensive monitoring and detection system for EdgeWorkers, providing real-time performance analytics, alerting, and regression detection capabilities.

## 🚀 Features

- **Real-time Monitoring**: Live performance metrics and health status
- **Regression Detection**: Automated detection of performance regressions
- **Alert System**: Configurable alerts for performance issues
- **Global Heat Map**: Visual representation of PoP (Point of Presence) performance
- **Performance Trends**: Historical performance analysis and trending
- **Dashboard**: Centralized monitoring interface
- **WebSocket Support**: Real-time data streaming

## 🏗️ Architecture

The project consists of several components:

```
edgeworker-detector/
├── backend/           # Node.js API server
├── frontend/          # React-based web interface
├── data-generator/    # Python script for generating test data
├── monitoring/        # Prometheus + Grafana monitoring stack
└── docker-compose.yml # Container orchestration
```

### Backend (`/backend`)
- **Node.js** application with Express.js
- **MongoDB** for data storage
- **Redis** for caching and session management
- **InfluxDB** for time-series metrics
- **WebSocket** support for real-time updates

### Frontend (`/frontend`)
- **React 18** with modern hooks
- **Vite** for fast development and building
- **Real-time charts** and visualizations
- **Responsive design** with modern UI components

### Data Generator (`/data-generator`)
- **Python** script for generating synthetic test data
- **Configurable** data patterns and volumes
- **Docker** containerized for easy deployment

### Monitoring (`/monitoring`)
- **Prometheus** for metrics collection
- **Grafana** for visualization and dashboards
- **Custom dashboards** for EdgeWorker metrics

## 🛠️ Prerequisites

- **Docker** and **Docker Compose**
- **Node.js** 18+ (for local development)
- **Python** 3.8+ (for local development)

## 🚀 Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd edgeworker-detector
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Grafana: http://localhost:3001
   - Prometheus: http://localhost:9090

### Local Development

1. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Start backend server**
   ```bash
   cd backend
   npm start
   ```

4. **Start frontend development server**
   ```bash
   cd frontend
   npm run dev
   ```

## 📊 Usage

### Dashboard
- View real-time performance metrics
- Monitor EdgeWorker health status
- Track response times and throughput

### Alerts
- Configure performance thresholds
- Set up notification rules
- Monitor alert history

### Analytics
- Analyze performance trends
- Identify performance patterns
- Generate performance reports

### PoP Management
- Monitor Point of Presence performance
- View global performance heat map
- Track regional performance metrics

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Backend Configuration
NODE_ENV=development
PORT=8000
MONGODB_URI=mongodb://localhost:27017/edgeworker-detector
REDIS_URL=redis://localhost:6379
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=your-token
INFLUXDB_ORG=your-org
INFLUXDB_BUCKET=edgeworker-metrics

# Frontend Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

### Alert Configuration

Configure alerts in the backend:

```javascript
// Example alert configuration
{
  name: "High Response Time",
  condition: "response_time > 1000",
  severity: "warning",
  enabled: true
}
```

## 📈 Monitoring

### Metrics Collected

- **Response Time**: EdgeWorker response latency
- **Throughput**: Requests per second
- **Error Rate**: Percentage of failed requests
- **Availability**: Uptime and health status
- **Resource Usage**: CPU, memory, and network utilization

### Dashboards

- **Overview Dashboard**: High-level system health
- **Performance Dashboard**: Detailed performance metrics
- **Alert Dashboard**: Active and historical alerts
- **PoP Dashboard**: Regional performance analysis

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Integration Tests
```bash
docker-compose -f docker-compose.test.yml up
```

## 🚀 Deployment

### Production Deployment

1. **Build production images**
   ```bash
   docker-compose -f docker-compose.prod.yml build
   ```

2. **Deploy to production**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Kubernetes Deployment

```bash
kubectl apply -f k8s/
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔮 Roadmap

- [ ] Machine learning-based anomaly detection
- [ ] Advanced alerting with ML insights
- [ ] Multi-tenant support
- [ ] API rate limiting and authentication
- [ ] Performance benchmarking tools
- [ ] Integration with CI/CD pipelines

---

**Built with ❤️ for EdgeWorker monitoring and optimization**
