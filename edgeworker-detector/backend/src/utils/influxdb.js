import { InfluxDB } from '@influxdata/influxdb-client';
import { HealthAPI } from '@influxdata/influxdb-client-apis';
import { circuitBreakerManager } from './circuitBreaker.js';

let influxClient = null;
let queryApi = null;
let writeApi = null;
let connectionState = 'disconnected'; // disconnected, connecting, connected, error
let lastConnectionAttempt = null;
let connectionRetryCount = 0;
let lastHealthCheck = null;
let connectionPool = new Map(); // For connection pooling

// Configuration constants
const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const QUERY_TIMEOUT = 30000; // 30 seconds
const HEALTH_CHECK_TIMEOUT = 10000; // 10 seconds
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute
const CONNECTION_POOL_SIZE = 3;

// Enhanced structured logging utility
function logConnectionEvent(level, message, metadata = {}) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        component: 'influxdb-client',
        message,
        connectionState,
        retryCount: connectionRetryCount,
        processId: process.pid,
        memoryUsage: process.memoryUsage().heapUsed,
        ...metadata
    };

    // Add performance context for slow operations
    if (metadata.executionTime > 5000) {
        logEntry.performance = 'slow';
    } else if (metadata.executionTime > 1000) {
        logEntry.performance = 'moderate';
    } else if (metadata.executionTime !== undefined) {
        logEntry.performance = 'fast';
    }

    const logString = JSON.stringify(logEntry);

    if (level === 'error') {
        console.error(`[INFLUXDB-ERROR] ${logString}`);
    } else if (level === 'warn') {
        console.warn(`[INFLUXDB-WARN] ${logString}`);
    } else if (level === 'debug') {
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG_INFLUXDB) {
            console.debug(`[INFLUXDB-DEBUG] ${logString}`);
        }
    } else {
        console.log(`[INFLUXDB-INFO] ${logString}`);
    }
}

// Calculate exponential backoff delay
function calculateBackoffDelay(attempt) {
    const delay = Math.min(BASE_RETRY_DELAY * Math.pow(2, attempt), MAX_RETRY_DELAY);
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
}

