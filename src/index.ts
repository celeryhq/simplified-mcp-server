/**
 * Main entry point for the Simplified MCP Server
 * This file exports the main server class and configuration utilities
 */

// Core server and configuration
export { SimplifiedMCPServer } from './server.js';
export { ConfigurationManager } from './config/configuration.js';
export type { ServerConfig } from './config/configuration.js';

// API client
export { SimplifiedAPIClient } from './api/client.js';
export type { APIClientConfig } from './api/client.js';

// Social media tools
export { socialMediaTools } from './tools/implementations/social-media-tools.js';

// Tool system
export { ToolRegistry } from './tools/registry.js';
export { 
  ToolDefinitionBuilder, 
  createTool, 
  CommonSchemas, 
  ToolDefinitionValidator,
  ToolTemplates
} from './tools/definitions.js';
export type { 
  ToolDefinition, 
  ToolCallParams, 
  ToolCallResponse, 
  SchemaProperty 
} from './types/index.js';

// Error handling
export { ErrorHandler, MCPErrorCodes } from './utils/errors.js';
export type { MCPError, ErrorType, AppError } from './types/index.js';

// Logging
export { LogLevel, ConfigurableLogger, createLogger, logger } from './utils/logger.js';
export type { Logger, LoggerConfig, LogEntry } from './utils/logger.js';

// Re-export all types from types/index.ts for convenience
export type * from './types/index.js';