/**
 * WorkflowStatusService - Provides status checking capabilities for running workflows
 */

import type { 
  WorkflowStatus, 
  APIClient,
  Logger 
} from '../types/index.js';
import { AppError, ErrorType } from '../types/index.js';
import { WorkflowErrorHandler } from '../utils/workflow-error-handler.js';

/**
 * Configuration for workflow status service
 */
export interface WorkflowStatusConfig {
  statusCheckInterval: number;   // Status polling interval in ms (minimum 1000ms)
  maxRetryAttempts: number;      // Max retry attempts for failed requests
  cleanupInterval: number;       // Interval for cleaning up completed executions
}

/**
 * Execution tracking information
 */
interface ExecutionTracker {
  workflowId: string;
  workflowInstanceId: string;
  correlationId?: string | undefined;
  startTime: number;
  lastStatusCheck: number;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  pollInterval?: NodeJS.Timeout | undefined;
  callbacks: Array<(status: WorkflowStatus) => void>;
}

/**
 * Service for checking workflow execution status via API calls
 */
export class WorkflowStatusService {
  private apiClient: APIClient;
  private logger: Logger;
  private config: WorkflowStatusConfig;
  private errorHandler: WorkflowErrorHandler;
  private trackedExecutions: Map<string, ExecutionTracker> = new Map();
  private cleanupTimer?: NodeJS.Timeout | undefined;

