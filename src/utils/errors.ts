import { AppError, ErrorType, MCPError } from '../types/index.js';

/**
 * MCP Error Codes based on JSON-RPC 2.0 specification
 */
export const MCPErrorCodes = {
  // Standard JSON-RPC errors
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  
  // MCP-specific errors (using reserved range -32000 to -32099)
  SERVER_ERROR: -32000,
  AUTHENTICATION_ERROR: -32001,
  API_ERROR: -32002,
  VALIDATION_ERROR: -32003,
  NETWORK_ERROR: -32004,
  TOOL_ERROR: -32005,
  RATE_LIMIT_ERROR: -32006,
  TIMEOUT_ERROR: -32007
} as const;

/**
 * Error context for tracking error origins and debugging
 */
export interface ErrorContext {
  operation?: string;
  toolName?: string;
  endpoint?: string;
  requestId?: string;
  userId?: string;
  timestamp?: Date;
  additionalData?: Record<string, any>;
}

/**
 * Error Handler provides comprehensive error handling and translation capabilities
 */
export class ErrorHandler {
  /**
   * Translate an application error to MCP format
   * @param error Application error to translate
   * @param context Additional context for the error (string or ErrorContext)
   * @returns MCP-formatted error
   */
  static translateToMCPError(error: AppError | Error, context?: string | ErrorContext): MCPError {
    if (error instanceof AppError) {
      return this.translateAppErrorToMCP(error, context);
    }
    
    // Handle generic errors
    return {
      code: MCPErrorCodes.INTERNAL_ERROR,
      message: `Internal error: ${error.message}`,
      data: {
        context,
        originalError: error.message,
        stack: error.stack
      }
    };
  }

  /**
   * Translate an AppError to MCP format
   * @param error AppError to translate
   * @param context Additional context (string or ErrorContext)
   * @returns MCP-formatted error
   */
  private static translateAppErrorToMCP(error: AppError, context?: string | ErrorContext): MCPError {
    const contextData = typeof context === 'string' ? { context } : context;
    const baseData = {
      ...contextData,
      errorType: error.type,
      originalMessage: error.message,
      timestamp: new Date().toISOString(),
      ...(error.details && { details: error.details })
    };

    switch (error.type) {
      case ErrorType.AUTH_ERROR:
        return {
          code: MCPErrorCodes.AUTHENTICATION_ERROR,
          message: this.getAuthErrorMessage(error),
          data: {
            ...baseData,
            status: error.status,
            authenticationRequired: true
          }
        };

      case ErrorType.VALIDATION_ERROR:
        return {
          code: MCPErrorCodes.VALIDATION_ERROR,
          message: `Parameter validation failed: ${error.message}`,
          data: {
            ...baseData,
            status: error.status,
            validationErrors: error.details?.validationErrors
          }
        };

      case ErrorType.NETWORK_ERROR:
        return {
          code: this.isTimeoutError(error) ? MCPErrorCodes.TIMEOUT_ERROR : MCPErrorCodes.NETWORK_ERROR,
          message: this.getNetworkErrorMessage(error),
          data: {
            ...baseData,
            retryable: true,
            networkIssue: true
          }
        };

      case ErrorType.API_ERROR:
        if (this.isRateLimitError(error)) {
          return {
            code: MCPErrorCodes.RATE_LIMIT_ERROR,
            message: `Rate limit exceeded: ${error.message}`,
            data: {
              ...baseData,
              status: error.status,
              retryable: true,
              retryAfter: error.details?.retryAfter
            }
          };
        }
        
        return {
          code: MCPErrorCodes.API_ERROR,
          message: `API request failed: ${error.message}`,
          data: {
            ...baseData,
            status: error.status,
            retryable: this.isRetryableAPIError(error)
          }
        };

      case ErrorType.TOOL_ERROR:
        return {
          code: MCPErrorCodes.TOOL_ERROR,
          message: `Tool execution failed: ${error.message}`,
          data: {
            ...baseData,
            toolName: error.details?.toolName,
            toolParams: error.details?.toolParams
          }
        };

      case ErrorType.CONFIG_ERROR:
        return {
          code: MCPErrorCodes.INVALID_PARAMS,
          message: `Configuration error: ${error.message}`,
          data: {
            ...baseData,
            configurationRequired: true
          }
        };

      default:
        return {
          code: MCPErrorCodes.SERVER_ERROR,
          message: `Server error: ${error.message}`,
          data: baseData
        };
    }
  }