// Enhanced connection function with exponential backoff and circuit breaker
async function connectInfluxDB() {
    const url = process.env.INFLUXDB_URL || 'http://influxdb:8086';
    const token = process.env.INFLUXDB_TOKEN || 'your-super-secret-admin-token';
    const org = process.env.INFLUXDB_ORG || 'akamai';
    const bucket = process.env.INFLUXDB_BUCKET || 'edgeworker-metrics';

    // Prevent concurrent connection attempts
    if (connectionState === 'connecting') {
        logConnectionEvent('warn', 'Connection attempt already in progress, waiting...');
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (connectionState === 'connected') {
                    clearInterval(checkInterval);
                    resolve();
                } else if (connectionState === 'error') {
                    clearInterval(checkInterval);
                    reject(new Error('Concurrent connection attempt failed'));
                }
            }, 100);

            // Timeout after 60 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('Connection attempt timeout'));
            }, 60000);
        });
    }

    connectionState = 'connecting';
    lastConnectionAttempt = new Date();

    logConnectionEvent('info', 'Starting InfluxDB connection attempt', {
        url: url.replace(/\/\/.*@/, '//***@'), // Hide credentials in logs
        org,
        bucket,
        nodeEnv: process.env.NODE_ENV,
        previousState: connectionState
    });

    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
        connectionRetryCount = attempt + 1;
        const attemptStartTime = Date.now();

        try {
            logConnectionEvent('debug', `Connection attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS}`, {
                attemptStartTime: new Date(attemptStartTime).toISOString()
            });

            // Create client with enhanced configuration
            influxClient = new InfluxDB({
                url,
                token,
                timeout: HEALTH_CHECK_TIMEOUT,
                transportOptions: {
                    headers: {
                        'User-Agent': 'EdgeWorker-Detector/1.0'
                    }
                }
            });

            queryApi = influxClient.getQueryApi(org);
            writeApi = influxClient.getWriteApi(org, bucket);

            // Configure write API with error handling
            writeApi.useDefaultTags({ service: 'edgeworker-detector' });

            // Health check with timeout and detailed error handling
            const healthApi = new HealthAPI(influxClient);
            const healthCheckPromise = healthApi.getHealth();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Health check timeout after ${HEALTH_CHECK_TIMEOUT}ms`)), HEALTH_CHECK_TIMEOUT)
            );

            const health = await Promise.race([healthCheckPromise, timeoutPromise]);
            const connectionTime = Date.now() - attemptStartTime;

            if (health && health.status === 'pass') {
                connectionState = 'connected';
                global.influxConnected = true;
                connectionRetryCount = 0;
                lastHealthCheck = new Date();

                logConnectionEvent('info', 'Successfully connected to InfluxDB', {
                    healthStatus: health.status,
                    attemptNumber: attempt + 1,
                    connectionTime,
                    totalRetryTime: Date.now() - lastConnectionAttempt.getTime(),
                    influxVersion: health.version || 'unknown'
                });

                // Start periodic health checks
                startPeriodicHealthCheck();

                return;
            } else {
                throw new Error(`InfluxDB health check failed with status: ${health?.status || 'unknown'}`);
            }
        } catch (error) {
            const isLastAttempt = attempt === MAX_RETRY_ATTEMPTS - 1;
            const connectionTime = Date.now() - attemptStartTime;

            // Categorize error types for better handling
            const errorCategory = categorizeError(error);

            logConnectionEvent('error', `Connection attempt ${attempt + 1} failed`, {
                error: error.message,
                errorType: error.constructor.name,
                errorCategory,
                connectionTime,
                isLastAttempt,
                nextRetryIn: isLastAttempt ? null : calculateBackoffDelay(attempt),
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });

            if (isLastAttempt) {
                connectionState = 'error';
                global.influxConnected = false;

                const finalError = new Error(`Failed to connect to InfluxDB after ${MAX_RETRY_ATTEMPTS} attempts. Last error: ${error.message}`);
                finalError.category = errorCategory;
                finalError.originalError = error;

                logConnectionEvent('error', 'All connection attempts exhausted', {
                    totalAttempts: MAX_RETRY_ATTEMPTS,
                    totalRetryTime: Date.now() - lastConnectionAttempt.getTime(),
                    finalError: finalError.message,
                    errorCategory
                });

                throw finalError;
            }

            // Wait with exponential backoff before next attempt
            const delay = calculateBackoffDelay(attempt);
            logConnectionEvent('info', `Waiting ${delay}ms before next retry`, {
                backoffStrategy: 'exponential',
                jitterApplied: true
            });
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Categorize errors for better handling and monitoring
function categorizeError(error) {
    const message = error.message.toLowerCase();

    if (message.includes('econnrefused') || message.includes('enotfound')) {
        return 'network';
    } else if (message.includes('timeout')) {
        return 'timeout';
    } else if (message.includes('unauthorized') || message.includes('forbidden')) {
        return 'authentication';
    } else if (message.includes('health check')) {
        return 'health_check';
    } else {
        return 'unknown';
    }
}

// Periodic health check to maintain connection awareness
function startPeriodicHealthCheck() {
    // Clear any existing interval
    if (global.influxHealthCheckInterval) {
        clearInterval(global.influxHealthCheckInterval);
    }

    global.influxHealthCheckInterval = setInterval(async () => {
        try {
            const healthResult = await checkConnectionHealth();
            if (!healthResult.healthy) {
                logConnectionEvent('warn', 'Periodic health check failed, connection may be unstable', {
                    healthResult
                });
            }
        } catch (error) {
            logConnectionEvent('error', 'Periodic health check error', {
                error: error.message
            });
        }
    }, HEALTH_CHECK_INTERVAL);
}

// Enhanced query execution with circuit breaker, timeout, retry logic, and comprehensive performance logging
async function executeQuery(query, options = {}) {
    const startTime = Date.now();
    const queryId = Math.random().toString(36).substr(2, 9);
    const timeout = options.timeout || QUERY_TIMEOUT;
    const maxRetries = options.maxRetries || 2;
    const retryDelay = options.retryDelay || 1000;

    // Get circuit breaker for InfluxDB queries
    const circuitBreaker = circuitBreakerManager.getBreaker('influxdb-query', {
        failureThreshold: 5,
        resetTimeout: 30000, // 30 seconds
        monitoringPeriod: 60000 // 1 minute
    });

    // Execute query with circuit breaker protection
    return await circuitBreaker.execute(async () => {
        // Validate connection before executing query
        if (!queryApi || connectionState !== 'connected') {
            const error = new Error(`InfluxDB not connected - queryApi not available. Connection state: ${connectionState}`);
            logConnectionEvent('error', 'Query attempted on disconnected client', {
                queryId,
                connectionState,
                hasQueryApi: !!queryApi
            });
            throw error;
        }

        // Log query initiation with enhanced metadata
        logConnectionEvent('debug', 'Executing InfluxDB query', {
            queryId,
            queryLength: query.length,
            timeout,
            maxRetries,
            queryPreview: query.substring(0, 150) + (query.length > 150 ? '...' : ''),
            queryHash: hashQuery(query)
        });

        let lastError = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const attemptStartTime = Date.now();

            try {
                // Add attempt logging for retries
                if (attempt > 0) {
                    logConnectionEvent('info', `Query retry attempt ${attempt}/${maxRetries}`, {
                        queryId,
                        previousError: lastError?.message,
                        retryDelay: attempt > 0 ? retryDelay : 0
                    });

                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                }

                // Execute query with timeout
                const queryPromise = queryApi.collectRows(query);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout)
                );

                const result = await Promise.race([queryPromise, timeoutPromise]);
                const executionTime = Date.now() - startTime;
                const attemptTime = Date.now() - attemptStartTime;

                // Enhanced success logging with performance metrics
                logConnectionEvent('info', 'Query executed successfully', {
                    queryId,
                    executionTime,
                    attemptTime,
                    resultCount: result.length,
                    attemptNumber: attempt + 1,
                    performance: categorizePerformance(executionTime),
                    resultSize: JSON.stringify(result).length,
                    cacheHit: options.fromCache || false
                });

                // Track query performance for monitoring
                trackQueryPerformance(query, executionTime, result.length);

                return result;

            } catch (error) {
                const executionTime = Date.now() - startTime;
                const attemptTime = Date.now() - attemptStartTime;
                lastError = error;

                const errorCategory = categorizeQueryError(error);
                const isRetryable = isRetryableError(error);
                const isLastAttempt = attempt === maxRetries;

                logConnectionEvent('error', `Query execution failed (attempt ${attempt + 1}/${maxRetries + 1})`, {
                    queryId,
                    executionTime,
                    attemptTime,
                    error: error.message,
                    errorType: error.constructor.name,
                    errorCategory,
                    isTimeout: error.message.includes('timeout'),
                    isRetryable,
                    isLastAttempt,
                    willRetry: isRetryable && !isLastAttempt
                });

                // Handle connection errors
                if (errorCategory === 'connection') {
                    connectionState = 'error';
                    global.influxConnected = false;

                    logConnectionEvent('warn', 'Connection error detected, marking connection as unhealthy', {
                        queryId,
                        previousState: connectionState
                    });
                }

                // If this is the last attempt or error is not retryable, throw
                if (isLastAttempt || !isRetryable) {
                    const finalError = new Error(`Query failed after ${attempt + 1} attempts: ${error.message}`);
                    finalError.originalError = error;
                    finalError.category = errorCategory;
                    finalError.queryId = queryId;
                    finalError.totalExecutionTime = executionTime;

                    throw finalError;
                }
            }
        }
    });
}

// Categorize query performance for monitoring
function categorizePerformance(executionTime) {
    if (executionTime < 500) return 'excellent';
    if (executionTime < 1000) return 'good';
    if (executionTime < 3000) return 'acceptable';
    if (executionTime < 10000) return 'slow';
    return 'critical';
}

// Categorize query errors for better handling
function categorizeQueryError(error) {
    const message = error.message.toLowerCase();

    if (message.includes('econnrefused') || message.includes('enotfound') || message.includes('network')) {
        return 'connection';
    } else if (message.includes('timeout')) {
        return 'timeout';
    } else if (message.includes('syntax') || message.includes('parse')) {
        return 'syntax';
    } else if (message.includes('unauthorized') || message.includes('forbidden')) {
        return 'authorization';
    } else if (message.includes('not found') || message.includes('bucket')) {
        return 'resource';
    } else {
        return 'unknown';
    }
}

// Determine if an error is retryable
function isRetryableError(error) {
    const category = categorizeQueryError(error);
    return ['connection', 'timeout', 'unknown'].includes(category);
}

// Simple query hash for logging and caching
function hashQuery(query) {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
        const char = query.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
}

// Track query performance metrics
function trackQueryPerformance(query, executionTime, resultCount) {
    // Initialize performance tracking if not exists
    if (!global.influxQueryMetrics) {
        global.influxQueryMetrics = {
            totalQueries: 0,
            totalExecutionTime: 0,
            slowQueries: 0,
            failedQueries: 0,
            averageExecutionTime: 0
        };
    }

    const metrics = global.influxQueryMetrics;
    metrics.totalQueries++;
    metrics.totalExecutionTime += executionTime;
    metrics.averageExecutionTime = metrics.totalExecutionTime / metrics.totalQueries;

    if (executionTime > 5000) {
        metrics.slowQueries++;
    }

    // Log performance summary every 100 queries
    if (metrics.totalQueries % 100 === 0) {
        logConnectionEvent('info', 'Query performance summary', {
            totalQueries: metrics.totalQueries,
            averageExecutionTime: Math.round(metrics.averageExecutionTime),
            slowQueryPercentage: Math.round((metrics.slowQueries / metrics.totalQueries) * 100),
            failureRate: Math.round((metrics.failedQueries / metrics.totalQueries) * 100)
        });
    }
}

// Enhanced reconnection utility with circuit breaker pattern
async function ensureConnection() {
    const currentTime = Date.now();

    // Circuit breaker: if we've failed recently, don't retry immediately
    if (connectionState === 'error' && lastConnectionAttempt) {
        const timeSinceLastAttempt = currentTime - lastConnectionAttempt.getTime();
        const minRetryInterval = Math.min(BASE_RETRY_DELAY * Math.pow(2, connectionRetryCount), MAX_RETRY_DELAY);

        if (timeSinceLastAttempt < minRetryInterval) {
            const waitTime = minRetryInterval - timeSinceLastAttempt;
            logConnectionEvent('debug', 'Circuit breaker active, waiting before reconnection', {
                currentState: connectionState,
                timeSinceLastAttempt,
                waitTime,
                retryCount: connectionRetryCount
            });

            throw new Error(`Connection circuit breaker active. Retry in ${waitTime}ms`);
        }
    }

    if (connectionState !== 'connected' || !global.influxConnected) {
        logConnectionEvent('warn', 'Connection not healthy, attempting reconnection', {
            currentState: connectionState,
            globalConnected: global.influxConnected,
            lastHealthCheck: lastHealthCheck?.toISOString(),
            timeSinceLastCheck: lastHealthCheck ? currentTime - lastHealthCheck.getTime() : null
        });

        try {
            await connectInfluxDB();
            logConnectionEvent('info', 'Reconnection successful', {
                newState: connectionState,
                reconnectionTime: Date.now() - currentTime
            });
        } catch (error) {
            logConnectionEvent('error', 'Reconnection failed', {
                error: error.message,
                errorCategory: error.category || 'unknown',
                reconnectionTime: Date.now() - currentTime
            });
            throw error;
        }
    }
}

// Auto-reconnection with exponential backoff
async function autoReconnect() {
    if (connectionState === 'connecting') {
        return; // Already attempting to reconnect
    }

    logConnectionEvent('info', 'Starting auto-reconnection process', {
        currentState: connectionState,
        retryCount: connectionRetryCount
    });

    try {
        await ensureConnection();
    } catch (error) {
        const delay = calculateBackoffDelay(connectionRetryCount);
        logConnectionEvent('warn', `Auto-reconnection failed, scheduling retry in ${delay}ms`, {
            error: error.message,
            nextRetryIn: delay
        });

        setTimeout(() => {
            autoReconnect();
        }, delay);
    }
}



// Enhanced connection health check utility
async function checkConnectionHealth() {
    const startTime = Date.now();

    try {
        if (!influxClient) {
            logConnectionEvent('debug', 'Health check failed: no client instance');
            return {
                healthy: false,
                reason: 'No client instance',
                connectionState,
                checkDuration: Date.now() - startTime
            };
        }

        const healthApi = new HealthAPI(influxClient);
        const healthCheckPromise = healthApi.getHealth();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Health check timeout after ${HEALTH_CHECK_TIMEOUT}ms`)), HEALTH_CHECK_TIMEOUT)
        );

        const health = await Promise.race([healthCheckPromise, timeoutPromise]);
        const checkDuration = Date.now() - startTime;
        const isHealthy = health && health.status === 'pass';

        // Update connection state based on health check
        if (isHealthy) {
            if (connectionState !== 'connected') {
                logConnectionEvent('info', 'Connection restored via health check', {
                    previousState: connectionState,
                    checkDuration
                });
            }
            connectionState = 'connected';
            global.influxConnected = true;
            lastHealthCheck = new Date();
        } else {
            logConnectionEvent('warn', 'Health check indicates unhealthy connection', {
                healthStatus: health?.status,
                checkDuration
            });
            connectionState = 'error';
            global.influxConnected = false;
        }

        const result = {
            healthy: isHealthy,
            status: health?.status,
            version: health?.version,
            connectionState,
            checkDuration,
            lastCheck: new Date().toISOString(),
            message: health?.message
        };

        logConnectionEvent('debug', 'Health check completed', result);
        return result;

    } catch (error) {
        const checkDuration = Date.now() - startTime;
        const errorCategory = categorizeError(error);

        // Update connection state
        const previousState = connectionState;
        connectionState = 'error';
        global.influxConnected = false;

        logConnectionEvent('error', 'Health check failed with exception', {
            error: error.message,
            errorType: error.constructor.name,
            errorCategory,
            checkDuration,
            previousState
        });

        // Trigger auto-reconnection for certain error types
        if (['network', 'timeout'].includes(errorCategory)) {
            setTimeout(() => autoReconnect(), 5000);
        }

        return {
            healthy: false,
            reason: error.message,
            errorCategory,
            connectionState,
            checkDuration,
            lastCheck: new Date().toISOString()
        };
    }
}

