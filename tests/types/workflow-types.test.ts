/**
 * Tests for workflow types and validation schemas
 */

import {
  WorkflowDefinition,
  WorkflowExecutionResult,
  WorkflowStatus,
  WorkflowConfig,
  WorkflowDefinitionSchema,
  WorkflowExecutionResultSchema,
  WorkflowStatusSchema,
  WorkflowConfigSchema,
  isWorkflowDefinition,
  isWorkflowStatus,
  isWorkflowExecutionResult,
  isWorkflowConfig
} from '../../src/types/index.js';

describe('Workflow Types and Schemas', () => {
  describe('WorkflowDefinition', () => {
    const validWorkflowDefinition: WorkflowDefinition = {
      id: 'test-workflow-123',
      name: 'Test Workflow',
      description: 'A test workflow for validation',
      category: 'test',
      version: '1.0.0',
      inputSchema: {
        type: 'object',
        properties: {
          input_param: { type: 'string' }
        },
        required: ['input_param']
      },
      executionType: 'async',
      metadata: { author: 'test' }
    };

    it('should validate a valid workflow definition', () => {
      const result = WorkflowDefinitionSchema.safeParse(validWorkflowDefinition);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validWorkflowDefinition);
      }
    });

    it('should apply defaults for optional fields', () => {
      const minimalWorkflow = {
        id: 'minimal-workflow',
        name: 'Minimal Workflow',
        description: 'A minimal workflow',
        inputSchema: {
          type: 'object' as const,
          properties: {}
        }
      };

      const result = WorkflowDefinitionSchema.safeParse(minimalWorkflow);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.category).toBe('workflow');
        expect(result.data.version).toBe('1.0.0');
        expect(result.data.executionType).toBe('async');
      }
    });

    it('should reject invalid workflow definition', () => {
      const invalidWorkflow = {
        id: '',
        name: 'Test Workflow',
        description: 'A test workflow'
        // Missing required inputSchema
      };

      const result = WorkflowDefinitionSchema.safeParse(invalidWorkflow);
      expect(result.success).toBe(false);
    });

    it('should work with type guard', () => {
      expect(isWorkflowDefinition(validWorkflowDefinition)).toBe(true);
      expect(isWorkflowDefinition({ invalid: 'object' })).toBe(false);
    });
  });

  describe('WorkflowStatus', () => {
    const validWorkflowStatus: WorkflowStatus = {
      create_time: 1753703781802,
      update_time: 1753703781904,
      status: 'COMPLETED',
      end_time: 1753703781904,
      start_time: 1753703781802,
      workflow_id: '2724',
      input: {
        target_domain: 'example.com',
        context: {
          user_id: 556565,
          workspace_id: 82515
        }
      },
      output: {
        result: 'success'
      },
      correlationId: '2724_9a92222c2ca34fffbfd00e8767dd22d0',
      workflowInstanceId: '8f496b6a-c905-41bb-b7b7-200a8982ab30',
      progress: 100
    };

    it('should validate a valid workflow status', () => {
      const result = WorkflowStatusSchema.safeParse(validWorkflowStatus);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validWorkflowStatus);
      }
    });

    it('should validate minimal workflow status', () => {
      const minimalStatus = {
        create_time: 1753703781802,
        update_time: 1753703781904,
        status: 'RUNNING' as const,
        start_time: 1753703781802,
        workflow_id: '2724',
        input: {},
        output: {}
      };

      const result = WorkflowStatusSchema.safeParse(minimalStatus);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status values', () => {
      const invalidStatus = {
        ...validWorkflowStatus,
        status: 'INVALID_STATUS'
      };

      const result = WorkflowStatusSchema.safeParse(invalidStatus);
      expect(result.success).toBe(false);
    });

    it('should work with type guard', () => {
      expect(isWorkflowStatus(validWorkflowStatus)).toBe(true);
      expect(isWorkflowStatus({ invalid: 'object' })).toBe(false);
    });
  });

  describe('WorkflowExecutionResult', () => {
    const validExecutionResult: WorkflowExecutionResult = {
      success: true,
      correlationId: '2724_9a92222c2ca34fffbfd00e8767dd22d0',
      workflowInstanceId: '8f496b6a-c905-41bb-b7b7-200a8982ab30',
      originalWorkflowId: '2724',
      status: 'COMPLETED',
      input: { target_domain: 'example.com' },
      output: { result: 'success' },
      startTime: 1753703781802,
      endTime: 1753703781904,
      createTime: 1753703781802,
      updateTime: 1753703781904,
      executionDuration: 102,
      executionResponse: {
        correlation_id: '2724_9a92222c2ca34fffbfd00e8767dd22d0',
        workflow_id: '8f496b6a-c905-41bb-b7b7-200a8982ab30'
      },
      metadata: { source: 'test' }
    };

    it('should validate a valid execution result', () => {
      const result = WorkflowExecutionResultSchema.safeParse(validExecutionResult);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validExecutionResult);
      }
    });

    it('should validate minimal execution result', () => {
      const minimalResult = {
        success: false,
        correlationId: '2724_test',
        workflowInstanceId: 'test-uuid',
        originalWorkflowId: '2724',
        status: 'FAILED' as const,
        error: 'Execution failed'
      };

      const result = WorkflowExecutionResultSchema.safeParse(minimalResult);
      expect(result.success).toBe(true);
    });

    it('should work with type guard', () => {
      expect(isWorkflowExecutionResult(validExecutionResult)).toBe(true);
      expect(isWorkflowExecutionResult({ invalid: 'object' })).toBe(false);
    });
  });

  describe('WorkflowConfig', () => {
    const validWorkflowConfig: WorkflowConfig = {
      enabled: true,
      discoveryInterval: 60000,
      executionTimeout: 300000,
      maxConcurrentExecutions: 10,
      filterPatterns: ['test-*', 'prod-*'],
      statusCheckInterval: 5000,
      retryAttempts: 3
    };

    it('should validate a valid workflow config', () => {
      const result = WorkflowConfigSchema.safeParse(validWorkflowConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validWorkflowConfig);
      }
    });

    it('should apply defaults for optional fields', () => {
      const minimalConfig = {
        enabled: true
      };

      const result = WorkflowConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.discoveryInterval).toBe(0);
        expect(result.data.executionTimeout).toBe(300000);
        expect(result.data.maxConcurrentExecutions).toBe(10);
        expect(result.data.filterPatterns).toEqual([]);
        expect(result.data.statusCheckInterval).toBe(5000);
        expect(result.data.retryAttempts).toBe(3);
      }
    });

    it('should reject invalid config values', () => {
      const invalidConfig = {
        enabled: true,
        executionTimeout: -1000 // Negative timeout should be invalid
      };

      const result = WorkflowConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should work with type guard', () => {
      expect(isWorkflowConfig(validWorkflowConfig)).toBe(true);
      expect(isWorkflowConfig({ invalid: 'object' })).toBe(false);
    });
  });

  describe('Schema Integration', () => {
    it('should handle complex nested validation', () => {
      const complexWorkflow: WorkflowDefinition = {
        id: 'complex-workflow',
        name: 'Complex Workflow',
        description: 'A complex workflow with nested schema',
        inputSchema: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string' }
              }
            },
            settings: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['user']
        },
        metadata: {
          tags: ['complex', 'nested'],
          author: 'test-user',
          version: '2.0.0'
        }
      };

      const result = WorkflowDefinitionSchema.safeParse(complexWorkflow);
      expect(result.success).toBe(true);
    });

    it('should validate workflow execution with status response', () => {
      const statusResponse: WorkflowStatus = {
        create_time: 1753703781802,
        update_time: 1753703781904,
        status: 'COMPLETED',
        end_time: 1753703781904,
        start_time: 1753703781802,
        workflow_id: '2724',
        input: { param: 'value' },
        output: { result: 'success' }
      };

      const executionResult: WorkflowExecutionResult = {
        success: true,
        correlationId: '2724_test',
        workflowInstanceId: 'test-uuid',
        originalWorkflowId: '2724',
        status: 'COMPLETED',
        statusResponse
      };

      const result = WorkflowExecutionResultSchema.safeParse(executionResult);
      expect(result.success).toBe(true);
    });
  });
});