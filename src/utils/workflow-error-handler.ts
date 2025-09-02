/**
 * WorkflowErrorHandler - Centralized error management for workflow operations
 * Provides graceful degradation, structured logging, and error response formatting
 */

import type { 
  Logger,
  WorkflowDefinition,
  WorkflowExecutionResult,
  WorkflowStatus,
  MCPError
} from '../types/index.js';
import { AppError, ErrorType } from '../types/index.js';
import { ErrorHandler, MCPErrorCodes } from './errors.js';

/**
 * Workflow-specific error types
 */
export enum WorkflowErrorType {
  DISCOVERY_FAILED = 'DISCOVERY_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  STATUS_CHECK_FAILED = 'STATUS_CHECK_FAILED',
  TOOL_GENERATION_FAILED = 'TOOL_GENERATION_FAILED',
  WORKFLOWS_LIST_TOOL_UNAVAILABLE = 'WORKFLOWS_LIST_TOOL_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED'
}

/**
 * Workflow error context for enhanced debugging
 */
export interface WorkflowErrorContext {
  operation: string;
  workflowId?: string | undefined;
  workflowInstanceId?: string | undefined;
  correlationId?: string | undefined;
  toolName?: string | undefined;
  parameters?: Record<string, any> | undefined;
  timestamp?: Date | undefined;
  retryAttempt?: number | undefined;
  additionalData?: Record<string, any> | undefined;
}

/**
 * Workflow error metrics for monitoring
 */
export interface WorkflowErrorMetrics {
  timestamp: string;
  errorType: WorkflowErrorType;
  operation: string;
  workflowId?: string | undefined;
  severity: 'critical' | 'error' | 'warning' | 'info';
  isRetryable: boolean;
  isGracefullyHandled: boolean;
  message: string;
  context?: WorkflowErrorContext | undefined;
}

/**
 * Centralized error handler for workflow operations
 */
export class WorkflowErrorHandler {
  private logger: Logger;
  private errorMetrics: WorkflowErrorMetrics[] = [];
  private maxMetricsHistory: number = 1000;

  constructor(logger: Logger) {
    this.logger = logger.child ? logger.child('WorkflowErrorHandler') : logger;
  }

  /**
   * Handle workflow discovery errors with graceful degradation
   */
  handleDiscoveryError(
    error: Error | AppError,
    context: Partial<WorkflowErrorContext> = {}
  ): WorkflowDefinition[] {
    const errorContext: WorkflowErrorContext = {
      operation: 'workflow_discovery',
      timestamp: new Date(),
      workflowId: context.workflowId || undefined,
      workflowInstanceId: context.workflowInstanceId || undefined,
      correlationId: context.correlationId || undefined,
      toolName: context.toolName || undefined,
      parameters: context.parameters || undefined,
      retryAttempt: context.retryAttempt || undefined,
      additionalData: context.additionalData || undefined
    };

    // Log the error with structured information
    this.logWorkflowError(error, WorkflowErrorType.DISCOVERY_FAILED, errorContext);

    // Record metrics
    this.recordErrorMetrics(
      WorkflowErrorType.DISCOVERY_FAILED,
      errorContext,
      error,
      'warning', // Discovery failures are warnings, not critical errors
      false, // Not retryable at this level
      true // Gracefully handled by returning empty array
    );

    // Check if this is a workflows-list-tool unavailable error
    if (this.isWorkflowsListToolUnavailable(error)) {
      this.logger.warn(
        'workflows-list-tool is unavailable. Server will continue with static tools only.',
        { context: errorContext }
      );
      
      // Schedule retry if configured (implementation would depend on configuration)
      this.scheduleDiscoveryRetry(errorContext);
    } else {
      this.logger.warn(
        'Workflow discovery failed. Continuing with existing/cached workflows.',
        { error: error.message, context: errorContext }
      );
    }

    // Graceful degradation: return empty array to continue with static tools
    return [];
  }

