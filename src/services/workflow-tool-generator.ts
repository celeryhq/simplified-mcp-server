/**
 * WorkflowToolGenerator - Converts WorkflowDefinitions to ToolDefinitions
 * Handles dynamic tool generation, parameter validation, and execution
 */

import type {
  WorkflowDefinition,
  ToolDefinition,
  APIClient,
  Logger,
  WorkflowExecutionResult
} from '../types/index.js';
import { AppError, ErrorType } from '../types/index.js';
import { WorkflowExecutionService } from './workflow-execution.js';
import { WorkflowErrorHandler } from '../utils/workflow-error-handler.js';

/**
 * Configuration for workflow tool generation
 */
export interface WorkflowToolGeneratorConfig {
  executionTimeout: number;      // Default execution timeout in ms
  statusCheckInterval: number;   // Status polling interval in ms
  maxRetryAttempts: number;      // Max retry attempts for failed requests
  toolNamePrefix?: string;       // Optional prefix for generated tool names
}

/**
 * Interface for WorkflowToolGenerator
 */
export interface IWorkflowToolGenerator {
  // Tool generation
  convertWorkflowToTool(workflow: WorkflowDefinition): ToolDefinition;
  generateToolName(workflow: WorkflowDefinition, existingNames?: Set<string>): string;
  
  // Parameter handling
  validateWorkflowParameters(workflow: WorkflowDefinition, params: any): void;
  buildExecutionPayload(params: any): { input: any; source: string };
  
  // Execution handling
  executeWorkflowTool(workflow: WorkflowDefinition, params: any, apiClient: APIClient): Promise<any>;
  formatExecutionResult(result: WorkflowExecutionResult, workflow: WorkflowDefinition): any;
  
  // Cache and statistics management
  clearGeneratedNames(): void;
  getGenerationStats(): { totalGenerated: number; cacheHits: number; errors: number };
}

/**
 * WorkflowToolGenerator implementation
 * Handles conversion from WorkflowDefinition to ToolDefinition
 */
export class WorkflowToolGenerator implements IWorkflowToolGenerator {
  private logger: Logger;
  private config: WorkflowToolGeneratorConfig;
  private executionService: WorkflowExecutionService;
  private errorHandler: WorkflowErrorHandler;
  private generatedToolNames: Set<string> = new Set();
  private cacheHits: number = 0;
  private errors: number = 0;

  constructor(
    logger: Logger,
    config: WorkflowToolGeneratorConfig,
    executionService: WorkflowExecutionService
  ) {
    this.logger = logger;
    this.config = config;
    this.executionService = executionService;
    this.errorHandler = new WorkflowErrorHandler(logger);
  }

  /**
   * Convert a WorkflowDefinition to a ToolDefinition
   * @param workflow Workflow definition to convert
   * @returns ToolDefinition MCP tool definition
   */
  convertWorkflowToTool(workflow: WorkflowDefinition): ToolDefinition {
    // this.logger.debug(`Converting workflow to tool: ${workflow.name} (${workflow.id})`);

    // Validate workflow definition
    this.validateWorkflowDefinition(workflow);

    // Generate unique tool name
    const toolName = this.generateToolName(workflow, this.generatedToolNames);
    this.generatedToolNames.add(toolName);

    // Convert input schema with validation
    const inputSchema = this.convertInputSchema(workflow.inputSchema);

    // Create tool definition
    const toolDefinition: ToolDefinition = {
      name: toolName,
      description: this.enhanceToolDescription(workflow),
      category: workflow.category || 'workflow',
      version: workflow.version || '1.0.0',
      inputSchema,
      handler: async (params: any, apiClient: APIClient) => {
        return this.executeWorkflowTool(workflow, params, apiClient);
      }
    };

    // this.logger.debug(`Successfully converted workflow to tool: ${toolName}`);
    return toolDefinition;
  }

