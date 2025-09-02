/**
 * Workflow Discovery Service
 * Handles communication with the workflows-list-tool to discover available workflows
 */

import type {
  WorkflowDefinition,
  APIClient,
  Logger,
  WorkflowConfig
} from '../types/index.js';
import {
  WorkflowDefinitionSchema,
  AppError,
  ErrorType
} from '../types/index.js';
import { WorkflowErrorHandler } from '../utils/workflow-error-handler.js';
import { z } from 'zod';

/**
 * Interface for WorkflowDiscoveryService
 */
export interface IWorkflowDiscoveryService {
  // Discovery operations
  listWorkflows(): Promise<WorkflowDefinition[]>;
  validateWorkflow(workflow: any): WorkflowDefinition | null;

  // Health checking
  isWorkflowsListToolAvailable(): Promise<boolean>;
  testConnection(): Promise<boolean>;

  // Cache management
  clearCache(): void;
  getCacheStats(): { size: number; lastUpdate: number; hitRate: number };
}

/**
 * WorkflowDiscoveryService implementation
 * Discovers workflows by calling the workflows-list-tool through the API client
 */
export class WorkflowDiscoveryService implements IWorkflowDiscoveryService {
  private apiClient: APIClient;
  private logger: Logger;
  private config: WorkflowConfig;
  private errorHandler: WorkflowErrorHandler;
  private lastDiscoveryTime: number = 0;
  private cachedWorkflows: WorkflowDefinition[] = [];
  private cacheValidityMs: number = 60000; // 1 minute cache

  constructor(apiClient: APIClient, logger: Logger, config: WorkflowConfig) {
    this.apiClient = apiClient;
    this.logger = logger;
    this.config = config;
    this.errorHandler = new WorkflowErrorHandler(logger);
  }

