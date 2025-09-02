/**
 * Type definitions for the Simplified MCP Server
 */

import { z } from 'zod';

// Re-export configuration types
export type { ServerConfig } from '../config/configuration.js';
export type { APIClientConfig } from '../api/client.js';

// API Client types (simplified for social media tools)
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface APIRequestOptions {
  headers?: Record<string, string> | undefined;
  timeout?: number | undefined;
}

export interface APIResponse {
  status: number;
  statusText: string;
  data: any;
}

// Re-export error handling utilities
export { ErrorHandler, MCPErrorCodes } from '../utils/errors.js';

// Re-export tool registry
export { ToolRegistry } from '../tools/registry.js';

// Re-export tool definition utilities
export {
  ToolDefinitionBuilder,
  createTool,
  CommonSchemas,
  ToolDefinitionValidator,
  ToolTemplates,
  type SchemaProperty
} from '../tools/definitions.js';

/**
 * MCP Tool Definition interface
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[] | undefined;
  };
  handler: (params: any, apiClient: any) => Promise<any>;
  category?: string | undefined;
  version?: string | undefined;
}

/**
 * MCP Tool Call Request parameters
 */
export interface ToolCallParams {
  name: string;
  arguments: Record<string, any>;
}

/**
 * MCP Tool Call Response content
 */
export interface ToolCallResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

/**
 * MCP Error Response
 */
export interface MCPError {
  code: number;
  message: string;
  data?: any | undefined;
}

/**
 * API Client interface
 */
export interface APIClient {
  makeRequest(endpoint: string, method?: HttpMethod | undefined, data?: any | undefined, options?: APIRequestOptions | undefined): Promise<APIResponse>;
  get(endpoint: string, params?: Record<string, any> | undefined, options?: APIRequestOptions | undefined): Promise<APIResponse>;
  post(endpoint: string, data: any, options?: APIRequestOptions | undefined): Promise<APIResponse>;
  put(endpoint: string, data: any, options?: APIRequestOptions | undefined): Promise<APIResponse>;
  delete(endpoint: string, options?: APIRequestOptions | undefined): Promise<APIResponse>;
  patch(endpoint: string, data: any, options?: APIRequestOptions | undefined): Promise<APIResponse>;
}

// Re-export LogLevel from logger
export { LogLevel } from '../utils/logger.js';

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  child?: (name: string) => Logger; // Optional child method
}

/**
 * Error types for the application
 */
export enum ErrorType {
  CONFIG_ERROR = 'CONFIG_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TOOL_ERROR = 'TOOL_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

/**
 * Application error class
 */
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public details?: any | undefined,
    public status?: number | undefined
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ============================================================================
// WORKFLOW TYPES AND INTERFACES
// ============================================================================

/**
 * Workflow Definition interface
 * Represents a workflow that can be converted to an MCP tool
 */
export interface WorkflowDefinition {
  id: string;                    // Unique workflow identifier
  name: string;                  // Tool name for MCP (must be unique)
  description: string;           // Tool description
  category?: string | undefined; // Tool category (defaults to 'workflow')
  version?: string | undefined;  // Tool version (defaults to '1.0.0')
  inputSchema: {                 // JSON Schema for parameters
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  executionType?: 'sync' | 'async' | undefined; // Execution type (defaults to 'async')
  metadata?: Record<string, any> | undefined;    // Additional workflow metadata
}

/**
 * Workflow Execution Result interface
 * Result of workflow execution from Simplified API
 */
export interface WorkflowExecutionResult {
  success: boolean;
  correlationId: string;         // correlation_id from API response (e.g., "2724_9a92222c2ca34fffbfd00e8767dd22d0")
  workflowInstanceId: string;    // workflow_id from API response (UUID)
  originalWorkflowId: string;    // Original workflow ID used in request (e.g., "2724")
  
  // From status response
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  input?: Record<string, any> | undefined;   // Original input with context from status
  output?: Record<string, any> | undefined;  // Workflow output results from status
  error?: string | undefined;                // Error message if failed
  
  // Timing information
  startTime?: number | undefined;            // start_time from status (timestamp)
  endTime?: number | undefined;              // end_time from status (timestamp)
  createTime?: number | undefined;           // create_time from status (timestamp)
  updateTime?: number | undefined;           // update_time from status (timestamp)
  executionDuration?: number | undefined;    // Calculated duration in ms
  
  // Raw API responses for debugging
  executionResponse?: {          // Raw execution response
    correlation_id: string;
    workflow_id: string;
  } | undefined;
  statusResponse?: WorkflowStatus | undefined; // Raw status response
  
  metadata?: Record<string, any> | undefined; // Additional execution metadata
}

/**
 * Workflow Status interface
 * Status information for running workflows based on actual API response
 */
export interface WorkflowStatus {
  // From API response
  create_time: number;           // Creation timestamp (e.g., 1753703781802)
  update_time: number;           // Last update timestamp
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'; // API uses uppercase
  end_time?: number | undefined; // End timestamp if completed/failed
  start_time: number;            // Start timestamp
  workflow_id: string;           // Original workflow ID (e.g., "2724")
  input: Record<string, any>;    // Original input parameters with context
  output: Record<string, any>;   // Workflow output results
  
