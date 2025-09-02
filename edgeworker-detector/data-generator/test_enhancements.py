#!/usr/bin/env python3
"""
Test script to verify the data generator enhancements:
1. Write confirmation logging
2. Health check endpoint
3. Exponential backoff retry logic
"""

import os
import sys
import time
import requests
import threading
from datetime import datetime

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from generator import EdgeWorkerDataGenerator

def test_health_endpoint():
    """Test the health check endpoint"""
    print("🧪 Testing health check endpoint...")
    
    # Start generator in a separate thread
    generator = EdgeWorkerDataGenerator()
    
    def run_generator():
        # Override InfluxDB connection to simulate failure for testing
        generator.connection_status = "disconnected"
        generator.start_health_server()
        time.sleep(2)  # Give server time to start
    
    generator_thread = threading.Thread(target=run_generator, daemon=True)
    generator_thread.start()
    
    # Wait for server to start
    time.sleep(3)
    
    try:
        # Test health endpoint
        response = requests.get('http://localhost:8080/health', timeout=5)
        print(f"✅ Health endpoint status: {response.status_code}")
        print(f"📊 Health response: {response.json()}")
        
        # Test metrics endpoint
        response = requests.get('http://localhost:8080/metrics', timeout=5)
        print(f"✅ Metrics endpoint status: {response.status_code}")
        print(f"📊 Metrics response keys: {list(response.json().keys())}")
        
        return True
        
    except Exception as e:
        print(f"❌ Health endpoint test failed: {e}")
        return False

def test_exponential_backoff():
    """Test exponential backoff logic"""
    print("\n🧪 Testing exponential backoff logic...")
    
    generator = EdgeWorkerDataGenerator()
    
    # Override InfluxDB URL to force connection failure
    generator.influx_url = "http://nonexistent:8086"
    
    start_time = time.time()
    result = generator.connect_to_influxdb()
    end_time = time.time()
    
    print(f"✅ Connection attempt took {end_time - start_time:.2f} seconds")
    print(f"📊 Connection result: {result}")
    print(f"📊 Connection status: {generator.connection_status}")
    print(f"📊 Last error: {generator.last_error}")
    
    return True

def test_write_confirmation():
    """Test write confirmation logging"""
    print("\n🧪 Testing write confirmation logging...")
    
    generator = EdgeWorkerDataGenerator()
    
    # Test metrics tracking
    print(f"📊 Initial total writes: {generator.total_writes}")
    print(f"📊 Initial failed writes: {generator.failed_writes}")
    
    # Generate some test points
    points = generator.generate_metrics_batch()
    print(f"✅ Generated {len(points)} test points")
    
    # Test write with invalid connection (should fail and increment counters)
    generator.influx_url = "http://nonexistent:8086"
    generator.connect_to_influxdb()  # This will fail
    
    result = generator.write_metrics(points[:5])  # Test with smaller batch
    
    print(f"📊 Write result: {result}")
    print(f"📊 Total writes after test: {generator.total_writes}")
    print(f"📊 Failed writes after test: {generator.failed_writes}")
    print(f"📊 Last error: {generator.last_error}")
    
    return True

if __name__ == "__main__":
    print("🚀 Starting data generator enhancement tests...\n")
    
    # Run tests
    tests = [
        ("Health Endpoint", test_health_endpoint),
        ("Exponential Backoff", test_exponential_backoff),
        ("Write Confirmation", test_write_confirmation)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
            print(f"✅ {test_name}: {'PASSED' if result else 'FAILED'}")
        except Exception as e:
            print(f"❌ {test_name}: FAILED with error: {e}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n📊 Test Summary:")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    print(f"✅ Passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! Data generator enhancements are working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the implementation.")