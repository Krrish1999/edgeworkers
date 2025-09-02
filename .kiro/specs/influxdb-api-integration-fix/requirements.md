# Requirements Document

## Introduction

The EdgeWorker monitoring system has a data generator (`generator.py`) that creates mock metrics and writes them to InfluxDB every 10 seconds. However, the backend APIs may not be returning dynamically updated metrics data, suggesting there are integration gaps between the data generator, InfluxDB, and the API endpoints that need to be identified and resolved.

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want the backend APIs to return real-time metrics data from InfluxDB, so that the dashboard displays current EdgeWorker performance information.

#### Acceptance Criteria

1. WHEN the data generator writes new metrics to InfluxDB THEN the dashboard APIs SHALL return the updated data within 30 seconds
2. WHEN querying `/api/dashboard/overview` THEN the system SHALL return current metrics calculated from InfluxDB data
3. WHEN querying `/api/dashboard/heatmap` THEN the system SHALL return current PoP status based on recent InfluxDB metrics
4. WHEN querying `/api/dashboard/timeseries` THEN the system SHALL return time-series data from InfluxDB for the specified time range

### Requirement 2

**User Story:** As a developer, I want proper error handling and logging for InfluxDB connectivity issues, so that I can quickly identify and resolve integration problems.

#### Acceptance Criteria

1. WHEN InfluxDB is unavailable THEN the system SHALL return appropriate error responses with 500 status codes
2. WHEN InfluxDB queries fail THEN the system SHALL log detailed error information for debugging
3. WHEN InfluxDB connection is lost THEN the system SHALL attempt to reconnect automatically
4. WHEN InfluxDB queries timeout THEN the system SHALL handle the timeout gracefully and return error responses

### Requirement 3

**User Story:** As a monitoring operator, I want the WebSocket real-time updates to reflect current InfluxDB data, so that the dashboard shows live performance metrics.

#### Acceptance Criteria

1. WHEN new metrics are written to InfluxDB THEN WebSocket clients SHALL receive updated overview metrics within 10 seconds
2. WHEN a PoP experiences performance regression THEN WebSocket clients SHALL receive updated regression counts
3. WHEN WebSocket broadcasts fail THEN the system SHALL log errors and continue attempting to broadcast
4. WHEN no WebSocket clients are connected THEN the system SHALL skip unnecessary InfluxDB queries to optimize performance

### Requirement 4

**User Story:** As a system integrator, I want consistent data formatting between the generator and API responses, so that the frontend can properly display metrics.

#### Acceptance Criteria

1. WHEN the generator writes metrics with specific field names THEN the APIs SHALL query using the same field names
2. WHEN the generator uses specific measurement names THEN the APIs SHALL filter by the same measurement names
3. WHEN the generator writes timestamp data THEN the APIs SHALL return timestamps in consistent format
4. WHEN the generator writes PoP metadata THEN the APIs SHALL return the same metadata fields (city, country, tier, etc.)

### Requirement 5

**User Story:** As a performance analyst, I want the alert system to detect regressions based on real InfluxDB data, so that alerts reflect actual performance issues.

#### Acceptance Criteria

1. WHEN cold start times exceed thresholds in InfluxDB THEN the system SHALL create alerts in MongoDB
2. WHEN performance returns to normal levels THEN the system SHALL automatically resolve related alerts
3. WHEN querying alert statistics THEN the system SHALL correlate MongoDB alerts with current InfluxDB metrics
4. WHEN regression detection runs THEN the system SHALL use recent InfluxDB data to determine PoP health status