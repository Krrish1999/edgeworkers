import { createClient } from 'redis';

let redisClient = null;
let connectionState = 'disconnected';
let connectionRetryCount = 0;

// Configuration constants
const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds

// Calculate exponential backoff delay
function calculateBackoffDelay(attempt) {
    const delay = Math.min(BASE_RETRY_DELAY * Math.pow(2, attempt), MAX_RETRY_DELAY);
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
}

async function connectRedis() {
    const url = process.env.REDIS_URL || 'redis://redis:6379';
    
    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
        connectionRetryCount = attempt + 1;
        
        try {
            console.log(`Attempting Redis connection (${attempt + 1}/${MAX_RETRY_ATTEMPTS})`);
            connectionState = 'connecting';
            
            redisClient = createClient({ 
                url,
                socket: {
                    connectTimeout: 10000,
                    lazyConnect: true
                }
            });
            
            redisClient.on('error', (error) => {
                console.error('❌ Redis error:', error.message);
                connectionState = 'error';
                global.redisConnected = false;
            });
            
            redisClient.on('connect', () => {
                console.log('✅ Connected to Redis');
                connectionState = 'connected';
                global.redisConnected = true;
                connectionRetryCount = 0;
            });
            
            redisClient.on('disconnect', () => {
                console.warn('⚠️  Redis disconnected');
                connectionState = 'disconnected';
                global.redisConnected = false;
            });
            
            redisClient.on('reconnecting', () => {
                console.log('🔄 Redis reconnecting...');
                connectionState = 'connecting';
            });
            
            await redisClient.connect();
            
            // Test the connection
            await redisClient.ping();
            
            console.log('✅ Redis connection established and tested successfully');
            return;
            
        } catch (error) {
            const isLastAttempt = attempt === MAX_RETRY_ATTEMPTS - 1;
            
            console.error(`❌ Redis connection attempt ${attempt + 1} failed:`, error.message);
            
            if (isLastAttempt) {
                connectionState = 'failed';
                global.redisConnected = false;
                console.error(`💥 Failed to connect to Redis after ${MAX_RETRY_ATTEMPTS} attempts`);
                throw error;
            }
            
            // Wait with exponential backoff before next attempt
            const delay = calculateBackoffDelay(attempt);
            console.log(`⏳ Waiting ${delay}ms before next Redis retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

function getRedisClient() {
    if (!redisClient || connectionState !== 'connected') {
        const error = new Error(`Redis not available - connection state: ${connectionState}`);
        error.connectionState = connectionState;
        throw error;
    }
    return redisClient;
}

// Enhanced Redis operations with error handling
async function setWithExpiry(key, value, ttlSeconds) {
    try {
        const client = getRedisClient();
        await client.setEx(key, ttlSeconds, value);
        console.log(`✅ Cached data for key: ${key} (TTL: ${ttlSeconds}s)`);
        return true;
    } catch (error) {
        console.warn(`⚠️  Failed to cache data for key ${key}:`, error.message);
        return false;
    }
}

async function get(key) {
    try {
        const client = getRedisClient();
        const result = await client.get(key);
        if (result) {
            console.log(`✅ Cache hit for key: ${key}`);
        } else {
            console.log(`❌ Cache miss for key: ${key}`);
        }
        return result;
    } catch (error) {
        console.warn(`⚠️  Failed to get cached data for key ${key}:`, error.message);
        return null;
    }
}

async function del(key) {
    try {
        const client = getRedisClient();
        const result = await client.del(key);
        console.log(`✅ Deleted cache key: ${key}`);
        return result;
    } catch (error) {
        console.warn(`⚠️  Failed to delete cache key ${key}:`, error.message);
        return 0;
    }
}

async function exists(key) {
    try {
        const client = getRedisClient();
        return await client.exists(key);
    } catch (error) {
        console.warn(`⚠️  Failed to check existence of cache key ${key}:`, error.message);
        return 0;
    }
}

// Clear cache by pattern
async function clearCachePattern(pattern) {
    try {
        const client = getRedisClient();
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(keys);
            console.log(`✅ Cleared ${keys.length} cache keys matching pattern: ${pattern}`);
            return keys.length;
        }
        return 0;
    } catch (error) {
        console.warn(`⚠️  Failed to clear cache pattern ${pattern}:`, error.message);
        return 0;
    }
}

// Enhanced caching with fallback support
async function setFallbackCache(key, value, ttlSeconds) {
    try {
        const fallbackKey = `${key}_fallback`;
        const client = getRedisClient();
        
        // Store both regular cache and long-term fallback cache
        await Promise.all([
            client.setEx(key, ttlSeconds, value),
            client.setEx(fallbackKey, ttlSeconds * 10, value) // Fallback cache lasts 10x longer
        ]);
        
        console.log(`✅ Cached data with fallback for key: ${key} (TTL: ${ttlSeconds}s, Fallback TTL: ${ttlSeconds * 10}s)`);
        return true;
    } catch (error) {
        console.warn(`⚠️  Failed to cache data with fallback for key ${key}:`, error.message);
        return false;
    }
}

async function getWithFallback(key) {
    try {
        const client = getRedisClient();
        
        // Try regular cache first
        let result = await client.get(key);
        if (result) {
            console.log(`✅ Cache hit for key: ${key}`);
            return { data: result, source: 'cache' };
        }
        
        // Try fallback cache
        const fallbackKey = `${key}_fallback`;
        result = await client.get(fallbackKey);
        if (result) {
            console.log(`✅ Fallback cache hit for key: ${key}`);
            return { data: result, source: 'fallback_cache' };
        }
        
        console.log(`❌ Cache miss for key: ${key} (including fallback)`);
        return { data: null, source: 'miss' };
        
    } catch (error) {
        console.warn(`⚠️  Failed to get cached data for key ${key}:`, error.message);
        return { data: null, source: 'error' };
    }
}

// Store data specifically for fallback purposes (longer TTL)
async function setLongTermCache(key, value, ttlSeconds = 3600) {
    try {
        const client = getRedisClient();
        const longTermKey = `longterm_${key}`;
        
        await client.setEx(longTermKey, ttlSeconds, value);
        console.log(`✅ Stored long-term cache for key: ${longTermKey} (TTL: ${ttlSeconds}s)`);
        return true;
    } catch (error) {
        console.warn(`⚠️  Failed to store long-term cache for key ${key}:`, error.message);
        return false;
    }
}

async function getLongTermCache(key) {
    try {
        const client = getRedisClient();
        const longTermKey = `longterm_${key}`;
        
        const result = await client.get(longTermKey);
        if (result) {
            console.log(`✅ Long-term cache hit for key: ${longTermKey}`);
        } else {
            console.log(`❌ Long-term cache miss for key: ${longTermKey}`);
        }
        return result;
    } catch (error) {
        console.warn(`⚠️  Failed to get long-term cached data for key ${key}:`, error.message);
        return null;
    }
}

// Health check for Redis connection
async function healthCheck() {
    try {
        const client = getRedisClient();
        const start = Date.now();
        await client.ping();
        const responseTime = Date.now() - start;
        
        return {
            healthy: true,
            responseTime,
            connectionState,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message,
            connectionState,
            timestamp: new Date().toISOString()
        };
    }
}

// Get connection status
function getConnectionStatus() {
    return {
        state: connectionState,
        connected: global.redisConnected,
        retryCount: connectionRetryCount,
        hasClient: !!redisClient
    };
}

// Graceful shutdown
async function gracefulShutdown() {
    console.log('🔄 Shutting down Redis connection...');
    
    try {
        if (redisClient) {
            await redisClient.quit();
            console.log('✅ Redis connection closed gracefully');
        }
        
        connectionState = 'disconnected';
        global.redisConnected = false;
        redisClient = null;
        
    } catch (error) {
        console.error('❌ Error during Redis graceful shutdown:', error.message);
        throw error;
    }
}

export { 
    connectRedis, 
    getRedisClient, 
    setWithExpiry, 
    get, 
    del, 
    exists, 
    clearCachePattern,
    setFallbackCache,
    getWithFallback,
    setLongTermCache,
    getLongTermCache,
    healthCheck,
    getConnectionStatus,
    gracefulShutdown
};