// Enhanced connection status for comprehensive monitoring
function getConnectionStatus() {
    const currentTime = new Date();
    const circuitBreaker = circuitBreakerManager.getBreaker('influxdb-query');

    const status = {
        state: connectionState,
        connected: global.influxConnected,
        lastConnectionAttempt: lastConnectionAttempt?.toISOString(),
        lastHealthCheck: lastHealthCheck?.toISOString(),
        retryCount: connectionRetryCount,
        hasClient: !!influxClient,
        hasQueryApi: !!queryApi,
        hasWriteApi: !!writeApi,
        uptime: lastConnectionAttempt ? currentTime.getTime() - lastConnectionAttempt.getTime() : null,
        healthCheckInterval: HEALTH_CHECK_INTERVAL,
        queryMetrics: global.influxQueryMetrics || null,
        circuitBreaker: circuitBreaker.getStatus(),
        configuration: {
            maxRetryAttempts: MAX_RETRY_ATTEMPTS,
            baseRetryDelay: BASE_RETRY_DELAY,
            maxRetryDelay: MAX_RETRY_DELAY,
            queryTimeout: QUERY_TIMEOUT,
            healthCheckTimeout: HEALTH_CHECK_TIMEOUT
        }
    };

    return status;
}

// Graceful shutdown utility
async function gracefulShutdown() {
    logConnectionEvent('info', 'Starting graceful InfluxDB client shutdown');

    try {
        // Clear health check interval
        if (global.influxHealthCheckInterval) {
            clearInterval(global.influxHealthCheckInterval);
            global.influxHealthCheckInterval = null;
        }

        // Close write API
        if (writeApi) {
            await writeApi.close();
            logConnectionEvent('info', 'Write API closed successfully');
        }

        // Reset connection state
        connectionState = 'disconnected';
        global.influxConnected = false;
        influxClient = null;
        queryApi = null;
        writeApi = null;

        logConnectionEvent('info', 'InfluxDB client shutdown completed');

    } catch (error) {
        logConnectionEvent('error', 'Error during graceful shutdown', {
            error: error.message,
            errorType: error.constructor.name
        });
        throw error;
    }
}