  /**
   * Generate a unique tool name from workflow definition
   * Handles naming conflicts and ensures MCP compliance
   * @param workflow Workflow definition
   * @param existingNames Set of existing tool names to avoid conflicts
   * @returns string Unique tool name
   */
  generateToolName(workflow: WorkflowDefinition, existingNames?: Set<string>): string {
    const existing = existingNames || new Set();
    
    // Start with sanitized workflow name
    let baseName = this.sanitizeToolName(workflow.name);
    
    // Add prefix if configured
    if (this.config.toolNamePrefix) {
      baseName = `${this.config.toolNamePrefix}_${baseName}`;
    }

    // Check for conflicts and generate unique name
    let toolName = baseName;
    let counter = 1;

    while (existing.has(toolName)) {
      this.cacheHits++; // Track cache hits when name conflicts occur
      
      // Try with workflow ID first
      if (counter === 1) {
        toolName = `${baseName}_${this.sanitizeToolName(workflow.id)}`;
      } else {
        // Use numeric suffix
        toolName = `${baseName}_${counter}`;
      }
      counter++;

      // Prevent infinite loop
      if (counter > 1000) {
        this.errors++; // Track error
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Unable to generate unique tool name for workflow: ${workflow.name}`,
          { workflowId: workflow.id, baseName, attempts: counter }
        );
      }
    }

    // this.logger.debug(`Generated tool name: ${toolName} for workflow: ${workflow.name}`);
    return toolName;
  }

  /**
   * Validate workflow parameters against the workflow's input schema
   * @param workflow Workflow definition with input schema
   * @param params Parameters to validate
   * @throws AppError if validation fails
   */
  validateWorkflowParameters(workflow: WorkflowDefinition, params: any): void {
    const schema = workflow.inputSchema;

    // Validate required parameters
    if (schema.required && Array.isArray(schema.required)) {
      for (const requiredField of schema.required) {
        if (!(requiredField in params)) {
          this.errors++;
          throw new AppError(
            ErrorType.VALIDATION_ERROR,
            `Missing required parameter: ${requiredField}`,
            { workflowId: workflow.id, requiredField, providedParams: Object.keys(params) }
          );
        }
      }
    }

    // Validate parameter types and constraints
    if (schema.properties) {
      for (const [key, value] of Object.entries(params)) {
        const propSchema = schema.properties[key];
        if (propSchema) {
          this.validateParameterValue(key, value, propSchema, workflow.id);
        } else {
          // Log warning for unexpected parameters but don't fail
          this.logger.warn(
            `Unexpected parameter '${key}' for workflow ${workflow.id}, ignoring`
          );
        }
      }
    }
  }

  /**
   * Build execution payload in the required format for Simplified API
   * @param params Raw parameters from MCP tool call
   * @returns Object with input and source fields
   */
  buildExecutionPayload(params: any): { input: any; source: string } {
    return {
      input: params || {},
      source: 'application'
    };
  }

  /**
   * Execute a workflow tool with proper error handling and result formatting
   * @param workflow Workflow definition
   * @param params Tool parameters
   * @param apiClient API client instance
   * @returns Promise<any> Formatted execution result
   */
  async executeWorkflowTool(
    workflow: WorkflowDefinition,
    params: any,
    apiClient: APIClient
  ): Promise<any> {
    this.logger.info(`Executing workflow tool: ${workflow.name} (${workflow.id})`);

    try {
      // Validate parameters
      this.validateWorkflowParameters(workflow, params);

      // Execute the workflow
      const result = await this.executionService.executeWorkflow(workflow.id, params);
      
      // Format and return result
      return this.formatExecutionResult(result, workflow);

    } catch (error) {
      this.errors++; // Track error
      
      // Use error handler to create MCP-formatted error response
      const mcpError = this.errorHandler.createWorkflowToolErrorResponse(
        error instanceof Error ? error : new Error(String(error)),
        workflow.name,
        params,
        { 
          workflowId: workflow.id,
          operation: 'workflow_tool_execution'
        }
      );
      
      // Throw an error that includes the MCP error data
      const enhancedError = new AppError(
        ErrorType.TOOL_ERROR,
        mcpError.message,
        mcpError.data
      );
      
      throw enhancedError;
    }
  }

  /**
   * Format workflow execution result for MCP response
   * @param result Workflow execution result
   * @param workflow Workflow definition
   * @returns Formatted result object
   */
  formatExecutionResult(result: WorkflowExecutionResult, workflow: WorkflowDefinition): any {
    if (result.success) {
      this.logger.info(
        `Workflow tool execution successful: ${workflow.name}, duration: ${result.executionDuration}ms`
      );
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              workflowId: workflow.id,
              workflowName: workflow.name,
              correlationId: result.correlationId,
              executionDuration: result.executionDuration,
              status: result.status,
              result: result.output || {},
              metadata: {
                startTime: result.startTime,
                endTime: result.endTime,
                createTime: result.createTime,
                updateTime: result.updateTime
              }
            }, null, 2)
          }
        ]
      };
    } else {
      this.logger.error(
        `Workflow tool execution failed: ${workflow.name}, error: ${result.error}`
      );
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              workflowId: workflow.id,
              workflowName: workflow.name,
              correlationId: result.correlationId,
              status: result.status,
              error: result.error,
              metadata: {
                startTime: result.startTime,
                endTime: result.endTime,
                createTime: result.createTime,
                updateTime: result.updateTime
              }
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Clear generated tool names cache
   */
  clearGeneratedNames(): void {
    this.generatedToolNames.clear();
    this.cacheHits = 0;
    this.errors = 0;
  }

  /**
   * Get all generated tool names
   * @returns string[] Array of generated tool names
   */
  getGeneratedToolNames(): string[] {
    return Array.from(this.generatedToolNames);
  }

  /**
   * Get generation statistics
   * @returns Object with generation statistics
   */
  getGenerationStats(): { totalGenerated: number; cacheHits: number; errors: number } {
    return {
      totalGenerated: this.generatedToolNames.size,
      cacheHits: this.cacheHits,
      errors: this.errors
    };
  }

  /**
   * Validate workflow definition structure
   * @param workflow Workflow definition to validate
   * @throws AppError if validation fails
   */
  private validateWorkflowDefinition(workflow: WorkflowDefinition): void {
    if (!workflow.id || typeof workflow.id !== 'string') {
      this.errors++;
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Workflow ID is required and must be a string'
      );
    }

    if (!workflow.name || typeof workflow.name !== 'string') {
      this.errors++;
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Workflow name is required and must be a string'
      );
    }

    if (!workflow.description || typeof workflow.description !== 'string') {
      this.errors++;
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Workflow description is required and must be a string'
      );
    }

    if (!workflow.inputSchema || typeof workflow.inputSchema !== 'object') {
      this.errors++;
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Workflow inputSchema is required and must be an object'
      );
    }

    if (workflow.inputSchema.type !== 'object') {
      this.errors++;
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Workflow inputSchema type must be "object"'
      );
    }

    if (!workflow.inputSchema.properties || typeof workflow.inputSchema.properties !== 'object') {
      this.errors++;
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Workflow inputSchema must have properties object'
      );
    }
  }

  /**
   * Convert workflow input schema to tool input schema
   * @param inputSchema Workflow input schema
   * @returns Converted input schema
   */
  private convertInputSchema(inputSchema: WorkflowDefinition['inputSchema']): ToolDefinition['inputSchema'] {
    // For now, we pass through the schema as-is since they have the same structure
    // In the future, we might need to transform certain schema elements
    const convertedSchema: ToolDefinition['inputSchema'] = {
      type: 'object',
      properties: { ...inputSchema.properties }
    };
    
    // Handle optional required array - only set if it exists and has items
    if (inputSchema.required && inputSchema.required.length > 0) {
      convertedSchema.required = [...inputSchema.required];
    }
    
    return convertedSchema;
  }

  /**
   * Enhance tool description with workflow metadata
   * @param workflow Workflow definition
   * @returns Enhanced description
   */
  private enhanceToolDescription(workflow: WorkflowDefinition): string {
    let description = workflow.description;
    
    // Add workflow ID for reference
    description += ` (Workflow ID: ${workflow.id})`;
    
    // Add execution type if specified
    if (workflow.executionType) {
      description += ` [${workflow.executionType}]`;
    }
    
    return description;
  }

  /**
   * Sanitize tool name to be valid for MCP
   * @param name Raw tool name
   * @returns string Sanitized tool name
   */
  private sanitizeToolName(name: string): string {
    // Replace invalid characters (including hyphens) with underscores
    let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
    
    // Ensure it starts with a letter
    if (!/^[a-zA-Z]/.test(sanitized)) {
      sanitized = `workflow_${sanitized}`;
    }
    
    // Remove consecutive underscores
    sanitized = sanitized.replace(/_+/g, '_');
    
    // Remove trailing underscores
    sanitized = sanitized.replace(/_$/, '');
    
    // Ensure minimum length
    if (sanitized.length === 0) {
      sanitized = 'workflow_tool';
    }
    
    return sanitized;
  }

  /**
   * Validate individual parameter value against its schema
   * @param paramName Parameter name
   * @param value Parameter value
   * @param schema Parameter schema
   * @param workflowId Workflow ID for error context
   */
  private validateParameterValue(paramName: string, value: any, schema: any, workflowId: string): void {
    if (schema.type) {
      const actualType = this.getValueType(value);
      const expectedType = schema.type;

      if (expectedType === 'string' && actualType !== 'string') {
        this.errors++;
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be a string, got ${actualType}`,
          { workflowId, paramName, expectedType, actualType }
        );
      }

      if (expectedType === 'number' && actualType !== 'number') {
        this.errors++;
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be a number, got ${actualType}`,
          { workflowId, paramName, expectedType, actualType }
        );
      }

      if (expectedType === 'integer' && (!Number.isInteger(value) || actualType !== 'number')) {
        this.errors++;
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be an integer, got ${actualType}`,
          { workflowId, paramName, expectedType, actualType }
        );
      }

