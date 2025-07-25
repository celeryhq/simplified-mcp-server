/**
 * Type definitions for the Simplified MCP Server
 */

// Re-export configuration types
export type { ServerConfig } from '../config/configuration.js';
export type { APIClientConfig } from '../api/client.js';

// API Client types (simplified for social media tools)
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface APIRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
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
    required?: string[];
  };
  handler: (params: any, apiClient: any) => Promise<any>;
  category?: string;
  version?: string;
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
  data?: any;
}

/**
 * API Client interface
 */
export interface APIClient {
  makeRequest(endpoint: string, method?: HttpMethod, data?: any, options?: APIRequestOptions): Promise<APIResponse>;
  get(endpoint: string, params?: Record<string, any>, options?: APIRequestOptions): Promise<APIResponse>;
  post(endpoint: string, data: any, options?: APIRequestOptions): Promise<APIResponse>;
  put(endpoint: string, data: any, options?: APIRequestOptions): Promise<APIResponse>;
  delete(endpoint: string, options?: APIRequestOptions): Promise<APIResponse>;
  patch(endpoint: string, data: any, options?: APIRequestOptions): Promise<APIResponse>;
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
    public details?: any,
    public status?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}