  /**
   * Handle workflow validation errors
   */
  handleValidationError(
    workflow: any,
    error: Error | AppError,
    context: Partial<WorkflowErrorContext> = {}
  ): null {
    const errorContext: WorkflowErrorContext = {
      operation: 'workflow_validation',
      timestamp: new Date(),
      workflowId: context.workflowId || undefined,
      workflowInstanceId: context.workflowInstanceId || undefined,
      correlationId: context.correlationId || undefined,
      toolName: context.toolName || undefined,
      parameters: context.parameters || undefined,
      retryAttempt: context.retryAttempt || undefined,
      additionalData: { workflow, ...(context.additionalData || {}) }
    };

    // Log validation failure
    this.logWorkflowError(error, WorkflowErrorType.VALIDATION_FAILED, errorContext);

    // Record metrics
    this.recordErrorMetrics(
      WorkflowErrorType.VALIDATION_FAILED,
      errorContext,
      error,
      'info', // Validation errors are usually user input issues
      false, // Not retryable
      true // Gracefully handled by skipping invalid workflow
    );

    this.logger.info(
      'Skipping invalid workflow definition',
      { 
        error: error.message, 
        workflowData: this.sanitizeWorkflowData(workflow),
        context: errorContext 
      }
    );

    // Graceful degradation: return null to skip this workflow
    return null;
  }

  /**
   * Handle workflow execution errors
   */
  handleExecutionError(
    error: Error | AppError,
    workflowId: string,
    parameters?: Record<string, any>,
    context: Partial<WorkflowErrorContext> = {}
  ): WorkflowExecutionResult {
    const errorContext: WorkflowErrorContext = {
      operation: 'workflow_execution',
      workflowId,
      workflowInstanceId: context.workflowInstanceId || undefined,
      correlationId: context.correlationId || undefined,
      toolName: context.toolName || undefined,
      parameters: this.sanitizeParameters(parameters),
      timestamp: new Date(),
      retryAttempt: context.retryAttempt || undefined,
      additionalData: context.additionalData || undefined
    };

    // Determine error type and severity
    const workflowErrorType = this.classifyExecutionError(error);
    const severity = this.getErrorSeverity(error, workflowErrorType);

    // Log the error
    this.logWorkflowError(error, workflowErrorType, errorContext);

    // Record metrics
    this.recordErrorMetrics(
      workflowErrorType,
      errorContext,
      error,
      severity,
      this.isRetryableError(error),
      true // Gracefully handled by returning error result
    );

    // Create structured error result
    const errorResult: WorkflowExecutionResult = {
      success: false,
      correlationId: context.correlationId || '',
      workflowInstanceId: context.workflowInstanceId || '',
      originalWorkflowId: workflowId,
      status: 'FAILED',
      error: this.getUserFriendlyErrorMessage(error, workflowErrorType) || undefined,
      metadata: {
        errorType: workflowErrorType,
        originalError: error.message,
        timestamp: errorContext.timestamp?.toISOString(),
        isRetryable: this.isRetryableError(error),
        context: errorContext
      }
    };

    return errorResult;
  }

  /**
   * Handle workflow status check errors
   */
  handleStatusCheckError(
    error: Error | AppError,
    workflowId: string,
    workflowInstanceId: string,
    context: Partial<WorkflowErrorContext> = {}
  ): WorkflowStatus {
    const errorContext: WorkflowErrorContext = {
      operation: 'workflow_status_check',
      workflowId,
      workflowInstanceId,
      correlationId: context.correlationId || undefined,
      toolName: context.toolName || undefined,
      parameters: context.parameters || undefined,
      timestamp: new Date(),
      retryAttempt: context.retryAttempt || undefined,
      additionalData: context.additionalData || undefined
    };

    // Log the error
    this.logWorkflowError(error, WorkflowErrorType.STATUS_CHECK_FAILED, errorContext);

    // Record metrics
    this.recordErrorMetrics(
      WorkflowErrorType.STATUS_CHECK_FAILED,
      errorContext,
      error,
      'warning',
      this.isRetryableError(error),
      true // Gracefully handled by returning error status
    );

    // Return error status
    return {
      create_time: Date.now(),
      update_time: Date.now(),
      status: 'FAILED',
      start_time: Date.now(),
      workflow_id: workflowId,
      input: {},
      output: {},
      workflowInstanceId,
      error: this.getUserFriendlyErrorMessage(error, WorkflowErrorType.STATUS_CHECK_FAILED)
    };
  }

