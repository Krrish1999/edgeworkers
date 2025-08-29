import { InfluxDB } from '@influxdata/influxdb-client';
// FIX: Switched from PingAPI to the more robust HealthAPI
import { HealthAPI } from '@influxdata/influxdb-client-apis';

let influxClient = null;
let queryApi = null;
let writeApi = null;

// Implement a retry mechanism for the connection
async function connectInfluxDB() {
    const url = process.env.INFLUXDB_URL || 'http://influxdb:8086';
    const token = process.env.INFLUXDB_TOKEN || 'your-super-secret-admin-token';
    const org = process.env.INFLUXDB_ORG || 'akamai';
    const bucket = process.env.INFLUXDB_BUCKET || 'edgeworker-metrics';

    // Retry connection up to 5 times
    for (let i = 0; i < 5; i++) {
        try {
            influxClient = new InfluxDB({ url, token });
            queryApi = influxClient.getQueryApi(org);
            writeApi = influxClient.getWriteApi(org, bucket);
            
            // FIX: Use the HealthAPI for a more reliable readiness check
            const healthApi = new HealthAPI(influxClient);
            const health = await healthApi.getHealth();

            if (health && health.status === 'pass') {
                console.log('✅ Connected to InfluxDB');
                global.influxConnected = true;
                return; // Exit the function on successful connection
            } else {
                throw new Error(`InfluxDB health check returned status: ${health.status}`);
            }
        } catch (error) {
            // Log the specific error message from the client
            console.error(`❌ Attempt ${i + 1} to connect to InfluxDB failed. Reason: ${error.message}`);
            // Wait for 5 seconds before the next attempt
            if (i < 4) {
                 console.log(`Retrying in 5 seconds...`);
                 await new Promise(res => setTimeout(res, 5000));
            }
        }
    }
    
    // If all retries fail, throw the final error
    const finalError = new Error('Failed to connect to InfluxDB after multiple retries.');
    console.error('❌', finalError.message);
    global.influxConnected = false;
    throw finalError;
}

function getInfluxClient() {
    if (!influxClient) {
        throw new Error('InfluxDB not connected');
    }
    return { client: influxClient, queryApi, writeApi };
}

export { connectInfluxDB, getInfluxClient };