  /**
   * Discover available workflows by calling the workflows-list-tool
   * @returns Promise<WorkflowDefinition[]> Array of validated workflow definitions
   * @throws AppError if discovery fails critically
   */
  async listWorkflows(): Promise<WorkflowDefinition[]> {
    this.logger.debug('Starting workflow discovery...');

    // Check cache first
    if (this.isCacheValid()) {
      this.logger.debug(`Returning ${this.cachedWorkflows.length} cached workflows`);
      return [...this.cachedWorkflows];
    }

    try {
      // Call the workflows-list-tool endpoint
      // Based on the design, this should be a tool call to discover workflows
      let response: any[];

      try {
        response = await this.callWorkflowsListTool();
      } catch (error) {
        // Handle API call errors specifically
        if (error instanceof AppError && error.message.includes('unexpected response format')) {
          this.logger.warn('workflows-list-tool returned invalid response format');
          return [];
        }
        throw error; // Re-throw other errors to be handled by outer catch
      }

      if (!response || !Array.isArray(response)) {
        this.logger.warn('workflows-list-tool returned invalid response format');
        return [];
      }

      const validatedWorkflows: WorkflowDefinition[] = [];
      const errors: string[] = [];

      // Validate each workflow definition
      for (let i = 0; i < response.length; i++) {
        const workflow = response[i];
        try {
          const validatedWorkflow = this.validateWorkflow(workflow);
          if (validatedWorkflow) {
            validatedWorkflows.push(validatedWorkflow);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Workflow ${i}: ${errorMessage}`);

          // Use error handler for structured logging
          this.errorHandler.handleValidationError(
            workflow,
            error instanceof Error ? error : new Error(errorMessage),
            { additionalData: { workflowIndex: i } }
          );
        }
      }

      // Log validation results
      if (errors.length > 0) {
        this.logger.warn(`Workflow validation errors: ${errors.join('; ')}`);
      }

      this.logger.info(`Successfully discovered ${validatedWorkflows.length} workflows (${errors.length} validation errors)`);

      // Apply filtering if configured
      const filteredWorkflows = this.applyFilters(validatedWorkflows);

      // Update cache
      this.cachedWorkflows = filteredWorkflows;
      this.lastDiscoveryTime = Date.now();

      return [...filteredWorkflows];

    } catch (error) {
      // Use error handler for graceful degradation
      const fallbackWorkflows = this.errorHandler.handleDiscoveryError(
        error instanceof Error ? error : new Error(String(error)),
        { additionalData: { cachedWorkflowsCount: this.cachedWorkflows.length } }
      );

      // Return cached workflows if available, otherwise use fallback (empty array)
      if (this.cachedWorkflows.length > 0) {
        this.logger.info(`Returning ${this.cachedWorkflows.length} cached workflows due to discovery failure`);
        return [...this.cachedWorkflows];
      }

      return fallbackWorkflows;
    }
  }

  /**
   * Validate a workflow definition against the expected schema
   * @param workflow Raw workflow object to validate
   * @returns WorkflowDefinition | null Validated workflow or null if invalid
   */
  validateWorkflow(workflow: any): WorkflowDefinition | null {
    if (!workflow || typeof workflow !== 'object') {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Workflow must be an object'
      );
    }

    try {
      // Use Zod schema for validation
      const validatedWorkflow = WorkflowDefinitionSchema.parse(workflow) as WorkflowDefinition;

      // Additional business logic validation
      this.validateWorkflowBusinessRules(validatedWorkflow);

      return validatedWorkflow;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err =>
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Workflow validation failed: ${errorMessages}`
        );
      }
      throw error;
    }
  }

  /**
   * Check if the workflows-list-tool is available
   * @returns Promise<boolean> True if available, false otherwise
   */
  async isWorkflowsListToolAvailable(): Promise<boolean> {
    const result = await this.testConnection();
    if (!result) {
      this.logger.debug('workflows-list-tool availability check failed');
    }
    return result;
  }

  /**
   * Test connection to the workflows-list-tool
   * @returns Promise<boolean> True if connection successful, false otherwise
   */
  async testConnection(): Promise<boolean> {
    try {
      this.logger.debug('Testing connection to workflows-list-tool...');

      // Try to make a simple call to the workflows-list-tool
      // This is a lightweight check to see if the tool is responsive
      try {
        await this.callWorkflowsListTool();
      } catch (error) {
        // Even if the response format is invalid, the connection works
        if (error instanceof AppError && error.message.includes('unexpected response format')) {
          this.logger.debug('workflows-list-tool connection test successful');
          return true;
        }
        throw error;
      }

      this.logger.debug('workflows-list-tool connection test successful');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.debug(`workflows-list-tool connection test failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Call the workflows API to get available workflows
   * This method handles the actual API call to discover workflows
   * @returns Promise<any[]> Raw workflow data from the API
   * @throws AppError if the call fails
   */
  private async callWorkflowsListTool(): Promise<any[]> {
    // Call the actual Simplified workflows API endpoint
    const response = await this.apiClient.get('/api/v1/service/workflows/mcp');

    if (!response.data) {
      throw new AppError(
        ErrorType.API_ERROR,
        'Workflows API returned empty response'
      );
    }

    // Handle the actual API response format
    // Expected format: { count: number, results: Array<{id: number, title: string, description: string}> }
    if (response.data.results && Array.isArray(response.data.results)) {
      this.logger.debug(`Workflows API returned ${response.data.results.length} workflows (total: ${response.data.count})`);

      // Transform the API response to match our expected format
      return response.data.results.map((workflow: any) => this.transformWorkflowFromAPI(workflow));
    }

    // Fallback for different response formats
    if (Array.isArray(response.data)) {
      return response.data.map((workflow: any) => this.transformWorkflowFromAPI(workflow));
    }

    throw new AppError(
      ErrorType.API_ERROR,
      'Workflows API returned unexpected response format'
    );
  }

  /**
   * Transform workflow data from API format to WorkflowDefinition format
   * @param apiWorkflow Raw workflow data from API
   * @returns Transformed workflow data
   */
  private transformWorkflowFromAPI(apiWorkflow: any): any {
    // Transform the API response format to match WorkflowDefinition schema
    // API format: { id: number, title: string, description: string, inputs?: object }
    // Target format: WorkflowDefinition

    const workflowId = String(apiWorkflow.id);
    const workflowName = this.sanitizeWorkflowName(apiWorkflow.title || `workflow-${workflowId}`);
    const description = apiWorkflow.description || `Workflow ${workflowId}`;

    // Extract input schema from the workflow inputs
    const inputSchema = this.extractInputSchema(apiWorkflow.inputs);

    return {
      id: workflowId,
      name: workflowName,
      description: description,
      category: 'workflow',
      version: '1.0.0',
      inputSchema: inputSchema,
      executionType: 'async' as const,
      metadata: {
        originalId: apiWorkflow.id,
        originalTitle: apiWorkflow.title,
        originalInputs: apiWorkflow.inputs,
        source: 'simplified-api'
      } as Record<string, any>
    };
  }

  /**
   * Extract and validate input schema from workflow inputs
   */
  private extractInputSchema(inputs: any): { type: 'object'; properties: Record<string, any>; required: string[] } {
    // Default schema if no inputs provided
    const defaultSchema = {
      type: 'object' as const,
      properties: {
        parameters: {
          type: 'object',
          description: 'Workflow parameters',
          additionalProperties: true
        }
      },
      required: []
    };

    if (!inputs || typeof inputs !== 'object') {
      return defaultSchema;
    }

    try {
      // Validate the inputs structure matches JSON Schema format
      if (inputs.type === 'object' && inputs.properties && typeof inputs.properties === 'object') {
        return {
          type: 'object',
          properties: inputs.properties,
          required: Array.isArray(inputs.required) ? inputs.required : []
        };
      }

      // If inputs doesn't match expected format, log and use default
      this.logger.debug('Workflow inputs do not match expected JSON Schema format, using default schema');
      return defaultSchema;

    } catch (error) {
      this.logger.warn(`Failed to parse workflow inputs: ${error instanceof Error ? error.message : String(error)}`);
      return defaultSchema;
    }
  }

  /**
   * Sanitize workflow name to be valid for MCP tool names
   * @param title Original workflow title
   * @returns Sanitized name suitable for MCP tools
   */
  private sanitizeWorkflowName(title: string): string {
    // Convert to lowercase and replace invalid characters
    let sanitized = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s_-]/g, '') // Remove invalid characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

    // Ensure it starts with a letter
    if (!/^[a-z]/.test(sanitized)) {
      sanitized = `workflow-${sanitized}`;
    }

    // Ensure it's not empty and has reasonable length
    if (!sanitized || sanitized.length < 1) {
      sanitized = 'unnamed-workflow';
    }

    if (sanitized.length > 50) {
      sanitized = sanitized.substring(0, 50).replace(/-+$/, '');
    }

    return sanitized;
  }

  /**
   * Apply configured filters to workflows
   * @param workflows Array of workflows to filter
   * @returns WorkflowDefinition[] Filtered workflows
   */
  private applyFilters(workflows: WorkflowDefinition[]): WorkflowDefinition[] {
    if (!this.config.filterPatterns || this.config.filterPatterns.length === 0) {
      return workflows;
    }

    const filteredWorkflows = workflows.filter(workflow => {
      return this.config.filterPatterns!.some(pattern => {
        // Simple pattern matching - could be enhanced with regex or glob patterns
        if (pattern.includes('*')) {
          const regexPattern = pattern.replace(/\*/g, '.*');
          return new RegExp(regexPattern, 'i').test(workflow.name);
        }
        return workflow.name.toLowerCase().includes(pattern.toLowerCase());
      });
    });

    this.logger.debug(`Applied filters: ${workflows.length} -> ${filteredWorkflows.length} workflows`);
    return filteredWorkflows;
  }

  /**
   * Validate business rules for workflows
   * @param workflow Validated workflow definition
   * @throws AppError if business rules are violated
   */
  private validateWorkflowBusinessRules(workflow: WorkflowDefinition): void {
    // Check for reasonable name length
    if (workflow.name.length > 100) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Workflow name must be 100 characters or less'
      );
    }

    // Check for reasonable description length
    if (workflow.description.length > 1000) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Workflow description must be 1000 characters or less'
      );
    }

    // Validate workflow name format (must be valid for MCP tool names)
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(workflow.name)) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Workflow name must start with a letter and contain only letters, numbers, underscores, and hyphens'
      );
    }

    // Validate input schema has reasonable complexity
    if (workflow.inputSchema.properties) {
      const propertyCount = Object.keys(workflow.inputSchema.properties).length;
      if (propertyCount > 50) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          'Workflow input schema cannot have more than 50 properties'
        );
      }
    }
  }

  /**
   * Check if cached workflows are still valid
   * @returns boolean True if cache is valid, false otherwise
   */
  private isCacheValid(): boolean {
    if (this.cachedWorkflows.length === 0) {
      return false;
    }

    const cacheAge = Date.now() - this.lastDiscoveryTime;
    return cacheAge < this.cacheValidityMs;
  }

  /**
   * Clear the workflow cache
   */
  public clearCache(): void {
    this.cachedWorkflows = [];
    this.lastDiscoveryTime = 0;
    this.logger.debug('Workflow cache cleared');
  }

  /**
   * Get cache statistics
   * @returns Object with cache information
   */
  public getCacheStats(): { size: number; lastUpdate: number; hitRate: number } {
    const cacheAge = Date.now() - this.lastDiscoveryTime;
    const hitRate = this.cachedWorkflows.length > 0 && cacheAge < this.cacheValidityMs ? 1.0 : 0.0;
    
    return {
      size: this.cachedWorkflows.length,
      lastUpdate: this.lastDiscoveryTime,
      hitRate: hitRate
    };
  }

  /**
   * Force refresh of workflows (bypass cache)
   * @returns Promise<WorkflowDefinition[]> Fresh workflow definitions
   */
  public async refreshWorkflows(): Promise<WorkflowDefinition[]> {
    this.clearCache();
    return this.listWorkflows();
  }
}