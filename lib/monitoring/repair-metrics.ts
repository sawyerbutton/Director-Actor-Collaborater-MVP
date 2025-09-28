/**
 * Repair Service Metrics Collection
 * Epic-001 Story 3: Monitoring implementation
 */

interface MetricData {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

interface PerformanceMetrics {
  requestCount: number;
  successCount: number;
  failureCount: number;
  retryCount: number;
  totalLatency: number;
  latencies: number[];
  tokenUsage: number;
  errorTypes: Map<string, number>;
}

export class RepairMetricsCollector {
  private static instance: RepairMetricsCollector;
  private metrics: PerformanceMetrics;
  private metricsHistory: MetricData[] = [];
  private readonly maxHistorySize = 10000;

  private constructor() {
    this.metrics = this.initializeMetrics();
    this.startPeriodicFlush();
  }

  static getInstance(): RepairMetricsCollector {
    if (!RepairMetricsCollector.instance) {
      RepairMetricsCollector.instance = new RepairMetricsCollector();
    }
    return RepairMetricsCollector.instance;
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      retryCount: 0,
      totalLatency: 0,
      latencies: [],
      tokenUsage: 0,
      errorTypes: new Map()
    };
  }

  /**
   * Record a repair request
   */
  recordRequest(): void {
    this.metrics.requestCount++;
    this.addMetric('repair_requests_total', 1);
  }

  /**
   * Record a successful repair
   */
  recordSuccess(latency: number, tokensUsed: number = 0): void {
    this.metrics.successCount++;
    this.metrics.totalLatency += latency;
    this.metrics.latencies.push(latency);
    this.metrics.tokenUsage += tokensUsed;

    this.addMetric('repair_success_total', 1);
    this.addMetric('repair_latency_ms', latency);
    this.addMetric('tokens_used', tokensUsed);

    // Keep latencies array bounded
    if (this.metrics.latencies.length > 1000) {
      this.metrics.latencies = this.metrics.latencies.slice(-1000);
    }
  }

  /**
   * Record a failed repair
   */
  recordFailure(errorType: string, latency: number): void {
    this.metrics.failureCount++;
    this.metrics.totalLatency += latency;
    this.metrics.latencies.push(latency);

    // Track error types
    const currentCount = this.metrics.errorTypes.get(errorType) || 0;
    this.metrics.errorTypes.set(errorType, currentCount + 1);

    this.addMetric('repair_failure_total', 1, { error_type: errorType });
    this.addMetric('repair_latency_ms', latency, { status: 'failed' });
  }

  /**
   * Record a retry attempt
   */
  recordRetry(attemptNumber: number, errorType: string): void {
    this.metrics.retryCount++;
    this.addMetric('repair_retry_total', 1, {
      attempt: attemptNumber.toString(),
      error_type: errorType
    });
  }

  /**
   * Get current metrics summary
   */
  getMetricsSummary(): {
    successRate: number;
    averageLatency: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    requestsPerMinute: number;
    tokensPerRequest: number;
    topErrors: Array<{ type: string; count: number }>;
  } {
    const successRate = this.metrics.requestCount > 0
      ? (this.metrics.successCount / this.metrics.requestCount) * 100
      : 0;

    const averageLatency = this.metrics.latencies.length > 0
      ? this.metrics.totalLatency / this.metrics.latencies.length
      : 0;

    // Calculate percentiles
    const sortedLatencies = [...this.metrics.latencies].sort((a, b) => a - b);
    const p50Latency = this.getPercentile(sortedLatencies, 50);
    const p95Latency = this.getPercentile(sortedLatencies, 95);
    const p99Latency = this.getPercentile(sortedLatencies, 99);

    // Calculate requests per minute (based on last minute of data)
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentRequests = this.metricsHistory.filter(
      m => m.timestamp > oneMinuteAgo && m.labels?.metric === 'repair_requests_total'
    ).length;

    const tokensPerRequest = this.metrics.requestCount > 0
      ? this.metrics.tokenUsage / this.metrics.requestCount
      : 0;

    // Get top error types
    const topErrors = Array.from(this.metrics.errorTypes.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      successRate,
      averageLatency,
      p50Latency,
      p95Latency,
      p99Latency,
      requestsPerMinute: recentRequests,
      tokensPerRequest,
      topErrors
    };
  }

