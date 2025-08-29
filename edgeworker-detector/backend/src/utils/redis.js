import { createClient } from 'redis';

let redisClient = null;

async function connectRedis() {
    const url = process.env.REDIS_URL || 'redis://redis:6379';
    
    try {
        redisClient = createClient({ url });
        
        redisClient.on('error', (error) => {
            console.error('❌ Redis error:', error);
            global.redisConnected = false;
        });
        
        redisClient.on('connect', () => {
            console.log('✅ Connected to Redis');
            global.redisConnected = true;
        });
        
        redisClient.on('disconnect', () => {
            console.warn('⚠️  Redis disconnected');
            global.redisConnected = false;
        });
        
        await redisClient.connect();
        
    } catch (error) {
        console.error('❌ Failed to connect to Redis:', error);
        global.redisConnected = false;
        throw error;
    }
}

function getRedisClient() {
    if (!redisClient) {
        throw new Error('Redis not connected');
    }
    return redisClient;
}

export { connectRedis, getRedisClient };