  constructor(
    apiClient: APIClient, 
    logger: Logger, 
    config: WorkflowStatusConfig
  ) {
    this.apiClient = apiClient;
    this.logger = logger;
    this.config = {
      ...config,
      statusCheckInterval: Math.max(config.statusCheckInterval, 1000) // Enforce minimum 1000ms
    };
    this.errorHandler = new WorkflowErrorHandler(logger);
    
    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Check the status of a workflow execution
   */
  async checkStatus(
    workflowId: string, 
    workflowInstanceId: string
  ): Promise<WorkflowStatus> {
    this.logger.debug(`Checking status for workflow ${workflowId}, instance ${workflowInstanceId}`);
    
    const endpoint = this.buildStatusEndpoint(workflowId, workflowInstanceId);
    
    try {
      const response = await this.apiClient.get(endpoint, undefined, {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en'
        }
      });
      
      const status = this.parseStatusResponse(response.data, workflowId, workflowInstanceId);
      
      // Update tracking information if this execution is being tracked
      const trackingKey = this.getTrackingKey(workflowId, workflowInstanceId);
      const tracker = this.trackedExecutions.get(trackingKey);
      if (tracker) {
        tracker.status = status.status;
        tracker.lastStatusCheck = Date.now();
      }
      
      this.logger.debug(
        `Status check completed for workflow ${workflowId}: ${status.status}`
      );
      
      return status;
      
    } catch (error) {
      // Use error handler but still throw for this method since it's expected to throw
      this.errorHandler.handleStatusCheckError(
        error instanceof Error ? error : new Error(String(error)),
        workflowId,
        workflowInstanceId
      );
      
      throw new AppError(
        ErrorType.API_ERROR,
        `Failed to check workflow status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { workflowId, workflowInstanceId, originalError: error }
      );
    }
  }

  /**
   * Start polling for status updates with callback
   */
  pollWithInterval(
    workflowId: string,
    workflowInstanceId: string,
    callback: (status: WorkflowStatus) => void
  ): void {
    const trackingKey = this.getTrackingKey(workflowId, workflowInstanceId);
    
    // Check if already tracking this execution
    let tracker = this.trackedExecutions.get(trackingKey);
    if (!tracker) {
      tracker = {
        workflowId,
        workflowInstanceId,
        startTime: Date.now(),
        lastStatusCheck: 0,
        status: 'RUNNING',
        callbacks: []
      };
      this.trackedExecutions.set(trackingKey, tracker);
    }
    
    // Add callback to tracker
    tracker.callbacks.push(callback);
    
    // Start polling if not already started
    if (!tracker.pollInterval) {
      this.logger.info(
        `Starting status polling for workflow ${workflowId}, instance ${workflowInstanceId}`
      );
      
      tracker.pollInterval = setInterval(async () => {
        try {
          const status = await this.checkStatus(workflowId, workflowInstanceId);
          
          // Notify all callbacks
          tracker!.callbacks.forEach(cb => {
            try {
              cb(status);
            } catch (error) {
              this.logger.error('Error in status callback:', error);
            }
          });
          
          // Stop polling if workflow is complete
          if (status.status !== 'RUNNING') {
            this.stopPolling(workflowId, workflowInstanceId);
          }
          
        } catch (error) {
          // Use error handler for structured logging and error status creation
          const errorStatus = this.errorHandler.handleStatusCheckError(
            error instanceof Error ? error : new Error(String(error)),
            workflowId,
            workflowInstanceId,
            { operation: 'status_polling' }
          );
          
          tracker!.callbacks.forEach(cb => {
            try {
              cb(errorStatus);
            } catch (cbError) {
              this.logger.error('Error in error status callback:', cbError);
            }
          });
          
          // Stop polling on persistent errors
          this.stopPolling(workflowId, workflowInstanceId);
        }
      }, this.config.statusCheckInterval);
    }
  }

  /**
   * Stop polling for a specific workflow execution
   */
  stopPolling(workflowId: string, workflowInstanceId: string): void {
    const trackingKey = this.getTrackingKey(workflowId, workflowInstanceId);
    const tracker = this.trackedExecutions.get(trackingKey);
    
    if (tracker && tracker.pollInterval) {
      clearInterval(tracker.pollInterval);
      tracker.pollInterval = undefined;
      
      this.logger.info(
        `Stopped status polling for workflow ${workflowId}, instance ${workflowInstanceId}`
      );
    }
  }

  /**
   * Track a workflow execution for status monitoring
   */
  trackExecution(executionId: string, workflowId: string): void {
    // For this implementation, executionId is the workflowInstanceId
    const trackingKey = this.getTrackingKey(workflowId, executionId);
    
    if (!this.trackedExecutions.has(trackingKey)) {
      const tracker: ExecutionTracker = {
        workflowId,
        workflowInstanceId: executionId,
        startTime: Date.now(),
        lastStatusCheck: 0,
        status: 'RUNNING',
        callbacks: []
      };
      
      this.trackedExecutions.set(trackingKey, tracker);
      
      this.logger.info(
        `Started tracking execution for workflow ${workflowId}, instance ${executionId}`
      );
    }
  }

  /**
   * Clean up completed workflow executions
   */
  cleanupCompletedExecutions(): void {
    const now = Date.now();
    const completedKeys: string[] = [];
    
    for (const [key, tracker] of this.trackedExecutions.entries()) {
      // Clean up executions that are completed and haven't been checked recently
      const isCompleted = tracker.status !== 'RUNNING';
      const isStale = now - tracker.lastStatusCheck > this.config.cleanupInterval;
      
      if (isCompleted && isStale) {
        // Stop any active polling
        if (tracker.pollInterval) {
          clearInterval(tracker.pollInterval);
        }
        
        completedKeys.push(key);
      }
    }
    
    // Remove completed executions
    completedKeys.forEach(key => {
      const tracker = this.trackedExecutions.get(key);
      if (tracker) {
        this.logger.debug(
          `Cleaned up completed execution: workflow ${tracker.workflowId}, instance ${tracker.workflowInstanceId}`
        );
        this.trackedExecutions.delete(key);
      }
    });
    
    if (completedKeys.length > 0) {
      this.logger.info(`Cleaned up ${completedKeys.length} completed executions`);
    }
  }

  /**
   * Get the number of currently tracked executions
   */
  getTrackedExecutionsCount(): number {
    return this.trackedExecutions.size;
  }

  /**
   * Get list of tracked execution keys
   */
  getTrackedExecutionKeys(): string[] {
    return Array.from(this.trackedExecutions.keys());
  }

  /**
   * Get tracking information for a specific execution
   */
  getExecutionTracker(workflowId: string, workflowInstanceId: string): ExecutionTracker | undefined {
    const trackingKey = this.getTrackingKey(workflowId, workflowInstanceId);
    return this.trackedExecutions.get(trackingKey);
  }

  /**
   * Stop all polling and clean up
   */
  shutdown(): void {
    this.logger.info('3 Shutting down WorkflowStatusService');
    
    // Stop all polling intervals
    for (const tracker of this.trackedExecutions.values()) {
      if (tracker.pollInterval) {
        clearInterval(tracker.pollInterval);
      }
    }
    
    // Clear all tracked executions
    this.trackedExecutions.clear();
    
    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Build status endpoint URL
   */
  private buildStatusEndpoint(workflowId: string, workflowInstanceId: string): string {
    return `/api/v1/service/workflows/${workflowId}/runs/${workflowInstanceId}/status`;
  }

  /**
   * Parse status response for handling RUNNING/COMPLETED/FAILED/CANCELLED states
   */
  private parseStatusResponse(
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
    let error: string | undefined;
    if (status === 'FAILED') {
      // Try to extract error from output or create generic message
      if (output && typeof output === 'object') {
        error = output.error || output.message || 'Workflow execution failed';
      } else {
        error = 'Workflow execution failed';
      }
    }
    
    const result: WorkflowStatus = {
      create_time,
      update_time,
      status: status as 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
      end_time,
      start_time,
      workflow_id,
      input,
      output,
      workflowInstanceId
    };
    
    // Only add error property if it has a value
    if (error !== undefined) {
      result.error = error;
    }
    
    return result;
  }

  /**
   * Generate tracking key for execution
   */
  private getTrackingKey(workflowId: string, workflowInstanceId: string): string {
    return `${workflowId}:${workflowInstanceId}`;
  }

  /**
   * Start the cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupCompletedExecutions();
    }, this.config.cleanupInterval);
  }

  /**
   * Get current configuration (for testing)
   */
  getConfig(): Readonly<WorkflowStatusConfig> {
    return { ...this.config };
  }
}