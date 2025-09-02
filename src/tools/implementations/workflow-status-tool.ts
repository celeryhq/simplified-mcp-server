/**
 * Workflow Status Checking Tool
 * Built-in MCP tool for checking workflow execution status via GET API calls
 */

import type { 
  ToolDefinition, 
  APIClient, 
  Logger,
  WorkflowStatus,
  ToolCallResponse 
} from '../../types/index.js';
import { AppError, ErrorType } from '../../types/index.js';
import { createTool, CommonSchemas } from '../definitions.js';

/**
 * Parameters for workflow status check
 */
interface WorkflowStatusCheckParams {
  workflowId: string;      // Original workflow ID (e.g., "2724")
  workflow_id: string;     // UUID from execution response
  includeRawResponse?: boolean; // Whether to include raw API response
}

/**
 * Create the workflow status checking tool definition
 */
function createWorkflowStatusTool(logger: Logger): ToolDefinition {
  return createTool()
    .name('check-workflow-status')
    .description('Check the execution status of a running workflow via API calls')
    .category('workflow')
    .version('1.0.0')
    .requiredString(
      'workflowId', 
      'The original workflow ID used to start the execution (e.g., "2724")',
      { 
        minLength: 1,
        maxLength: 100,
        pattern: '^[a-zA-Z0-9_-]+$'
      }
    )
    .requiredString(
      'workflow_id',
      'The workflow instance ID (UUID) returned from the execution start response',
      {
        pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      }
    )
    .optionalBoolean(
      'includeRawResponse',
      'Whether to include the raw API response in the result (default: false)'
    )
    .handler(async (params: WorkflowStatusCheckParams, apiClient: APIClient): Promise<ToolCallResponse> => {
      return handleWorkflowStatusCheck(params, apiClient, logger);
    })
    .build();
}

/**
 * Handle workflow status check request
 */
async function handleWorkflowStatusCheck(
  params: WorkflowStatusCheckParams,
  apiClient: APIClient,
  logger: Logger
): Promise<ToolCallResponse> {
  logger.info(`Checking workflow status: workflowId=${params.workflowId}, workflow_id=${params.workflow_id}`);

  try {
    // Validate parameters
    validateStatusCheckParams(params);

    // Build the status endpoint URL
    const endpoint = buildStatusEndpoint(params.workflowId, params.workflow_id);
    
    logger.debug(`Making status check request to: ${endpoint}`);

    // Make the API call to check status
    const response = await apiClient.get(endpoint, undefined, {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en'
      }
    });

    // Parse and validate the status response
    const status = parseStatusResponse(response.data, params.workflowId, params.workflow_id);
    
    logger.info(`Workflow status check completed: ${status.status}`);

    // Format the response for MCP
    return formatStatusResponse(status, params.includeRawResponse ? response.data : undefined);

  } catch (error) {
    logger.error(`Workflow status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      workflowId: params.workflowId,
      workflow_id: params.workflow_id,
      error
    });

    // Handle different types of errors
    if (error instanceof AppError) {
      return formatErrorResponse(error);
    }

    // Handle API unavailability
    if (isAPIUnavailableError(error)) {
      return formatAPIUnavailableResponse(params.workflowId, params.workflow_id);
    }

    // Handle other errors
    const appError = new AppError(
      ErrorType.API_ERROR,
      `Failed to check workflow status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { workflowId: params.workflowId, workflow_id: params.workflow_id, originalError: error }
    );

    return formatErrorResponse(appError);
  }
}

/**
 * Validate workflow status check parameters
 */
function validateStatusCheckParams(params: WorkflowStatusCheckParams): void {
  if (!params.workflowId || typeof params.workflowId !== 'string') {
    throw new AppError(
      ErrorType.VALIDATION_ERROR,
      'workflowId is required and must be a non-empty string'
    );
  }

  if (!params.workflow_id || typeof params.workflow_id !== 'string') {
    throw new AppError(
      ErrorType.VALIDATION_ERROR,
      'workflow_id is required and must be a non-empty string'
    );
  }

  // Validate workflowId format (alphanumeric, underscore, hyphen)
  const workflowIdPattern = /^[a-zA-Z0-9_-]+$/;
  if (!workflowIdPattern.test(params.workflowId)) {
    throw new AppError(
      ErrorType.VALIDATION_ERROR,
      'workflowId must contain only alphanumeric characters, underscores, and hyphens'
    );
  }

  // Validate workflow_id as UUID
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(params.workflow_id)) {
    throw new AppError(
      ErrorType.VALIDATION_ERROR,
      'workflow_id must be a valid UUID format'
    );
  }
}

