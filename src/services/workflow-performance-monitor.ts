/**
 * WorkflowPerformanceMonitor - Handles performance monitoring and cleanup for workflow executions
 */

import type { Logger, WorkflowExecutionMetrics } from '../types/index.js';
import { createMCPLogger } from '../utils/logger.js';

/**
 * Aggregated performance statistics
 */
export interface PerformanceStats {
  // Execution counts
  totalExecutions: number;
  runningExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  timeoutExecutions: number;

  // Timing statistics
  averageDuration: number;
  minDuration: number;
  maxDuration: number;

  // Resource statistics
  averageMemoryUsage: number;
  peakMemoryUsage: number;
  averageCpuUsage: number;
  peakCpuUsage: number;

  // API statistics
  totalApiCalls: number;
  averageApiTime: number;

  // Error statistics
  totalErrors: number;
  errorRate: number;

  // Time window
  windowStart: number;
  windowEnd: number;
}

/**
 * Configuration for performance monitoring
 */
export interface PerformanceMonitorConfig {
  enabled: boolean;
  metricsRetentionTime: number;    // How long to keep metrics (ms)
  cleanupInterval: number;         // How often to run cleanup (ms)
  maxConcurrentExecutions: number; // Resource limit
  executionTimeout: number;        // Timeout for executions (ms)
  memoryThreshold: number;         // Memory usage threshold (MB)
  cpuThreshold: number;            // CPU usage threshold (%)
}

/**
 * Resource usage information
 */
interface ResourceUsage {
  memoryUsage: number;  // MB
  cpuUsage: number;     // Percentage
  timestamp: number;
}

/**
 * Service for monitoring workflow performance and managing resources
 */
export class WorkflowPerformanceMonitor {
  private logger: Logger;
  private config: PerformanceMonitorConfig;

  // Metrics storage
  private executionMetrics: Map<string, WorkflowExecutionMetrics> = new Map();
  private resourceHistory: ResourceUsage[] = [];

  // Cleanup and monitoring
  private cleanupTimer: NodeJS.Timeout | undefined;
  private resourceMonitorTimer: NodeJS.Timeout | undefined;

  // Performance counters
  private totalExecutions: number = 0;
  private totalApiCalls: number = 0;
  private totalErrors: number = 0;

  constructor(logger: Logger, config: PerformanceMonitorConfig) {
    // Ensure we use an MCP-safe logger to prevent JSON-RPC protocol interference
    // Create a child logger with MCP-safe configuration
    this.logger = createMCPLogger({
      context: 'WorkflowPerformanceMonitor',
      level: logger ? (logger as any).config?.level : undefined
    });
    this.config = config;

    if (config.enabled) {
      this.startMonitoring();
    }
  }

  /**
   * Start tracking a new workflow execution
   */
  startExecution(
    workflowId: string,
    workflowInstanceId: string,
    correlationId?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enabled) return;

    const executionKey = this.getExecutionKey(workflowId, workflowInstanceId);
    const startTime = Date.now();

    const metrics: WorkflowExecutionMetrics = {
      workflowId,
      workflowInstanceId,
      correlationId,
      startTime,
      status: 'RUNNING',
      apiCallCount: 0,
      totalApiTime: 0,
      errorCount: 0,
      metadata
    };

    this.executionMetrics.set(executionKey, metrics);
    this.totalExecutions++;

    this.logger.debug(
      `Started tracking execution: ${executionKey} (total: ${this.totalExecutions})`
    );