  /**
   * Get a user-friendly authentication error message
   * @param error AppError with authentication details
   * @returns User-friendly error message
   */
  private static getAuthErrorMessage(error: AppError): string {
    if (error.status === 401) {
      return 'Authentication failed. Please check your API token and ensure it is valid and not expired.';
    }
    
    if (error.status === 403) {
      return 'Access forbidden. Your API token does not have sufficient permissions for this operation.';
    }
    
    return `Authentication error: ${error.message}`;
  }

  /**
   * Get a user-friendly network error message
   * @param error AppError with network details
   * @returns User-friendly error message
   */
  private static getNetworkErrorMessage(error: AppError): string {
    if (this.isTimeoutError(error)) {
      return 'Request timed out. The API did not respond within the expected time. Please try again.';
    }
    
    if (error.details?.code === 'ECONNRESET') {
      return 'Connection was reset. Please check your network connection and try again.';
    }
    
    if (error.details?.code === 'ENOTFOUND') {
      return 'Unable to resolve API hostname. Please check your network connection and API configuration.';
    }
    
    return `Network error: ${error.message}. Please check your connection and try again.`;
  }

  /**
   * Check if an error is a timeout error
   * @param error AppError to check
   * @returns True if the error is a timeout error
   */
  private static isTimeoutError(error: AppError): boolean {
    return (
      error.details?.code === 'ECONNABORTED' ||
      error.message.toLowerCase().includes('timeout')
    );
  }

  /**
   * Check if an error is a rate limit error
   * @param error AppError to check
   * @returns True if the error is a rate limit error
   */
  private static isRateLimitError(error: AppError): boolean {
    return error.status === 429;
  }

  /**
   * Check if an API error is retryable
   * @param error AppError to check
   * @returns True if the error is retryable
   */
  private static isRetryableAPIError(error: AppError): boolean {
    if (!error.status) return false;
    
    // 5xx server errors are retryable
    if (error.status >= 500) return true;
    
    // 429 rate limit is retryable
    if (error.status === 429) return true;
    
    // 4xx client errors are generally not retryable
    return false;
  }

  /**
   * Create a standardized error response for MCP tools
   * @param error Error to format
   * @param toolName Name of the tool that failed
   * @param toolParams Parameters passed to the tool
   * @param context Additional context
   * @returns MCP tool error response
   */
  static createToolErrorResponse(
    error: AppError | Error,
    toolName: string,
    toolParams?: any,
    context?: string
  ): MCPError {
    let appError: AppError;
    
    if (error instanceof AppError) {
      appError = error;
    } else {
      appError = new AppError(
        ErrorType.TOOL_ERROR,
        error.message,
        { toolName, toolParams, originalError: error.message }
      );
    }
    
    // Add tool-specific details
    if (!appError.details) {
      appError.details = {};
    }
    appError.details.toolName = toolName;
    appError.details.toolParams = toolParams;
    
    // Update the error type to TOOL_ERROR if it's not already
    if (appError.type !== ErrorType.TOOL_ERROR) {
      appError = new AppError(
        ErrorType.TOOL_ERROR,
        appError.message,
        { ...appError.details, originalType: appError.type },
        appError.status
      );
    }
    
    return this.translateToMCPError(appError, context);
  }

