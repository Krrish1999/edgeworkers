import os
import time
import random
import json
import logging
import numpy as np
from datetime import datetime, timedelta
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
from faker import Faker
import schedule

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
        
    def connect_to_influxdb(self):
        """Establish connection to InfluxDB with retry logic"""
        max_retries = 10
        retry_count = 0
        
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
                    logger.info("Successfully connected to InfluxDB")
                    return True
                    
            except Exception as e:
                retry_count += 1
                logger.warning(f"Failed to connect to InfluxDB (attempt {retry_count}): {e}")
                time.sleep(5)
                
        logger.error("Failed to connect to InfluxDB after maximum retries")
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
        """Write metrics to InfluxDB"""
        try:
            self.write_api.write(bucket=self.influx_bucket, record=points)
            logger.info(f"✅ Written {len(points)} metrics to InfluxDB")
        except Exception as e:
            logger.error(f"❌ Failed to write metrics: {e}")
    
    def run_generator(self):
        """Main generator loop"""
        if not self.connect_to_influxdb():
            return
            
        logger.info("🚀 Starting EdgeWorker Cold-Start Data Generator")
        logger.info(f"📊 Monitoring {len(self.pops)} PoPs across {len(set(p['country'] for p in self.pops))} countries")
        
        # Generate initial batch
        self.generate_and_write_metrics()
        
        # Schedule regular generation
        schedule.every(10).seconds.do(self.generate_and_write_metrics)
        
        while True:
            schedule.run_pending()
            time.sleep(1)
    
    def generate_and_write_metrics(self):
        """Generate and write metrics"""
        try:
            points = self.generate_metrics_batch()
            self.write_metrics(points)
            
            # Print some stats
            regression_count = sum(1 for state in self.regression_state.values() if state['is_regressed'])
            if regression_count > 0:
                logger.warning(f"🔥 {regression_count} PoPs currently experiencing regressions")
                
        except Exception as e:
            logger.error(f"❌ Error in generation cycle: {e}")

if __name__ == "__main__":
    generator = EdgeWorkerDataGenerator()
    generator.run_generator()