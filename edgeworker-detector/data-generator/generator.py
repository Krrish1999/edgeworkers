import os
import time
import random
import json
import logging
import numpy as np
import threading
from datetime import datetime, timedelta
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
from faker import Faker
import schedule
from flask import Flask, jsonify

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EdgeWorkerDataGenerator:
    def __init__(self):
        self.influx_url = os.getenv('INFLUXDB_URL', 'http://influxdb:8086')
        self.influx_token = os.getenv('INFLUXDB_TOKEN', 'your-super-secret-admin-token')
        self.influx_org = os.getenv('INFLUXDB_ORG', 'akamai')
        self.influx_bucket = os.getenv('INFLUXDB_BUCKET', 'edgeworker-metrics')
        
        self.client = None
        self.write_api = None
        self.fake = Faker()
        
        # Initialize Akamai PoPs data
        self.pops = self.generate_akamai_pops()
        
        # Simulation parameters
        self.base_cold_start_time = 3.5  # Base cold start time in ms
        self.regression_probability = 0.05  # 5% chance of regression
        self.regression_factor = 2.5  # How much slower during regression
        
        # Track regression state
        self.regression_state = {}
        
        # Health monitoring
        self.last_successful_write = None
        self.total_writes = 0
        self.failed_writes = 0
        self.connection_status = "disconnected"
        self.last_error = None
        
        # Flask app for health check
        self.app = Flask(__name__)
        self.setup_health_endpoints()
        
    def connect_to_influxdb(self):
        """Establish connection to InfluxDB with exponential backoff retry logic"""
        max_retries = 10
        retry_count = 0
        base_delay = 1  # Start with 1 second delay
        max_delay = 60  # Maximum delay of 60 seconds
        
        while retry_count < max_retries:
            try:
                self.client = InfluxDBClient(
                    url=self.influx_url,
                    token=self.influx_token,
                    org=self.influx_org
                )
                self.write_api = self.client.write_api(write_options=SYNCHRONOUS)
                
                # Test connection
                health = self.client.health()
                if health.status == "pass":
                    self.connection_status = "connected"
                    self.last_error = None
                    logger.info("✅ Successfully connected to InfluxDB")
                    return True
                    
            except Exception as e:
                retry_count += 1
                self.connection_status = "disconnected"
                self.last_error = str(e)
                
                # Calculate exponential backoff delay
                delay = min(base_delay * (2 ** (retry_count - 1)), max_delay)
                
                logger.warning(f"❌ Failed to connect to InfluxDB (attempt {retry_count}/{max_retries}): {e}")
                logger.info(f"⏳ Retrying in {delay} seconds...")
                time.sleep(delay)
                
        logger.error("💥 Failed to connect to InfluxDB after maximum retries")
        self.connection_status = "failed"
        return False
    
    def generate_akamai_pops(self):
        """Generate simulated Akamai PoP locations worldwide"""
        pops = [
            # Major US Cities
            {"code": "lax1", "city": "Los Angeles", "country": "USA", "lat": 34.05, "lon": -118.24, "tier": "tier1"},
            {"code": "nyc1", "city": "New York", "country": "USA", "lat": 40.71, "lon": -74.00, "tier": "tier1"},
            {"code": "chi1", "city": "Chicago", "country": "USA", "lat": 41.88, "lon": -87.63, "tier": "tier1"},
            {"code": "dfw1", "city": "Dallas", "country": "USA", "lat": 32.78, "lon": -96.80, "tier": "tier1"},
            {"code": "sea1", "city": "Seattle", "country": "USA", "lat": 47.61, "lon": -122.33, "tier": "tier1"},
            
            # Europe
            {"code": "lhr1", "city": "London", "country": "UK", "lat": 51.51, "lon": -0.13, "tier": "tier1"},
            {"code": "fra1", "city": "Frankfurt", "country": "Germany", "lat": 50.11, "lon": 8.68, "tier": "tier1"},
            {"code": "ams1", "city": "Amsterdam", "country": "Netherlands", "lat": 52.37, "lon": 4.90, "tier": "tier1"},
            {"code": "par1", "city": "Paris", "country": "France", "lat": 48.86, "lon": 2.35, "tier": "tier1"},
            {"code": "mad1", "city": "Madrid", "country": "Spain", "lat": 40.42, "lon": -3.70, "tier": "tier2"},
            
            # Asia Pacific
            {"code": "nrt1", "city": "Tokyo", "country": "Japan", "lat": 35.68, "lon": 139.69, "tier": "tier1"},
            {"code": "sin1", "city": "Singapore", "country": "Singapore", "lat": 1.35, "lon": 103.82, "tier": "tier1"},
            {"code": "syd1", "city": "Sydney", "country": "Australia", "lat": -33.87, "lon": 151.21, "tier": "tier1"},
            {"code": "hkg1", "city": "Hong Kong", "country": "Hong Kong", "lat": 22.32, "lon": 114.17, "tier": "tier1"},
            {"code": "bom1", "city": "Mumbai", "country": "India", "lat": 19.08, "lon": 72.88, "tier": "tier2"},
            
            # Emerging Markets
            {"code": "gru1", "city": "São Paulo", "country": "Brazil", "lat": -23.55, "lon": -46.63, "tier": "tier2"},
            {"code": "jnb1", "city": "Johannesburg", "country": "South Africa", "lat": -26.20, "lon": 28.05, "tier": "tier2"},
            {"code": "dxb1", "city": "Dubai", "country": "UAE", "lat": 25.20, "lon": 55.27, "tier": "tier2"},
            {"code": "yyz1", "city": "Toronto", "country": "Canada", "lat": 43.65, "lon": -79.38, "tier": "tier1"},
            {"code": "icn1", "city": "Seoul", "country": "South Korea", "lat": 37.57, "lon": 126.98, "tier": "tier1"},
        ]
        
        return pops
    
    def setup_health_endpoints(self):
        """Setup Flask endpoints for health monitoring"""
        
        @self.app.route('/health', methods=['GET'])
        def health_check():
            """Health check endpoint for monitoring data generator status"""
            try:
                # Check InfluxDB connection
                influx_healthy = False
                if self.client:
                    try:
                        health = self.client.health()
                        influx_healthy = health.status == "pass"
                    except:
                        influx_healthy = False
                
                # Calculate uptime and success rate
                uptime_seconds = 0
                if hasattr(self, 'start_time'):
                    uptime_seconds = (datetime.utcnow() - self.start_time).total_seconds()
                
                success_rate = 0
                if self.total_writes > 0:
                    success_rate = ((self.total_writes - self.failed_writes) / self.total_writes) * 100
                
                # Determine overall health status
                overall_status = "healthy"
                if not influx_healthy or self.connection_status == "failed":
                    overall_status = "unhealthy"
                elif self.connection_status == "error" or (self.total_writes > 0 and success_rate < 90):
                    overall_status = "degraded"
                
                health_data = {
                    "status": overall_status,
                    "timestamp": datetime.utcnow().isoformat(),
                    "uptime_seconds": int(uptime_seconds),
                    "influxdb": {
                        "connection_status": self.connection_status,
                        "healthy": influx_healthy,
                        "last_error": self.last_error
                    },
                    "metrics": {
                        "total_writes": self.total_writes,
                        "failed_writes": self.failed_writes,
                        "success_rate_percent": round(success_rate, 2),
                        "last_successful_write": self.last_successful_write.isoformat() if self.last_successful_write else None
                    },
                    "pops": {
                        "total_monitored": len(self.pops),
                        "currently_regressed": sum(1 for state in self.regression_state.values() if state.get('is_regressed', False))
                    }
                }
                
                status_code = 200 if overall_status == "healthy" else 503
                return jsonify(health_data), status_code
                
            except Exception as e:
                logger.error(f"❌ Health check failed: {e}")
                return jsonify({
                    "status": "error",
                    "timestamp": datetime.utcnow().isoformat(),
                    "error": str(e)
                }), 500
        
        @self.app.route('/metrics', methods=['GET'])
        def metrics_endpoint():
            """Detailed metrics endpoint for monitoring"""
            try:
                # Get regression details
                regressed_pops = []
                for pop_code, state in self.regression_state.items():
                    if state.get('is_regressed', False):
                        pop_info = next((p for p in self.pops if p['code'] == pop_code), None)
                        if pop_info:
                            regressed_pops.append({
                                "pop_code": pop_code,
                                "city": pop_info['city'],
                                "country": pop_info['country'],
                                "regression_start": state['regression_start'].isoformat() if state['regression_start'] else None,
                                "duration_seconds": state.get('regression_duration', 0)
                            })
                
                metrics_data = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "generator": {
                        "total_writes": self.total_writes,
                        "failed_writes": self.failed_writes,
                        "success_rate_percent": round(((self.total_writes - self.failed_writes) / max(self.total_writes, 1)) * 100, 2),
                        "last_successful_write": self.last_successful_write.isoformat() if self.last_successful_write else None
                    },
                    "pops": {
                        "total": len(self.pops),
                        "healthy": len(self.pops) - len(regressed_pops),
                        "regressed": len(regressed_pops),
                        "regressed_details": regressed_pops
                    },
                    "influxdb": {
                        "connection_status": self.connection_status,
                        "url": self.influx_url,
                        "bucket": self.influx_bucket,
                        "last_error": self.last_error
                    }
                }
                
                return jsonify(metrics_data), 200
                
            except Exception as e:
                logger.error(f"❌ Metrics endpoint failed: {e}")
                return jsonify({
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                }), 500
    
    def simulate_cold_start_time(self, pop):
        """Generate realistic cold start times with potential regressions"""
        pop_code = pop['code']
        tier = pop['tier']
        
        # Base time varies by tier (tier1 = faster infrastructure)
        base_time = self.base_cold_start_time
        if tier == 'tier2':
            base_time *= 1.3
        elif tier == 'tier3':
            base_time *= 1.6
            
        # Add random variation (normal distribution)
        variation = np.random.normal(0, base_time * 0.2)
        cold_start_time = base_time + variation
        
        # Simulate regressions
        if pop_code not in self.regression_state:
            self.regression_state[pop_code] = {
                'is_regressed': False,
                'regression_start': None,
                'regression_duration': 0
            }
        
        pop_regression = self.regression_state[pop_code]
        
        # Randomly trigger regression
        if not pop_regression['is_regressed'] and random.random() < self.regression_probability:
            pop_regression['is_regressed'] = True
            pop_regression['regression_start'] = datetime.utcnow()
            pop_regression['regression_duration'] = random.randint(300, 1800)  # 5-30 minutes
            logger.warning(f"🔥 REGRESSION TRIGGERED at {pop_code} - Duration: {pop_regression['regression_duration']}s")
        
        # Apply regression if active
        if pop_regression['is_regressed']:
            time_since_regression = (datetime.utcnow() - pop_regression['regression_start']).total_seconds()
            
            if time_since_regression < pop_regression['regression_duration']:
                # Apply regression factor with some randomness
                regression_multiplier = self.regression_factor + random.uniform(-0.5, 0.8)
                cold_start_time *= regression_multiplier
                logger.info(f"⚠️  {pop_code} experiencing regression: {cold_start_time:.2f}ms")
            else:
                # Recovery
                pop_regression['is_regressed'] = False
                logger.info(f"✅ {pop_code} recovered from regression")
        
        # Ensure minimum time
        cold_start_time = max(cold_start_time, 0.5)
        
        return round(cold_start_time, 3)
    
    def generate_metrics_batch(self):
        """Generate a batch of cold start metrics"""
        points = []
        timestamp = datetime.utcnow()
        
        for pop in self.pops:
            # Generate multiple EdgeWorker function metrics per PoP
            functions = ['auth-validator', 'content-optimizer', 'geo-redirect', 'a-b-test', 'rate-limiter']
            
            for function_name in functions:
                cold_start_time = self.simulate_cold_start_time(pop)
                
                # Create InfluxDB point
                point = Point("cold_start_metrics") \
                    .tag("pop_code", pop['code']) \
                    .tag("city", pop['city']) \
                    .tag("country", pop['country']) \
                    .tag("tier", pop['tier']) \
                    .tag("function_name", function_name) \
                    .field("cold_start_time_ms", cold_start_time) \
                    .field("latitude", pop['lat']) \
                    .field("longitude", pop['lon']) \
                    .time(timestamp, WritePrecision.NS)
                
                points.append(point)
        
        return points
    
    def write_metrics(self, points):
        """Write metrics to InfluxDB with retry logic and confirmation logging"""
        max_retries = 3
        retry_count = 0
        base_delay = 1
        
        while retry_count < max_retries:
            try:
                # Attempt to write metrics
                start_time = time.time()
                self.write_api.write(bucket=self.influx_bucket, record=points)
                write_duration = time.time() - start_time
                
                # Write confirmation logging
                self.total_writes += 1
                self.last_successful_write = datetime.utcnow()
                self.connection_status = "connected"
                self.last_error = None
                
                logger.info(f"✅ Successfully written {len(points)} metrics to InfluxDB in {write_duration:.3f}s")
                logger.debug(f"📊 Total successful writes: {self.total_writes}, Failed writes: {self.failed_writes}")
                return True
                
            except Exception as e:
                retry_count += 1
                self.failed_writes += 1
                self.last_error = str(e)
                
                if retry_count < max_retries:
                    # Calculate exponential backoff delay
                    delay = base_delay * (2 ** (retry_count - 1))
                    logger.warning(f"⚠️  Failed to write metrics (attempt {retry_count}/{max_retries}): {e}")
                    logger.info(f"⏳ Retrying write in {delay} seconds...")
                    time.sleep(delay)
                    
                    # Try to reconnect if connection seems lost
                    try:
                        health = self.client.health()
                        if health.status != "pass":
                            logger.warning("🔄 Connection health check failed, attempting reconnect...")
                            self.connect_to_influxdb()
                    except:
                        logger.warning("🔄 Connection lost, attempting reconnect...")
                        self.connect_to_influxdb()
                else:
                    # Final failure
                    self.connection_status = "error"
                    logger.error(f"💥 Failed to write metrics after {max_retries} attempts: {e}")
                    logger.error(f"📊 Total failed writes: {self.failed_writes}")
                    
        return False
    
    def start_health_server(self):
        """Start the Flask health check server in a separate thread"""
        def run_server():
            # Disable Flask's default logging to avoid conflicts
            import logging as flask_logging
            flask_log = flask_logging.getLogger('werkzeug')
            flask_log.setLevel(flask_logging.ERROR)
            
            port = int(os.getenv('HEALTH_CHECK_PORT', 8080))
            logger.info(f"🏥 Starting health check server on port {port}")
            self.app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)
        
        health_thread = threading.Thread(target=run_server, daemon=True)
        health_thread.start()
        return health_thread
    
    def run_generator(self):
        """Main generator loop"""
        # Track start time for uptime calculation
        self.start_time = datetime.utcnow()
        
        # Start health check server
        self.start_health_server()
        
        if not self.connect_to_influxdb():
            logger.error("💥 Failed to connect to InfluxDB, but continuing to run health server...")
            # Keep running for health checks even if InfluxDB is down
            while True:
                time.sleep(10)
                # Periodically try to reconnect
                logger.info("🔄 Attempting to reconnect to InfluxDB...")
                if self.connect_to_influxdb():
                    break
            
        logger.info("🚀 Starting EdgeWorker Cold-Start Data Generator")
        logger.info(f"📊 Monitoring {len(self.pops)} PoPs across {len(set(p['country'] for p in self.pops))} countries")
        logger.info(f"🏥 Health check available at http://localhost:{os.getenv('HEALTH_CHECK_PORT', 8080)}/health")
        
        # Generate initial batch
        self.generate_and_write_metrics()
        
        # Schedule regular generation
        schedule.every(10).seconds.do(self.generate_and_write_metrics)
        
        while True:
            schedule.run_pending()
            time.sleep(1)
    
    def generate_and_write_metrics(self):
        """Generate and write metrics with enhanced error handling"""
        try:
            points = self.generate_metrics_batch()
            write_success = self.write_metrics(points)
            
            # Print some stats
            regression_count = sum(1 for state in self.regression_state.values() if state.get('is_regressed', False))
            if regression_count > 0:
                logger.warning(f"🔥 {regression_count} PoPs currently experiencing regressions")
            
            # Log periodic status updates
            if self.total_writes > 0 and self.total_writes % 10 == 0:
                success_rate = ((self.total_writes - self.failed_writes) / self.total_writes) * 100
                logger.info(f"📈 Status: {self.total_writes} total writes, {success_rate:.1f}% success rate")
            
            # If write failed, try to reconnect for next attempt
            if not write_success and self.connection_status != "connected":
                logger.info("🔄 Attempting to reconnect for next write cycle...")
                self.connect_to_influxdb()
                
        except Exception as e:
            self.failed_writes += 1
            self.last_error = str(e)
            logger.error(f"❌ Error in generation cycle: {e}")
            
            # Try to reconnect on unexpected errors
            try:
                logger.info("🔄 Attempting to reconnect after generation error...")
                self.connect_to_influxdb()
            except Exception as reconnect_error:
                logger.error(f"❌ Reconnection failed: {reconnect_error}")

if __name__ == "__main__":
    generator = EdgeWorkerDataGenerator()
    generator.run_generator()