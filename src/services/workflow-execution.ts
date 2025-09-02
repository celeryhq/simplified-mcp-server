/**
 * WorkflowExecutionService - Handles workflow execution via Simplified API
 */

import type { 
  WorkflowExecutionResult, 
  WorkflowStatus, 
  APIClient,
  Logger 
} from '../types/index.js';
import { AppError, ErrorType } from '../types/index.js';
import { WorkflowErrorHandler } from '../utils/workflow-error-handler.js';
import { WorkflowPerformanceMonitor, type PerformanceMonitorConfig } from './workflow-performance-monitor.js';

/**
 * Configuration for workflow execution
 */
export interface WorkflowExecutionConfig {
  executionTimeout: number;      // Default execution timeout in ms
  statusCheckInterval: number;   // Status polling interval in ms (minimum 1000ms)
  maxRetryAttempts: number;      // Max retry attempts for failed requests
  performanceMonitoring?: PerformanceMonitorConfig; // Performance monitoring config
}

/**
 * Service for executing workflows via Simplified API
 */
export class WorkflowExecutionService {
  private apiClient: APIClient;
  private logger: Logger;
  private config: WorkflowExecutionConfig;
  private errorHandler: WorkflowErrorHandler;
  private activeExecutions: Map<string, AbortController> = new Map();
  private performanceMonitor?: WorkflowPerformanceMonitor;

  constructor(
    apiClient: APIClient, 
    logger: Logger, 
    config: WorkflowExecutionConfig
  ) {
    this.apiClient = apiClient;
    this.logger = logger;
    this.config = {
      ...config,
      statusCheckInterval: Math.max(config.statusCheckInterval, 1000) // Enforce minimum 1000ms
    };
    this.errorHandler = new WorkflowErrorHandler(logger);
    
    // Initialize performance monitor if configured
    if (config.performanceMonitoring) {
      this.performanceMonitor = new WorkflowPerformanceMonitor(logger, config.performanceMonitoring);
    }
  }

  /**
   * Execute a workflow and return the result
   */
  async executeWorkflow(
    workflowId: string, 
    parameters: Record<string, any>
  ): Promise<WorkflowExecutionResult> {
    this.logger.info(`Starting workflow execution for workflow ${workflowId}`);
    
    let executionResult: { correlation_id: string; workflow_id: string } | undefined;
    let workflowInstanceId: string | undefined;
    
    try {
      // Build execution payload
      const payload = this.buildExecutionPayload(parameters);
      const endpoint = this.buildExecutionEndpoint(workflowId);
      
      // Start workflow execution
      const apiStartTime = Date.now();
      const executionResponse = await this.apiClient.post(endpoint, payload);
      const apiDuration = Date.now() - apiStartTime;
      
      executionResult = this.parseExecutionResponse(executionResponse.data);
      workflowInstanceId = executionResult.workflow_id;
      
      // Start performance monitoring
      this.performanceMonitor?.startExecution(
        workflowId,
        workflowInstanceId,
        executionResult.correlation_id,
        { parameters }
      );
      
      // Record API call
      this.performanceMonitor?.recordApiCall(
        workflowId,
        workflowInstanceId,
        apiDuration,
        true
      );
      
      this.logger.info(
        `Workflow ${workflowId} started with correlation_id: ${executionResult.correlation_id}, workflow_id: ${executionResult.workflow_id}`
      );
      
      // Poll until completion
      const finalStatus = await this.pollUntilComplete(
        workflowId, 
        executionResult.workflow_id,
        this.config.executionTimeout
      );
      
      // Complete performance tracking
      this.performanceMonitor?.completeExecution(
        workflowId,
        workflowInstanceId,
        finalStatus.status as 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT',
        finalStatus.error
      );
      
      // Build final result
      const result: WorkflowExecutionResult = {
        success: finalStatus.status === 'COMPLETED',
        correlationId: executionResult.correlation_id,
        workflowInstanceId: executionResult.workflow_id,
        originalWorkflowId: workflowId,
        status: finalStatus.status,
        input: finalStatus.input,
        output: finalStatus.output,
        error: finalStatus.error || undefined,
        startTime: finalStatus.start_time,
        endTime: finalStatus.end_time,
        createTime: finalStatus.create_time,
        updateTime: finalStatus.update_time,
        executionDuration: finalStatus.end_time ? 
          finalStatus.end_time - finalStatus.start_time : undefined,
        executionResponse: executionResult,
        statusResponse: finalStatus
      };
      
      this.logger.info(
        `Workflow ${workflowId} completed with status: ${finalStatus.status}, duration: ${result.executionDuration}ms`
      );
      
      return result;
      
    } catch (error) {
      // Record error in performance monitoring
      if (workflowInstanceId) {
        this.performanceMonitor?.completeExecution(
          workflowId,
          workflowInstanceId,
          'FAILED',
          error instanceof Error ? error.message : String(error)
        );
      }
      
      return this.errorHandler.handleExecutionError(
        error instanceof Error ? error : new Error(String(error)),
        workflowId,
        parameters,
        { 
          correlationId: executionResult?.correlation_id || undefined, 
          workflowInstanceId: executionResult?.workflow_id || undefined 
        }
      );
    }
  }