      if (expectedType === 'boolean' && actualType !== 'boolean') {
        this.errors++;
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be a boolean, got ${actualType}`,
          { workflowId, paramName, expectedType, actualType }
        );
      }

      if (expectedType === 'array' && !Array.isArray(value)) {
        this.errors++;
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be an array, got ${actualType}`,
          { workflowId, paramName, expectedType, actualType }
        );
      }

      if (expectedType === 'object' && (actualType !== 'object' || value === null || Array.isArray(value))) {
        this.errors++;
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be an object, got ${actualType}`,
          { workflowId, paramName, expectedType, actualType }
        );
      }
    }

    // Validate enum values
    if (schema.enum && Array.isArray(schema.enum)) {
      if (!schema.enum.includes(value)) {
        this.errors++;
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be one of: ${schema.enum.join(', ')}, got: ${value}`,
          { workflowId, paramName, allowedValues: schema.enum, actualValue: value }
        );
      }
    }

    // Validate string constraints
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength && value.length < schema.minLength) {
        this.errors++;
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be at least ${schema.minLength} characters long`,
          { workflowId, paramName, minLength: schema.minLength, actualLength: value.length }
        );
      }

      if (schema.maxLength && value.length > schema.maxLength) {
        this.errors++;
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be at most ${schema.maxLength} characters long`,
          { workflowId, paramName, maxLength: schema.maxLength, actualLength: value.length }
        );
      }

      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        this.errors++;
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' does not match required pattern: ${schema.pattern}`,
          { workflowId, paramName, pattern: schema.pattern, actualValue: value }
        );
      }
    }

    // Validate number constraints
    if ((schema.type === 'number' || schema.type === 'integer') && typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        this.errors++;
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be at least ${schema.minimum}`,
          { workflowId, paramName, minimum: schema.minimum, actualValue: value }
        );
      }

      if (schema.maximum !== undefined && value > schema.maximum) {
        this.errors++;
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be at most ${schema.maximum}`,
          { workflowId, paramName, maximum: schema.maximum, actualValue: value }
        );
      }
    }

    // Validate array constraints
    if (schema.type === 'array' && Array.isArray(value)) {
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        this.errors++;
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must have at least ${schema.minItems} items`,
          { workflowId, paramName, minItems: schema.minItems, actualItems: value.length }
        );
      }

      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        this.errors++;
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must have at most ${schema.maxItems} items`,
          { workflowId, paramName, maxItems: schema.maxItems, actualItems: value.length }
        );
      }

      // Validate array items if schema is provided
      if (schema.items) {
        for (let i = 0; i < value.length; i++) {
          this.validateParameterValue(`${paramName}[${i}]`, value[i], schema.items, workflowId);
        }
      }
    }
  }

  /**
   * Get the type of a value for validation
   * @param value Value to check
   * @returns string Type name
   */
  private getValueType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
}