  /**
   * Log error details for debugging
   * @param error Error to log
   * @param context Additional context
   * @param logger Logger instance (optional)
   */
  static logError(error: AppError | Error, context?: string, logger?: any): void {
    const errorInfo = {
      message: error.message,
      type: error instanceof AppError ? error.type : 'UnknownError',
      context,
      stack: error.stack,
      ...(error instanceof AppError && error.details && { details: error.details }),
      ...(error instanceof AppError && error.status && { status: error.status })
    };

    if (logger) {
      logger.error('Error occurred:', errorInfo);
    } else {
      console.error('Error occurred:', JSON.stringify(errorInfo, null, 2));
    }
  }

  /**
   * Create a user-friendly error message for display
   * @param error Error to format
   * @returns User-friendly error message
   */
  static getUserFriendlyMessage(error: AppError | Error): string {
    if (!(error instanceof AppError)) {
      return `An unexpected error occurred: ${error.message}`;
    }

    switch (error.type) {
      case ErrorType.AUTH_ERROR:
        return this.getAuthErrorMessage(error);
      
      case ErrorType.NETWORK_ERROR:
        return this.getNetworkErrorMessage(error);
      
      case ErrorType.VALIDATION_ERROR:
        return `Invalid parameters: ${error.message}`;
      
      case ErrorType.API_ERROR:
        if (error.status === 429) {
          return 'Rate limit exceeded. Please wait before making more requests.';
        }
        if (error.status === 404) {
          return 'The requested resource was not found.';
        }
        return `API error: ${error.message}`;
      
      case ErrorType.CONFIG_ERROR:
        return `Configuration error: ${error.message}`;
      
      case ErrorType.TOOL_ERROR:
        return `Tool execution failed: ${error.message}`;
      
      default:
        return error.message;
    }
  }

  /**
   * Check if an error should trigger a retry
   * @param error Error to check
   * @returns True if the error is retryable
   */
  static isRetryableError(error: AppError | Error): boolean {
    if (!(error instanceof AppError)) {
      return false;
    }

    switch (error.type) {
      case ErrorType.NETWORK_ERROR:
        return true;
      
      case ErrorType.API_ERROR:
        return this.isRetryableAPIError(error);
      
      default:
        return false;
    }
  }

  /**
   * Get suggested retry delay for an error
   * @param error Error to analyze
   * @param attempt Current attempt number
   * @returns Suggested delay in milliseconds
   */
  static getRetryDelay(error: AppError | Error, attempt: number): number {
    if (!(error instanceof AppError)) {
      return 1000 * attempt; // Default exponential backoff
    }

    // Rate limit errors should respect Retry-After header
    if (error.type === ErrorType.API_ERROR && error.status === 429) {
      const retryAfter = error.details?.retryAfter;
      if (retryAfter) {
        return parseInt(retryAfter, 10) * 1000; // Convert seconds to milliseconds
      }
    }

    // Network errors get exponential backoff
    if (error.type === ErrorType.NETWORK_ERROR) {
      return Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Cap at 30 seconds
    }

    // Default exponential backoff
    return 1000 * attempt;
  }

  /**
   * Validate that an error response conforms to MCP specification
   * @param errorResponse Error response to validate
   * @returns True if the error response is valid
   */
  static validateMCPErrorResponse(errorResponse: any): boolean {
    if (!errorResponse || typeof errorResponse !== 'object') {
      return false;
    }

    // Check required fields
    if (typeof errorResponse.code !== 'number') {
      return false;
    }

    if (typeof errorResponse.message !== 'string') {
      return false;
    }

    // Check that code is in valid range
    const validCodes = Object.values(MCPErrorCodes);
    if (!validCodes.includes(errorResponse.code)) {
      return false;
    }

    return true;
  }

  /**
   * Create a standardized error response for MCP protocol violations
   * @param message Error message
   * @param data Additional error data
   * @returns MCP protocol error response
   */
  static createProtocolError(message: string, data?: any): MCPError {
    return {
      code: MCPErrorCodes.INVALID_REQUEST,
      message: `Protocol error: ${message}`,
      data: {
        timestamp: new Date().toISOString(),
        protocolViolation: true,
        ...data
      }
    };
  }

