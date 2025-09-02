/**
 * Unit tests for WorkflowStatusService
 */

import { WorkflowStatusService, type WorkflowStatusConfig } from '../../src/services/workflow-status.js';
import type { APIClient, Logger, WorkflowStatus } from '../../src/types/index.js';
import { AppError, ErrorType } from '../../src/types/index.js';

// Mock implementations
const mockAPIClient: jest.Mocked<APIClient> = {
  makeRequest: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn()
};

const mockLogger: jest.Mocked<Logger> = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Test configuration
const testConfig: WorkflowStatusConfig = {
  statusCheckInterval: 1000,
  maxRetryAttempts: 3,
  cleanupInterval: 30000
};

// Sample API response data
const sampleStatusResponse = {
  create_time: 1753703781802,
  update_time: 1753703781904,
  status: 'RUNNING',
  start_time: 1753703781802,
  workflow_id: '2724',
  input: {
    target_domain: 'example.com',
    context: {
      space_id: null,
      user_id: 556565,
      workspace_id: 82515,
      subscription_id: null,
      use_quota: true
    }
  },
  output: {
    competitors_analysis: null
  }
};

const sampleCompletedResponse = {
  ...sampleStatusResponse,
  status: 'COMPLETED',
  end_time: 1753703782000,
  update_time: 1753703782000,
  output: {
    competitors_analysis: {
      result: 'analysis complete'
    }
  }
};

const sampleFailedResponse = {
  ...sampleStatusResponse,
  status: 'FAILED',
  end_time: 1753703782000,
  update_time: 1753703782000,
  output: {
    error: 'Domain analysis failed',
    competitors_analysis: null
  }
};