  /**
   * Get metrics for monitoring endpoint
   */
  getPrometheusMetrics(): string {
    const summary = this.getMetricsSummary();
    const timestamp = Date.now();

    return `
# HELP repair_success_rate The success rate of repair requests
# TYPE repair_success_rate gauge
repair_success_rate ${summary.successRate.toFixed(2)} ${timestamp}

# HELP repair_latency_p50 The 50th percentile latency in milliseconds
# TYPE repair_latency_p50 gauge
repair_latency_p50 ${summary.p50Latency.toFixed(2)} ${timestamp}

# HELP repair_latency_p95 The 95th percentile latency in milliseconds
# TYPE repair_latency_p95 gauge
repair_latency_p95 ${summary.p95Latency.toFixed(2)} ${timestamp}

# HELP repair_latency_p99 The 99th percentile latency in milliseconds
# TYPE repair_latency_p99 gauge
repair_latency_p99 ${summary.p99Latency.toFixed(2)} ${timestamp}

# HELP repair_requests_total Total number of repair requests
# TYPE repair_requests_total counter
repair_requests_total ${this.metrics.requestCount} ${timestamp}

# HELP repair_success_total Total number of successful repairs
# TYPE repair_success_total counter
repair_success_total ${this.metrics.successCount} ${timestamp}

# HELP repair_failure_total Total number of failed repairs
# TYPE repair_failure_total counter
repair_failure_total ${this.metrics.failureCount} ${timestamp}

# HELP repair_retry_total Total number of retry attempts
# TYPE repair_retry_total counter
repair_retry_total ${this.metrics.retryCount} ${timestamp}

# HELP deepseek_tokens_used Total tokens used by DeepSeek API
# TYPE deepseek_tokens_used counter
deepseek_tokens_used ${this.metrics.tokenUsage} ${timestamp}

# HELP repair_requests_per_minute Repair requests in the last minute
# TYPE repair_requests_per_minute gauge
repair_requests_per_minute ${summary.requestsPerMinute} ${timestamp}
`.trim();
  }

  /**
   * Check if alerts should be triggered
   */
  checkAlerts(): Array<{ alert: string; message: string; severity: string }> {
    const alerts: Array<{ alert: string; message: string; severity: string }> = [];
    const summary = this.getMetricsSummary();

    // Check failure rate
    if (summary.successRate < 95) {
      alerts.push({
        alert: 'repair_failure_rate_high',
        message: `Repair success rate is ${summary.successRate.toFixed(2)}% (below 95% threshold)`,
        severity: 'critical'
      });
    }

    // Check response time
    if (summary.p95Latency > 5000) {
      alerts.push({
        alert: 'repair_response_time_slow',
        message: `P95 latency is ${summary.p95Latency.toFixed(0)}ms (above 5000ms threshold)`,
        severity: 'warning'
      });
    }

    // Check retry exhaustion
    const recentRetries = this.metricsHistory.filter(
      m => m.timestamp > Date.now() - 3600000 && m.labels?.metric === 'repair_retry_total'
    ).length;

    if (recentRetries > 10) {
      alerts.push({
        alert: 'repair_retry_exhausted',
        message: `${recentRetries} retries in the last hour (above 10/hour threshold)`,
        severity: 'warning'
      });
    }

    return alerts;
  }

  /**
   * Reset metrics (for testing)
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.metricsHistory = [];
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  private addMetric(name: string, value: number, labels?: Record<string, string>): void {
    const metric: MetricData = {
      timestamp: Date.now(),
      value,
      labels: { ...labels, metric: name }
    };

    this.metricsHistory.push(metric);

    // Keep history bounded
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
    }
  }

  private startPeriodicFlush(): void {
    // Flush metrics to external service every minute
    setInterval(() => {
      this.flushMetrics();
    }, 60000);
  }

  private async flushMetrics(): Promise<void> {
    // In production, this would send metrics to a monitoring service
    // For now, just log a summary
    if (process.env.NODE_ENV !== 'test') {
      const summary = this.getMetricsSummary();
      console.log('[Metrics]', JSON.stringify(summary));
    }
  }
}

// Export singleton instance
export const metricsCollector = RepairMetricsCollector.getInstance();