  /**
   * Create a standardized error response for method not found
   * @param method Method that was not found
   * @returns MCP method not found error response
   */
  static createMethodNotFoundError(method: string): MCPError {
    return {
      code: MCPErrorCodes.METHOD_NOT_FOUND,
      message: `Method not found: ${method}`,
      data: {
        timestamp: new Date().toISOString(),
        method,
        availableMethods: ['tools/list', 'tools/call']
      }
    };
  }

  /**
   * Create a standardized error response for parse errors
   * @param parseError Original parse error
   * @returns MCP parse error response
   */
  static createParseError(parseError: Error): MCPError {
    return {
      code: MCPErrorCodes.PARSE_ERROR,
      message: 'Parse error: Invalid JSON was received by the server',
      data: {
        timestamp: new Date().toISOString(),
        originalError: parseError.message,
        parseError: true
      }
    };
  }

  /**
   * Wrap an operation with comprehensive error handling
   * @param operation Operation to execute
   * @param context Error context for debugging
   * @returns Promise that resolves to operation result or throws MCP-formatted error
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const mcpError = this.translateToMCPError(error as Error, context);
      this.logError(error as Error, JSON.stringify(context));
      
      // Create a new error that includes the MCP error data
      const enhancedError = new Error(mcpError.message);
      (enhancedError as any).mcpError = mcpError;
      throw enhancedError;
    }
  }

  /**
   * Get error severity level for logging and monitoring
   * @param error Error to analyze
   * @returns Severity level (critical, error, warning, info)
   */
  static getErrorSeverity(error: AppError | Error): 'critical' | 'error' | 'warning' | 'info' {
    if (!(error instanceof AppError)) {
      return 'error';
    }

    switch (error.type) {
      case ErrorType.CONFIG_ERROR:
        return 'critical'; // Configuration errors prevent startup
      
      case ErrorType.AUTH_ERROR:
        return error.status === 401 ? 'error' : 'warning';
      
      case ErrorType.API_ERROR:
        if (error.status && error.status >= 500) {
          return 'error'; // Server errors are serious
        }
        if (error.status === 429) {
          return 'warning'; // Rate limits are expected
        }
        return 'info'; // Client errors are often user mistakes
      
      case ErrorType.NETWORK_ERROR:
        return 'warning'; // Network issues are often transient
      
      case ErrorType.VALIDATION_ERROR:
        return 'info'; // Validation errors are user input issues
      
      case ErrorType.TOOL_ERROR:
        return 'error'; // Tool failures need attention
      
      default:
        return 'error';
    }
  }

  /**
   * Check if an error indicates a system health issue
   * @param error Error to analyze
   * @returns True if the error indicates a system health problem
   */
  static isSystemHealthIssue(error: AppError | Error): boolean {
    if (!(error instanceof AppError)) {
      return true; // Unknown errors are concerning
    }

    switch (error.type) {
      case ErrorType.CONFIG_ERROR:
        return true; // Configuration issues affect system health
      
      case ErrorType.API_ERROR:
        return error.status ? error.status >= 500 : false; // Server errors indicate health issues
      
      case ErrorType.NETWORK_ERROR:
        return true; // Network issues affect system connectivity
      
      default:
        return false;
    }
  }

  /**
   * Create error metrics for monitoring and alerting
   * @param error Error to create metrics for
   * @param context Error context
   * @returns Error metrics object
   */
  static createErrorMetrics(error: AppError | Error, context?: ErrorContext) {
    const severity = this.getErrorSeverity(error);
    const isHealthIssue = this.isSystemHealthIssue(error);
    const isRetryable = this.isRetryableError(error);

    return {
      timestamp: new Date().toISOString(),
      errorType: error instanceof AppError ? error.type : 'UnknownError',
      severity,
      isHealthIssue,
      isRetryable,
      message: error.message,
      ...(error instanceof AppError && error.status && { httpStatus: error.status }),
      ...(context && {
        operation: context.operation,
        toolName: context.toolName,
        endpoint: context.endpoint,
        requestId: context.requestId
      })
    };
  }
}