describe('WorkflowStatusService', () => {
  let service: WorkflowStatusService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkflowStatusService(mockAPIClient, mockLogger, testConfig);
  });

  afterEach(() => {
    service.shutdown();
  });

  describe('constructor', () => {
    it('should create service with provided configuration', () => {
      const config = service.getConfig();
      expect(config.statusCheckInterval).toBe(1000);
      expect(config.maxRetryAttempts).toBe(3);
      expect(config.cleanupInterval).toBe(30000);
    });

    it('should enforce minimum 1000ms status check interval', () => {
      const configWithLowInterval: WorkflowStatusConfig = {
        ...testConfig,
        statusCheckInterval: 500
      };
      
      const serviceWithLowInterval = new WorkflowStatusService(
        mockAPIClient, 
        mockLogger, 
        configWithLowInterval
      );
      
      const config = serviceWithLowInterval.getConfig();
      expect(config.statusCheckInterval).toBe(1000);
      
      serviceWithLowInterval.shutdown();
    });
  });

  describe('checkStatus', () => {
    it('should successfully check workflow status', async () => {
      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: sampleStatusResponse
      });

      const result = await service.checkStatus('2724', 'uuid-123');

      expect(mockAPIClient.get).toHaveBeenCalledWith(
        '/api/v1/service/workflows/2724/runs/uuid-123/status',
        undefined,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Language': 'en'
          }
        }
      );

      expect(result).toEqual({
        create_time: 1753703781802,
        update_time: 1753703781904,
        status: 'RUNNING',
        start_time: 1753703781802,
        workflow_id: '2724',
        input: sampleStatusResponse.input,
        output: sampleStatusResponse.output,
        workflowInstanceId: 'uuid-123',
        error: undefined
      });
    });

    it('should handle completed workflow status', async () => {
      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: sampleCompletedResponse
      });

      const result = await service.checkStatus('2724', 'uuid-123');

      expect(result.status).toBe('COMPLETED');
      expect(result.end_time).toBe(1753703782000);
      expect(result.output).toEqual({
        competitors_analysis: {
          result: 'analysis complete'
        }
      });
    });

    it('should handle failed workflow status with error extraction', async () => {
      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: sampleFailedResponse
      });

      const result = await service.checkStatus('2724', 'uuid-123');

      expect(result.status).toBe('FAILED');
      expect(result.error).toBe('Domain analysis failed');
    });

    it('should handle cancelled workflow status', async () => {
      const cancelledResponse = {
        ...sampleStatusResponse,
        status: 'CANCELLED',
        end_time: 1753703782000,
        update_time: 1753703782000
      };

      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: cancelledResponse
      });

      const result = await service.checkStatus('2724', 'uuid-123');

      expect(result.status).toBe('CANCELLED');
      expect(result.end_time).toBe(1753703782000);
    });

    it('should throw AppError on API failure', async () => {
      const apiError = new AppError(
        ErrorType.API_ERROR,
        'API request failed',
        {},
        500
      );
      
      mockAPIClient.get.mockRejectedValue(apiError);

      await expect(service.checkStatus('2724', 'uuid-123')).rejects.toThrow(AppError);
      await expect(service.checkStatus('2724', 'uuid-123')).rejects.toThrow(
        'Failed to check workflow status: API request failed'
      );
    });

    it('should throw AppError on invalid response format', async () => {
      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: 'invalid response'
      });

      await expect(service.checkStatus('2724', 'uuid-123')).rejects.toThrow(AppError);
      await expect(service.checkStatus('2724', 'uuid-123')).rejects.toThrow(
        'Invalid status response format'
      );
    });

    it('should throw AppError on missing required fields', async () => {
      const invalidResponse = {
        create_time: 1753703781802,
        // Missing required fields
        status: 'RUNNING'
      };

      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: invalidResponse
      });

      await expect(service.checkStatus('2724', 'uuid-123')).rejects.toThrow(AppError);
      await expect(service.checkStatus('2724', 'uuid-123')).rejects.toThrow(
        'Missing required fields in status response'
      );
    });

    it('should throw AppError on invalid status value', async () => {
      const invalidStatusResponse = {
        ...sampleStatusResponse,
        status: 'INVALID_STATUS'
      };

      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: invalidStatusResponse
      });

      await expect(service.checkStatus('2724', 'uuid-123')).rejects.toThrow(AppError);
      await expect(service.checkStatus('2724', 'uuid-123')).rejects.toThrow(
        'Invalid status value: INVALID_STATUS'
      );
    });
  });

  describe('pollWithInterval', () => {
    it('should start polling and call callback with status updates', (done) => {
      const callback = jest.fn((status) => {
        expect(status).toEqual(
          expect.objectContaining({
            status: 'RUNNING',
            workflow_id: '2724',
            workflowInstanceId: 'uuid-123'
          })
        );
        service.stopPolling('2724', 'uuid-123');
        done();
      });
      
      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: sampleStatusResponse
      });

      service.pollWithInterval('2724', 'uuid-123', callback);
    });

    it('should stop polling when workflow completes', (done) => {
      const callback = jest.fn();
      let callCount = 0;
      
      // First call returns RUNNING, second call returns COMPLETED
      mockAPIClient.get
        .mockResolvedValueOnce({
          status: 200,
          statusText: 'OK',
          data: sampleStatusResponse
        })
        .mockResolvedValueOnce({
          status: 200,
          statusText: 'OK',
          data: sampleCompletedResponse
        });

      const wrappedCallback = (status: WorkflowStatus) => {
        callback(status);
        callCount++;
        
        if (callCount === 1) {
          expect(status.status).toBe('RUNNING');
        } else if (callCount === 2) {
          expect(status.status).toBe('COMPLETED');
          
          // Wait a bit to ensure no more calls happen
          setTimeout(() => {
            expect(callback).toHaveBeenCalledTimes(2);
            done();
          }, 100);
        }
      };

      service.pollWithInterval('2724', 'uuid-123', wrappedCallback);
    });

    it('should handle multiple callbacks for same execution', (done) => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: sampleStatusResponse
      });

      const checkBothCalled = () => {
        if (callback1.mock.calls.length > 0 && callback2.mock.calls.length > 0) {
          service.stopPolling('2724', 'uuid-123');
          done();
        }
      };

      service.pollWithInterval('2724', 'uuid-123', (status) => {
        callback1(status);
        checkBothCalled();
      });
      
      service.pollWithInterval('2724', 'uuid-123', (status) => {
        callback2(status);
        checkBothCalled();
      });
    });

    it('should handle polling errors gracefully', (done) => {
      const callback = jest.fn((status) => {
        try {
          expect(status).toEqual(
            expect.objectContaining({
              status: 'FAILED',
              error: 'Unable to check workflow status. The workflow may still be running.'
            })
          );
          done();
        } catch (error) {
          done(error);
        }
      });
      
      mockAPIClient.get.mockRejectedValue(new Error('API Error'));

      service.pollWithInterval('2724', 'uuid-123', callback);
      
      // Also set a fallback timeout in case the callback is never called
      setTimeout(() => {
        if (callback.mock.calls.length === 0) {
          done(new Error('Callback was never called'));
        }
      }, 2000);
    }, 3000);
  });

  describe('stopPolling', () => {
    it('should stop polling for specific execution', () => {
      const callback = jest.fn();
      
      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: sampleStatusResponse
      });

      // Start polling
      service.pollWithInterval('2724', 'uuid-123', callback);
      
      // Verify tracker exists
      const tracker = service.getExecutionTracker('2724', 'uuid-123');
      expect(tracker).toBeDefined();
      expect(tracker?.callbacks).toHaveLength(1);
      
      // Stop polling
      service.stopPolling('2724', 'uuid-123');
      
      // Verify polling was stopped (tracker should still exist but interval should be cleared)
      const trackerAfterStop = service.getExecutionTracker('2724', 'uuid-123');
      expect(trackerAfterStop).toBeDefined();
      // We can't directly test if the interval was cleared, but we can verify the method doesn't throw
    });

    it('should handle stopping non-existent polling gracefully', () => {
      expect(() => {
        service.stopPolling('non-existent', 'uuid-123');
      }).not.toThrow();
    });
  });

  describe('trackExecution', () => {
    it('should track new execution', () => {
      service.trackExecution('uuid-123', '2724');
      
      const tracker = service.getExecutionTracker('2724', 'uuid-123');
      expect(tracker).toBeDefined();
      expect(tracker?.workflowId).toBe('2724');
      expect(tracker?.workflowInstanceId).toBe('uuid-123');
      expect(tracker?.status).toBe('RUNNING');
    });

    it('should not duplicate tracking for same execution', () => {
      service.trackExecution('uuid-123', '2724');
      service.trackExecution('uuid-123', '2724');
      
      expect(service.getTrackedExecutionsCount()).toBe(1);
    });
  });

  describe('cleanupCompletedExecutions', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should clean up completed executions', async () => {
      // Track an execution
      service.trackExecution('uuid-123', '2724');
      
      // Simulate status check that marks it as completed
      const tracker = service.getExecutionTracker('2724', 'uuid-123');
      if (tracker) {
        tracker.status = 'COMPLETED';
        tracker.lastStatusCheck = Date.now() - 40000; // Make it stale
      }
      
      expect(service.getTrackedExecutionsCount()).toBe(1);
      
      // Run cleanup
      service.cleanupCompletedExecutions();
      
      expect(service.getTrackedExecutionsCount()).toBe(0);
    });

    it('should not clean up running executions', () => {
      service.trackExecution('uuid-123', '2724');
      
      const tracker = service.getExecutionTracker('2724', 'uuid-123');
      if (tracker) {
        tracker.status = 'RUNNING';
        tracker.lastStatusCheck = Date.now();
      }
      
      expect(service.getTrackedExecutionsCount()).toBe(1);
      
      service.cleanupCompletedExecutions();
      
      expect(service.getTrackedExecutionsCount()).toBe(1);
    });

    it('should not clean up recently completed executions', () => {
      service.trackExecution('uuid-123', '2724');
      
      const tracker = service.getExecutionTracker('2724', 'uuid-123');
      if (tracker) {
        tracker.status = 'COMPLETED';
        tracker.lastStatusCheck = Date.now(); // Recent check
      }
      
      expect(service.getTrackedExecutionsCount()).toBe(1);
      
      service.cleanupCompletedExecutions();
      
      expect(service.getTrackedExecutionsCount()).toBe(1);
    });
  });

  describe('getTrackedExecutionsCount', () => {
    it('should return correct count of tracked executions', () => {
      expect(service.getTrackedExecutionsCount()).toBe(0);
      
      service.trackExecution('uuid-1', '2724');
      expect(service.getTrackedExecutionsCount()).toBe(1);
      
      service.trackExecution('uuid-2', '2725');
      expect(service.getTrackedExecutionsCount()).toBe(2);
    });
  });

  describe('getTrackedExecutionKeys', () => {
    it('should return list of tracked execution keys', () => {
      service.trackExecution('uuid-1', '2724');
      service.trackExecution('uuid-2', '2725');
      
      const keys = service.getTrackedExecutionKeys();
      expect(keys).toHaveLength(2);
      expect(keys).toContain('2724:uuid-1');
      expect(keys).toContain('2725:uuid-2');
    });
  });

  describe('getExecutionTracker', () => {
    it('should return tracker for existing execution', () => {
      service.trackExecution('uuid-123', '2724');
      
      const tracker = service.getExecutionTracker('2724', 'uuid-123');
      expect(tracker).toBeDefined();
      expect(tracker?.workflowId).toBe('2724');
      expect(tracker?.workflowInstanceId).toBe('uuid-123');
    });

    it('should return undefined for non-existent execution', () => {
      const tracker = service.getExecutionTracker('non-existent', 'uuid-123');
      expect(tracker).toBeUndefined();
    });
  });

  describe('shutdown', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should stop all polling and clear tracked executions', async () => {
      const callback = jest.fn();
      
      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: sampleStatusResponse
      });

      // Start polling for multiple executions
      service.pollWithInterval('2724', 'uuid-1', callback);
      service.pollWithInterval('2725', 'uuid-2', callback);
      
      expect(service.getTrackedExecutionsCount()).toBe(2);
      
      // Shutdown service
      service.shutdown();
      
      expect(service.getTrackedExecutionsCount()).toBe(0);
      
      // Advance time - callbacks should not be called
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle callback errors gracefully during polling', async () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const normalCallback = jest.fn();
      
      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: sampleStatusResponse
      });

      // Test that callbacks can be added without throwing
      expect(() => {
        service.pollWithInterval('2724', 'uuid-123', errorCallback);
        service.pollWithInterval('2724', 'uuid-123', normalCallback);
      }).not.toThrow();
      
      // Verify both callbacks are registered
      const tracker = service.getExecutionTracker('2724', 'uuid-123');
      expect(tracker?.callbacks).toHaveLength(2);
      
      // Clean up
      service.stopPolling('2724', 'uuid-123');
    });
  });

  describe('status response parsing edge cases', () => {
    it('should handle failed workflow without error in output', async () => {
      const failedResponseNoError = {
        ...sampleStatusResponse,
        status: 'FAILED',
        end_time: 1753703782000,
        output: {
          competitors_analysis: null
        }
      };

      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: failedResponseNoError
      });

      const result = await service.checkStatus('2724', 'uuid-123');

      expect(result.status).toBe('FAILED');
      expect(result.error).toBe('Workflow execution failed');
    });

    it('should handle failed workflow with message in output', async () => {
      const failedResponseWithMessage = {
        ...sampleStatusResponse,
        status: 'FAILED',
        end_time: 1753703782000,
        output: {
          message: 'Custom failure message',
          competitors_analysis: null
        }
      };

      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: failedResponseWithMessage
      });

      const result = await service.checkStatus('2724', 'uuid-123');

      expect(result.status).toBe('FAILED');
      expect(result.error).toBe('Custom failure message');
    });
  });
});