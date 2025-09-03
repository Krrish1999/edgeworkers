// Environment Configuration Validation
const requiredEnvVars = [
    'INFLUXDB_URL',
    'INFLUXDB_TOKEN',
    'INFLUXDB_ORG',
    'INFLUXDB_BUCKET'
];

const optionalEnvVars = {
    NODE_ENV: 'development',
    PORT: '3001',
    MONGODB_URI: 'mongodb://admin:password123@localhost:27017/edgeworker?authSource=admin',
    REDIS_URL: 'redis://localhost:6379'
};

export const validateEnvironment = () => {
    const missing = [];
    const config = {};

    // Check required variables
    requiredEnvVars.forEach(varName => {
        if (!process.env[varName]) {
            missing.push(varName);
        } else {
            config[varName] = process.env[varName];
        }
    });

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Set optional variables with defaults
    Object.entries(optionalEnvVars).forEach(([varName, defaultValue]) => {
        config[varName] = process.env[varName] || defaultValue;
    });

    // Validate specific formats
    if (config.PORT && isNaN(parseInt(config.PORT))) {
        throw new Error('PORT must be a valid number');
    }

    if (!config.INFLUXDB_URL.startsWith('http')) {
        throw new Error('INFLUXDB_URL must be a valid HTTP URL');
    }

    console.log('✅ Environment configuration validated successfully');
    return config;
};

export default validateEnvironment;