  /**
   * Get the current status of a workflow execution
   */
  async getExecutionStatus(
    workflowId: string, 
    workflowInstanceId: string
  ): Promise<WorkflowStatus> {
    const endpoint = this.buildStatusEndpoint(workflowId, workflowInstanceId);
    
    try {
      const apiStartTime = Date.now();
      const response = await this.apiClient.get(endpoint, undefined, {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en'
        }
      });
      const apiDuration = Date.now() - apiStartTime;
      
      // Record API call for performance monitoring
      this.performanceMonitor?.recordApiCall(
        workflowId,
        workflowInstanceId,
        apiDuration,
        true
      );
      
      const status = this.parseStatusResponse(response.data, workflowId, workflowInstanceId);
      
      // Update execution status in performance monitor
      this.performanceMonitor?.updateExecutionStatus(
        workflowId,
        workflowInstanceId,
        status.status as 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT',
        status.error
      );
      
      return status;
      
    } catch (error) {
      // Record failed API call
      this.performanceMonitor?.recordApiCall(
        workflowId,
        workflowInstanceId,
        0,
        false,
        error instanceof Error ? error.message : String(error)
      );
      
      // Use error handler but still throw for this method since it's expected to throw
      this.errorHandler.handleStatusCheckError(
        error instanceof Error ? error : new Error(String(error)),
        workflowId,
        workflowInstanceId
      );
      
      throw new AppError(
        ErrorType.API_ERROR,
        `Failed to get workflow status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { workflowId, workflowInstanceId, originalError: error }
      );
    }
  }

  /**
   * Poll workflow status until completion with minimum 1000ms interval
   */
  async pollUntilComplete(
    workflowId: string,
    workflowInstanceId: string,
    timeout?: number
  ): Promise<WorkflowStatus> {
    const startTime = Date.now();
    const timeoutMs = timeout || this.config.executionTimeout;
    const executionKey = `${workflowId}:${workflowInstanceId}`;
    
    // Create abort controller for this execution
    const abortController = new AbortController();
    this.activeExecutions.set(executionKey, abortController);
    
    try {
      while (true) {
        // Check for timeout
        if (Date.now() - startTime > timeoutMs) {
          throw new AppError(
            ErrorType.API_ERROR,
            `Workflow execution timeout after ${timeoutMs}ms`,
            { workflowId, workflowInstanceId, timeout: timeoutMs }
          );
        }
        
        // Check if execution was cancelled
        if (abortController.signal.aborted) {
          throw new AppError(
            ErrorType.API_ERROR,
            'Workflow execution was cancelled',
            { workflowId, workflowInstanceId }
          );
        }
        
        // Get current status
        const status = await this.getExecutionStatus(workflowId, workflowInstanceId);
        
        // Check if workflow is complete
        if (status.status !== 'RUNNING') {
          this.logger.info(
            `Workflow ${workflowId} polling completed with status: ${status.status}`
          );
          return status;
        }
        
        // Wait before next poll (minimum 1000ms)
        await this.delay(this.config.statusCheckInterval);
      }
      
    } finally {
      // Clean up active execution tracking
      this.activeExecutions.delete(executionKey);
    }
  }

  /**
   * Cancel a running workflow execution (if supported)
   */
  async cancelExecution(
    workflowId: string, 
    workflowInstanceId: string
  ): Promise<boolean> {
    const executionKey = `${workflowId}:${workflowInstanceId}`;
    
    // Cancel local polling
    const abortController = this.activeExecutions.get(executionKey);
    if (abortController) {
      abortController.abort();
      this.activeExecutions.delete(executionKey);
    }
    
    // Note: The Simplified API doesn't appear to have a cancel endpoint
    // based on the design document, so we only cancel local polling
    this.logger.info(`Cancelled local polling for workflow ${workflowId}, instance ${workflowInstanceId}`);
    return true;
  }

  /**
   * Build execution payload with required format
   */
  buildExecutionPayload(parameters: Record<string, any>): { input: any; source: string } {
    return {
      input: parameters,
      source: 'application'
    };
  }

  /**
   * Build execution endpoint URL
   */
  buildExecutionEndpoint(workflowId: string): string {
    return `/api/v1/service/workflows/${workflowId}/start`;
  }

  /**
   * Build status endpoint URL
   */
  buildStatusEndpoint(workflowId: string, workflowInstanceId: string): string {
    return `/api/v1/service/workflows/${workflowId}/runs/${workflowInstanceId}/status`;
  }

  /**
   * Parse execution response to extract correlation_id and workflow_id
   */
  parseExecutionResponse(response: any): { correlation_id: string; workflow_id: string } {
    if (!response || typeof response !== 'object') {
      throw new AppError(
        ErrorType.API_ERROR,
        'Invalid execution response format',
        { response }
      );
    }
    
    const { correlation_id, workflow_id } = response;
    
    if (!correlation_id || !workflow_id) {
      throw new AppError(
        ErrorType.API_ERROR,
        'Missing correlation_id or workflow_id in execution response',
        { response }
      );
    }
    
    return { correlation_id, workflow_id };
  }

  /**
   * Parse status response for handling RUNNING/COMPLETED/FAILED/CANCELLED states
   */
  parseStatusResponse(
    response: any, 
    originalWorkflowId: string, 
    workflowInstanceId: string
  ): WorkflowStatus {
    if (!response || typeof response !== 'object') {
      throw new AppError(
        ErrorType.API_ERROR,
        'Invalid status response format',
        { response, originalWorkflowId, workflowInstanceId }
      );
    }
    
    const {
      create_time,
      update_time,
      status,
      end_time,
      start_time,
      workflow_id,
      input,
      output
    } = response;
    
    // Validate required fields
    if (
      typeof create_time !== 'number' ||
      typeof update_time !== 'number' ||
      !status ||
      typeof start_time !== 'number' ||
      !workflow_id ||
      !input ||
      !output
    ) {
      throw new AppError(
        ErrorType.API_ERROR,
        'Missing required fields in status response',
        { response, originalWorkflowId, workflowInstanceId }
      );
    }
    
    // Validate status value
    const validStatuses = ['RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new AppError(
        ErrorType.API_ERROR,
        `Invalid status value: ${status}`,
        { response, originalWorkflowId, workflowInstanceId }
      );
    }
    
    // Extract error message for failed workflows
    let error: string | undefined = undefined;
    if (status === 'FAILED') {
      // Try to extract error from output or create generic message
      if (output && typeof output === 'object') {
        error = output.error || output.message || 'Workflow execution failed';
      } else {
        error = 'Workflow execution failed';
      }
    }
    
    return {
      create_time,
      update_time,
      status: status as 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
      end_time,
      start_time,
      workflow_id,
      input,
      output,
      workflowInstanceId,
      error: error || undefined
    };
  }

  /**
   * Set execution timeout
   */
  setExecutionTimeout(timeout: number): void {
    this.config.executionTimeout = timeout;
  }

  /**
   * Handle execution errors and return structured error result
   * @deprecated Use WorkflowErrorHandler.handleExecutionError instead
   */
  handleExecutionError(error: any, workflowId: string): WorkflowExecutionResult {
    // Delegate to the error handler for consistency
    return this.errorHandler.handleExecutionError(
      error instanceof Error ? error : new Error(String(error)),
      workflowId
    );
  }

  /**
   * Get active executions count
   */
  getActiveExecutionsCount(): number {
    return this.activeExecutions.size;
  }

  /**
   * Get list of active execution keys
   */
  getActiveExecutionKeys(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Cancel all active executions
   */
  cancelAllExecutions(): void {
    this.activeExecutions.forEach((controller, key) => {
      controller.abort();
      this.logger.info(`Cancelled execution: ${key}`);
      
      // Update performance monitoring for cancelled executions
      const [workflowId, workflowInstanceId] = key.split(':');
      if (workflowId && workflowInstanceId) {
        this.performanceMonitor?.updateExecutionStatus(
          workflowId,
          workflowInstanceId,
          'CANCELLED',
          'Execution cancelled by service shutdown'
        );
      }
    });
    this.activeExecutions.clear();
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(windowMs?: number) {
    return this.performanceMonitor?.getPerformanceStats(windowMs);
  }

  /**
   * Get performance monitor instance (for testing)
   */
  getPerformanceMonitor(): WorkflowPerformanceMonitor | undefined {
    return this.performanceMonitor;
  }

  /**
   * Shutdown the execution service
   */
  shutdown(): void {
    this.logger.info('1 Shutting down WorkflowExecutionService');
    
    // Cancel all active executions
    this.cancelAllExecutions();
    
    // Shutdown performance monitor
    this.performanceMonitor?.shutdown();
    
    this.logger.info('WorkflowExecutionService shutdown complete');
  }

  /**
   * Get current configuration (for testing)
   */
  getConfig(): Readonly<WorkflowExecutionConfig> {
    return { ...this.config };
  }

  /**
   * Delay helper for polling intervals
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}