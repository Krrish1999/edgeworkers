#!/usr/bin/env python3
"""
Quick test to verify health endpoint functionality
"""

import os
import sys
import time
import threading
import socket
from datetime import datetime

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def check_port_available(port):
    """Check if a port is available"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('localhost', port))
            return True
        except OSError:
            return False

def test_health_server_startup():
    """Test that the health server can start up properly"""
    print("🧪 Testing health server startup...")
    
    try:
        from generator import EdgeWorkerDataGenerator
        
        # Create generator instance
        generator = EdgeWorkerDataGenerator()
        
        # Check if port 8080 is available
        port = 8080
        if not check_port_available(port):
            print(f"⚠️  Port {port} is already in use, trying port 8081...")
            port = 8081
            os.environ['HEALTH_CHECK_PORT'] = str(port)
        
        print(f"🏥 Testing health server on port {port}")
        
        # Start health server in a separate thread
        def start_server():
            try:
                generator.start_health_server()
            except Exception as e:
                print(f"❌ Health server failed to start: {e}")
        
        server_thread = threading.Thread(target=start_server, daemon=True)
        server_thread.start()
        
        # Give server time to start
        time.sleep(2)
        
        # Try to connect to the health endpoint using basic socket connection
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(5)
                result = s.connect_ex(('localhost', port))
                if result == 0:
                    print("✅ Health server is listening on the expected port")
                    
                    # Send a basic HTTP request
                    request = f"GET /health HTTP/1.1\r\nHost: localhost:{port}\r\n\r\n"
                    s.send(request.encode())
                    
                    # Read response
                    response = s.recv(4096).decode()
                    if "HTTP/1.1" in response and ("200" in response or "503" in response):
                        print("✅ Health endpoint responded with HTTP status")
                        if '"status"' in response:
                            print("✅ Health endpoint returned JSON response")
                        return True
                    else:
                        print(f"⚠️  Unexpected response: {response[:200]}...")
                        return False
                else:
                    print(f"❌ Could not connect to health server on port {port}")
                    return False
                    
        except Exception as e:
            print(f"❌ Error testing health endpoint: {e}")
            return False
            
    except ImportError as e:
        print(f"❌ Could not import generator module: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_generator_initialization():
    """Test that the generator initializes properly with all enhancements"""
    print("\n🧪 Testing generator initialization...")
    
    try:
        from generator import EdgeWorkerDataGenerator
        
        generator = EdgeWorkerDataGenerator()
        
        # Check initialization of monitoring variables
        checks = [
            (hasattr(generator, 'total_writes'), 'total_writes counter'),
            (hasattr(generator, 'failed_writes'), 'failed_writes counter'),
            (hasattr(generator, 'last_successful_write'), 'last_successful_write timestamp'),
            (hasattr(generator, 'connection_status'), 'connection_status tracking'),
            (hasattr(generator, 'last_error'), 'last_error tracking'),
            (hasattr(generator, 'app'), 'Flask app instance'),
            (generator.total_writes == 0, 'total_writes initialized to 0'),
            (generator.failed_writes == 0, 'failed_writes initialized to 0'),
            (generator.connection_status == "disconnected", 'connection_status initialized'),
        ]
        
        all_passed = True
        for check, description in checks:
            if check:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description}")
                all_passed = False
        
        return all_passed
        
    except Exception as e:
        print(f"❌ Generator initialization failed: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 Testing Task 5 health endpoint functionality\n")
    
    tests = [
        ("Generator Initialization", test_generator_initialization),
        ("Health Server Startup", test_health_server_startup)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name}: FAILED with error: {e}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n📊 Test Summary:")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"  {status}: {test_name}")
    
    print(f"\n🎯 Overall Result: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All health endpoint tests passed!")
        return True
    else:
        print("⚠️  Some tests failed.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)