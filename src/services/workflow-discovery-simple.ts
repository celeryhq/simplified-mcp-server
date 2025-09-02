/**
 * Simplified Workflow Discovery Service
 * Handles communication with the Simplified API to discover available workflows
 */

import type { APIClient, Logger } from '../types/index.js';
import { AppError, ErrorType } from '../types/index.js';

/**
 * Simple workflow definition for MCP tools
 */
export interface SimpleWorkflowDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  executionType: 'async';
  metadata?: Record<string, any>;
}

/**
 * Simple workflow configuration
 */
export interface SimpleWorkflowConfig {
  enabled: boolean;
  filterPatterns?: string[];
}

/**
 * Simple Workflow Discovery Service
 */
export class SimpleWorkflowDiscoveryService {
  private apiClient: APIClient;
  private logger: Logger;
  private config: SimpleWorkflowConfig;
  private cachedWorkflows: SimpleWorkflowDefinition[] = [];
  private lastDiscoveryTime: number = 0;
  private cacheValidityMs: number = 60000; // 1 minute cache

  constructor(apiClient: APIClient, logger: Logger, config: SimpleWorkflowConfig) {
    this.apiClient = apiClient;
    this.logger = logger;
    this.config = config;
  }

  /**
   * Discover available workflows from the Simplified API
   */
  async listWorkflows(): Promise<SimpleWorkflowDefinition[]> {
    this.logger.debug('Starting workflow discovery...');

    // Check cache first
    if (this.isCacheValid()) {
      this.logger.debug(`Returning ${this.cachedWorkflows.length} cached workflows`);
      return [...this.cachedWorkflows];
    }

    try {
      // Call the Simplified workflows API
      const response = await this.apiClient.get('/api/v1/service/workflows/mcp');

      if (!response.data || !response.data.results || !Array.isArray(response.data.results)) {
        this.logger.warn('Workflows API returned invalid response format');
        return [];
      }

      this.logger.debug(`Workflows API returned ${response.data.results.length} workflows (total: ${response.data.count})`);

      // Transform API response to workflow definitions
      const workflows: SimpleWorkflowDefinition[] = response.data.results
        .map((apiWorkflow: any) => this.transformWorkflowFromAPI(apiWorkflow))
        .filter((workflow: SimpleWorkflowDefinition | null) => workflow !== null) as SimpleWorkflowDefinition[];

      // Apply filtering if configured
      const filteredWorkflows = this.applyFilters(workflows);

      // Update cache
      this.cachedWorkflows = filteredWorkflows;
      this.lastDiscoveryTime = Date.now();

      this.logger.info(`Successfully discovered ${filteredWorkflows.length} workflows`);
      return [...filteredWorkflows];

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Workflow discovery failed: ${errorMessage}`);

      // Return cached workflows if available
      if (this.cachedWorkflows.length > 0) {
        this.logger.info(`Returning ${this.cachedWorkflows.length} cached workflows due to discovery failure`);
        return [...this.cachedWorkflows];
      }

      return [];
    }
  }

  /**
   * Test connection to the workflows API
   */
  async testConnection(): Promise<boolean> {
    try {
      this.logger.debug('Testing connection to workflows API...');
      const response = await this.apiClient.get('/api/v1/service/workflows/mcp');
      this.logger.debug('Workflows API connection test successful');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Workflows API connection test failed: ${errorMessage}`);
      if (error instanceof Error && 'details' in error) {
        this.logger.error('Error details:', (error as any).details);
      }
      return false;
    }
  }

  /**
   * Transform workflow data from API format to workflow definition
   */
  private transformWorkflowFromAPI(apiWorkflow: any): SimpleWorkflowDefinition | null {
    try {
      if (!apiWorkflow || typeof apiWorkflow !== 'object') {
        return null;
      }

      const workflowId = String(apiWorkflow.id || 'unknown');
      const workflowTitle = apiWorkflow.title || `Workflow ${workflowId}`;
      const workflowName = this.sanitizeWorkflowName(workflowTitle);
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
        executionType: 'async',
        metadata: {
          originalId: apiWorkflow.id,
          originalTitle: apiWorkflow.title,
          originalInputs: apiWorkflow.inputs,
          source: 'simplified-api'
        }
      };
    } catch (error) {
      this.logger.warn(`Failed to transform workflow: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
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
   */
  private applyFilters(workflows: SimpleWorkflowDefinition[]): SimpleWorkflowDefinition[] {
    if (!this.config.filterPatterns || this.config.filterPatterns.length === 0) {
      return workflows;
    }

    const filteredWorkflows = workflows.filter(workflow => {
      return this.config.filterPatterns!.some(pattern => {
        // Simple pattern matching with wildcards
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
   * Check if cached workflows are still valid
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
   */
  public getCacheStats(): {
    cachedCount: number;
    lastDiscoveryTime: number;
    cacheAge: number;
    isValid: boolean;
  } {
    return {
      cachedCount: this.cachedWorkflows.length,
      lastDiscoveryTime: this.lastDiscoveryTime,
      cacheAge: Date.now() - this.lastDiscoveryTime,
      isValid: this.isCacheValid()
    };
  }

  /**
   * Force refresh of workflows (bypass cache)
   */
  public async refreshWorkflows(): Promise<SimpleWorkflowDefinition[]> {
    this.clearCache();
    return this.listWorkflows();
  }
}