/**
 * Unit tests for WorkflowToolManager
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WorkflowToolManager, type IWorkflowToolManager } from '../../src/services/workflow-tool-manager.js';
import { WorkflowDiscoveryService, type IWorkflowDiscoveryService } from '../../src/services/workflow-discovery.js';
import { WorkflowExecutionService } from '../../src/services/workflow-execution.js';
import { WorkflowStatusService } from '../../src/services/workflow-status.js';
import { ToolRegistry } from '../../src/tools/registry.js';
import type { 
  APIClient, 
  Logger, 
  ServerConfig, 
  WorkflowDefinition,
  WorkflowExecutionResult
} from '../../src/types/index.js';
import { AppError, ErrorType } from '../../src/types/index.js';

// Mock the service dependencies
jest.mock('../../src/services/workflow-discovery.js');
jest.mock('../../src/services/workflow-execution.js');
jest.mock('../../src/services/workflow-status.js');

describe('WorkflowToolManager', () => {
  let workflowToolManager: IWorkflowToolManager;
  let mockApiClient: APIClient;
  let mockLogger: Logger;
  let mockConfig: ServerConfig;
  let mockToolRegistry: ToolRegistry;
  let mockDiscoveryService: IWorkflowDiscoveryService;
  let mockExecutionService: WorkflowExecutionService;
  let mockStatusService: WorkflowStatusService;

  // Sample workflow definitions for testing
  const sampleWorkflows: WorkflowDefinition[] = [
    {
      id: '1',
      name: 'test_workflow_1',
      description: 'Test workflow 1',
      category: 'test',
      version: '1.0.0',
      inputSchema: {
        type: 'object',
        properties: {
          param1: { type: 'string', description: 'Test parameter 1' }
        },
        required: ['param1']
      },
      executionType: 'async'
    },
    {
      id: '2',
      name: 'test_workflow_2',
      description: 'Test workflow 2',
      inputSchema: {
        type: 'object',
        properties: {
          param2: { type: 'number', description: 'Test parameter 2' }
        }
      }
    }
  ];

  beforeEach(() => {
    // Create mock API client
    mockApiClient = {
      makeRequest: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn()
    };

    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Create mock config
    mockConfig = {
      apiToken: 'test-token',
      apiBaseUrl: 'https://api.test.com',
      logLevel: 'info',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      workflowsEnabled: true,
      workflowDiscoveryInterval: 0,
      workflowExecutionTimeout: 300000,
      workflowMaxConcurrentExecutions: 10,
      workflowFilterPatterns: [],
      workflowStatusCheckInterval: 5000,
      workflowRetryAttempts: 3
    };

    // Create mock tool registry
    mockToolRegistry = new ToolRegistry();
    jest.spyOn(mockToolRegistry, 'registerTool');
    jest.spyOn(mockToolRegistry, 'unregisterTool');
    jest.spyOn(mockToolRegistry, 'getTool');

    // Create mock services
    mockDiscoveryService = {
      listWorkflows: jest.fn(),
      validateWorkflow: jest.fn(),
      isWorkflowsListToolAvailable: jest.fn(),
      testConnection: jest.fn(),
      clearCache: jest.fn(),
      getCacheStats: jest.fn()
    };

    mockExecutionService = {
      executeWorkflow: jest.fn(),
      getExecutionStatus: jest.fn(),
      pollUntilComplete: jest.fn(),
      cancelExecution: jest.fn(),
      buildExecutionPayload: jest.fn(),
      buildExecutionEndpoint: jest.fn(),
      parseExecutionResponse: jest.fn(),
      setExecutionTimeout: jest.fn(),
      handleExecutionError: jest.fn(),
      getActiveExecutionsCount: jest.fn(),
      getActiveExecutionKeys: jest.fn(),
      cancelAllExecutions: jest.fn(),
      getConfig: jest.fn(),
      shutdown: jest.fn(),
      getPerformanceStats: jest.fn(),
      getPerformanceMonitor: jest.fn()
    };

    mockStatusService = {
      checkStatus: jest.fn(),
      pollWithInterval: jest.fn(),
      stopPolling: jest.fn(),
      trackExecution: jest.fn(),
      cleanupCompletedExecutions: jest.fn(),
      getTrackedExecutionsCount: jest.fn(),
      getTrackedExecutionKeys: jest.fn(),
      getExecutionTracker: jest.fn(),
      shutdown: jest.fn(),
      getConfig: jest.fn()
    };

    // Mock the service constructors
    (WorkflowDiscoveryService as any).mockImplementation(() => mockDiscoveryService);
    (WorkflowExecutionService as any).mockImplementation(() => mockExecutionService);
    (WorkflowStatusService as any).mockImplementation(() => mockStatusService);

    // Create WorkflowToolManager instance
    workflowToolManager = new WorkflowToolManager(
      mockApiClient,
      mockLogger,
      mockConfig,
      mockToolRegistry
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create WorkflowToolManager with all dependencies', () => {
      expect(workflowToolManager).toBeDefined();
      expect(WorkflowDiscoveryService).toHaveBeenCalledWith(
        mockApiClient,
        mockLogger,
        expect.objectContaining({
          enabled: true,
          discoveryInterval: 0,
          executionTimeout: 300000,
          maxConcurrentExecutions: 10,
          filterPatterns: [],
          statusCheckInterval: 5000,
          retryAttempts: 3
        })
      );
      expect(WorkflowExecutionService).toHaveBeenCalledWith(
        mockApiClient,
        mockLogger,
        expect.objectContaining({
          executionTimeout: 300000,
          statusCheckInterval: 5000,
          maxRetryAttempts: 3
        })
      );
      expect(WorkflowStatusService).toHaveBeenCalledWith(
        mockApiClient,
        mockLogger,
        expect.objectContaining({
          statusCheckInterval: 5000,
          maxRetryAttempts: 3,
          cleanupInterval: 300000
        })
      );
    });
  });

  describe('isEnabled', () => {
    it('should return true when workflows are enabled in config', () => {
      expect(workflowToolManager.isEnabled()).toBe(true);
    });

    it('should return false when workflows are disabled in config', () => {
      mockConfig.workflowsEnabled = false;
      const disabledManager = new WorkflowToolManager(
        mockApiClient,
        mockLogger,
        mockConfig,
        mockToolRegistry
      );
      expect(disabledManager.isEnabled()).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully when workflows are enabled and available', async () => {
      (mockDiscoveryService.isWorkflowsListToolAvailable as jest.MockedFunction<any>)
        .mockResolvedValue(true);
      (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
        .mockResolvedValue(sampleWorkflows);

      await workflowToolManager.initialize();

      expect(mockDiscoveryService.isWorkflowsListToolAvailable).toHaveBeenCalled();
      expect(mockDiscoveryService.listWorkflows).toHaveBeenCalled();
      expect(mockToolRegistry.registerTool).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('WorkflowToolManager initialized successfully')
      );
    });

    it('should handle disabled workflows gracefully', async () => {
      mockConfig.workflowsEnabled = false;
      const disabledManager = new WorkflowToolManager(
        mockApiClient,
        mockLogger,
        mockConfig,
        mockToolRegistry
      );

      await disabledManager.initialize();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Workflow tools are disabled in configuration'
      );
      expect(mockDiscoveryService.isWorkflowsListToolAvailable).not.toHaveBeenCalled();
    });

    it('should handle unavailable workflows-list-tool gracefully', async () => {
      (mockDiscoveryService.isWorkflowsListToolAvailable as jest.MockedFunction<any>)
        .mockResolvedValue(false);

      await workflowToolManager.initialize();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'workflows-list-tool is not available, workflow tools will be disabled'
      );
      expect(mockDiscoveryService.listWorkflows).not.toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      (mockDiscoveryService.isWorkflowsListToolAvailable as jest.MockedFunction<any>)
        .mockResolvedValue(true);
      (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
        .mockRejectedValue(new Error('Discovery failed'));

      await workflowToolManager.initialize();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize WorkflowToolManager')
      );
    });

    it('should not initialize twice', async () => {
      (mockDiscoveryService.isWorkflowsListToolAvailable as jest.MockedFunction<any>)
        .mockResolvedValue(true);
      (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
        .mockResolvedValue([]);

      await workflowToolManager.initialize();
      await workflowToolManager.initialize();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'WorkflowToolManager is already initialized'
      );
    });
  });

  describe('shutdown', () => {
    it('should shutdown all services and clean up resources', async () => {
      // Initialize first
      (mockDiscoveryService.isWorkflowsListToolAvailable as jest.MockedFunction<any>)
        .mockResolvedValue(true);
      (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
        .mockResolvedValue(sampleWorkflows);
      await workflowToolManager.initialize();

      // Now shutdown
      await workflowToolManager.shutdown();

      expect(mockStatusService.shutdown).toHaveBeenCalled();
      expect(mockExecutionService.shutdown).toHaveBeenCalled();
      expect(mockToolRegistry.unregisterTool).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'WorkflowToolManager shutdown complete'
      );
    });
  });

  describe('discoverWorkflows', () => {
    it('should discover workflows successfully', async () => {
      (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
        .mockResolvedValue(sampleWorkflows);

      const result = await workflowToolManager.discoverWorkflows();

      expect(result).toEqual(sampleWorkflows);
      expect(mockDiscoveryService.listWorkflows).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Discovered ${sampleWorkflows.length} workflows`
      );
    });

    it('should return empty array when workflows are disabled', async () => {
      mockConfig.workflowsEnabled = false;
      const disabledManager = new WorkflowToolManager(
        mockApiClient,
        mockLogger,
        mockConfig,
        mockToolRegistry
      );

      const result = await disabledManager.discoverWorkflows();

      expect(result).toEqual([]);
      expect(mockDiscoveryService.listWorkflows).not.toHaveBeenCalled();
    });

    it('should handle discovery errors gracefully', async () => {
      (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
        .mockRejectedValue(new Error('Discovery failed'));

      await expect(workflowToolManager.discoverWorkflows()).rejects.toThrow('Discovery failed');
    });
  });

  describe('registerWorkflowTools', () => {
    it('should register workflow tools successfully', () => {
      workflowToolManager.registerWorkflowTools(sampleWorkflows);

      expect(mockToolRegistry.registerTool).toHaveBeenCalledTimes(2);
      expect(workflowToolManager.getRegisteredWorkflowCount()).toBe(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('2 successful, 0 failed')
      );
    });

    it('should handle tool registration errors gracefully', () => {
      (mockToolRegistry.registerTool as jest.MockedFunction<any>)
        .mockImplementationOnce(() => {
          throw new Error('Registration failed');
        })
        .mockImplementationOnce(() => {
          // Second call succeeds
        });

      workflowToolManager.registerWorkflowTools(sampleWorkflows);

      expect(mockToolRegistry.registerTool).toHaveBeenCalledTimes(2);
      expect(workflowToolManager.getRegisteredWorkflowCount()).toBe(1);
      // The error handler logs both structured error and user-friendly message
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to generate tool for workflow test_workflow_1'),
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('1 successful, 1 failed')
      );
    });

    it('should replace existing tools with same name', () => {
      (mockToolRegistry.getTool as jest.MockedFunction<any>)
        .mockReturnValue({ name: 'workflow_test_workflow_1' });

      workflowToolManager.registerWorkflowTools([sampleWorkflows[0]]);

      expect(mockToolRegistry.unregisterTool).toHaveBeenCalledWith('workflow_test_workflow_1');
      expect(mockToolRegistry.registerTool).toHaveBeenCalled();
    });
  });

  describe('refreshWorkflows', () => {
    it('should refresh workflows successfully', async () => {
      (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
        .mockResolvedValue(sampleWorkflows);

      await workflowToolManager.refreshWorkflows();

      expect(mockDiscoveryService.listWorkflows).toHaveBeenCalled();
      expect(mockToolRegistry.registerTool).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Workflow refresh completed')
      );
    });

    it('should handle refresh errors', async () => {
      (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
        .mockRejectedValue(new Error('Discovery failed'));

      await expect(workflowToolManager.refreshWorkflows()).rejects.toThrow('Discovery failed');
    });
  });

  describe('getRegisteredWorkflowCount', () => {
    it('should return correct count of registered workflows', () => {
      expect(workflowToolManager.getRegisteredWorkflowCount()).toBe(0);

      workflowToolManager.registerWorkflowTools(sampleWorkflows);
      expect(workflowToolManager.getRegisteredWorkflowCount()).toBe(2);
    });
  });

  describe('getWorkflowToolNames', () => {
    it('should return names of registered workflow tools', () => {
      workflowToolManager.registerWorkflowTools(sampleWorkflows);
      
      const toolNames = workflowToolManager.getWorkflowToolNames();
      expect(toolNames).toContain('workflow_test_workflow_1_workflow_1');
      expect(toolNames).toContain('workflow_test_workflow_2_workflow_2');
      expect(toolNames).toHaveLength(2);
    });

    it('should return empty array when no workflows are registered', () => {
      const toolNames = workflowToolManager.getWorkflowToolNames();
      expect(toolNames).toEqual([]);
    });
  });

  describe('workflow tool execution', () => {
    beforeEach(() => {
      workflowToolManager.registerWorkflowTools([sampleWorkflows[0]]);
    });

    it('should execute workflow tool successfully', async () => {
      const mockResult: WorkflowExecutionResult = {
        success: true,
        correlationId: 'test-correlation-id',
        workflowInstanceId: 'test-instance-id',
        originalWorkflowId: '1',
        status: 'COMPLETED',
        output: { result: 'success' },
        executionDuration: 1000
      };

      (mockExecutionService.executeWorkflow as jest.MockedFunction<any>)
        .mockResolvedValue(mockResult);

      // Get the registered tool and execute it
      const tool = mockToolRegistry.registerTool.mock.calls[0][0];
      const result = await tool.handler({ param1: 'test' }, mockApiClient);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      
      const resultData = JSON.parse(result.content[0].text);
      expect(resultData.success).toBe(true);
      expect(resultData.workflowId).toBe('1');
      expect(resultData.workflowName).toBe('test_workflow_1');
      expect(resultData.correlationId).toBe('test-correlation-id');
      expect(resultData.executionDuration).toBe(1000);
      expect(resultData.result).toEqual({ result: 'success' });
      expect(resultData.status).toBe('COMPLETED');
      
      expect(mockExecutionService.executeWorkflow).toHaveBeenCalledWith('1', { param1: 'test' });
    });

    it('should handle workflow execution failure', async () => {
      const mockResult: WorkflowExecutionResult = {
        success: false,
        correlationId: 'test-correlation-id',
        workflowInstanceId: 'test-instance-id',
        originalWorkflowId: '1',
        status: 'FAILED',
        error: 'Execution failed'
      };

      (mockExecutionService.executeWorkflow as jest.MockedFunction<any>)
        .mockResolvedValue(mockResult);

      // Get the registered tool and execute it
      const tool = mockToolRegistry.registerTool.mock.calls[0][0];
      const result = await tool.handler({ param1: 'test' }, mockApiClient);
      
      expect(result.content).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      
      const resultData = JSON.parse(result.content[0].text);
      expect(resultData.success).toBe(false);
      expect(resultData.error).toBe('Execution failed');
      expect(resultData.status).toBe('FAILED');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Workflow tool execution failed')
      );
    });

    it('should handle workflow execution errors', async () => {
      (mockExecutionService.executeWorkflow as jest.MockedFunction<any>)
        .mockRejectedValue(new Error('Service error'));

      // Get the registered tool and execute it
      const tool = mockToolRegistry.registerTool.mock.calls[0][0];
      
      await expect(tool.handler({ param1: 'test' }, mockApiClient))
        .rejects.toThrow(AppError);
      
      // The error handler now logs with structured format
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Workflow error: EXECUTION_FAILED'),
        expect.any(Object)
      );
    });
  });

  describe('tool name generation', () => {
    it('should generate valid tool names', () => {
      const workflowWithInvalidName: WorkflowDefinition = {
        id: '3',
        name: 'invalid-name!@#$%^&*()',
        description: 'Test workflow with invalid name',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      };

      workflowToolManager.registerWorkflowTools([workflowWithInvalidName]);
      
      const toolNames = workflowToolManager.getWorkflowToolNames();
      expect(toolNames[0]).toMatch(/^[a-zA-Z][a-zA-Z0-9_-]*$/);
    });

    it('should handle name conflicts by appending workflow ID', () => {
      // First register a workflow to simulate existing tool
      workflowToolManager.registerWorkflowTools([sampleWorkflows[0]]);
      
      // Mock existing tool with same name for the second workflow
      (mockToolRegistry.getTool as jest.MockedFunction<any>)
        .mockReturnValue({ name: 'workflow_test_workflow_1' });

      // Create a workflow with the same name but different ID
      const conflictingWorkflow: WorkflowDefinition = {
        ...sampleWorkflows[0],
        id: '999', // Different ID
        name: 'test_workflow_1' // Same name
      };

      workflowToolManager.registerWorkflowTools([conflictingWorkflow]);
      
      const toolNames = workflowToolManager.getWorkflowToolNames();
      // The second workflow should get a numeric suffix since the first one already exists
      expect(toolNames).toContain('workflow_test_workflow_1_2');
    });
  });

  describe('auto-refresh functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start auto-refresh when interval is configured', async () => {
      mockConfig.workflowDiscoveryInterval = 60000; // 1 minute
      const managerWithAutoRefresh = new WorkflowToolManager(
        mockApiClient,
        mockLogger,
        mockConfig,
        mockToolRegistry
      );

      (mockDiscoveryService.isWorkflowsListToolAvailable as jest.MockedFunction<any>)
        .mockResolvedValue(true);
      (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
        .mockResolvedValue([]);

      await managerWithAutoRefresh.initialize();

      // Fast-forward time to trigger auto-refresh
      jest.advanceTimersByTime(60000);

      expect(mockDiscoveryService.listWorkflows).toHaveBeenCalledTimes(2); // Initial + auto-refresh
    });

    it('should not start auto-refresh when interval is 0', async () => {
      mockConfig.workflowDiscoveryInterval = 0;
      
      (mockDiscoveryService.isWorkflowsListToolAvailable as jest.MockedFunction<any>)
        .mockResolvedValue(true);
      (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
        .mockResolvedValue([]);

      await workflowToolManager.initialize();

      // Fast-forward time
      jest.advanceTimersByTime(60000);

      expect(mockDiscoveryService.listWorkflows).toHaveBeenCalledTimes(1); // Only initial call
    });
  });

  describe('getWorkflowStats', () => {
    it('should return correct workflow statistics', () => {
      workflowToolManager.registerWorkflowTools(sampleWorkflows);
      
      const stats = workflowToolManager.getWorkflowStats();
      
      expect(stats).toEqual({
        enabled: true,
        totalWorkflows: 2,
        lastRefreshTime: expect.any(Number),
        refreshAge: expect.any(Number),
        autoRefreshEnabled: false,
        autoRefreshInterval: 0
      });
    });
  });

  describe('getWorkflowById', () => {
    it('should return workflow by ID', () => {
      workflowToolManager.registerWorkflowTools(sampleWorkflows);
      
      const workflow = workflowToolManager.getWorkflowById('1');
      expect(workflow).toEqual(sampleWorkflows[0]);
    });

    it('should return undefined for non-existent workflow', () => {
      const workflow = workflowToolManager.getWorkflowById('non-existent');
      expect(workflow).toBeUndefined();
    });
  });

  describe('getAllWorkflows', () => {
    it('should return all registered workflows', () => {
      workflowToolManager.registerWorkflowTools(sampleWorkflows);
      
      const workflows = workflowToolManager.getAllWorkflows();
      expect(workflows).toEqual(sampleWorkflows);
    });
  });

  describe('forceRefresh', () => {
    it('should clear cache and refresh workflows', async () => {
      (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
        .mockResolvedValue(sampleWorkflows);

      await workflowToolManager.forceRefresh();

      expect(mockDiscoveryService.clearCache).toHaveBeenCalled();
      expect(mockDiscoveryService.listWorkflows).toHaveBeenCalled();
    });
  });

  describe('getDiscoveryCacheStats', () => {
    it('should return discovery cache statistics', () => {
      const mockStats = {
        cachedCount: 2,
        lastDiscoveryTime: Date.now(),
        cacheAge: 1000,
        isValid: true
      };

      (mockDiscoveryService.getCacheStats as jest.MockedFunction<any>)
        .mockReturnValue(mockStats);

      const stats = workflowToolManager.getDiscoveryCacheStats();
      expect(stats).toEqual(mockStats);
    });
  });

  describe('refresh and hot-reloading functionality', () => {
    beforeEach(() => {
      // Initialize with some workflows
      workflowToolManager.registerWorkflowTools(sampleWorkflows);
    });

    describe('incremental refresh', () => {
      it('should add new workflows during refresh', async () => {
        const newWorkflow: WorkflowDefinition = {
          id: '3',
          name: 'new_workflow',
          description: 'New workflow added',
          inputSchema: {
            type: 'object',
            properties: {
              param3: { type: 'string', description: 'New parameter' }
            }
          }
        };

        const updatedWorkflows = [...sampleWorkflows, newWorkflow];
        (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
          .mockResolvedValue(updatedWorkflows);

        await workflowToolManager.refreshWorkflows();

        expect(workflowToolManager.getRegisteredWorkflowCount()).toBe(3);
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('1 added, 0 updated, 0 removed, 2 unchanged')
        );
      });

      it('should remove workflows that are no longer available', async () => {
        // Return only the first workflow
        (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
          .mockResolvedValue([sampleWorkflows[0]]);

        await workflowToolManager.refreshWorkflows();

        expect(workflowToolManager.getRegisteredWorkflowCount()).toBe(1);
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('0 added, 0 updated, 1 removed, 1 unchanged')
        );
      });

      it('should update workflows that have changed', async () => {
        const updatedWorkflow: WorkflowDefinition = {
          ...sampleWorkflows[0],
          description: 'Updated description',
          version: '2.0.0'
        };

        const updatedWorkflows = [updatedWorkflow, sampleWorkflows[1]];
        (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
          .mockResolvedValue(updatedWorkflows);

        await workflowToolManager.refreshWorkflows();

        expect(workflowToolManager.getRegisteredWorkflowCount()).toBe(2);
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('0 added, 1 updated, 0 removed, 1 unchanged')
        );
      });

      it('should detect unchanged workflows correctly', async () => {
        // Return the same workflows
        (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
          .mockResolvedValue(sampleWorkflows);

        await workflowToolManager.refreshWorkflows();

        expect(workflowToolManager.getRegisteredWorkflowCount()).toBe(2);
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('0 added, 0 updated, 0 removed, 2 unchanged')
        );
      });

      it('should handle mixed changes in a single refresh', async () => {
        const newWorkflow: WorkflowDefinition = {
          id: '3',
          name: 'new_workflow',
          description: 'New workflow',
          inputSchema: { type: 'object', properties: {} }
        };

        const updatedWorkflow: WorkflowDefinition = {
          ...sampleWorkflows[0],
          description: 'Updated description'
        };

        // Return new workflow, updated first workflow, skip second workflow
        const mixedWorkflows = [updatedWorkflow, newWorkflow];
        (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
          .mockResolvedValue(mixedWorkflows);

        await workflowToolManager.refreshWorkflows();

        expect(workflowToolManager.getRegisteredWorkflowCount()).toBe(2);
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('1 added, 1 updated, 1 removed, 0 unchanged')
        );
      });

      it('should handle tool generation errors during refresh', async () => {
        const problematicWorkflow: WorkflowDefinition = {
          id: '3',
          name: 'problematic_workflow',
          description: 'This will cause an error',
          inputSchema: { type: 'object', properties: {} }
        };

        (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
          .mockResolvedValue([...sampleWorkflows, problematicWorkflow]);

        // Mock tool generation to fail for the problematic workflow
        const originalRegisterTool = mockToolRegistry.registerTool;
        (mockToolRegistry.registerTool as jest.MockedFunction<any>)
          .mockImplementation((toolDef: any) => {
            if (toolDef.name.includes('problematic')) {
              throw new Error('Tool generation failed');
            }
            return originalRegisterTool.call(mockToolRegistry, toolDef);
          });

        await workflowToolManager.refreshWorkflows();

        // Should still register the valid workflows
        expect(workflowToolManager.getRegisteredWorkflowCount()).toBe(2);
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to generate tool for workflow problematic_workflow'),
          expect.any(Object)
        );
      });
    });

    describe('triggerManualRefresh', () => {
      it('should successfully trigger manual refresh', async () => {
        const newWorkflow: WorkflowDefinition = {
          id: '3',
          name: 'manual_refresh_workflow',
          description: 'Added via manual refresh',
          inputSchema: { type: 'object', properties: {} }
        };

        (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
          .mockResolvedValue([...sampleWorkflows, newWorkflow]);

        const result = await workflowToolManager.triggerManualRefresh();

        expect(result.success).toBe(true);
        expect(result.stats).toEqual({
          added: 1,
          updated: 0,
          removed: 0,
          unchanged: 2
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Manual workflow refresh triggered');
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Manual refresh completed: 1 added, 0 updated, 0 removed, 2 unchanged')
        );
      });

      it('should handle manual refresh errors gracefully', async () => {
        (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
          .mockRejectedValue(new Error('Discovery service unavailable'));

        const result = await workflowToolManager.triggerManualRefresh();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Discovery service unavailable');
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Manual refresh failed: Discovery service unavailable')
        );
      });
    });

    describe('getRefreshStatus', () => {
      it('should return correct refresh status without auto-refresh', () => {
        const status = workflowToolManager.getRefreshStatus();

        expect(status).toEqual({
          enabled: true,
          lastRefreshTime: expect.any(Number),
          refreshAge: expect.any(Number),
          autoRefreshEnabled: false,
          autoRefreshInterval: 0
        });
      });

      it('should return correct refresh status with auto-refresh enabled', async () => {
        mockConfig.workflowDiscoveryInterval = 60000;
        const managerWithAutoRefresh = new WorkflowToolManager(
          mockApiClient,
          mockLogger,
          mockConfig,
          mockToolRegistry
        );

        // Register workflows and trigger a refresh to set lastRefreshTime
        managerWithAutoRefresh.registerWorkflowTools(sampleWorkflows);
        (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
          .mockResolvedValue(sampleWorkflows);
        await managerWithAutoRefresh.refreshWorkflows();

        const status = managerWithAutoRefresh.getRefreshStatus();

        expect(status).toEqual({
          enabled: true,
          lastRefreshTime: expect.any(Number),
          refreshAge: expect.any(Number),
          autoRefreshEnabled: true,
          autoRefreshInterval: 60000,
          nextRefreshIn: expect.any(Number)
        });
        expect(status.lastRefreshTime).toBeGreaterThan(0);
        expect(status.nextRefreshIn).toBeGreaterThanOrEqual(0);
      });

      it('should return disabled status when workflows are disabled', () => {
        mockConfig.workflowsEnabled = false;
        const disabledManager = new WorkflowToolManager(
          mockApiClient,
          mockLogger,
          mockConfig,
          mockToolRegistry
        );

        const status = disabledManager.getRefreshStatus();

        expect(status.enabled).toBe(false);
      });
    });

    describe('workflow change detection', () => {
      it('should detect name changes', async () => {
        const changedWorkflow: WorkflowDefinition = {
          ...sampleWorkflows[0],
          name: 'changed_name'
        };

        (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
          .mockResolvedValue([changedWorkflow, sampleWorkflows[1]]);

        await workflowToolManager.refreshWorkflows();

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('0 added, 1 updated, 0 removed, 1 unchanged')
        );
      });

      it('should detect description changes', async () => {
        const changedWorkflow: WorkflowDefinition = {
          ...sampleWorkflows[0],
          description: 'Changed description'
        };

        (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
          .mockResolvedValue([changedWorkflow, sampleWorkflows[1]]);

        await workflowToolManager.refreshWorkflows();

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('0 added, 1 updated, 0 removed, 1 unchanged')
        );
      });

      it('should detect input schema changes', async () => {
        const changedWorkflow: WorkflowDefinition = {
          ...sampleWorkflows[0],
          inputSchema: {
            type: 'object',
            properties: {
              newParam: { type: 'string', description: 'New parameter' }
            }
          }
        };

        (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
          .mockResolvedValue([changedWorkflow, sampleWorkflows[1]]);

        await workflowToolManager.refreshWorkflows();

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('0 added, 1 updated, 0 removed, 1 unchanged')
        );
      });

      it('should detect version changes', async () => {
        const changedWorkflow: WorkflowDefinition = {
          ...sampleWorkflows[0],
          version: '2.0.0'
        };

        (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
          .mockResolvedValue([changedWorkflow, sampleWorkflows[1]]);

        await workflowToolManager.refreshWorkflows();

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('0 added, 1 updated, 0 removed, 1 unchanged')
        );
      });

      it('should detect metadata changes', async () => {
        const changedWorkflow: WorkflowDefinition = {
          ...sampleWorkflows[0],
          metadata: { newKey: 'newValue' }
        };

        (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
          .mockResolvedValue([changedWorkflow, sampleWorkflows[1]]);

        await workflowToolManager.refreshWorkflows();

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('0 added, 1 updated, 0 removed, 1 unchanged')
        );
      });
    });

    describe('auto-refresh with incremental updates', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should set up auto-refresh timer when interval is configured', async () => {
        mockConfig.workflowDiscoveryInterval = 60000;
        const managerWithAutoRefresh = new WorkflowToolManager(
          mockApiClient,
          mockLogger,
          mockConfig,
          mockToolRegistry
        );

        (mockDiscoveryService.isWorkflowsListToolAvailable as jest.MockedFunction<any>)
          .mockResolvedValue(true);
        (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
          .mockResolvedValue(sampleWorkflows);

        await managerWithAutoRefresh.initialize();

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Starting auto-refresh timer with interval: 60000ms')
        );

        await managerWithAutoRefresh.shutdown();
      });

      it('should use incremental updates in manual refresh', async () => {
        // Test incremental updates through manual refresh instead of auto-refresh
        const newWorkflow: WorkflowDefinition = {
          id: '3',
          name: 'manual_refresh_workflow',
          description: 'Added via manual refresh',
          inputSchema: { type: 'object', properties: {} }
        };

        (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
          .mockResolvedValue([...sampleWorkflows, newWorkflow]);

        const result = await workflowToolManager.triggerManualRefresh();

        expect(result.success).toBe(true);
        expect(result.stats).toEqual({
          added: 1,
          updated: 0,
          removed: 0,
          unchanged: 2
        });
      });

      it('should handle refresh errors in manual refresh', async () => {
        (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
          .mockRejectedValue(new Error('Manual refresh discovery failed'));

        const result = await workflowToolManager.triggerManualRefresh();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Manual refresh discovery failed');
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Manual refresh failed: Manual refresh discovery failed')
        );
      });
    });

    describe('cleanup and resource management', () => {
      it('should properly clean up removed workflows', async () => {
        // Start with 2 workflows
        expect(workflowToolManager.getRegisteredWorkflowCount()).toBe(2);

        // Return empty list to simulate all workflows being removed
        (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
          .mockResolvedValue([]);

        await workflowToolManager.refreshWorkflows();

        expect(workflowToolManager.getRegisteredWorkflowCount()).toBe(0);
        expect(mockToolRegistry.unregisterTool).toHaveBeenCalledTimes(2);
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('0 added, 0 updated, 2 removed, 0 unchanged')
        );
      });

      it('should handle partial cleanup failures gracefully', async () => {
        // Mock unregisterTool to fail for one tool
        (mockToolRegistry.unregisterTool as jest.MockedFunction<any>)
          .mockReturnValueOnce(false) // First call fails
          .mockReturnValueOnce(true); // Second call succeeds

        // Return empty list to trigger removal
        (mockDiscoveryService.listWorkflows as jest.MockedFunction<any>)
          .mockResolvedValue([]);

        await workflowToolManager.refreshWorkflows();

        // Should still attempt to remove both tools
        expect(mockToolRegistry.unregisterTool).toHaveBeenCalledTimes(2);
      });
    });
  });
});