  // Processed fields for internal use
  correlationId?: string | undefined;        // correlation_id for tracking (from execution response)
  workflowInstanceId?: string | undefined;   // workflow_id (UUID) from execution response
  progress?: number | undefined;             // Progress percentage if available
  error?: string | undefined;                // Extracted error message for failed workflows
}

/**
 * Workflow Configuration interface
 * Configuration for workflow tool functionality
 */
export interface WorkflowConfig {
  enabled: boolean;              // Enable/disable workflow tools
  discoveryInterval?: number | undefined;    // Auto-refresh interval in ms (0 = disabled)
  executionTimeout?: number | undefined;     // Default execution timeout in ms
  maxConcurrentExecutions?: number | undefined; // Max concurrent workflow executions
  filterPatterns?: string[] | undefined;     // Workflow name patterns to include/exclude
  statusCheckInterval?: number | undefined;  // Status polling interval in ms
  retryAttempts?: number | undefined;        // Retry attempts for failed discoveries
}

/**
 * Performance metrics for a workflow execution
 */
export interface WorkflowExecutionMetrics {
  workflowId: string;
  workflowInstanceId: string;
  correlationId?: string | undefined;
  
  // Timing metrics
  startTime: number;
  endTime?: number | undefined;
  duration?: number | undefined;
  
  // Status tracking
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';
  
  // Resource usage
  memoryUsage?: number | undefined;
  cpuUsage?: number | undefined;
  
  // API call metrics
  apiCallCount: number;
  totalApiTime: number;
  
  // Error tracking
  errorCount: number;
  lastError?: string | undefined;
  
  // Metadata
  metadata?: Record<string, any> | undefined;
}

/**
 * Aggregated performance statistics
 */
export interface PerformanceStats {
  // Execution counts
  totalExecutions: number;
  runningExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  timeoutExecutions: number;
  
  // Timing statistics
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  
  // Resource statistics
  averageMemoryUsage: number;
  peakMemoryUsage: number;
  averageCpuUsage: number;
  peakCpuUsage: number;
  
  // API statistics
  totalApiCalls: number;
  averageApiTime: number;
  
  // Error statistics
  totalErrors: number;
  errorRate: number;
  
  // Time window
  windowStart: number;
  windowEnd: number;
}

/**
 * Configuration for performance monitoring
 */
export interface PerformanceMonitorConfig {
  enabled: boolean;
  metricsRetentionTime: number;    // How long to keep metrics (ms)
  cleanupInterval: number;         // How often to run cleanup (ms)
  maxConcurrentExecutions: number; // Resource limit
  executionTimeout: number;        // Timeout for executions (ms)
  memoryThreshold: number;         // Memory usage threshold (MB)
  cpuThreshold: number;            // CPU usage threshold (%)
}

// ============================================================================
// WORKFLOW VALIDATION SCHEMAS
// ============================================================================

/**
 * Zod schema for JSON Schema object validation
 */
const JSONSchemaSchema = z.object({
  type: z.literal('object'),
  properties: z.record(z.any()),
  required: z.array(z.string()).default([])
});

/**
 * Zod schema for WorkflowDefinition validation
 */
export const WorkflowDefinitionSchema = z.object({
  id: z.string().min(1, 'Workflow ID is required'),
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string().min(1, 'Workflow description is required'),
  category: z.string().default('workflow'),
  version: z.string().default('1.0.0'),
  inputSchema: JSONSchemaSchema,
  executionType: z.enum(['sync', 'async']).default('async'),
  metadata: z.record(z.any()).optional()
});

/**
 * Zod schema for WorkflowStatus validation
 */
export const WorkflowStatusSchema = z.object({
  create_time: z.number(),
  update_time: z.number(),
  status: z.enum(['RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  end_time: z.number().optional(),
  start_time: z.number(),
  workflow_id: z.string(),
  input: z.record(z.any()),
  output: z.record(z.any()),
  
  // Processed fields for internal use
  correlationId: z.string().optional(),
  workflowInstanceId: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  error: z.string().optional()
});

/**
 * Zod schema for WorkflowExecutionResult validation
 */
export const WorkflowExecutionResultSchema = z.object({
  success: z.boolean(),
  correlationId: z.string(),
  workflowInstanceId: z.string(),
  originalWorkflowId: z.string(),
  
  status: z.enum(['RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  input: z.record(z.any()).optional(),
  output: z.record(z.any()).optional(),
  error: z.string().optional(),
  
  // Timing information
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  createTime: z.number().optional(),
  updateTime: z.number().optional(),
  executionDuration: z.number().optional(),
  
  // Raw API responses for debugging
  executionResponse: z.object({
    correlation_id: z.string(),
    workflow_id: z.string()
  }).optional(),
  statusResponse: WorkflowStatusSchema.optional(),
  
  metadata: z.record(z.any()).optional()
});

/**
 * Zod schema for WorkflowConfig validation
 */
export const WorkflowConfigSchema = z.object({
  enabled: z.boolean(),
  discoveryInterval: z.number().min(0).default(0),
  executionTimeout: z.number().positive().default(300000), // 5 minutes
  maxConcurrentExecutions: z.number().positive().default(10),
  filterPatterns: z.array(z.string()).default([]),
  statusCheckInterval: z.number().positive().default(5000), // 5 seconds
  retryAttempts: z.number().min(0).default(3)
});

/**
 * Type guards for workflow types
 */
export const isWorkflowDefinition = (obj: any): obj is WorkflowDefinition => {
  try {
    WorkflowDefinitionSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
};

export const isWorkflowStatus = (obj: any): obj is WorkflowStatus => {
  try {
    WorkflowStatusSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
};

export const isWorkflowExecutionResult = (obj: any): obj is WorkflowExecutionResult => {
  try {
    WorkflowExecutionResultSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
};

export const isWorkflowConfig = (obj: any): obj is WorkflowConfig => {
  try {
    WorkflowConfigSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
};