  /**
   * Handle workflow tool generation errors
   */
  handleToolGenerationError(
    error: Error | AppError,
    workflow: WorkflowDefinition,
    context: Partial<WorkflowErrorContext> = {}
  ): null {
    const errorContext: WorkflowErrorContext = {
      operation: 'workflow_tool_generation',
      workflowId: workflow.id,
      workflowInstanceId: context.workflowInstanceId || undefined,
      correlationId: context.correlationId || undefined,
      toolName: workflow.name,
      parameters: context.parameters || undefined,
      timestamp: new Date(),
      retryAttempt: context.retryAttempt || undefined,
      additionalData: { workflow: this.sanitizeWorkflowData(workflow), ...(context.additionalData || {}) }
    };

    // Log the error
    this.logWorkflowError(error, WorkflowErrorType.TOOL_GENERATION_FAILED, errorContext);

    // Record metrics
    this.recordErrorMetrics(
      WorkflowErrorType.TOOL_GENERATION_FAILED,
      errorContext,
      error,
      'error', // Tool generation failures are more serious
      false, // Not retryable at this level
      true // Gracefully handled by skipping tool
    );

    this.logger.error(
      `Failed to generate tool for workflow ${workflow.name} (${workflow.id}). Tool will be skipped.`,
      { error: error.message, context: errorContext }
    );

    // Graceful degradation: return null to skip this tool
    return null;
  }

  /**
   * Create MCP-formatted error response for workflow tool failures
   */
  createWorkflowToolErrorResponse(
    error: Error | AppError,
    toolName: string,
    parameters?: Record<string, any>,
    context: Partial<WorkflowErrorContext> = {}
  ): MCPError {
    const errorContext: WorkflowErrorContext = {
      operation: 'workflow_tool_execution',
      workflowId: context.workflowId || undefined,
      workflowInstanceId: context.workflowInstanceId || undefined,
      correlationId: context.correlationId || undefined,
      toolName,
      parameters: this.sanitizeParameters(parameters),
      timestamp: new Date(),
      retryAttempt: context.retryAttempt || undefined,
      additionalData: context.additionalData || undefined
    };

    // Classify the error
    const workflowErrorType = this.classifyExecutionError(error);

    // Log the error
    this.logWorkflowError(error, workflowErrorType, errorContext);

    // Record metrics
    this.recordErrorMetrics(
      workflowErrorType,
      errorContext,
      error,
      this.getErrorSeverity(error, workflowErrorType),
      this.isRetryableError(error),
      true // Gracefully handled by returning MCP error
    );

    // Create workflow-specific error details
    const workflowErrorDetails = {
      workflowErrorType,
      toolName,
      isWorkflowError: true,
      userFriendlyMessage: this.getUserFriendlyErrorMessage(error, workflowErrorType),
      isRetryable: this.isRetryableError(error),
      context: errorContext
    };

    // Use existing ErrorHandler to create MCP error with workflow-specific details
    const baseError = error instanceof AppError ? error : new AppError(
      ErrorType.TOOL_ERROR,
      error.message,
      workflowErrorDetails
    );

    // Add workflow-specific details to the error
    if (!baseError.details) {
      baseError.details = {};
    }
    baseError.details = { ...baseError.details, ...workflowErrorDetails };

    return ErrorHandler.createToolErrorResponse(
      baseError,
      toolName,
      parameters,
      `Workflow tool execution failed: ${workflowErrorType}`
    );
  }

  /**
   * Check if workflows-list-tool is unavailable
   */
  isWorkflowsListToolUnavailable(error: Error | AppError): boolean {
    if (error instanceof AppError) {
      // Check for specific API errors that indicate tool unavailability
      if (error.type === ErrorType.API_ERROR) {
        return error.status === 404 || 
               error.message.includes('workflows-list-tool') ||
               error.message.includes('not found') ||
               error.message.includes('unavailable');
      }
      
      if (error.type === ErrorType.NETWORK_ERROR) {
        return true; // Network errors might indicate tool unavailability
      }
    }

    // Check error message for indicators
    const message = error.message.toLowerCase();
    return message.includes('workflows-list-tool') ||
           message.includes('tool not found') ||
           message.includes('connection refused') ||
           message.includes('service unavailable');
  }

  /**
   * Get error metrics for monitoring
   */
  getErrorMetrics(): WorkflowErrorMetrics[] {
    return [...this.errorMetrics];
  }

