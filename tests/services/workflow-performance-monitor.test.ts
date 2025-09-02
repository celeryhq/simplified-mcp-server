/**
 * Tests for WorkflowPerformanceMonitor
 */

import { WorkflowPerformanceMonitor, type PerformanceMonitorConfig } from '../../src/services/workflow-performance-monitor.js';
import type { Logger } from '../../src/types/index.js';

// Mock logger
const mockLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  logError: jest.fn(),
  setLevel: jest.fn(),
  setContext: jest.fn(),
  child: jest.fn(),
  updateConfig: jest.fn()
};

// Mock createMCPLogger to return our mock logger
jest.mock('../../src/utils/logger.js', () => ({
  createMCPLogger: jest.fn(() => mockLogger)
}));

describe('WorkflowPerformanceMonitor', () => {
  let monitor: WorkflowPerformanceMonitor;
  let config: PerformanceMonitorConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    config = {
      enabled: true,
      metricsRetentionTime: 60000, // 1 minute for testing
      cleanupInterval: 10000, // 10 seconds for testing
      maxConcurrentExecutions: 5,
      executionTimeout: 30000, // 30 seconds for testing
      memoryThreshold: 100, // 100 MB
      cpuThreshold: 50 // 50%
    };
    
    monitor = new WorkflowPerformanceMonitor(mockLogger, config);
  });

  afterEach(() => {
    monitor.shutdown();
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(monitor).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Performance monitoring started');
    });

    it('should not start monitoring when disabled', () => {
      jest.clearAllMocks(); // Clear previous calls
      const disabledConfig = { ...config, enabled: false };
      const disabledMonitor = new WorkflowPerformanceMonitor(mockLogger, disabledConfig);
      
      expect(mockLogger.info).not.toHaveBeenCalledWith('Performance monitoring started');
      
      disabledMonitor.shutdown();
    });
  });

  describe('execution tracking', () => {
    const workflowId = 'test-workflow';
    const workflowInstanceId = 'test-instance-123';
    const correlationId = 'test-correlation-456';

    it('should start tracking execution', () => {
      monitor.startExecution(workflowId, workflowInstanceId, correlationId, { test: 'metadata' });
      
      const metrics = monitor.getExecutionMetrics(workflowId, workflowInstanceId);
      expect(metrics).toBeDefined();
      expect(metrics?.workflowId).toBe(workflowId);
      expect(metrics?.workflowInstanceId).toBe(workflowInstanceId);
      expect(metrics?.correlationId).toBe(correlationId);
      expect(metrics?.status).toBe('RUNNING');
      expect(metrics?.metadata).toEqual({ test: 'metadata' });
      expect(metrics?.startTime).toBeGreaterThan(0);
    });

    it('should not track when disabled', () => {
      const disabledConfig = { ...config, enabled: false };
      const disabledMonitor = new WorkflowPerformanceMonitor(mockLogger, disabledConfig);
      
      disabledMonitor.startExecution(workflowId, workflowInstanceId);
      
      const metrics = disabledMonitor.getExecutionMetrics(workflowId, workflowInstanceId);
      expect(metrics).toBeUndefined();
      
      disabledMonitor.shutdown();
    });

    it('should update execution status', () => {
      monitor.startExecution(workflowId, workflowInstanceId);
      
      // Add a small delay to ensure duration > 0
      const startTime = Date.now();
      while (Date.now() - startTime < 1) {
        // Small busy wait to ensure time passes
      }
      
      monitor.updateExecutionStatus(workflowId, workflowInstanceId, 'COMPLETED');
      
      const metrics = monitor.getExecutionMetrics(workflowId, workflowInstanceId);
      expect(metrics?.status).toBe('COMPLETED');
      expect(metrics?.endTime).toBeGreaterThan(0);
      expect(metrics?.duration).toBeGreaterThanOrEqual(0);
    });

    it('should update execution status with error', () => {
      monitor.startExecution(workflowId, workflowInstanceId);
      monitor.updateExecutionStatus(workflowId, workflowInstanceId, 'FAILED', 'Test error');
      
      const metrics = monitor.getExecutionMetrics(workflowId, workflowInstanceId);
      expect(metrics?.status).toBe('FAILED');
      expect(metrics?.errorCount).toBe(1);
      expect(metrics?.lastError).toBe('Test error');
    });

    it('should complete execution tracking', () => {
      monitor.startExecution(workflowId, workflowInstanceId);
      
      // Add a small delay to ensure duration > 0
      const startTime = Date.now();
      while (Date.now() - startTime < 1) {
        // Small busy wait to ensure time passes
      }
      
      const completedMetrics = monitor.completeExecution(workflowId, workflowInstanceId, 'COMPLETED');
      
      expect(completedMetrics).toBeDefined();
      expect(completedMetrics?.status).toBe('COMPLETED');
      expect(completedMetrics?.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing execution for status update', () => {
      monitor.updateExecutionStatus('missing-workflow', 'missing-instance', 'COMPLETED');
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No metrics found for execution: missing-workflow:missing-instance'
      );
    });
  });

  describe('API call tracking', () => {
    const workflowId = 'test-workflow';
    const workflowInstanceId = 'test-instance-123';

    beforeEach(() => {
      monitor.startExecution(workflowId, workflowInstanceId);
    });

    it('should record successful API call', () => {
      monitor.recordApiCall(workflowId, workflowInstanceId, 1500, true);
      
      const metrics = monitor.getExecutionMetrics(workflowId, workflowInstanceId);
      expect(metrics?.apiCallCount).toBe(1);
      expect(metrics?.totalApiTime).toBe(1500);
      expect(metrics?.errorCount).toBe(0);
    });

    it('should record failed API call', () => {
      monitor.recordApiCall(workflowId, workflowInstanceId, 500, false, 'API Error');
      
      const metrics = monitor.getExecutionMetrics(workflowId, workflowInstanceId);
      expect(metrics?.apiCallCount).toBe(1);
      expect(metrics?.totalApiTime).toBe(500);
      expect(metrics?.errorCount).toBe(1);
      expect(metrics?.lastError).toBe('API Error');
    });

    it('should accumulate multiple API calls', () => {
      monitor.recordApiCall(workflowId, workflowInstanceId, 1000, true);
      monitor.recordApiCall(workflowId, workflowInstanceId, 2000, true);
      monitor.recordApiCall(workflowId, workflowInstanceId, 500, false, 'Error');
      
      const metrics = monitor.getExecutionMetrics(workflowId, workflowInstanceId);
      expect(metrics?.apiCallCount).toBe(3);
      expect(metrics?.totalApiTime).toBe(3500);
      expect(metrics?.errorCount).toBe(1);
    });

    it('should handle missing execution for API call', () => {
      monitor.recordApiCall('missing-workflow', 'missing-instance', 1000, true);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No metrics found for API call: missing-workflow:missing-instance'
      );
    });
  });

  describe('performance statistics', () => {
    beforeEach(() => {
      // Create some test executions
      monitor.startExecution('workflow-1', 'instance-1');
      monitor.startExecution('workflow-2', 'instance-2');
      monitor.startExecution('workflow-3', 'instance-3');
      
      // Complete some executions
      monitor.completeExecution('workflow-1', 'instance-1', 'COMPLETED');
      monitor.completeExecution('workflow-2', 'instance-2', 'FAILED', 'Test error');
      
      // Add some API calls
      monitor.recordApiCall('workflow-1', 'instance-1', 1000, true);
      monitor.recordApiCall('workflow-2', 'instance-2', 2000, false, 'API Error');
      monitor.recordApiCall('workflow-3', 'instance-3', 1500, true);
    });

    it('should calculate performance statistics', () => {
      const stats = monitor.getPerformanceStats();
      
      expect(stats.totalExecutions).toBe(3);
      expect(stats.runningExecutions).toBe(1);
      expect(stats.completedExecutions).toBe(1);
      expect(stats.failedExecutions).toBe(1);
      expect(stats.timeoutExecutions).toBe(0);
      
      expect(stats.totalApiCalls).toBe(3);
      expect(stats.totalErrors).toBe(2); // One from failed execution, one from failed API call
      expect(stats.errorRate).toBeCloseTo(0.33, 2); // 1 out of 3 executions had errors (workflow-2)
      
      expect(stats.windowStart).toBe(0);
      expect(stats.windowEnd).toBeGreaterThan(0);
    });

    it('should calculate statistics for time window', () => {
      const windowMs = 30000; // 30 seconds
      const stats = monitor.getPerformanceStats(windowMs);
      
      expect(stats.totalExecutions).toBe(3);
      expect(stats.windowStart).toBeGreaterThan(0);
      expect(stats.windowEnd - stats.windowStart).toBeLessThanOrEqual(windowMs);
    });

    it('should return empty stats when no executions', () => {
      const emptyMonitor = new WorkflowPerformanceMonitor(mockLogger, { ...config, enabled: true });
      const stats = emptyMonitor.getPerformanceStats();
      
      expect(stats.totalExecutions).toBe(0);
      expect(stats.runningExecutions).toBe(0);
      expect(stats.completedExecutions).toBe(0);
      expect(stats.totalApiCalls).toBe(0);
      expect(stats.totalErrors).toBe(0);
      expect(stats.errorRate).toBe(0);
      
      emptyMonitor.shutdown();
    });
  });

  describe('resource monitoring', () => {
    it('should get current resource usage', () => {
      const usage = monitor.getCurrentResourceUsage();
      
      expect(usage.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(usage.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(usage.timestamp).toBeGreaterThan(0);
    });

    it('should check resource limits', () => {
      const limits = monitor.checkResourceLimits();
      
      expect(limits).toHaveProperty('memoryExceeded');
      expect(limits).toHaveProperty('cpuExceeded');
      expect(limits).toHaveProperty('concurrencyExceeded');
      
      expect(typeof limits.memoryExceeded).toBe('boolean');
      expect(typeof limits.cpuExceeded).toBe('boolean');
      expect(typeof limits.concurrencyExceeded).toBe('boolean');
    });

    it('should detect concurrency limit exceeded', () => {
      // Start more executions than the limit
      for (let i = 0; i < config.maxConcurrentExecutions + 2; i++) {
        monitor.startExecution(`workflow-${i}`, `instance-${i}`);
      }
      
      const limits = monitor.checkResourceLimits();
      expect(limits.concurrencyExceeded).toBe(true);
    });
  });

  describe('cleanup and timeout enforcement', () => {
    it('should clean up old metrics', () => {
      // Create an execution and complete it
      monitor.startExecution('old-workflow', 'old-instance');
      monitor.completeExecution('old-workflow', 'old-instance', 'COMPLETED');
      
      // Manually set old timestamp to simulate old execution
      const metrics = monitor.getExecutionMetrics('old-workflow', 'old-instance');
      if (metrics) {
        metrics.startTime = Date.now() - config.metricsRetentionTime - 1000;
      }
      
      // Run cleanup
      monitor.cleanupOldMetrics();
      
      // Old execution should be cleaned up
      const cleanedMetrics = monitor.getExecutionMetrics('old-workflow', 'old-instance');
      expect(cleanedMetrics).toBeUndefined();
    });

    it('should enforce execution timeouts', () => {
      // Start an execution
      monitor.startExecution('timeout-workflow', 'timeout-instance');
      
      // Manually set old start time to simulate timeout
      const metrics = monitor.getExecutionMetrics('timeout-workflow', 'timeout-instance');
      if (metrics) {
        metrics.startTime = Date.now() - config.executionTimeout - 1000;
      }
      
      // Enforce timeouts
      monitor.enforceExecutionTimeouts();
      
      // Execution should be marked as timed out
      const timedOutMetrics = monitor.getExecutionMetrics('timeout-workflow', 'timeout-instance');
      expect(timedOutMetrics?.status).toBe('TIMEOUT');
      expect(timedOutMetrics?.lastError).toContain('timeout');
    });

    it('should not clean up running executions', () => {
      monitor.startExecution('running-workflow', 'running-instance');
      
      // Manually set old timestamp but keep status as RUNNING
      const metrics = monitor.getExecutionMetrics('running-workflow', 'running-instance');
      if (metrics) {
        metrics.startTime = Date.now() - config.metricsRetentionTime - 1000;
      }
      
      monitor.cleanupOldMetrics();
      
      // Running execution should not be cleaned up
      const runningMetrics = monitor.getExecutionMetrics('running-workflow', 'running-instance');
      expect(runningMetrics).toBeDefined();
      expect(runningMetrics?.status).toBe('RUNNING');
    });
  });

  describe('monitoring statistics', () => {
    it('should provide monitoring statistics', () => {
      monitor.startExecution('stats-workflow-1', 'stats-instance-1');
      monitor.startExecution('stats-workflow-2', 'stats-instance-2');
      monitor.completeExecution('stats-workflow-1', 'stats-instance-1', 'COMPLETED');
      
      monitor.recordApiCall('stats-workflow-1', 'stats-instance-1', 1000, true);
      monitor.recordApiCall('stats-workflow-2', 'stats-instance-2', 500, false, 'Error');
      
      const stats = monitor.getMonitoringStats();
      
      expect(stats.enabled).toBe(true);
      expect(stats.totalExecutions).toBe(2);
      expect(stats.activeExecutions).toBe(1);
      expect(stats.totalApiCalls).toBe(2);
      expect(stats.totalErrors).toBe(1);
      expect(stats.metricsCount).toBe(2);
      expect(stats.resourceHistoryCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getAllMetrics', () => {
    it('should return all execution metrics', () => {
      monitor.startExecution('all-workflow-1', 'all-instance-1');
      monitor.startExecution('all-workflow-2', 'all-instance-2');
      
      const allMetrics = monitor.getAllMetrics();
      
      expect(allMetrics).toHaveLength(2);
      expect(allMetrics[0].workflowId).toBe('all-workflow-1');
      expect(allMetrics[1].workflowId).toBe('all-workflow-2');
    });

    it('should return empty array when no metrics', () => {
      const emptyMonitor = new WorkflowPerformanceMonitor(mockLogger, { ...config, enabled: true });
      const allMetrics = emptyMonitor.getAllMetrics();
      
      expect(allMetrics).toHaveLength(0);
      
      emptyMonitor.shutdown();
    });
  });

  describe('shutdown', () => {
    it('should shutdown cleanly', () => {
      monitor.startExecution('shutdown-workflow', 'shutdown-instance');
      
      monitor.shutdown();
      
      expect(mockLogger.info).toHaveBeenCalledWith('Shutting down WorkflowPerformanceMonitor');
      expect(mockLogger.info).toHaveBeenCalledWith('WorkflowPerformanceMonitor shutdown complete');
    });

    it('should clean up timers on shutdown', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      monitor.shutdown();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      
      clearIntervalSpy.mockRestore();
    });
  });

  describe('disabled monitoring', () => {
    let disabledMonitor: WorkflowPerformanceMonitor;

    beforeEach(() => {
      const disabledConfig = { ...config, enabled: false };
      disabledMonitor = new WorkflowPerformanceMonitor(mockLogger, disabledConfig);
    });

    afterEach(() => {
      disabledMonitor.shutdown();
    });

    it('should not track executions when disabled', () => {
      disabledMonitor.startExecution('disabled-workflow', 'disabled-instance');
      
      const metrics = disabledMonitor.getExecutionMetrics('disabled-workflow', 'disabled-instance');
      expect(metrics).toBeUndefined();
    });

    it('should not record API calls when disabled', () => {
      disabledMonitor.recordApiCall('disabled-workflow', 'disabled-instance', 1000, true);
      
      // Should not log any warnings about missing metrics
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should not update status when disabled', () => {
      disabledMonitor.updateExecutionStatus('disabled-workflow', 'disabled-instance', 'COMPLETED');
      
      // Should not log any warnings about missing metrics
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should return undefined for completion when disabled', () => {
      const result = disabledMonitor.completeExecution('disabled-workflow', 'disabled-instance', 'COMPLETED');
      
      expect(result).toBeUndefined();
    });

    it('should not run cleanup when disabled', () => {
      disabledMonitor.cleanupOldMetrics();
      disabledMonitor.enforceExecutionTimeouts();
      
      // Should not log any cleanup messages
      expect(mockLogger.info).not.toHaveBeenCalledWith(expect.stringContaining('Cleaned up'));
      expect(mockLogger.warn).not.toHaveBeenCalledWith(expect.stringContaining('Timed out'));
    });
  });
});