// Initialize connection with retry on startup
async function initializeConnection() {
    logConnectionEvent('info', 'Initializing InfluxDB connection on startup');

    try {
        await connectInfluxDB();
        logConnectionEvent('info', 'InfluxDB connection initialized successfully');
    } catch (error) {
        logConnectionEvent('error', 'Failed to initialize InfluxDB connection', {
            error: error.message,
            willRetryAutomatically: true
        });

        // Start auto-reconnection process
        setTimeout(() => autoReconnect(), 5000);
    }
}

// Enhanced client getter with automatic reconnection
function getInfluxClient() {
    if (!influxClient || connectionState !== 'connected') {
        const error = new Error(`InfluxDB not available - connection state: ${connectionState}`);
        error.connectionState = connectionState;
        error.hasClient = !!influxClient;

        logConnectionEvent('error', 'Client requested but not available', {
            connectionState,
            hasClient: !!influxClient,
            globalConnected: global.influxConnected,
            lastHealthCheck: lastHealthCheck?.toISOString()
        });

        // Trigger auto-reconnection if not already in progress
        if (connectionState !== 'connecting') {
            setTimeout(() => autoReconnect(), 100);
        }

        throw error;
    }

    return {
        client: influxClient,
        queryApi,
        writeApi,
        executeQuery,
        ensureConnection,
        checkConnectionHealth,
        getConnectionStatus
    };
}

export {
    connectInfluxDB,
    getInfluxClient,
    executeQuery,
    ensureConnection,
    checkConnectionHealth,
    getConnectionStatus,
    gracefulShutdown,
    initializeConnection,
    autoReconnect
};

