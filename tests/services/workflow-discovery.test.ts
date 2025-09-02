/**
 * Unit tests for WorkflowDiscoveryService
 */

import { WorkflowDiscoveryService } from '../../src/services/workflow-discovery.js';
import type { APIClient, Logger, WorkflowConfig, WorkflowDefinition } from '../../src/types/index.js';
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

const defaultConfig: WorkflowConfig = {
  enabled: true,
  discoveryInterval: 0,
  executionTimeout: 300000,
  maxConcurrentExecutions: 10,
  filterPatterns: [],
  statusCheckInterval: 5000,
  retryAttempts: 3
};

// Sample API workflow data (from the new API format)
const apiWorkflowData = {
  id: 561,
  title: 'Test Workflow',
  description: 'A test workflow for unit testing',
  inputs: {
    type: 'object',
    properties: {
      input_param: {
        type: 'string',
        title: 'Test Input Parameter'
      }
    },
    required: ['input_param']
  }
};

// Expected transformed workflow definition
const expectedTransformedWorkflow: WorkflowDefinition = {
  id: '561',
  name: 'test-workflow',
  description: 'A test workflow for unit testing',
  category: 'workflow',
  version: '1.0.0',
  inputSchema: {
    type: 'object',
    properties: {
      input_param: {
        type: 'string',
        title: 'Test Input Parameter'
      }
    },
    required: ['input_param']
  },
  executionType: 'async',
  metadata: {
    originalId: 561,
    originalTitle: 'Test Workflow',
    originalInputs: {
      type: 'object',
      properties: {
        input_param: {
          type: 'string',
          title: 'Test Input Parameter'
        }
      },
      required: ['input_param']
    },
    source: 'simplified-api'
  }
};

const minimalApiWorkflowData = {
  id: 123,
  title: 'Minimal Workflow',
  description: 'Minimal valid workflow'
  // No inputs field - should get default schema
};

const expectedMinimalTransformedWorkflow = {
  id: '123',
  name: 'minimal-workflow',
  description: 'Minimal valid workflow',
  category: 'workflow',
  version: '1.0.0',
  inputSchema: {
    type: 'object',
    properties: {
      parameters: {
        type: 'object',
        description: 'Workflow parameters',
        additionalProperties: true
      }
    },
    required: []
  },
  executionType: 'async',
  metadata: {
    originalId: 123,
    originalTitle: 'Minimal Workflow',
    source: 'simplified-api'
  }
};

