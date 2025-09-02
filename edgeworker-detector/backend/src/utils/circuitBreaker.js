/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascade failures by monitoring failure rates and temporarily blocking requests
 * when failure threshold is exceeded.
 */

class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 5; // Number of failures before opening
        this.resetTimeout = options.resetTimeout || 60000; // Time in ms before attempting reset
        this.monitoringPeriod = options.monitoringPeriod || 60000; // Time window for failure counting
        this.name = options.name || 'default';
        
        // Circuit states: CLOSED, OPEN, HALF_OPEN
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.nextAttemptTime = null;
        this.successCount = 0;
        this.totalRequests = 0;
        
        // Metrics for monitoring
        this.metrics = {
            totalRequests: 0,
            totalFailures: 0,
            totalSuccesses: 0,
            stateChanges: 0,
            lastStateChange: null,
            averageResponseTime: 0,
            totalResponseTime: 0
        };
        
        this.log('Circuit breaker initialized', {
            failureThreshold: this.failureThreshold,
            resetTimeout: this.resetTimeout,
            monitoringPeriod: this.monitoringPeriod
        });
    }
    
    /**
     * Execute a function with circuit breaker protection
     * @param {Function} fn - The function to execute
     * @param {Object} options - Execution options
     * @returns {Promise} - Result of function execution or circuit breaker error
     */
    async execute(fn, options = {}) {
        const startTime = Date.now();
        this.totalRequests++;
        this.metrics.totalRequests++;
        
        // Check if circuit is open
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttemptTime) {
                const error = new Error(`Circuit breaker is OPEN for ${this.name}. Next attempt in ${this.nextAttemptTime - Date.now()}ms`);
                error.circuitBreakerState = 'OPEN';
                error.nextAttemptTime = this.nextAttemptTime;
                
                this.log('Request blocked - circuit is OPEN', {
                    nextAttemptIn: this.nextAttemptTime - Date.now(),
                    failureCount: this.failureCount
                });
                
                throw error;
            } else {
                // Transition to HALF_OPEN state
                this.setState('HALF_OPEN');
                this.log('Transitioning to HALF_OPEN state for test request');
            }
        }
        
        try {
            const result = await fn();
            const responseTime = Date.now() - startTime;
            
            this.onSuccess(responseTime);
            return result;
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.onFailure(error, responseTime);
            throw error;
        }
    }
    
    /**
     * Handle successful execution
     * @param {number} responseTime - Response time in milliseconds
     */
    onSuccess(responseTime) {
        this.successCount++;
        this.metrics.totalSuccesses++;
        this.metrics.totalResponseTime += responseTime;
        this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.totalRequests;
        
        // Reset failure count on success
        this.failureCount = 0;
        this.lastFailureTime = null;
        
        // If we're in HALF_OPEN state and got a success, close the circuit
        if (this.state === 'HALF_OPEN') {
            this.setState('CLOSED');
            this.log('Circuit closed after successful test request', {
                responseTime,
                successCount: this.successCount
            });
        }
        
        this.log('Request succeeded', {
            responseTime,
            state: this.state,
            successCount: this.successCount
        });
    }
    
    /**
     * Handle failed execution
     * @param {Error} error - The error that occurred
     * @param {number} responseTime - Response time in milliseconds
     */
    onFailure(error, responseTime) {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        this.metrics.totalFailures++;
        this.metrics.totalResponseTime += responseTime;
        this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.totalRequests;
        
        this.log('Request failed', {
            error: error.message,
            errorType: error.constructor.name,
            responseTime,
            failureCount: this.failureCount,
            state: this.state
        });
        
        // Check if we should open the circuit
        if (this.shouldOpenCircuit()) {
            this.setState('OPEN');
            this.nextAttemptTime = Date.now() + this.resetTimeout;
            
            this.log('Circuit opened due to failure threshold exceeded', {
                failureThreshold: this.failureThreshold,
                currentFailures: this.failureCount,
                nextAttemptTime: new Date(this.nextAttemptTime).toISOString()
            });
        }
    }
    
    /**
     * Determine if circuit should be opened based on failure count and timing
     * @returns {boolean} - True if circuit should be opened
     */
    shouldOpenCircuit() {
        if (this.state === 'OPEN') {
            return false; // Already open
        }
        
        // Open if we've exceeded the failure threshold
        if (this.failureCount >= this.failureThreshold) {
            return true;
        }
        
        // Check if failures are within the monitoring period
        if (this.lastFailureTime && this.monitoringPeriod > 0) {
            const timeSinceLastFailure = Date.now() - this.lastFailureTime;
            if (timeSinceLastFailure > this.monitoringPeriod) {
                // Reset failure count if outside monitoring period
                this.failureCount = 0;
                this.log('Failure count reset - outside monitoring period', {
                    timeSinceLastFailure,
                    monitoringPeriod: this.monitoringPeriod
                });
                return false;
            }
        }
        
        return false;
    }
    
    /**
     * Set circuit breaker state and update metrics
     * @param {string} newState - New state (CLOSED, OPEN, HALF_OPEN)
     */
    setState(newState) {
        const previousState = this.state;
        this.state = newState;
        this.metrics.stateChanges++;
        this.metrics.lastStateChange = new Date().toISOString();
        
        this.log('State changed', {
            previousState,
            newState,
            stateChanges: this.metrics.stateChanges
        });
    }
    
    /**
     * Get current circuit breaker status and metrics
     * @returns {Object} - Status and metrics
     */
    getStatus() {
        return {
            name: this.name,
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            totalRequests: this.totalRequests,
            lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
            nextAttemptTime: this.nextAttemptTime ? new Date(this.nextAttemptTime).toISOString() : null,
            configuration: {
                failureThreshold: this.failureThreshold,
                resetTimeout: this.resetTimeout,
                monitoringPeriod: this.monitoringPeriod
            },
            metrics: {
                ...this.metrics,
                failureRate: this.metrics.totalRequests > 0 ? 
                    (this.metrics.totalFailures / this.metrics.totalRequests * 100).toFixed(2) + '%' : '0%',
                successRate: this.metrics.totalRequests > 0 ? 
                    (this.metrics.totalSuccesses / this.metrics.totalRequests * 100).toFixed(2) + '%' : '0%'
            }
        };
    }
    
    /**
     * Reset circuit breaker to initial state
     */
    reset() {
        this.log('Circuit breaker manually reset');
        
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.totalRequests = 0;
        this.lastFailureTime = null;
        this.nextAttemptTime = null;
        
        // Keep historical metrics but reset counters
        this.metrics.stateChanges++;
        this.metrics.lastStateChange = new Date().toISOString();
    }
    
    /**
     * Force circuit to open (for testing or manual intervention)
     */
    forceOpen() {
        this.log('Circuit breaker manually forced open');
        this.setState('OPEN');
        this.nextAttemptTime = Date.now() + this.resetTimeout;
    }
    
    /**
     * Force circuit to close (for testing or manual intervention)
     */
    forceClose() {
        this.log('Circuit breaker manually forced closed');
        this.setState('CLOSED');
        this.failureCount = 0;
        this.nextAttemptTime = null;
    }
    
    /**
     * Log circuit breaker events with structured format
     * @param {string} message - Log message
     * @param {Object} metadata - Additional metadata
     */
    log(message, metadata = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            component: 'circuit-breaker',
            name: this.name,
            message,
            state: this.state,
            ...metadata
        };
        
        const logString = JSON.stringify(logEntry);
        
        if (message.includes('failed') || message.includes('opened') || message.includes('blocked')) {
            console.warn(`[CIRCUIT-BREAKER-WARN] ${logString}`);
        } else if (message.includes('error')) {
            console.error(`[CIRCUIT-BREAKER-ERROR] ${logString}`);
        } else {
            console.log(`[CIRCUIT-BREAKER-INFO] ${logString}`);
        }
    }
}

/**
 * Circuit Breaker Manager - manages multiple circuit breakers
 */
class CircuitBreakerManager {
    constructor() {
        this.breakers = new Map();
    }
    
    /**
     * Get or create a circuit breaker
     * @param {string} name - Circuit breaker name
     * @param {Object} options - Configuration options
     * @returns {CircuitBreaker} - Circuit breaker instance
     */
    getBreaker(name, options = {}) {
        if (!this.breakers.has(name)) {
            this.breakers.set(name, new CircuitBreaker({ ...options, name }));
        }
        return this.breakers.get(name);
    }
    
    /**
     * Get status of all circuit breakers
     * @returns {Object} - Status of all breakers
     */
    getAllStatus() {
        const status = {};
        for (const [name, breaker] of this.breakers) {
            status[name] = breaker.getStatus();
        }
        return status;
    }
    
    /**
     * Reset all circuit breakers
     */
    resetAll() {
        for (const breaker of this.breakers.values()) {
            breaker.reset();
        }
    }
}

// Global circuit breaker manager instance
const circuitBreakerManager = new CircuitBreakerManager();

export { CircuitBreaker, CircuitBreakerManager, circuitBreakerManager };