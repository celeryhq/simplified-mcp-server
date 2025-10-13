/**
 * ServerLogger - A wrapper around ConfigurableLogger for server-specific logging
 * Provides structured logging for server lifecycle events and error handling
 */

import { Logger, LoggerConfig, createMCPLogger } from './logger.js';
import type { ServerConfig } from '../types/index.js';

/**
 * Server event types for structured logging
 */
export enum ServerEventType {
  STARTUP = 'server_startup',
  SHUTDOWN = 'server_shutdown',
  TOOL_REGISTRATION = 'tool_registration',
  WORKFLOW_DISCOVERY = 'workflow_discovery',
  ERROR = 'server_error'
}

/**
 * Server metadata interface for log entries
 */
export interface ServerMetadata {
  pid?: number;
  hostname?: string;
  version?: string;
  environment?: string;
  serverName?: string;
  [key: string]: any;
}

/**
 * ServerLogger class that wraps ConfigurableLogger with server-specific functionality
 */
export class ServerLogger implements Logger {
  private logger: Logger;
  private serverMetadata: ServerMetadata;

  constructor(logger?: Logger, serverConfig?: Partial<ServerConfig>) {
    // Use provided logger or create a new MCP-safe logger
    this.logger = logger || createMCPLogger({ 
      context: 'SimplifiedMCPServer',
      enableStructured: true,
      enableFallback: true
    });

    // Initialize server metadata
    this.serverMetadata = this.buildServerMetadata(serverConfig);
  }

  /**
   * Build server metadata from environment and config
   */
  private buildServerMetadata(serverConfig?: Partial<ServerConfig>): ServerMetadata {
    return {
      pid: process.pid,
      hostname: process.env.HOSTNAME || 'unknown',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      serverName: 'simplified-mcp-server',
      ...(serverConfig && {
        apiBaseUrl: serverConfig.apiBaseUrl,
        workflowsEnabled: serverConfig.workflowsEnabled
      })
    };
  }

  /**
   * Log server startup event with metadata
   */
  logStartup(message: string, metadata?: any): void {
    const logData = {
      eventType: ServerEventType.STARTUP,
      serverMetadata: this.serverMetadata,
      ...metadata
    };

    this.logger.info(message, logData);
  }

  /**
   * Log server shutdown event with metadata
   */
  logShutdown(message: string, metadata?: any): void {
    const logData = {
      eventType: ServerEventType.SHUTDOWN,
      serverMetadata: this.serverMetadata,
      ...metadata
    };

    this.logger.info(message, logData);
  }

  /**
   * Log tool registration events
   */
  logToolRegistration(toolCount: number, workflowCount: number, metadata?: any): void {
    const logData = {
      eventType: ServerEventType.TOOL_REGISTRATION,
      serverMetadata: this.serverMetadata,
      toolCount,
      workflowCount,
      totalTools: toolCount + workflowCount,
      ...metadata
    };

    this.logger.info(`Tool registration completed: ${toolCount + workflowCount} tools total`, logData);
  }

  /**
   * Log workflow discovery events
   */
  logWorkflowDiscovery(message: string, workflowData?: any, metadata?: any): void {
    const logData = {
      eventType: ServerEventType.WORKFLOW_DISCOVERY,
      serverMetadata: this.serverMetadata,
      workflowData,
      ...metadata
    };

    this.logger.info(message, logData);
  }

  /**
   * Log server errors with proper context preservation
   */
  logError(error: Error, context?: string, metadata?: any): void {
    const errorData = {
      eventType: ServerEventType.ERROR,
      serverMetadata: this.serverMetadata,
      context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error as any).code && { code: (error as any).code }
      },
      ...metadata
    };

    // Use the logger's logError method for proper error handling
    if (this.logger.logError) {
      this.logger.logError(error, context);
    } else {
      this.logger.error(error.message, errorData);
    }
  }

  /**
   * Standard Logger interface methods - delegate to wrapped logger
   */
  debug(message: string, ...args: any[]): void {
    const logData = {
      serverMetadata: this.serverMetadata,
      ...(args.length > 0 && { args })
    };
    this.logger.debug(message, logData);
  }

  info(message: string, ...args: any[]): void {
    const logData = {
      serverMetadata: this.serverMetadata,
      ...(args.length > 0 && { args })
    };
    this.logger.info(message, logData);
  }

  warn(message: string, ...args: any[]): void {
    const logData = {
      serverMetadata: this.serverMetadata,
      ...(args.length > 0 && { args })
    };
    this.logger.warn(message, logData);
  }

  error(message: string, ...args: any[]): void {
    const logData = {
      serverMetadata: this.serverMetadata,
      ...(args.length > 0 && { args })
    };
    this.logger.error(message, logData);
  }

  /**
   * Set logger context (delegates to wrapped logger if supported)
   */
  setContext(context: string): void {
    if (this.logger.setContext) {
      this.logger.setContext(context);
    }
  }

  /**
   * Set log level (delegates to wrapped logger if supported)
   */
  setLevel(level: any): void {
    if (this.logger.setLevel) {
      this.logger.setLevel(level);
    }
  }

  /**
   * Create child logger (delegates to wrapped logger if supported)
   */
  child(context: string): Logger {
    if (this.logger.child) {
      return new ServerLogger(this.logger.child(context));
    }
    
    // Fallback: create new ServerLogger with updated context
    const childLogger = createMCPLogger({ 
      context: `SimplifiedMCPServer:${context}`,
      enableStructured: true,
      enableFallback: true
    });
    return new ServerLogger(childLogger);
  }

  /**
   * Update logger configuration (delegates to wrapped logger if supported)
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    if (this.logger.updateConfig) {
      this.logger.updateConfig(config);
    }
  }

  /**
   * Get the wrapped logger instance
   */
  getWrappedLogger(): Logger {
    return this.logger;
  }

  /**
   * Get server metadata
   */
  getServerMetadata(): ServerMetadata {
    return { ...this.serverMetadata };
  }

  /**
   * Update server metadata
   */
  updateServerMetadata(metadata: Partial<ServerMetadata>): void {
    this.serverMetadata = { ...this.serverMetadata, ...metadata };
  }
}

/**
 * Create a ServerLogger instance with optional configuration
 */
export function createServerLogger(
  logger?: Logger, 
  serverConfig?: Partial<ServerConfig>
): ServerLogger {
  return new ServerLogger(logger, serverConfig);
}