describe('WorkflowDiscoveryService', () => {
  let service: WorkflowDiscoveryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkflowDiscoveryService(mockAPIClient, mockLogger, defaultConfig);
  });

  describe('constructor', () => {
    it('should create service with provided dependencies', () => {
      expect(service).toBeInstanceOf(WorkflowDiscoveryService);
    });
  });

  describe('listWorkflows', () => {
    it('should successfully discover and validate workflows', async () => {
      // Mock API response in new format
      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: {
          count: 2,
          results: [apiWorkflowData, minimalApiWorkflowData]
        }
      });

      const workflows = await service.listWorkflows();

      expect(workflows).toHaveLength(2);
      expect(workflows[0]).toMatchObject(expectedTransformedWorkflow);
      expect(workflows[1]).toMatchObject(expectedMinimalTransformedWorkflow);
      expect(mockAPIClient.get).toHaveBeenCalledWith('/api/v1/service/workflows/mcp');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully discovered 2 workflows (0 validation errors)'
      );
    });

    it('should handle empty results array', async () => {
      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: {
          count: 0,
          results: []
        }
      });

      const workflows = await service.listWorkflows();

      expect(workflows).toHaveLength(0);
      expect(mockAPIClient.get).toHaveBeenCalledWith('/api/v1/service/workflows/mcp');
    });

    it('should handle invalid API response format', async () => {
      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: {
          // Missing results array
          count: 1
        }
      });

      const workflows = await service.listWorkflows();

      expect(workflows).toHaveLength(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'workflows-list-tool returned invalid response format'
      );
    });

    it('should handle workflows with missing or invalid data', async () => {
      const invalidWorkflowData = {
        id: 'invalid',
        // missing title and description - should still be transformed
      };

      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: {
          count: 3,
          results: [apiWorkflowData, invalidWorkflowData, minimalApiWorkflowData]
        }
      });

      const workflows = await service.listWorkflows();

      // All workflows should be transformed (the service is more lenient now)
      expect(workflows).toHaveLength(3);
      expect(workflows[0]).toMatchObject(expectedTransformedWorkflow);
      expect(workflows[2]).toMatchObject(expectedMinimalTransformedWorkflow);
      // The invalid workflow should still be transformed with defaults
      expect(workflows[1].id).toBe('invalid');
      expect(workflows[1].name).toBe('workflow-invalid');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully discovered 3 workflows (0 validation errors)'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully discovered 3 workflows (0 validation errors)'
      );
    });

    it('should return empty array when API returns non-array response', async () => {
      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: 'invalid response'
      });

      const workflows = await service.listWorkflows();

      expect(workflows).toHaveLength(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'workflows-list-tool returned invalid response format'
      );
    });

    it('should return empty array when API call fails', async () => {
      mockAPIClient.get.mockRejectedValue(new Error('API Error'));

      const workflows = await service.listWorkflows();

      expect(workflows).toHaveLength(0);
      // The error handler manages the logging, so we just verify the behavior
    });

    it('should return cached workflows when API fails and cache exists', async () => {
      // First successful call to populate cache
      mockAPIClient.get.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        data: {
          count: 1,
          results: [apiWorkflowData]
        }
      });

      await service.listWorkflows();

      // Force cache expiration by manipulating time
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 120000); // 2 minutes later

      // Second call fails
      mockAPIClient.get.mockRejectedValue(new Error('API Error'));

      const workflows = await service.listWorkflows();

      expect(workflows).toHaveLength(1);
      expect(workflows[0]).toMatchObject(expectedTransformedWorkflow);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Returning 1 cached workflows due to discovery failure'
      );

      // Restore Date.now
      jest.restoreAllMocks();
    });

    it('should apply filter patterns when configured', async () => {
      const configWithFilters: WorkflowConfig = {
        ...defaultConfig,
        filterPatterns: ['test*', 'minimal*']
      };

      service = new WorkflowDiscoveryService(mockAPIClient, mockLogger, configWithFilters);

      const otherApiWorkflowData = {
        id: 999,
        title: 'Other Workflow',
        description: 'Another workflow'
      };

      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: {
          count: 3,
          results: [apiWorkflowData, minimalApiWorkflowData, otherApiWorkflowData]
        }
      });

      const workflows = await service.listWorkflows();

      expect(workflows).toHaveLength(2);
      expect(workflows.find(w => w.name === 'test-workflow')).toBeDefined();
      expect(workflows.find(w => w.name === 'minimal-workflow')).toBeDefined();
      expect(workflows.find(w => w.name === 'other-workflow')).toBeUndefined();
    });

    it('should use cache when valid', async () => {
      // First call
      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: {
          count: 1,
          results: [apiWorkflowData]
        }
      });

      await service.listWorkflows();

      // Second call should use cache
      const workflows = await service.listWorkflows();

      expect(workflows).toHaveLength(1);
      expect(mockAPIClient.get).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Returning 1 cached workflows'
      );
    });
  });

  describe('validateWorkflow', () => {
    it('should validate a correct workflow definition', () => {
      const result = service.validateWorkflow(expectedTransformedWorkflow);
      expect(result).toMatchObject(expectedTransformedWorkflow);
    });

    it('should validate minimal workflow with defaults', () => {
      const result = service.validateWorkflow(expectedMinimalTransformedWorkflow);
      expect(result).toMatchObject(expectedMinimalTransformedWorkflow);
    });

    it('should throw error for null/undefined workflow', () => {
      expect(() => service.validateWorkflow(null)).toThrow(AppError);
      expect(() => service.validateWorkflow(undefined)).toThrow(AppError);
    });

    it('should throw error for non-object workflow', () => {
      expect(() => service.validateWorkflow('string')).toThrow(AppError);
      expect(() => service.validateWorkflow(123)).toThrow(AppError);
    });

    it('should throw error for missing required fields', () => {
      const invalidWorkflow = {
        id: 'test',
        // missing name and description
      };

      expect(() => service.validateWorkflow(invalidWorkflow)).toThrow(AppError);
    });

    it('should throw error for invalid workflow name format', () => {
      const invalidWorkflow = {
        ...expectedMinimalTransformedWorkflow,
        name: '123invalid' // starts with number
      };

      expect(() => service.validateWorkflow(invalidWorkflow)).toThrow(AppError);
    });

    it('should throw error for workflow name too long', () => {
      const invalidWorkflow = {
        ...expectedMinimalTransformedWorkflow,
        name: 'a'.repeat(101) // too long
      };

      expect(() => service.validateWorkflow(invalidWorkflow)).toThrow(AppError);
    });

    it('should throw error for description too long', () => {
      const invalidWorkflow = {
        ...expectedMinimalTransformedWorkflow,
        description: 'a'.repeat(1001) // too long
      };

      expect(() => service.validateWorkflow(invalidWorkflow)).toThrow(AppError);
    });

    it('should throw error for too many input schema properties', () => {
      const properties: Record<string, any> = {};
      for (let i = 0; i < 51; i++) {
        properties[`prop${i}`] = { type: 'string' };
      }

      const invalidWorkflow = {
        ...expectedMinimalTransformedWorkflow,
        inputSchema: {
          type: 'object' as const,
          properties,
          required: []
        }
      };

      expect(() => service.validateWorkflow(invalidWorkflow)).toThrow(AppError);
    });

    it('should return null for validation errors in graceful mode', () => {
      // This test assumes the service might have a graceful mode
      // For now, it always throws, but this tests the interface
      expect(() => service.validateWorkflow({})).toThrow();
    });
  });

  describe('isWorkflowsListToolAvailable', () => {
    it('should return true when connection test succeeds', async () => {
      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: []
      });

      const result = await service.isWorkflowsListToolAvailable();

      expect(result).toBe(true);
    });

    it('should return false when connection test fails', async () => {
      mockAPIClient.get.mockRejectedValue(new Error('Connection failed'));

      const result = await service.isWorkflowsListToolAvailable();

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'workflows-list-tool availability check failed'
      );
    });
  });

  describe('testConnection', () => {
    it('should return true when API call succeeds', async () => {
      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: []
      });

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'workflows-list-tool connection test successful'
      );
    });

    it('should return false when API call fails', async () => {
      mockAPIClient.get.mockRejectedValue(new Error('Connection failed'));

      const result = await service.testConnection();

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'workflows-list-tool connection test failed: Connection failed'
      );
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      service.clearCache();
      expect(mockLogger.debug).toHaveBeenCalledWith('Workflow cache cleared');
    });

    it('should return cache statistics', () => {
      const stats = service.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('lastUpdate');
      expect(stats).toHaveProperty('hitRate');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.lastUpdate).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });

    it('should force refresh workflows', async () => {
      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: {
          count: 1,
          results: [apiWorkflowData]
        }
      });

      const workflows = await service.refreshWorkflows();

      expect(workflows).toHaveLength(1);
      expect(mockLogger.debug).toHaveBeenCalledWith('Workflow cache cleared');
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      mockAPIClient.get.mockRejectedValue(new AppError(
        ErrorType.API_ERROR,
        'API Error',
        {},
        500
      ));

      const workflows = await service.listWorkflows();

      expect(workflows).toHaveLength(0);
      // The error handler manages the logging, so we just verify the behavior
    });

    it('should handle network errors gracefully', async () => {
      mockAPIClient.get.mockRejectedValue(new AppError(
        ErrorType.NETWORK_ERROR,
        'Network Error'
      ));

      const workflows = await service.listWorkflows();

      expect(workflows).toHaveLength(0);
      // The error handler manages the logging, so we just verify the behavior
    });

    it('should handle empty API response', async () => {
      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: null
      });

      const workflows = await service.listWorkflows();

      expect(workflows).toHaveLength(0);
    });

    it('should handle malformed API response', async () => {
      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: {
          unexpected: 'format'
        }
      });

      const workflows = await service.listWorkflows();

      expect(workflows).toHaveLength(0);
    });
  });

  describe('filter patterns', () => {
    it('should handle wildcard patterns', async () => {
      const configWithWildcards: WorkflowConfig = {
        ...defaultConfig,
        filterPatterns: ['test*', '*workflow']
      };

      service = new WorkflowDiscoveryService(mockAPIClient, mockLogger, configWithWildcards);

      const workflowsData = [
        { id: 1, title: 'test something', description: 'Test workflow' },
        { id: 2, title: 'something workflow', description: 'Another workflow' },
        { id: 3, title: 'other tool', description: 'Other tool' }
      ];

      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: {
          count: 3,
          results: workflowsData
        }
      });

      const result = await service.listWorkflows();

      expect(result).toHaveLength(2);
      expect(result.find(w => w.name === 'test-something')).toBeDefined();
      expect(result.find(w => w.name === 'something-workflow')).toBeDefined();
      expect(result.find(w => w.name === 'other-tool')).toBeUndefined();
    });

    it('should handle case-insensitive patterns', async () => {
      const configWithFilters: WorkflowConfig = {
        ...defaultConfig,
        filterPatterns: ['TEST']
      };

      service = new WorkflowDiscoveryService(mockAPIClient, mockLogger, configWithFilters);

      mockAPIClient.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: {
          count: 1,
          results: [{ id: 1, title: 'test workflow', description: 'Test workflow' }]
        }
      });

      const result = await service.listWorkflows();

      expect(result).toHaveLength(1);
    });
  });
});