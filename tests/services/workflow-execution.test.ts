/**
 * Unit tests for WorkflowExecutionService
 */

import { WorkflowExecutionService } from '../../src/services/workflow-execution.js';
import type { APIClient, Logger, WorkflowStatus } from '../../src/types/index.js';
import { AppError, ErrorType } from '../../src/types/index.js';

// Mock API Client
const createMockAPIClient = (): jest.Mocked<APIClient> => ({
  makeRequest: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn()
});

// Mock Logger
const createMockLogger = (): jest.Mocked<Logger> => {
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn()
  };
  // Make child return the same logger for simplicity
  logger.child.mockReturnValue(logger);
  return logger as any;
};

describe('WorkflowExecutionService', () => {
  let service: WorkflowExecutionService;
  let mockApiClient: jest.Mocked<APIClient>;
  let mockLogger: jest.Mocked<Logger>;

  const defaultConfig = {
    executionTimeout: 30000,
    statusCheckInterval: 1000,
    maxRetryAttempts: 3
  };

  beforeEach(() => {
    mockApiClient = createMockAPIClient();
    mockLogger = createMockLogger();
    service = new WorkflowExecutionService(mockApiClient, mockLogger, defaultConfig);
  });

  afterEach(() => {
    // Cancel any active executions
    service.cancelAllExecutions();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should enforce minimum 1000ms status check interval', () => {
      const configWithLowInterval = {
        ...defaultConfig,
        statusCheckInterval: 500
      };

      const serviceWithLowInterval = new WorkflowExecutionService(
        mockApiClient,
        mockLogger,
        configWithLowInterval
      );

      // The service should internally enforce minimum 1000ms
      expect(serviceWithLowInterval.getConfig().statusCheckInterval).toBe(1000);
    });
  });

  describe('buildExecutionPayload', () => {
    it('should wrap parameters in correct format', () => {
      const parameters = { target_domain: 'example.com', param2: 'value2' };
      const payload = service.buildExecutionPayload(parameters);

      expect(payload).toEqual({
        input: parameters,
        source: 'application'
      });
    });

    it('should handle empty parameters', () => {
      const payload = service.buildExecutionPayload({});

      expect(payload).toEqual({
        input: {},
        source: 'application'
      });
    });
  });

  describe('buildExecutionEndpoint', () => {
    it('should build correct execution endpoint', () => {
      const workflowId = '2724';
      const endpoint = service.buildExecutionEndpoint(workflowId);

      expect(endpoint).toBe('/api/v1/service/workflows/2724/start');
    });
  });

  describe('buildStatusEndpoint', () => {
    it('should build correct status endpoint', () => {
      const workflowId = '2724';
      const workflowInstanceId = '8f496b6a-c905-41bb-b7b7-200a8982ab30';
      const endpoint = service.buildStatusEndpoint(workflowId, workflowInstanceId);

      expect(endpoint).toBe('/api/v1/service/workflows/2724/runs/8f496b6a-c905-41bb-b7b7-200a8982ab30/status');
    });
  });

  describe('parseExecutionResponse', () => {
    it('should parse valid execution response', () => {
      const response = {
        correlation_id: '2724_9a92222c2ca34fffbfd00e8767dd22d0',
        workflow_id: '8f496b6a-c905-41bb-b7b7-200a8982ab30'
      };

      const result = service.parseExecutionResponse(response);

      expect(result).toEqual(response);
    });

    it('should throw error for invalid response format', () => {
      expect(() => service.parseExecutionResponse(null)).toThrow(AppError);
      expect(() => service.parseExecutionResponse('invalid')).toThrow(AppError);
    });

    it('should throw error for missing correlation_id', () => {
      const response = { workflow_id: '8f496b6a-c905-41bb-b7b7-200a8982ab30' };

      expect(() => service.parseExecutionResponse(response)).toThrow(AppError);
    });

    it('should throw error for missing workflow_id', () => {
      const response = { correlation_id: '2724_9a92222c2ca34fffbfd00e8767dd22d0' };

      expect(() => service.parseExecutionResponse(response)).toThrow(AppError);
    });
  });

  describe('parseStatusResponse', () => {
    const validStatusResponse = {
      create_time: 1753703781802,
      update_time: 1753703781904,
      status: 'COMPLETED',
      end_time: 1753703781904,
      start_time: 1753703781802,
      workflow_id: '2724',
      input: { target_domain: 'example.com' },
      output: { result: 'success' }
    };

    it('should parse valid status response', () => {
      const result = service.parseStatusResponse(
        validStatusResponse,
        '2724',
        '8f496b6a-c905-41bb-b7b7-200a8982ab30'
      );

      expect(result).toEqual({
        ...validStatusResponse,
        status: 'COMPLETED',
        workflowInstanceId: '8f496b6a-c905-41bb-b7b7-200a8982ab30',
        error: undefined
      });
    });

    it('should handle RUNNING status', () => {
      const runningResponse = {
        ...validStatusResponse,
        status: 'RUNNING',
        end_time: undefined
      };

      const result = service.parseStatusResponse(
        runningResponse,
        '2724',
        '8f496b6a-c905-41bb-b7b7-200a8982ab30'
      );

      expect(result.status).toBe('RUNNING');
      expect(result.end_time).toBeUndefined();
    });

    it('should extract error message for FAILED status', () => {
      const failedResponse = {
        ...validStatusResponse,
        status: 'FAILED',
        output: { error: 'Workflow execution failed' }
      };

      const result = service.parseStatusResponse(
        failedResponse,
        '2724',
        '8f496b6a-c905-41bb-b7b7-200a8982ab30'
      );

      expect(result.status).toBe('FAILED');
      expect(result.error).toBe('Workflow execution failed');
    });

    it('should provide default error message for FAILED status without error details', () => {
      const failedResponse = {
        ...validStatusResponse,
        status: 'FAILED',
        output: {}
      };

      const result = service.parseStatusResponse(
        failedResponse,
        '2724',
        '8f496b6a-c905-41bb-b7b7-200a8982ab30'
      );

      expect(result.status).toBe('FAILED');
      expect(result.error).toBe('Workflow execution failed');
    });

    it('should throw error for invalid status value', () => {
      const invalidResponse = {
        ...validStatusResponse,
        status: 'INVALID_STATUS'
      };

      expect(() => service.parseStatusResponse(
        invalidResponse,
        '2724',
        '8f496b6a-c905-41bb-b7b7-200a8982ab30'
      )).toThrow(AppError);
    });

    it('should throw error for missing required fields', () => {
      const incompleteResponse = {
        create_time: 1753703781802,
        status: 'COMPLETED'
        // Missing other required fields
      };

      expect(() => service.parseStatusResponse(
        incompleteResponse,
        '2724',
        '8f496b6a-c905-41bb-b7b7-200a8982ab30'
      )).toThrow(AppError);
    });
  });

  describe('getExecutionStatus', () => {
    it('should get execution status successfully', async () => {
      const mockStatusResponse = {
        create_time: 1753703781802,
        update_time: 1753703781904,
        status: 'COMPLETED',
        end_time: 1753703781904,
        start_time: 1753703781802,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: { result: 'success' }
      };

      mockApiClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: mockStatusResponse
      });

      const result = await service.getExecutionStatus('2724', '8f496b6a-c905-41bb-b7b7-200a8982ab30');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/service/workflows/2724/runs/8f496b6a-c905-41bb-b7b7-200a8982ab30/status',
        undefined,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Language': 'en'
          }
        }
      );

      expect(result.status).toBe('COMPLETED');
      expect(result.workflowInstanceId).toBe('8f496b6a-c905-41bb-b7b7-200a8982ab30');
    });

    it('should handle API errors', async () => {
      const apiError = new AppError(ErrorType.API_ERROR, 'API request failed');
      mockApiClient.get.mockRejectedValue(apiError);

      await expect(service.getExecutionStatus('2724', '8f496b6a-c905-41bb-b7b7-200a8982ab30'))
        .rejects.toThrow(AppError);

      // The error should be properly handled and thrown
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/service/workflows/2724/runs/8f496b6a-c905-41bb-b7b7-200a8982ab30/status',
        undefined,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Language': 'en'
          }
        }
      );
    });
  });

  describe('pollUntilComplete', () => {
    it('should poll until workflow completes', async () => {
      const runningResponse = {
        create_time: 1753703781802,
        update_time: 1753703781850,
        status: 'RUNNING',
        start_time: 1753703781802,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: {}
      };

      const completedResponse = {
        ...runningResponse,
        update_time: 1753703781904,
        status: 'COMPLETED',
        end_time: 1753703781904,
        output: { result: 'success' }
      };

      mockApiClient.get
        .mockResolvedValueOnce({ status: 200, statusText: 'OK', data: runningResponse })
        .mockResolvedValueOnce({ status: 200, statusText: 'OK', data: completedResponse });

      const result = await service.pollUntilComplete('2724', '8f496b6a-c905-41bb-b7b7-200a8982ab30');

      expect(result.status).toBe('COMPLETED');
      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
    });

    it('should handle timeout', async () => {
      const runningResponse = {
        create_time: 1753703781802,
        update_time: 1753703781850,
        status: 'RUNNING',
        start_time: 1753703781802,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: {}
      };

      mockApiClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: runningResponse
      });

      await expect(service.pollUntilComplete('2724', '8f496b6a-c905-41bb-b7b7-200a8982ab30', 100))
        .rejects.toThrow('Workflow execution timeout');
    });

    it('should handle cancellation', async () => {
      const runningResponse = {
        create_time: 1753703781802,
        update_time: 1753703781850,
        status: 'RUNNING',
        start_time: 1753703781802,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: {}
      };

      mockApiClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: runningResponse
      });

      // Start polling in background
      const pollPromise = service.pollUntilComplete('2724', '8f496b6a-c905-41bb-b7b7-200a8982ab30');

      // Cancel after a short delay
      setTimeout(() => {
        service.cancelExecution('2724', '8f496b6a-c905-41bb-b7b7-200a8982ab30');
      }, 50);

      await expect(pollPromise).rejects.toThrow('Workflow execution was cancelled');
    });
  });

  describe('executeWorkflow', () => {
    it('should execute workflow successfully', async () => {
      const parameters = { target_domain: 'example.com' };
      const executionResponse = {
        correlation_id: '2724_9a92222c2ca34fffbfd00e8767dd22d0',
        workflow_id: '8f496b6a-c905-41bb-b7b7-200a8982ab30'
      };

      const completedStatusResponse = {
        create_time: 1753703781802,
        update_time: 1753703781904,
        status: 'COMPLETED',
        end_time: 1753703781904,
        start_time: 1753703781802,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: { result: 'success' }
      };

      mockApiClient.post.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: executionResponse
      });

      mockApiClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: completedStatusResponse
      });

      const result = await service.executeWorkflow('2724', parameters);

      expect(result.success).toBe(true);
      expect(result.correlationId).toBe('2724_9a92222c2ca34fffbfd00e8767dd22d0');
      expect(result.workflowInstanceId).toBe('8f496b6a-c905-41bb-b7b7-200a8982ab30');
      expect(result.originalWorkflowId).toBe('2724');
      expect(result.status).toBe('COMPLETED');
      expect(result.executionDuration).toBe(102); // 1753703781904 - 1753703781802

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/v1/service/workflows/2724/start',
        { input: parameters, source: 'application' }
      );
    });

    it('should handle failed workflow execution', async () => {
      const parameters = { target_domain: 'example.com' };
      const executionResponse = {
        correlation_id: '2724_9a92222c2ca34fffbfd00e8767dd22d0',
        workflow_id: '8f496b6a-c905-41bb-b7b7-200a8982ab30'
      };

      const failedStatusResponse = {
        create_time: 1753703781802,
        update_time: 1753703781904,
        status: 'FAILED',
        end_time: 1753703781904,
        start_time: 1753703781802,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: { error: 'Domain not found' }
      };

      mockApiClient.post.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: executionResponse
      });

      mockApiClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: failedStatusResponse
      });

      const result = await service.executeWorkflow('2724', parameters);

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.error).toBe('Domain not found');
    });

    it('should handle execution start failure', async () => {
      const parameters = { target_domain: 'example.com' };
      const apiError = new AppError(ErrorType.API_ERROR, 'Workflow not found');

      mockApiClient.post.mockRejectedValue(apiError);

      const result = await service.executeWorkflow('2724', parameters);

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.error).toBe('Workflow execution failed: Workflow not found');
      expect(result.originalWorkflowId).toBe('2724');
    });
  });

  describe('cancelExecution', () => {
    it('should cancel active execution', async () => {
      const workflowId = '2724';
      const workflowInstanceId = '8f496b6a-c905-41bb-b7b7-200a8982ab30';

      // Start a polling operation to create an active execution
      const runningResponse = {
        create_time: 1753703781802,
        update_time: 1753703781850,
        status: 'RUNNING',
        start_time: 1753703781802,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: {}
      };

      mockApiClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: runningResponse
      });

      // Start polling (this will add to active executions)
      const pollPromise = service.pollUntilComplete(workflowId, workflowInstanceId);

      // Verify execution is active
      expect(service.getActiveExecutionsCount()).toBe(1);

      // Cancel execution
      const cancelled = await service.cancelExecution(workflowId, workflowInstanceId);

      expect(cancelled).toBe(true);
      expect(service.getActiveExecutionsCount()).toBe(0);

      // The polling should be cancelled
      await expect(pollPromise).rejects.toThrow('Workflow execution was cancelled');
    });

    it('should handle cancellation of non-existent execution', async () => {
      const cancelled = await service.cancelExecution('2724', '8f496b6a-c905-41bb-b7b7-200a8982ab30');

      expect(cancelled).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cancelled local polling for workflow 2724, instance 8f496b6a-c905-41bb-b7b7-200a8982ab30'
      );
    });
  });

  describe('setExecutionTimeout', () => {
    it('should update execution timeout', () => {
      const newTimeout = 60000;
      service.setExecutionTimeout(newTimeout);

      expect(service['config'].executionTimeout).toBe(newTimeout);
    });
  });

  describe('handleExecutionError', () => {
    it('should handle AppError', () => {
      const error = new AppError(ErrorType.API_ERROR, 'API request failed');
      const result = service.handleExecutionError(error, '2724');

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.error).toBe('Workflow execution failed: API request failed');
      expect(result.originalWorkflowId).toBe('2724');
      expect(result.metadata?.errorType).toBeDefined();
    });

    it('should handle generic Error', () => {
      const error = new Error('Generic error');
      const result = service.handleExecutionError(error, '2724');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Workflow execution failed: Generic error');
      expect(result.metadata?.errorType).toBeDefined();
    });

    it('should handle unknown error types', () => {
      const error = 'String error';
      const result = service.handleExecutionError(error, '2724');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Workflow execution failed: String error');
    });
  });

  describe('active execution management', () => {
    it('should track active executions', () => {
      expect(service.getActiveExecutionsCount()).toBe(0);
      expect(service.getActiveExecutionKeys()).toEqual([]);
    });

    it('should cancel all active executions', () => {
      // This is tested indirectly through other tests
      service.cancelAllExecutions();
      expect(service.getActiveExecutionsCount()).toBe(0);
    });
  });
});