  /**
   * Clear error metrics history
   */
  clearErrorMetrics(): void {
    this.errorMetrics = [];
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<WorkflowErrorType, number>;
    errorsBySeverity: Record<string, number>;
    gracefullyHandledCount: number;
    retryableErrorCount: number;
  } {
    const stats = {
      totalErrors: this.errorMetrics.length,
      errorsByType: {} as Record<WorkflowErrorType, number>,
      errorsBySeverity: {} as Record<string, number>,
      gracefullyHandledCount: 0,
      retryableErrorCount: 0
    };

    // Initialize counters
    Object.values(WorkflowErrorType).forEach(type => {
      stats.errorsByType[type] = 0;
    });

    ['critical', 'error', 'warning', 'info'].forEach(severity => {
      stats.errorsBySeverity[severity] = 0;
    });

    // Count errors
    this.errorMetrics.forEach(metric => {
      stats.errorsByType[metric.errorType]++;
      
      // Severity should always be defined based on interface, but handle safely
      const severity = metric.severity as 'critical' | 'error' | 'warning' | 'info';
      if (severity && stats.errorsBySeverity[severity] !== undefined) {
        stats.errorsBySeverity[severity]++;
      }
      
      if (metric.isGracefullyHandled) {
        stats.gracefullyHandledCount++;
      }
      
      if (metric.isRetryable) {
        stats.retryableErrorCount++;
      }
    });

    return stats;
  }

  /**
   * Log workflow error with structured information
   */
  private logWorkflowError(
    error: Error | AppError,
    workflowErrorType: WorkflowErrorType,
    context: WorkflowErrorContext
  ): void {
    const logData = {
      workflowErrorType,
      message: error.message,
      context,
      ...(error instanceof AppError && {
        appErrorType: error.type,
        status: error.status,
        details: error.details
      }),
      stack: error.stack
    };

    // Use appropriate log level based on error severity
    const severity = this.getErrorSeverity(error, workflowErrorType);
    
    switch (severity) {
      case 'critical':
        this.logger.error(`Critical workflow error: ${workflowErrorType}`, logData);
        break;
      case 'error':
        this.logger.error(`Workflow error: ${workflowErrorType}`, logData);
        break;
      case 'warning':
        this.logger.warn(`Workflow warning: ${workflowErrorType}`, logData);
        break;
      case 'info':
        this.logger.info(`Workflow info: ${workflowErrorType}`, logData);
        break;
    }
  }