    // Check resource limits
    this.checkResourceLimits();
  }

  /**
   * Update execution status
   */
  updateExecutionStatus(
    workflowId: string,
    workflowInstanceId: string,
    status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT',
    error?: string
  ): void {
    if (!this.config.enabled) return;

    const executionKey = this.getExecutionKey(workflowId, workflowInstanceId);
    const metrics = this.executionMetrics.get(executionKey);

    if (!metrics) {
      this.logger.warn(`No metrics found for execution: ${executionKey}`);
      return;
    }

    metrics.status = status;

    if (status !== 'RUNNING') {
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
    }

    if (error) {
      metrics.errorCount++;
      metrics.lastError = error;
      this.totalErrors++;
    }

    this.logger.debug(
      `Updated execution status: ${executionKey} -> ${status}${error ? ` (error: ${error})` : ''}`
    );
  }

  /**
   * Record an API call for performance tracking
   */
  recordApiCall(
    workflowId: string,
    workflowInstanceId: string,
    duration: number,
    success: boolean,
    error?: string
  ): void {
    if (!this.config.enabled) return;

    const executionKey = this.getExecutionKey(workflowId, workflowInstanceId);
    const metrics = this.executionMetrics.get(executionKey);

    if (!metrics) {
      this.logger.warn(`No metrics found for API call: ${executionKey}`);
      return;
    }

    metrics.apiCallCount++;
    metrics.totalApiTime += duration;
    this.totalApiCalls++;

    if (!success && error) {
      metrics.errorCount++;
      metrics.lastError = error;
      this.totalErrors++;
    }

    this.logger.debug(
      `Recorded API call: ${executionKey} (${duration}ms, success: ${success})`
    );
  }

  /**
   * Complete execution tracking
   */
  completeExecution(
    workflowId: string,
    workflowInstanceId: string,
    finalStatus: 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT',
    error?: string
  ): WorkflowExecutionMetrics | undefined {
    if (!this.config.enabled) return undefined;

    const executionKey = this.getExecutionKey(workflowId, workflowInstanceId);
    const metrics = this.executionMetrics.get(executionKey);

    if (!metrics) {
      this.logger.warn(`No metrics found for completion: ${executionKey}`);
      return undefined;
    }

    this.updateExecutionStatus(workflowId, workflowInstanceId, finalStatus, error);

    this.logger.info(
      `Completed execution tracking: ${executionKey} (${finalStatus}, duration: ${metrics.duration}ms)`
    );

    return { ...metrics };
  }

  /**
   * Get metrics for a specific execution
   */
  getExecutionMetrics(workflowId: string, workflowInstanceId: string): WorkflowExecutionMetrics | undefined {
    const executionKey = this.getExecutionKey(workflowId, workflowInstanceId);
    return this.executionMetrics.get(executionKey);
  }

  /**
   * Get aggregated performance statistics
   */
  getPerformanceStats(windowMs?: number): PerformanceStats {
    const now = Date.now();
    const windowStart = windowMs ? now - windowMs : 0;

    // Filter metrics within the time window
    const relevantMetrics = Array.from(this.executionMetrics.values())
      .filter(m => m.startTime >= windowStart);

    if (relevantMetrics.length === 0) {
      return this.getEmptyStats(windowStart, now);
    }

    // Calculate statistics
    const completedMetrics = relevantMetrics.filter(m => m.duration !== undefined);
    const durations = completedMetrics.map(m => m.duration!);
    const memoryUsages = relevantMetrics.map(m => m.memoryUsage || 0).filter(m => m > 0);
    const cpuUsages = relevantMetrics.map(m => m.cpuUsage || 0).filter(c => c > 0);

    return {
      // Execution counts
      totalExecutions: relevantMetrics.length,
      runningExecutions: relevantMetrics.filter(m => m.status === 'RUNNING').length,
      completedExecutions: relevantMetrics.filter(m => m.status === 'COMPLETED').length,
      failedExecutions: relevantMetrics.filter(m => m.status === 'FAILED').length,
      timeoutExecutions: relevantMetrics.filter(m => m.status === 'TIMEOUT').length,

      // Timing statistics
      averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,

      // Resource statistics
      averageMemoryUsage: memoryUsages.length > 0 ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length : 0,
      peakMemoryUsage: memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0,
      averageCpuUsage: cpuUsages.length > 0 ? cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length : 0,
      peakCpuUsage: cpuUsages.length > 0 ? Math.max(...cpuUsages) : 0,

      // API statistics
      totalApiCalls: relevantMetrics.reduce((sum, m) => sum + m.apiCallCount, 0),
      averageApiTime: relevantMetrics.length > 0 ?
        relevantMetrics.reduce((sum, m) => sum + m.totalApiTime, 0) /
        relevantMetrics.reduce((sum, m) => sum + m.apiCallCount, 0) : 0,

      // Error statistics
      totalErrors: relevantMetrics.reduce((sum, m) => sum + m.errorCount, 0),
      errorRate: relevantMetrics.length > 0 ?
        relevantMetrics.filter(m => m.errorCount > 0).length / relevantMetrics.length : 0,

      // Time window
      windowStart,
      windowEnd: now
    };
  }

  /**
   * Get current resource usage
   */
  getCurrentResourceUsage(): ResourceUsage {
    const memoryUsage = this.getMemoryUsage();
    const cpuUsage = this.getCpuUsage();

    return {
      memoryUsage,
      cpuUsage,
      timestamp: Date.now()
    };
  }

  /**
   * Check if resource limits are exceeded
   */
  checkResourceLimits(): {
    memoryExceeded: boolean;
    cpuExceeded: boolean;
    concurrencyExceeded: boolean;
  } {
    const currentUsage = this.getCurrentResourceUsage();
    const runningExecutions = Array.from(this.executionMetrics.values())
      .filter(m => m.status === 'RUNNING').length;

    const memoryExceeded = currentUsage.memoryUsage > this.config.memoryThreshold;
    const cpuExceeded = currentUsage.cpuUsage > this.config.cpuThreshold;
    const concurrencyExceeded = runningExecutions >= this.config.maxConcurrentExecutions;

    if (memoryExceeded || cpuExceeded || concurrencyExceeded) {
      this.logger.warn('Resource limits exceeded:', {
        memoryUsage: currentUsage.memoryUsage,
        memoryThreshold: this.config.memoryThreshold,
        memoryExceeded,
        cpuUsage: currentUsage.cpuUsage,
        cpuThreshold: this.config.cpuThreshold,
        cpuExceeded,
        runningExecutions,
        maxConcurrentExecutions: this.config.maxConcurrentExecutions,
        concurrencyExceeded
      });
    }

    return { memoryExceeded, cpuExceeded, concurrencyExceeded };
  }

  /**
   * Clean up old metrics and completed executions
   */
  cleanupOldMetrics(): void {
    if (!this.config.enabled) return;

    const now = Date.now();
    const cutoffTime = now - this.config.metricsRetentionTime;
    const keysToDelete: string[] = [];

    for (const [key, metrics] of Array.from(this.executionMetrics.entries())) {
      // Clean up completed executions older than retention time
      const isCompleted = metrics.status !== 'RUNNING';
      const isOld = metrics.startTime < cutoffTime;

      if (isCompleted && isOld) {
        keysToDelete.push(key);
      }
    }

    // Remove old metrics
    keysToDelete.forEach(key => {
      this.executionMetrics.delete(key);
    });

    // Clean up resource history
    this.resourceHistory = this.resourceHistory.filter(r => r.timestamp >= cutoffTime);

    if (keysToDelete.length > 0) {
      this.logger.info(`Cleaned up ${keysToDelete.length} old execution metrics`);
    }
  }

  /**
   * Force timeout for long-running executions
   */
  enforceExecutionTimeouts(): void {
    if (!this.config.enabled) return;

    const now = Date.now();
    const timeoutThreshold = now - this.config.executionTimeout;
    const timedOutExecutions: string[] = [];

    for (const [key, metrics] of Array.from(this.executionMetrics.entries())) {
      if (metrics.status === 'RUNNING' && metrics.startTime < timeoutThreshold) {
        this.updateExecutionStatus(
          metrics.workflowId,
          metrics.workflowInstanceId,
          'TIMEOUT',
          `Execution timeout after ${this.config.executionTimeout}ms`
        );
        timedOutExecutions.push(key);
      }
    }

    if (timedOutExecutions.length > 0) {
      this.logger.warn(`Timed out ${timedOutExecutions.length} long-running executions`);
    }
  }

  /**
   * Get all execution metrics (for testing/debugging)
   */
  getAllMetrics(): WorkflowExecutionMetrics[] {
    return Array.from(this.executionMetrics.values());
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    enabled: boolean;
    totalExecutions: number;
    activeExecutions: number;
    totalApiCalls: number;
    totalErrors: number;
    metricsCount: number;
    resourceHistoryCount: number;
  } {
    return {
      enabled: this.config.enabled,
      totalExecutions: this.totalExecutions,
      activeExecutions: Array.from(this.executionMetrics.values()).filter(m => m.status === 'RUNNING').length,
      totalApiCalls: this.totalApiCalls,
      totalErrors: this.totalErrors,
      metricsCount: this.executionMetrics.size,
      resourceHistoryCount: this.resourceHistory.length
    };
  }

  /**
   * Shutdown the performance monitor
   */
  shutdown(): void {
    this.logger.info('2 Shutting down WorkflowPerformanceMonitor');

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    if (this.resourceMonitorTimer) {
      clearInterval(this.resourceMonitorTimer);
      this.resourceMonitorTimer = undefined;
    }

    // Final cleanup
    this.cleanupOldMetrics();

    this.logger.info('WorkflowPerformanceMonitor shutdown complete');
  }

  /**
   * Start monitoring timers
   */
  private startMonitoring(): void {
    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldMetrics();
      this.enforceExecutionTimeouts();
    }, this.config.cleanupInterval);

    // Start resource monitoring timer
    this.resourceMonitorTimer = setInterval(() => {
      const usage = this.getCurrentResourceUsage();
      this.resourceHistory.push(usage);

      // Keep only recent resource history
      const cutoffTime = Date.now() - this.config.metricsRetentionTime;
      this.resourceHistory = this.resourceHistory.filter(r => r.timestamp >= cutoffTime);
    }, 30000); // Every 30 seconds

    this.logger.info('Performance monitoring started');
  }

  /**
   * Get memory usage in MB
   */
  private getMemoryUsage(): number {
    try {
      const memUsage = process.memoryUsage();
      return Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100; // MB with 2 decimal places
    } catch (error) {
      this.logger.warn('Failed to get memory usage:', error);
      return 0;
    }
  }

  /**
   * Get CPU usage percentage (simplified)
   */
  private getCpuUsage(): number {
    try {
      // This is a simplified CPU usage calculation
      // In a real implementation, you might want to use a more sophisticated method
      const usage = process.cpuUsage();
      const totalUsage = usage.user + usage.system;

      // Convert to percentage (this is a rough approximation)
      return Math.round(totalUsage / 1000000 * 100) / 100; // Percentage with 2 decimal places
    } catch (error) {
      this.logger.warn('Failed to get CPU usage:', error);
      return 0;
    }
  }

  /**
   * Generate execution key
   */
  private getExecutionKey(workflowId: string, workflowInstanceId: string): string {
    return `${workflowId}:${workflowInstanceId}`;
  }

  /**
   * Get empty statistics object
   */
  private getEmptyStats(windowStart: number, windowEnd: number): PerformanceStats {
    return {
      totalExecutions: 0,
      runningExecutions: 0,
      completedExecutions: 0,
      failedExecutions: 0,
      timeoutExecutions: 0,
      averageDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      averageMemoryUsage: 0,
      peakMemoryUsage: 0,
      averageCpuUsage: 0,
      peakCpuUsage: 0,
      totalApiCalls: 0,
      averageApiTime: 0,
      totalErrors: 0,
      errorRate: 0,
      windowStart,
      windowEnd
    };
  }
}