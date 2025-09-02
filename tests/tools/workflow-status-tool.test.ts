/**
 * Unit tests for Workflow Status Checking Tool
 */

import { createWorkflowStatusTool } from '../../src/tools/implementations/workflow-status-tool.js';
import type { APIClient, Logger, ToolDefinition } from '../../src/types/index.js';
import { AppError, ErrorType } from '../../src/types/index.js';

// Mock logger
const mockLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock API client
const mockApiClient: APIClient = {
  makeRequest: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn()
};

describe('WorkflowStatusTool', () => {
  let tool: ToolDefinition;
  let mockGet: jest.MockedFunction<typeof mockApiClient.get>;

  beforeEach(() => {
    jest.clearAllMocks();
    tool = createWorkflowStatusTool(mockLogger);
    mockGet = mockApiClient.get as jest.MockedFunction<typeof mockApiClient.get>;
  });

  describe('Tool Definition', () => {
    it('should create a valid tool definition', () => {
      expect(tool.name).toBe('check-workflow-status');
      expect(tool.description).toBe('Check the execution status of a running workflow via API calls');
      expect(tool.category).toBe('workflow');
      expect(tool.version).toBe('1.0.0');
      expect(typeof tool.handler).toBe('function');
    });

    it('should have correct input schema', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('workflowId');
      expect(tool.inputSchema.properties).toHaveProperty('workflow_id');
      expect(tool.inputSchema.properties).toHaveProperty('includeRawResponse');
      expect(tool.inputSchema.required).toEqual(['workflowId', 'workflow_id']);
    });

    it('should validate workflowId parameter schema', () => {
      const workflowIdSchema = tool.inputSchema.properties.workflowId;
      expect(workflowIdSchema.type).toBe('string');
      expect(workflowIdSchema.minLength).toBe(1);
      expect(workflowIdSchema.maxLength).toBe(100);
      expect(workflowIdSchema.pattern).toBe('^[a-zA-Z0-9_-]+$');
    });

    it('should validate workflow_id parameter schema', () => {
      const workflowInstanceIdSchema = tool.inputSchema.properties.workflow_id;
      expect(workflowInstanceIdSchema.type).toBe('string');
      expect(workflowInstanceIdSchema.pattern).toBe('^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    });
  });

  describe('Parameter Validation', () => {
    it('should reject missing workflowId', async () => {
      const params = {
        workflow_id: '12345678-1234-1234-1234-123456789abc'
      };

      const result = await tool.handler(params, mockApiClient);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(false);
      expect(response.error.type).toBe('VALIDATION_ERROR');
      expect(response.error.message).toContain('workflowId is required');
    });

    it('should reject missing workflow_id', async () => {
      const params = {
        workflowId: '2724'
      };

      const result = await tool.handler(params, mockApiClient);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(false);
      expect(response.error.type).toBe('VALIDATION_ERROR');
      expect(response.error.message).toContain('workflow_id is required');
    });

    it('should reject invalid workflowId format', async () => {
      const params = {
        workflowId: 'invalid@workflow#id',
        workflow_id: '12345678-1234-1234-1234-123456789abc'
      };

      const result = await tool.handler(params, mockApiClient);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(false);
      expect(response.error.type).toBe('VALIDATION_ERROR');
      expect(response.error.message).toContain('alphanumeric characters, underscores, and hyphens');
    });

    it('should reject invalid workflow_id UUID format', async () => {
      const params = {
        workflowId: '2724',
        workflow_id: 'not-a-valid-uuid'
      };

      const result = await tool.handler(params, mockApiClient);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(false);
      expect(response.error.type).toBe('VALIDATION_ERROR');
      expect(response.error.message).toContain('valid UUID format');
    });

    it('should accept valid parameters', async () => {
      const params = {
        workflowId: '2724',
        workflow_id: '12345678-1234-1234-1234-123456789abc'
      };

      const mockStatusResponse = {
        create_time: 1641039781802,
        update_time: 1641039781904,
        status: 'COMPLETED',
        end_time: 1641039781904,
        start_time: 1641039781802,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: { result: 'success' }
      };

      mockGet.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: mockStatusResponse
      });

      const result = await tool.handler(params, mockApiClient);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.status).toBe('COMPLETED');
      expect(mockGet).toHaveBeenCalledWith(
        '/api/v1/service/workflows/2724/runs/12345678-1234-1234-1234-123456789abc/status',
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

  describe('API Integration', () => {
    const validParams = {
      workflowId: '2724',
      workflow_id: '12345678-1234-1234-1234-123456789abc'
    };

    it('should make correct API call to status endpoint', async () => {
      const mockStatusResponse = {
        create_time: 1641039781802,
        update_time: 1641039781904,
        status: 'RUNNING',
        start_time: 1641039781802,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: {}
      };

      mockGet.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: mockStatusResponse
      });

      await tool.handler(validParams, mockApiClient);

      expect(mockGet).toHaveBeenCalledWith(
        '/api/v1/service/workflows/2724/runs/12345678-1234-1234-1234-123456789abc/status',
        undefined,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Language': 'en'
          }
        }
      );
    });

    it('should handle RUNNING status correctly', async () => {
      const createTime = 1641039781802; // 2022-01-01T12:23:01.802Z
      const updateTime = 1641039781850; // 2022-01-01T12:23:01.850Z
      const startTime = 1641039781802;  // 2022-01-01T12:23:01.802Z
      
      const mockStatusResponse = {
        create_time: createTime,
        update_time: updateTime,
        status: 'RUNNING',
        start_time: startTime,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: {}
      };

      mockGet.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: mockStatusResponse
      });

      const result = await tool.handler(validParams, mockApiClient);
      const response = JSON.parse(result.content[0].text);

      expect(response.status).toBe('RUNNING');
      expect(response.workflowId).toBe('2724');
      expect(response.workflowInstanceId).toBe('12345678-1234-1234-1234-123456789abc');
      expect(response.createTime).toBe('2022-01-01T12:23:01.802Z');
      expect(response.updateTime).toBe('2022-01-01T12:23:01.850Z');
      expect(response.startTime).toBe('2022-01-01T12:23:01.802Z');
      expect(response.input).toEqual({ target_domain: 'example.com' });
      expect(response.output).toEqual({});
      expect(response.endTime).toBeUndefined();
      expect(response.executionDurationMs).toBeUndefined();
    });

    it('should handle COMPLETED status correctly', async () => {
      const createTime = 1641039781802; // 2022-01-01T12:23:01.802Z
      const updateTime = 1641039781904; // 2022-01-01T12:23:01.904Z
      const startTime = 1641039781802;  // 2022-01-01T12:23:01.802Z
      const endTime = 1641039781904;    // 2022-01-01T12:23:01.904Z
      
      const mockStatusResponse = {
        create_time: createTime,
        update_time: updateTime,
        status: 'COMPLETED',
        end_time: endTime,
        start_time: startTime,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: { result: 'success', data: 'processed' }
      };

      mockGet.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: mockStatusResponse
      });

      const result = await tool.handler(validParams, mockApiClient);
      const response = JSON.parse(result.content[0].text);

      expect(response.status).toBe('COMPLETED');
      expect(response.endTime).toBe('2022-01-01T12:23:01.904Z');
      expect(response.executionDurationMs).toBe(102); // endTime - startTime
      expect(response.output).toEqual({ result: 'success', data: 'processed' });
    });

    it('should handle FAILED status correctly', async () => {
      const createTime = 1641039781802; // 2022-01-01T12:23:01.802Z
      const updateTime = 1641039781904; // 2022-01-01T12:23:01.904Z
      const startTime = 1641039781802;  // 2022-01-01T12:23:01.802Z
      const endTime = 1641039781904;    // 2022-01-01T12:23:01.904Z
      
      const mockStatusResponse = {
        create_time: createTime,
        update_time: updateTime,
        status: 'FAILED',
        end_time: endTime,
        start_time: startTime,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: { error: 'Domain not found' }
      };

      mockGet.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: mockStatusResponse
      });

      const result = await tool.handler(validParams, mockApiClient);
      const response = JSON.parse(result.content[0].text);

      expect(response.status).toBe('FAILED');
      expect(response.error).toBe('Domain not found');
      expect(response.endTime).toBe('2022-01-01T12:23:01.904Z');
      expect(response.executionDurationMs).toBe(102);
    });

    it('should handle CANCELLED status correctly', async () => {
      const createTime = 1641039781802; // 2022-01-01T12:23:01.802Z
      const updateTime = 1641039781904; // 2022-01-01T12:23:01.904Z
      const startTime = 1641039781802;  // 2022-01-01T12:23:01.802Z
      const endTime = 1641039781904;    // 2022-01-01T12:23:01.904Z
      
      const mockStatusResponse = {
        create_time: createTime,
        update_time: updateTime,
        status: 'CANCELLED',
        end_time: endTime,
        start_time: startTime,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: {}
      };

      mockGet.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: mockStatusResponse
      });

      const result = await tool.handler(validParams, mockApiClient);
      const response = JSON.parse(result.content[0].text);

      expect(response.status).toBe('CANCELLED');
      expect(response.endTime).toBe('2022-01-01T12:23:01.904Z');
    });

    it('should include raw response when requested', async () => {
      const mockStatusResponse = {
        create_time: 1641039781802,
        update_time: 1641039781904,
        status: 'COMPLETED',
        end_time: 1641039781904,
        start_time: 1641039781802,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: { result: 'success' }
      };

      mockGet.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: mockStatusResponse
      });

      const paramsWithRaw = {
        ...validParams,
        includeRawResponse: true
      };

      const result = await tool.handler(paramsWithRaw, mockApiClient);
      const response = JSON.parse(result.content[0].text);

      expect(response.rawResponse).toEqual(mockStatusResponse);
    });

    it('should not include raw response by default', async () => {
      const mockStatusResponse = {
        create_time: 1641039781802,
        update_time: 1641039781904,
        status: 'COMPLETED',
        end_time: 1641039781904,
        start_time: 1641039781802,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: { result: 'success' }
      };

      mockGet.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: mockStatusResponse
      });

      const result = await tool.handler(validParams, mockApiClient);
      const response = JSON.parse(result.content[0].text);

      expect(response.rawResponse).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    const validParams = {
      workflowId: '2724',
      workflow_id: '12345678-1234-1234-1234-123456789abc'
    };

    it('should handle invalid API response format', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: 'invalid response'
      });

      const result = await tool.handler(validParams, mockApiClient);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error.type).toBe('API_ERROR');
      expect(response.error.message).toContain('Invalid status response format');
    });

    it('should handle missing required fields in response', async () => {
      const incompleteResponse = {
        create_time: 1641039781802,
        status: 'RUNNING'
        // Missing required fields: update_time, start_time, workflow_id, input, output
      };

      mockGet.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: incompleteResponse
      });

      const result = await tool.handler(validParams, mockApiClient);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error.type).toBe('API_ERROR');
      expect(response.error.message).toContain('Missing required fields');
      expect(response.error.details.missingFields).toContain('update_time');
      expect(response.error.details.missingFields).toContain('start_time');
      expect(response.error.details.missingFields).toContain('workflow_id');
      expect(response.error.details.missingFields).toContain('input');
      expect(response.error.details.missingFields).toContain('output');
    });

    it('should handle invalid status value', async () => {
      const invalidStatusResponse = {
        create_time: 1641039781802,
        update_time: 1641039781850,
        status: 'INVALID_STATUS',
        start_time: 1641039781802,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: {}
      };

      mockGet.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: invalidStatusResponse
      });

      const result = await tool.handler(validParams, mockApiClient);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error.type).toBe('API_ERROR');
      expect(response.error.message).toContain('Invalid status value: INVALID_STATUS');
      expect(response.error.message).toContain('RUNNING, COMPLETED, FAILED, CANCELLED');
    });

    it('should handle API unavailability (ECONNREFUSED)', async () => {
      const connectionError = new Error('connect ECONNREFUSED 127.0.0.1:3000');
      connectionError.code = 'ECONNREFUSED';
      mockGet.mockRejectedValue(connectionError);

      const result = await tool.handler(validParams, mockApiClient);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error.type).toBe('API_UNAVAILABLE');
      expect(response.error.message).toBe('Workflow status checking API is not available');
      expect(response.error.details.reason).toContain('not accessible');
    });

    it('should handle API unavailability (503 Service Unavailable)', async () => {
      const serviceError = new Error('Service Unavailable');
      serviceError.status = 503;
      mockGet.mockRejectedValue(serviceError);

      const result = await tool.handler(validParams, mockApiClient);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error.type).toBe('API_UNAVAILABLE');
      expect(response.error.message).toBe('Workflow status checking API is not available');
    });

    it('should handle API unavailability (502 Bad Gateway)', async () => {
      const gatewayError = new Error('Bad Gateway');
      gatewayError.statusCode = 502;
      mockGet.mockRejectedValue(gatewayError);

      const result = await tool.handler(validParams, mockApiClient);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error.type).toBe('API_UNAVAILABLE');
    });

    it('should handle general API errors', async () => {
      const apiError = new Error('Internal Server Error');
      mockGet.mockRejectedValue(apiError);

      const result = await tool.handler(validParams, mockApiClient);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error.type).toBe('API_ERROR');
      expect(response.error.message).toContain('Failed to check workflow status');
    });

    it('should handle AppError instances', async () => {
      const appError = new AppError(
        ErrorType.AUTH_ERROR,
        'Authentication failed',
        { reason: 'Invalid API key' },
        401
      );
      mockGet.mockRejectedValue(appError);

      const result = await tool.handler(validParams, mockApiClient);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error.type).toBe('AUTH_ERROR');
      expect(response.error.message).toBe('Authentication failed');
      expect(response.error.details.reason).toBe('Invalid API key');
      expect(response.error.status).toBe(401);
    });
  });

  describe('Logging', () => {
    const validParams = {
      workflowId: '2724',
      workflow_id: '12345678-1234-1234-1234-123456789abc'
    };

    it('should log status check start', async () => {
      const mockStatusResponse = {
        create_time: 1641039781802,
        update_time: 1641039781904,
        status: 'COMPLETED',
        end_time: 1641039781904,
        start_time: 1641039781802,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: { result: 'success' }
      };

      mockGet.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: mockStatusResponse
      });

      await tool.handler(validParams, mockApiClient);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Checking workflow status: workflowId=2724, workflow_id=12345678-1234-1234-1234-123456789abc'
      );
    });

    it('should log successful status check completion', async () => {
      const mockStatusResponse = {
        create_time: 1641039781802,
        update_time: 1641039781904,
        status: 'COMPLETED',
        end_time: 1641039781904,
        start_time: 1641039781802,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: { result: 'success' }
      };

      mockGet.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: mockStatusResponse
      });

      await tool.handler(validParams, mockApiClient);

      expect(mockLogger.info).toHaveBeenCalledWith('Workflow status check completed: COMPLETED');
    });

    it('should log API endpoint being called', async () => {
      const mockStatusResponse = {
        create_time: 1641039781802,
        update_time: 1641039781904,
        status: 'RUNNING',
        start_time: 1641039781802,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: {}
      };

      mockGet.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: mockStatusResponse
      });

      await tool.handler(validParams, mockApiClient);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Making status check request to: /api/v1/service/workflows/2724/runs/12345678-1234-1234-1234-123456789abc/status'
      );
    });

    it('should log errors with context', async () => {
      const apiError = new Error('Network timeout');
      mockGet.mockRejectedValue(apiError);

      await tool.handler(validParams, mockApiClient);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Workflow status check failed: Network timeout',
        {
          workflowId: '2724',
          workflow_id: '12345678-1234-1234-1234-123456789abc',
          error: apiError
        }
      );
    });
  });

  describe('Edge Cases', () => {
    const validParams = {
      workflowId: '2724',
      workflow_id: '12345678-1234-1234-1234-123456789abc'
    };

    it('should handle FAILED status with no error in output', async () => {
      const mockStatusResponse = {
        create_time: 1641039781802,
        update_time: 1641039781904,
        status: 'FAILED',
        end_time: 1641039781904,
        start_time: 1641039781802,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: {} // No error field
      };

      mockGet.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: mockStatusResponse
      });

      const result = await tool.handler(validParams, mockApiClient);
      const response = JSON.parse(result.content[0].text);

      expect(response.status).toBe('FAILED');
      expect(response.error).toBe('Workflow execution failed');
    });

    it('should handle FAILED status with error message in output', async () => {
      const mockStatusResponse = {
        create_time: 1641039781802,
        update_time: 1641039781904,
        status: 'FAILED',
        end_time: 1641039781904,
        start_time: 1641039781802,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: { message: 'Custom error message' }
      };

      mockGet.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: mockStatusResponse
      });

      const result = await tool.handler(validParams, mockApiClient);
      const response = JSON.parse(result.content[0].text);

      expect(response.status).toBe('FAILED');
      expect(response.error).toBe('Custom error message');
    });

    it('should handle workflow with no end_time (still running)', async () => {
      const mockStatusResponse = {
        create_time: 1641039781802,
        update_time: 1641039781850,
        status: 'RUNNING',
        start_time: 1641039781802,
        workflow_id: '2724',
        input: { target_domain: 'example.com' },
        output: {}
        // No end_time field
      };

      mockGet.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: mockStatusResponse
      });

      const result = await tool.handler(validParams, mockApiClient);
      const response = JSON.parse(result.content[0].text);

      expect(response.status).toBe('RUNNING');
      expect(response.endTime).toBeUndefined();
      expect(response.executionDurationMs).toBeUndefined();
    });

    it('should handle different workflowId formats', async () => {
      const testCases = [
        '2724',
        'workflow_123',
        'my-workflow-name',
        'WORKFLOW123',
        '123_workflow_456'
      ];

      for (const workflowId of testCases) {
        const params = {
          workflowId,
          workflow_id: '12345678-1234-1234-1234-123456789abc'
        };

        const mockStatusResponse = {
          create_time: 1641039781802,
          update_time: 1641039781904,
          status: 'COMPLETED',
          end_time: 1641039781904,
          start_time: 1641039781802,
          workflow_id: workflowId,
          input: {},
          output: {}
        };

        mockGet.mockResolvedValue({
          status: 200,
          statusText: 'OK',
          data: mockStatusResponse
        });

        const result = await tool.handler(params, mockApiClient);
        const response = JSON.parse(result.content[0].text);

        expect(response.status).toBe('COMPLETED');
        expect(response.workflowId).toBe(workflowId);
      }
    });
  });
});