  /**
   * Record error metrics for monitoring
   */
  private recordErrorMetrics(
    errorType: WorkflowErrorType,
    context: WorkflowErrorContext,
    error: Error | AppError,
    severity: 'critical' | 'error' | 'warning' | 'info',
    isRetryable: boolean,
    isGracefullyHandled: boolean
  ): void {
    const metric: WorkflowErrorMetrics = {
      timestamp: new Date().toISOString(),
      errorType,
      operation: context.operation,
      workflowId: context.workflowId || undefined,
      severity,
      isRetryable,
      isGracefullyHandled,
      message: error.message,
      context
    };

    this.errorMetrics.push(metric);

    // Trim metrics history if it gets too large
    if (this.errorMetrics.length > this.maxMetricsHistory) {
      this.errorMetrics = this.errorMetrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * Classify execution errors into workflow-specific types
   */
  private classifyExecutionError(error: Error | AppError): WorkflowErrorType {
    if (error instanceof AppError) {
      switch (error.type) {
        case ErrorType.NETWORK_ERROR:
          if (error.message.toLowerCase().includes('timeout')) {
            return WorkflowErrorType.TIMEOUT;
          }
          return WorkflowErrorType.EXECUTION_FAILED;
        
        case ErrorType.API_ERROR:
          if (error.status === 408 || error.message.toLowerCase().includes('timeout')) {
            return WorkflowErrorType.TIMEOUT;
          }
          return WorkflowErrorType.EXECUTION_FAILED;
        
        case ErrorType.VALIDATION_ERROR:
          return WorkflowErrorType.VALIDATION_FAILED;
        
        default:
          return WorkflowErrorType.EXECUTION_FAILED;
      }
    }

    // Check error message for specific indicators
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) {
      return WorkflowErrorType.TIMEOUT;
    }
    
    if (message.includes('cancel')) {
      return WorkflowErrorType.CANCELLED;
    }
    
    return WorkflowErrorType.EXECUTION_FAILED;
  }

  /**
   * Get error severity based on error type and workflow context
   */
  private getErrorSeverity(
    error: Error | AppError,
    workflowErrorType: WorkflowErrorType
  ): 'critical' | 'error' | 'warning' | 'info' {
    // Workflow-specific severity rules
    switch (workflowErrorType) {
      case WorkflowErrorType.WORKFLOWS_LIST_TOOL_UNAVAILABLE:
        return 'warning'; // Expected to happen sometimes
      
      case WorkflowErrorType.DISCOVERY_FAILED:
        return 'warning'; // Can continue with static tools
      
      case WorkflowErrorType.VALIDATION_FAILED:
        return 'info'; // Usually user input issues
      
      case WorkflowErrorType.TIMEOUT:
        return 'warning'; // Often transient
      
      case WorkflowErrorType.CANCELLED:
        return 'info'; // User-initiated
      
      case WorkflowErrorType.EXECUTION_FAILED:
      case WorkflowErrorType.STATUS_CHECK_FAILED:
      case WorkflowErrorType.TOOL_GENERATION_FAILED:
        // Use base error handler logic for these
        if (error instanceof AppError) {
          return ErrorHandler.getErrorSeverity(error);
        }
        return 'error';
      
      default:
        return 'error';
    }
  }

  /**
   * Check if an error is retryable in workflow context
   */
  private isRetryableError(error: Error | AppError): boolean {
    if (error instanceof AppError) {
      return ErrorHandler.isRetryableError(error);
    }
    
    // Check for retryable patterns in generic errors
    const message = error.message.toLowerCase();
    return message.includes('timeout') ||
           message.includes('network') ||
           message.includes('connection') ||
           message.includes('temporary');
  }

  /**
   * Get user-friendly error message for workflow errors
   */
  private getUserFriendlyErrorMessage(
    error: Error | AppError,
    workflowErrorType: WorkflowErrorType
  ): string {
    switch (workflowErrorType) {
      case WorkflowErrorType.WORKFLOWS_LIST_TOOL_UNAVAILABLE:
        return 'Workflow discovery service is currently unavailable. Please try again later.';
      
      case WorkflowErrorType.DISCOVERY_FAILED:
        return 'Failed to discover available workflows. Using cached workflows if available.';
      
      case WorkflowErrorType.VALIDATION_FAILED:
        return 'Workflow definition is invalid and cannot be used.';
      
      case WorkflowErrorType.EXECUTION_FAILED:
        return `Workflow execution failed: ${error.message}`;
      
      case WorkflowErrorType.STATUS_CHECK_FAILED:
        return 'Unable to check workflow status. The workflow may still be running.';
      
      case WorkflowErrorType.TOOL_GENERATION_FAILED:
        return 'Failed to create workflow tool. This workflow is not available.';
      
      case WorkflowErrorType.TIMEOUT:
        return 'Workflow execution timed out. Please try again or check if the workflow is still running.';
      
      case WorkflowErrorType.CANCELLED:
        return 'Workflow execution was cancelled.';
      
      default:
        if (error instanceof AppError) {
          return ErrorHandler.getUserFriendlyMessage(error);
        }
        return error.message;
    }
  }

  /**
   * Sanitize workflow data for logging (remove sensitive information)
   */
  private sanitizeWorkflowData(workflow: any): any {
    if (!workflow || typeof workflow !== 'object') {
      return workflow;
    }

    const sanitized = { ...workflow };
    
    // Remove potentially sensitive fields
    delete sanitized.apiKey;
    delete sanitized.token;
    delete sanitized.password;
    delete sanitized.secret;
    
    // Truncate large fields
    if (sanitized.description && sanitized.description.length > 200) {
      sanitized.description = sanitized.description.substring(0, 200) + '...';
    }
    
    return sanitized;
  }

  /**
   * Sanitize parameters for logging (remove sensitive information)
   */
  private sanitizeParameters(parameters?: Record<string, any>): Record<string, any> | undefined {
    if (!parameters || typeof parameters !== 'object') {
      return parameters;
    }

    const sanitized = { ...parameters };
    
    // Remove potentially sensitive fields
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'key', 'auth'];
    
    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * Schedule discovery retry (placeholder for retry logic)
   */
  private scheduleDiscoveryRetry(context: WorkflowErrorContext): void {
    // This would be implemented based on configuration
    // For now, just log that a retry should be scheduled
    this.logger.debug(
      'Discovery retry should be scheduled',
      { context }
    );
  }
}