/**
 * Build the status endpoint URL
 */
function buildStatusEndpoint(workflowId: string, workflowInstanceId: string): string {
  return `/api/v1/service/workflows/${workflowId}/runs/${workflowInstanceId}/status`;
}

/**
 * Parse and validate the status response from the API
 */
function parseStatusResponse(
  response: any, 
  originalWorkflowId: string, 
  workflowInstanceId: string
): WorkflowStatus {
  if (!response || typeof response !== 'object') {
    throw new AppError(
      ErrorType.API_ERROR,
      'Invalid status response format: response is not an object',
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
  const missingFields: string[] = [];
  if (typeof create_time !== 'number') missingFields.push('create_time');
  if (typeof update_time !== 'number') missingFields.push('update_time');
  if (!status || typeof status !== 'string') missingFields.push('status');
  if (typeof start_time !== 'number') missingFields.push('start_time');
  if (!workflow_id || typeof workflow_id !== 'string') missingFields.push('workflow_id');
  if (!input || typeof input !== 'object') missingFields.push('input');
  if (!output || typeof output !== 'object') missingFields.push('output');

  if (missingFields.length > 0) {
    throw new AppError(
      ErrorType.API_ERROR,
      `Missing required fields in status response: ${missingFields.join(', ')}`,
      { response, originalWorkflowId, workflowInstanceId, missingFields }
    );
  }

  // Validate status value
  const validStatuses = ['RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    throw new AppError(
      ErrorType.API_ERROR,
      `Invalid status value: ${status}. Must be one of: ${validStatuses.join(', ')}`,
      { response, originalWorkflowId, workflowInstanceId, status }
    );
  }

  // Extract error message for failed workflows
  let error: string | undefined;
  if (status === 'FAILED') {
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
    error
  };
}

/**
 * Format the successful status response for MCP
 */
function formatStatusResponse(status: WorkflowStatus, rawResponse?: any): ToolCallResponse {
  const executionDuration = status.end_time && status.start_time 
    ? status.end_time - status.start_time 
    : undefined;

  const result = {
    workflowId: status.workflow_id,
    workflowInstanceId: status.workflowInstanceId,
    status: status.status,
    createTime: new Date(status.create_time).toISOString(),
    updateTime: new Date(status.update_time).toISOString(),
    startTime: new Date(status.start_time).toISOString(),
    ...(status.end_time && { endTime: new Date(status.end_time).toISOString() }),
    ...(executionDuration && { executionDurationMs: executionDuration }),
    input: status.input,
    output: status.output,
    ...(status.error && { error: status.error }),
    ...(status.progress !== undefined && { progress: status.progress }),
    ...(rawResponse && { rawResponse })
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }
    ]
  };
}

/**
 * Format error response for MCP
 */
function formatErrorResponse(error: AppError): ToolCallResponse {
  const errorResult = {
    success: false,
    error: {
      type: error.type,
      message: error.message,
      ...(error.details && { details: error.details }),
      ...(error.status && { status: error.status })
    }
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(errorResult, null, 2)
      }
    ]
  };
}

/**
 * Format response when status checking API is not available
 */
function formatAPIUnavailableResponse(workflowId: string, workflowInstanceId: string): ToolCallResponse {
  const result = {
    success: false,
    workflowId,
    workflowInstanceId,
    error: {
      type: 'API_UNAVAILABLE',
      message: 'Workflow status checking API is not available',
      details: {
        reason: 'The status checking endpoint is not accessible or the service is down',
        suggestion: 'Please try again later or check if the workflow service is running'
      }
    }
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }
    ]
  };
}

/**
 * Check if an error indicates API unavailability
 */
function isAPIUnavailableError(error: any): boolean {
  if (!error) return false;

  // Check for common API unavailability indicators
  const unavailabilityIndicators = [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNRESET',
    'Service Unavailable',
    'Bad Gateway',
    'Gateway Timeout'
  ];

  const errorMessage = error.message || error.toString() || '';
  const errorCode = error.code || '';
  const statusCode = error.status || error.statusCode || 0;

  // Check HTTP status codes that indicate unavailability
  if ([502, 503, 504, 521, 522, 523, 524].includes(statusCode)) {
    return true;
  }

  // Check error messages and codes
  return unavailabilityIndicators.some(indicator => 
    errorMessage.includes(indicator) || errorCode.includes(indicator)
  );
}

/**
 * Export the tool creation function
 */
export { createWorkflowStatusTool };