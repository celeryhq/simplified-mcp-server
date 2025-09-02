/**
 * Tests for WorkflowToolGenerator
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { WorkflowToolGenerator } from '../../src/services/workflow-tool-generator.js';
import { WorkflowExecutionService } from '../../src/services/workflow-execution.js';
import type {
  WorkflowDefinition,
  WorkflowExecutionResult,
  APIClient,
  Logger
} from '../../src/types/index.js';
import { AppError, ErrorType } from '../../src/types/index.js';

// Mock dependencies
const mockLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const mockAPIClient: APIClient = {
  makeRequest: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn()
};

const mockExecutionService = {
  executeWorkflow: jest.fn()
} as unknown as WorkflowExecutionService;

describe('WorkflowToolGenerator', () => {
  let generator: WorkflowToolGenerator;
  let config: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    config = {
      executionTimeout: 300000,
      statusCheckInterval: 5000,
      maxRetryAttempts: 3,
      toolNamePrefix: 'workflow'
    };

    generator = new WorkflowToolGenerator(
      mockLogger,
      config,
      mockExecutionService
    );
  });

  describe('convertWorkflowToTool', () => {
    it('should convert a valid workflow to a tool definition', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow-123',
        name: 'Test Workflow',
        description: 'A test workflow for unit testing',
        category: 'test',
        version: '1.0.0',
        inputSchema: {
          type: 'object',
          properties: {
            input_text: {
              type: 'string',
              description: 'Text to process'
            }
          },
          required: ['input_text']
        },
        executionType: 'async'
      };

      const toolDefinition = generator.convertWorkflowToTool(workflow);

      expect(toolDefinition.name).toBe('workflow_Test_Workflow');
      expect(toolDefinition.description).toBe('A test workflow for unit testing (Workflow ID: test-workflow-123) [async]');
      expect(toolDefinition.category).toBe('test');
      expect(toolDefinition.version).toBe('1.0.0');
      expect(toolDefinition.inputSchema).toEqual(workflow.inputSchema);
      expect(typeof toolDefinition.handler).toBe('function');
    });

    it('should use default values for optional fields', () => {
      const workflow: WorkflowDefinition = {
        id: 'minimal-workflow',
        name: 'Minimal Workflow',
        description: 'A minimal workflow',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      };

      const toolDefinition = generator.convertWorkflowToTool(workflow);

      expect(toolDefinition.category).toBe('workflow');
      expect(toolDefinition.version).toBe('1.0.0');
      expect(toolDefinition.description).toBe('A minimal workflow (Workflow ID: minimal-workflow)');
    });

    it('should throw error for invalid workflow definition', () => {
      const invalidWorkflow = {
        id: '',
        name: 'Invalid Workflow',
        description: 'Invalid workflow'
      } as WorkflowDefinition;

      expect(() => generator.convertWorkflowToTool(invalidWorkflow)).toThrow(AppError);
      expect(() => generator.convertWorkflowToTool(invalidWorkflow)).toThrow('Workflow ID is required');
    });

    it('should validate workflow input schema', () => {
      const workflowWithInvalidSchema = {
        id: 'invalid-schema',
        name: 'Invalid Schema',
        description: 'Workflow with invalid schema',
        inputSchema: {
          type: 'string' // Should be 'object'
        }
      } as WorkflowDefinition;

      expect(() => generator.convertWorkflowToTool(workflowWithInvalidSchema)).toThrow(AppError);
      expect(() => generator.convertWorkflowToTool(workflowWithInvalidSchema)).toThrow('inputSchema type must be "object"');
    });
  });

  describe('generateToolName', () => {
    it('should generate a unique tool name', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-123',
        name: 'Test Workflow',
        description: 'Test',
        inputSchema: { type: 'object', properties: {} }
      };

      const toolName = generator.generateToolName(workflow);
      expect(toolName).toBe('workflow_Test_Workflow');
    });

    it('should handle naming conflicts by appending workflow ID', () => {
      const workflow: WorkflowDefinition = {
        id: 'unique-id-123',
        name: 'Conflicting Name',
        description: 'Test',
        inputSchema: { type: 'object', properties: {} }
      };

      const existingNames = new Set(['workflow_Conflicting_Name']);
      const toolName = generator.generateToolName(workflow, existingNames);
      expect(toolName).toBe('workflow_Conflicting_Name_unique_id_123');
    });

    it('should sanitize invalid characters in tool names', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-123',
        name: 'Test@Workflow#With$Special%Characters!',
        description: 'Test',
        inputSchema: { type: 'object', properties: {} }
      };

      const toolName = generator.generateToolName(workflow);
      expect(toolName).toBe('workflow_Test_Workflow_With_Special_Characters');
    });

    it('should handle names that start with numbers', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-123',
        name: '123-numeric-start',
        description: 'Test',
        inputSchema: { type: 'object', properties: {} }
      };

      const toolName = generator.generateToolName(workflow);
      expect(toolName).toBe('workflow_workflow_123_numeric_start');
    });

    it('should prevent infinite loops with too many conflicts', () => {
      const workflow: WorkflowDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        inputSchema: { type: 'object', properties: {} }
      };

      // Create a set with many existing names to force conflict resolution
      const existingNames = new Set();
      existingNames.add('workflow_Test'); // Base name
      existingNames.add('workflow_Test_test'); // With ID
      for (let i = 1; i <= 1000; i++) {
        existingNames.add(`workflow_Test_${i}`); // Numeric suffixes
      }

      expect(() => generator.generateToolName(workflow, existingNames)).toThrow(AppError);
      expect(() => generator.generateToolName(workflow, existingNames)).toThrow('Unable to generate unique tool name');
    });
  });

  describe('validateWorkflowParameters', () => {
    const workflow: WorkflowDefinition = {
      id: 'validation-test',
      name: 'Validation Test',
      description: 'Test parameter validation',
      inputSchema: {
        type: 'object',
        properties: {
          required_string: {
            type: 'string',
            description: 'Required string parameter',
            minLength: 3,
            maxLength: 10
          },
          optional_number: {
            type: 'number',
            description: 'Optional number parameter',
            minimum: 0,
            maximum: 100
          },
          enum_field: {
            type: 'string',
            description: 'Enum field',
            enum: ['option1', 'option2', 'option3']
          }
        },
        required: ['required_string']
      }
    };

    it('should validate valid parameters', () => {
      const params = {
        required_string: 'valid',
        optional_number: 50,
        enum_field: 'option1'
      };

      expect(() => generator.validateWorkflowParameters(workflow, params)).not.toThrow();
    });

    it('should throw error for missing required parameters', () => {
      const params = {
        optional_number: 50
      };

      expect(() => generator.validateWorkflowParameters(workflow, params)).toThrow(AppError);
      expect(() => generator.validateWorkflowParameters(workflow, params)).toThrow('Missing required parameter: required_string');
    });

    it('should validate string constraints', () => {
      // Test minLength
      expect(() => generator.validateWorkflowParameters(workflow, { required_string: 'ab' })).toThrow('at least 3 characters');
      
      // Test maxLength
      expect(() => generator.validateWorkflowParameters(workflow, { required_string: 'this_is_too_long' })).toThrow('at most 10 characters');
    });

    it('should validate number constraints', () => {
      const params = { required_string: 'valid' };
      
      // Test minimum
      expect(() => generator.validateWorkflowParameters(workflow, { ...params, optional_number: -1 })).toThrow('at least 0');
      
      // Test maximum
      expect(() => generator.validateWorkflowParameters(workflow, { ...params, optional_number: 101 })).toThrow('at most 100');
    });

    it('should validate enum values', () => {
      const params = { required_string: 'valid' };
      
      expect(() => generator.validateWorkflowParameters(workflow, { ...params, enum_field: 'invalid_option' })).toThrow('must be one of: option1, option2, option3');
    });

    it('should validate parameter types', () => {
      // Test string type validation
      expect(() => generator.validateWorkflowParameters(workflow, { required_string: 123 })).toThrow('must be a string');
      
      // Test number type validation
      expect(() => generator.validateWorkflowParameters(workflow, { required_string: 'valid', optional_number: 'not_a_number' })).toThrow('must be a number');
    });

    it('should handle array validation', () => {
      const arrayWorkflow: WorkflowDefinition = {
        id: 'array-test',
        name: 'Array Test',
        description: 'Test array validation',
        inputSchema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              description: 'Array of strings',
              items: { type: 'string' },
              minItems: 1,
              maxItems: 3
            }
          }
        }
      };

      // Valid array
      expect(() => generator.validateWorkflowParameters(arrayWorkflow, { items: ['item1', 'item2'] })).not.toThrow();
      
      // Empty array (violates minItems)
      expect(() => generator.validateWorkflowParameters(arrayWorkflow, { items: [] })).toThrow('at least 1 items');
      
      // Too many items
      expect(() => generator.validateWorkflowParameters(arrayWorkflow, { items: ['1', '2', '3', '4'] })).toThrow('at most 3 items');
      
      // Invalid item type
      expect(() => generator.validateWorkflowParameters(arrayWorkflow, { items: ['valid', 123] })).toThrow('must be a string');
    });

    it('should warn about unexpected parameters', () => {
      const params = {
        required_string: 'valid',
        unexpected_param: 'value'
      };

      generator.validateWorkflowParameters(workflow, params);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected parameter \'unexpected_param\'')
      );
    });
  });

  describe('buildExecutionPayload', () => {
    it('should build payload in correct format', () => {
      const params = { key1: 'value1', key2: 'value2' };
      const payload = generator.buildExecutionPayload(params);

      expect(payload).toEqual({
        input: params,
        source: 'application'
      });
    });

    it('should handle empty parameters', () => {
      const payload = generator.buildExecutionPayload({});
      
      expect(payload).toEqual({
        input: {},
        source: 'application'
      });
    });

    it('should handle null/undefined parameters', () => {
      const payload = generator.buildExecutionPayload(null);
      
      expect(payload).toEqual({
        input: {},
        source: 'application'
      });
    });
  });

  describe('executeWorkflowTool', () => {
    const workflow: WorkflowDefinition = {
      id: 'execution-test',
      name: 'Execution Test',
      description: 'Test workflow execution',
      inputSchema: {
        type: 'object',
        properties: {
          input_text: { type: 'string' }
        },
        required: ['input_text']
      }
    };

    it('should execute workflow successfully', async () => {
      const params = { input_text: 'test input' };
      const mockResult: WorkflowExecutionResult = {
        success: true,
        correlationId: 'test-correlation-123',
        workflowInstanceId: 'instance-456',
        originalWorkflowId: 'execution-test',
        status: 'COMPLETED',
        output: { result: 'processed output' },
        executionDuration: 1500,
        startTime: 1000,
        endTime: 2500,
        createTime: 1000,
        updateTime: 2500
      };

      (mockExecutionService.executeWorkflow as jest.MockedFunction<any>).mockResolvedValue(mockResult);

      const result = await generator.executeWorkflowTool(workflow, params, mockAPIClient);

      expect(mockExecutionService.executeWorkflow).toHaveBeenCalledWith('execution-test', params);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      
      const resultData = JSON.parse(result.content[0].text);
      expect(resultData.success).toBe(true);
      expect(resultData.workflowId).toBe('execution-test');
      expect(resultData.correlationId).toBe('test-correlation-123');
      expect(resultData.executionDuration).toBe(1500);
    });

    it('should handle workflow execution failure', async () => {
      const params = { input_text: 'test input' };
      const mockResult: WorkflowExecutionResult = {
        success: false,
        correlationId: 'failed-correlation-123',
        workflowInstanceId: 'instance-456',
        originalWorkflowId: 'execution-test',
        status: 'FAILED',
        error: 'Workflow execution failed due to invalid input',
        startTime: 1000,
        endTime: 2000,
        createTime: 1000,
        updateTime: 2000
      };

      (mockExecutionService.executeWorkflow as jest.MockedFunction<any>).mockResolvedValue(mockResult);

      const result = await generator.executeWorkflowTool(workflow, params, mockAPIClient);

      expect(result.content).toBeDefined();
      expect(result.isError).toBe(true);
      
      const resultData = JSON.parse(result.content[0].text);
      expect(resultData.success).toBe(false);
      expect(resultData.error).toBe('Workflow execution failed due to invalid input');
    });

    it('should handle parameter validation errors', async () => {
      const invalidParams = {}; // Missing required parameter

      await expect(generator.executeWorkflowTool(workflow, invalidParams, mockAPIClient))
        .rejects.toThrow(AppError);
      await expect(generator.executeWorkflowTool(workflow, invalidParams, mockAPIClient))
        .rejects.toThrow('Missing required parameter: input_text');
    });

    it('should handle execution service errors', async () => {
      const params = { input_text: 'test input' };
      const executionError = new Error('Network connection failed');

      (mockExecutionService.executeWorkflow as jest.MockedFunction<any>).mockRejectedValue(executionError);

      await expect(generator.executeWorkflowTool(workflow, params, mockAPIClient))
        .rejects.toThrow(AppError);
      await expect(generator.executeWorkflowTool(workflow, params, mockAPIClient))
        .rejects.toThrow('Tool execution failed: Network connection failed');
    });

    it('should handle AppError from execution service', async () => {
      const params = { input_text: 'test input' };
      const appError = new AppError(ErrorType.API_ERROR, 'API timeout', { timeout: 30000 });

      (mockExecutionService.executeWorkflow as jest.MockedFunction<any>).mockRejectedValue(appError);

      await expect(generator.executeWorkflowTool(workflow, params, mockAPIClient))
        .rejects.toThrow('Tool execution failed: API timeout');
    });
  });

  describe('formatExecutionResult', () => {
    const workflow: WorkflowDefinition = {
      id: 'format-test',
      name: 'Format Test',
      description: 'Test result formatting',
      inputSchema: { type: 'object', properties: {} }
    };

    it('should format successful execution result', () => {
      const executionResult: WorkflowExecutionResult = {
        success: true,
        correlationId: 'success-123',
        workflowInstanceId: 'instance-456',
        originalWorkflowId: 'format-test',
        status: 'COMPLETED',
        output: { message: 'Success!' },
        executionDuration: 2000,
        startTime: 1000,
        endTime: 3000,
        createTime: 1000,
        updateTime: 3000
      };

      const result = generator.formatExecutionResult(executionResult, workflow);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.isError).toBeUndefined();

      const resultData = JSON.parse(result.content[0].text);
      expect(resultData.success).toBe(true);
      expect(resultData.workflowId).toBe('format-test');
      expect(resultData.workflowName).toBe('Format Test');
      expect(resultData.result).toEqual({ message: 'Success!' });
      expect(resultData.metadata.startTime).toBe(1000);
    });

    it('should format failed execution result', () => {
      const executionResult: WorkflowExecutionResult = {
        success: false,
        correlationId: 'failed-123',
        workflowInstanceId: 'instance-456',
        originalWorkflowId: 'format-test',
        status: 'FAILED',
        error: 'Processing failed',
        startTime: 1000,
        endTime: 2000,
        createTime: 1000,
        updateTime: 2000
      };

      const result = generator.formatExecutionResult(executionResult, workflow);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.isError).toBe(true);

      const resultData = JSON.parse(result.content[0].text);
      expect(resultData.success).toBe(false);
      expect(resultData.error).toBe('Processing failed');
      expect(resultData.status).toBe('FAILED');
    });
  });

  describe('utility methods', () => {
    it('should clear generated names', () => {
      const workflow: WorkflowDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        inputSchema: { type: 'object', properties: {} }
      };

      generator.convertWorkflowToTool(workflow);
      expect(generator.getGeneratedToolNames().length).toBeGreaterThan(0);

      generator.clearGeneratedNames();
      expect(generator.getGeneratedToolNames()).toEqual([]);
    });

    it('should return generation statistics', () => {
      const workflow1: WorkflowDefinition = {
        id: 'test1',
        name: 'Test 1',
        description: 'Test',
        inputSchema: { type: 'object', properties: {} }
      };

      const workflow2: WorkflowDefinition = {
        id: 'test2',
        name: 'Test 2',
        description: 'Test',
        inputSchema: { type: 'object', properties: {} }
      };

      generator.convertWorkflowToTool(workflow1);
      generator.convertWorkflowToTool(workflow2);

      const stats = generator.getGenerationStats();
      expect(stats.totalGenerated).toBe(2);
      expect(stats.cacheHits).toBe(0);
      expect(stats.errors).toBe(0);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle workflow with complex nested schema', () => {
      const complexWorkflow: WorkflowDefinition = {
        id: 'complex-test',
        name: 'Complex Test',
        description: 'Test complex schema',
        inputSchema: {
          type: 'object',
          properties: {
            nested_object: {
              type: 'object',
              properties: {
                inner_string: { type: 'string' },
                inner_array: {
                  type: 'array',
                  items: { type: 'number' }
                }
              },
              required: ['inner_string']
            }
          },
          required: ['nested_object']
        }
      };

      const toolDef = generator.convertWorkflowToTool(complexWorkflow);
      expect(toolDef.inputSchema.properties.nested_object).toBeDefined();
    });

    it('should handle empty workflow name', () => {
      const workflow: WorkflowDefinition = {
        id: 'empty-name-test',
        name: '',
        description: 'Test empty name',
        inputSchema: { type: 'object', properties: {} }
      };

      expect(() => generator.convertWorkflowToTool(workflow)).toThrow('Workflow name is required');
    });

    it('should handle workflow with no properties in schema', () => {
      const workflow: WorkflowDefinition = {
        id: 'no-props',
        name: 'No Properties',
        description: 'Test no properties',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      };

      const toolDef = generator.convertWorkflowToTool(workflow);
      expect(toolDef.inputSchema.properties).toEqual({});
    });
  });
});