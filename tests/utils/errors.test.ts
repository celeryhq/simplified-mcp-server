import { ErrorHandler, MCPErrorCodes } from '../../src/utils/errors.js';
import { AppError, ErrorType } from '../../src/types/index.js';

describe('ErrorHandler', () => {
  describe('translateToMCPError', () => {
    it('should translate AUTH_ERROR to MCP authentication error', () => {
      const error = new AppError(
        ErrorType.AUTH_ERROR,
        'Invalid token',
        { responseData: { error: 'Unauthorized' } },
        401
      );

      const mcpError = ErrorHandler.translateToMCPError(error, 'test-context');

      expect(mcpError.code).toBe(MCPErrorCodes.AUTHENTICATION_ERROR);
      expect(mcpError.message).toBe('Authentication failed. Please check your API token and ensure it is valid and not expired.');
      expect(mcpError.data).toMatchObject({
        context: 'test-context',
        errorType: ErrorType.AUTH_ERROR,
        originalMessage: 'Invalid token',
        details: { responseData: { error: 'Unauthorized' } },
        status: 401,
        authenticationRequired: true
      });
      expect(mcpError.data.timestamp).toBeDefined();
    });

    it('should translate 403 AUTH_ERROR to access forbidden', () => {
      const error = new AppError(
        ErrorType.AUTH_ERROR,
        'Access denied',
        {},
        403
      );

      const mcpError = ErrorHandler.translateToMCPError(error);

      expect(mcpError.message).toBe('Access forbidden. Your API token does not have sufficient permissions for this operation.');
      expect(mcpError.code).toBe(MCPErrorCodes.AUTHENTICATION_ERROR);
    });

    it('should translate VALIDATION_ERROR to MCP validation error', () => {
      const error = new AppError(
        ErrorType.VALIDATION_ERROR,
        'Invalid parameters',
        { validationErrors: [{ field: 'name', message: 'required' }] },
        422
      );

      const mcpError = ErrorHandler.translateToMCPError(error);

      expect(mcpError.code).toBe(MCPErrorCodes.VALIDATION_ERROR);
      expect(mcpError.message).toBe('Parameter validation failed: Invalid parameters');
      expect(mcpError.data).toMatchObject({
        errorType: ErrorType.VALIDATION_ERROR,
        originalMessage: 'Invalid parameters',
        details: { validationErrors: [{ field: 'name', message: 'required' }] },
        status: 422,
        validationErrors: [{ field: 'name', message: 'required' }]
      });
      expect(mcpError.data.timestamp).toBeDefined();
    });

    it('should translate timeout NETWORK_ERROR to timeout error', () => {
      const error = new AppError(
        ErrorType.NETWORK_ERROR,
        'Request timeout',
        { code: 'ECONNABORTED' }
      );

      const mcpError = ErrorHandler.translateToMCPError(error);

      expect(mcpError.code).toBe(MCPErrorCodes.TIMEOUT_ERROR);
      expect(mcpError.message).toBe('Request timed out. The API did not respond within the expected time. Please try again.');
      expect(mcpError.data.retryable).toBe(true);
      expect(mcpError.data.networkIssue).toBe(true);
    });

    it('should translate connection reset NETWORK_ERROR', () => {
      const error = new AppError(
        ErrorType.NETWORK_ERROR,
        'Connection reset',
        { code: 'ECONNRESET' }
      );

      const mcpError = ErrorHandler.translateToMCPError(error);

      expect(mcpError.code).toBe(MCPErrorCodes.NETWORK_ERROR);
      expect(mcpError.message).toBe('Connection was reset. Please check your network connection and try again.');
    });

    it('should translate rate limit API_ERROR', () => {
      const error = new AppError(
        ErrorType.API_ERROR,
        'Too many requests',
        { retryAfter: '60' },
        429
      );

      const mcpError = ErrorHandler.translateToMCPError(error);

      expect(mcpError.code).toBe(MCPErrorCodes.RATE_LIMIT_ERROR);
      expect(mcpError.message).toBe('Rate limit exceeded: Too many requests');
      expect(mcpError.data.retryable).toBe(true);
      expect(mcpError.data.retryAfter).toBe('60');
    });

    it('should translate server API_ERROR', () => {
      const error = new AppError(
        ErrorType.API_ERROR,
        'Internal server error',
        {},
        500
      );

      const mcpError = ErrorHandler.translateToMCPError(error);

      expect(mcpError.code).toBe(MCPErrorCodes.API_ERROR);
      expect(mcpError.message).toBe('API request failed: Internal server error');
      expect(mcpError.data.retryable).toBe(true);
    });

    it('should translate client API_ERROR as non-retryable', () => {
      const error = new AppError(
        ErrorType.API_ERROR,
        'Bad request',
        {},
        400
      );

      const mcpError = ErrorHandler.translateToMCPError(error);

      expect(mcpError.code).toBe(MCPErrorCodes.API_ERROR);
      expect(mcpError.data.retryable).toBe(false);
    });

    it('should translate TOOL_ERROR', () => {
      const error = new AppError(
        ErrorType.TOOL_ERROR,
        'Tool execution failed',
        { toolName: 'test-tool', toolParams: { id: 1 } }
      );

      const mcpError = ErrorHandler.translateToMCPError(error);

      expect(mcpError.code).toBe(MCPErrorCodes.TOOL_ERROR);
      expect(mcpError.message).toBe('Tool execution failed: Tool execution failed');
      expect(mcpError.data.toolName).toBe('test-tool');
      expect(mcpError.data.toolParams).toEqual({ id: 1 });
    });

    it('should translate CONFIG_ERROR', () => {
      const error = new AppError(
        ErrorType.CONFIG_ERROR,
        'Missing API token'
      );

      const mcpError = ErrorHandler.translateToMCPError(error);

      expect(mcpError.code).toBe(MCPErrorCodes.INVALID_PARAMS);
      expect(mcpError.message).toBe('Configuration error: Missing API token');
      expect(mcpError.data.configurationRequired).toBe(true);
    });

    it('should translate generic Error to internal error', () => {
      const error = new Error('Something went wrong');

      const mcpError = ErrorHandler.translateToMCPError(error, 'test-context');

      expect(mcpError.code).toBe(MCPErrorCodes.INTERNAL_ERROR);
      expect(mcpError.message).toBe('Internal error: Something went wrong');
      expect(mcpError.data.context).toBe('test-context');
      expect(mcpError.data.originalError).toBe('Something went wrong');
    });
  });

  describe('createToolErrorResponse', () => {
    it('should create tool error response from AppError', () => {
      const error = new AppError(
        ErrorType.API_ERROR,
        'API call failed',
        { status: 500 }
      );

      const mcpError = ErrorHandler.createToolErrorResponse(
        error,
        'test-tool',
        { param1: 'value1' },
        'tool-execution'
      );

      expect(mcpError.code).toBe(MCPErrorCodes.TOOL_ERROR);
      expect(mcpError.message).toBe('Tool execution failed: API call failed');
      expect(mcpError.data.toolName).toBe('test-tool');
      expect(mcpError.data.toolParams).toEqual({ param1: 'value1' });
      expect(mcpError.data.context).toBe('tool-execution');
      expect(mcpError.data.details.originalType).toBe(ErrorType.API_ERROR);
    });

    it('should create tool error response from generic Error', () => {
      const error = new Error('Generic error');

      const mcpError = ErrorHandler.createToolErrorResponse(
        error,
        'test-tool',
        { param1: 'value1' }
      );

      expect(mcpError.code).toBe(MCPErrorCodes.TOOL_ERROR);
      expect(mcpError.message).toBe('Tool execution failed: Generic error');
      expect(mcpError.data.toolName).toBe('test-tool');
      expect(mcpError.data.toolParams).toEqual({ param1: 'value1' });
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return friendly message for AUTH_ERROR', () => {
      const error = new AppError(ErrorType.AUTH_ERROR, 'Invalid token', {}, 401);
      const message = ErrorHandler.getUserFriendlyMessage(error);
      
      expect(message).toBe('Authentication failed. Please check your API token and ensure it is valid and not expired.');
    });

    it('should return friendly message for NETWORK_ERROR timeout', () => {
      const error = new AppError(
        ErrorType.NETWORK_ERROR,
        'timeout',
        { code: 'ECONNABORTED' }
      );
      const message = ErrorHandler.getUserFriendlyMessage(error);
      
      expect(message).toBe('Request timed out. The API did not respond within the expected time. Please try again.');
    });

    it('should return friendly message for rate limit', () => {
      const error = new AppError(ErrorType.API_ERROR, 'Rate limited', {}, 429);
      const message = ErrorHandler.getUserFriendlyMessage(error);
      
      expect(message).toBe('Rate limit exceeded. Please wait before making more requests.');
    });

    it('should return friendly message for generic Error', () => {
      const error = new Error('Something broke');
      const message = ErrorHandler.getUserFriendlyMessage(error);
      
      expect(message).toBe('An unexpected error occurred: Something broke');
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable network errors', () => {
      const error = new AppError(ErrorType.NETWORK_ERROR, 'Connection failed');
      expect(ErrorHandler.isRetryableError(error)).toBe(true);
    });

    it('should identify retryable server errors', () => {
      const error = new AppError(ErrorType.API_ERROR, 'Server error', {}, 500);
      expect(ErrorHandler.isRetryableError(error)).toBe(true);
    });

    it('should identify retryable rate limit errors', () => {
      const error = new AppError(ErrorType.API_ERROR, 'Rate limited', {}, 429);
      expect(ErrorHandler.isRetryableError(error)).toBe(true);
    });

    it('should identify non-retryable client errors', () => {
      const error = new AppError(ErrorType.API_ERROR, 'Bad request', {}, 400);
      expect(ErrorHandler.isRetryableError(error)).toBe(false);
    });

    it('should identify non-retryable auth errors', () => {
      const error = new AppError(ErrorType.AUTH_ERROR, 'Unauthorized', {}, 401);
      expect(ErrorHandler.isRetryableError(error)).toBe(false);
    });

    it('should identify non-retryable generic errors', () => {
      const error = new Error('Generic error');
      expect(ErrorHandler.isRetryableError(error)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should return retry-after delay for rate limit errors', () => {
      const error = new AppError(
        ErrorType.API_ERROR,
        'Rate limited',
        { retryAfter: '30' },
        429
      );
      
      const delay = ErrorHandler.getRetryDelay(error, 1);
      expect(delay).toBe(30000); // 30 seconds in milliseconds
    });

    it('should return exponential backoff for network errors', () => {
      const error = new AppError(ErrorType.NETWORK_ERROR, 'Connection failed');
      
      expect(ErrorHandler.getRetryDelay(error, 1)).toBe(1000);
      expect(ErrorHandler.getRetryDelay(error, 2)).toBe(2000);
      expect(ErrorHandler.getRetryDelay(error, 3)).toBe(4000);
      expect(ErrorHandler.getRetryDelay(error, 10)).toBe(30000); // Capped at 30 seconds
    });

    it('should return default backoff for other errors', () => {
      const error = new AppError(ErrorType.API_ERROR, 'Server error', {}, 500);
      
      expect(ErrorHandler.getRetryDelay(error, 1)).toBe(1000);
      expect(ErrorHandler.getRetryDelay(error, 2)).toBe(2000);
      expect(ErrorHandler.getRetryDelay(error, 3)).toBe(3000);
    });

    it('should return default backoff for generic errors', () => {
      const error = new Error('Generic error');
      
      expect(ErrorHandler.getRetryDelay(error, 1)).toBe(1000);
      expect(ErrorHandler.getRetryDelay(error, 2)).toBe(2000);
    });
  });

  describe('logError', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log AppError details', () => {
      const error = new AppError(
        ErrorType.API_ERROR,
        'API failed',
        { status: 500 },
        500
      );

      ErrorHandler.logError(error, 'test-context');

      const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
      expect(loggedData.message).toBe('API failed');
      expect(loggedData.type).toBe('API_ERROR');
      expect(loggedData.context).toBe('test-context');
      expect(loggedData.status).toBe(500);
    });

    it('should log generic Error', () => {
      const error = new Error('Generic error');

      ErrorHandler.logError(error);

      const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
      expect(loggedData.message).toBe('Generic error');
      expect(loggedData.type).toBe('UnknownError');
    });

    it('should use custom logger when provided', () => {
      const mockLogger = {
        error: jest.fn()
      };
      
      const error = new AppError(ErrorType.API_ERROR, 'Test error');

      ErrorHandler.logError(error, 'test-context', mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error occurred:',
        expect.objectContaining({
          message: 'Test error',
          type: ErrorType.API_ERROR,
          context: 'test-context'
        })
      );
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('validateMCPErrorResponse', () => {
    it('should validate valid MCP error response', () => {
      const validError = {
        code: MCPErrorCodes.API_ERROR,
        message: 'Test error'
      };

      expect(ErrorHandler.validateMCPErrorResponse(validError)).toBe(true);
    });

    it('should reject invalid error response - missing code', () => {
      const invalidError = {
        message: 'Test error'
      };

      expect(ErrorHandler.validateMCPErrorResponse(invalidError)).toBe(false);
    });

    it('should reject invalid error response - missing message', () => {
      const invalidError = {
        code: MCPErrorCodes.API_ERROR
      };

      expect(ErrorHandler.validateMCPErrorResponse(invalidError)).toBe(false);
    });

    it('should reject invalid error response - invalid code', () => {
      const invalidError = {
        code: 999999,
        message: 'Test error'
      };

      expect(ErrorHandler.validateMCPErrorResponse(invalidError)).toBe(false);
    });

    it('should reject non-object error response', () => {
      expect(ErrorHandler.validateMCPErrorResponse(null)).toBe(false);
      expect(ErrorHandler.validateMCPErrorResponse('string')).toBe(false);
      expect(ErrorHandler.validateMCPErrorResponse(123)).toBe(false);
    });
  });

  describe('createProtocolError', () => {
    it('should create protocol error with message', () => {
      const error = ErrorHandler.createProtocolError('Invalid request format');

      expect(error.code).toBe(MCPErrorCodes.INVALID_REQUEST);
      expect(error.message).toBe('Protocol error: Invalid request format');
      expect(error.data.protocolViolation).toBe(true);
      expect(error.data.timestamp).toBeDefined();
    });

    it('should create protocol error with additional data', () => {
      const error = ErrorHandler.createProtocolError('Invalid request', { requestId: '123' });

      expect(error.code).toBe(MCPErrorCodes.INVALID_REQUEST);
      expect(error.data.requestId).toBe('123');
      expect(error.data.protocolViolation).toBe(true);
    });
  });

  describe('createMethodNotFoundError', () => {
    it('should create method not found error', () => {
      const error = ErrorHandler.createMethodNotFoundError('unknown/method');

      expect(error.code).toBe(MCPErrorCodes.METHOD_NOT_FOUND);
      expect(error.message).toBe('Method not found: unknown/method');
      expect(error.data.method).toBe('unknown/method');
      expect(error.data.availableMethods).toEqual(['tools/list', 'tools/call']);
    });
  });

  describe('createParseError', () => {
    it('should create parse error from original error', () => {
      const originalError = new Error('Unexpected token');
      const error = ErrorHandler.createParseError(originalError);

      expect(error.code).toBe(MCPErrorCodes.PARSE_ERROR);
      expect(error.message).toBe('Parse error: Invalid JSON was received by the server');
      expect(error.data.originalError).toBe('Unexpected token');
      expect(error.data.parseError).toBe(true);
    });
  });

  describe('withErrorHandling', () => {
    it('should execute operation successfully', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const context = { operation: 'test-op' };

      const result = await ErrorHandler.withErrorHandling(operation, context);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should handle operation failure', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const context = { operation: 'test-op' };

      await expect(ErrorHandler.withErrorHandling(operation, context)).rejects.toThrow('Operation failed');
    });
  });

  describe('getErrorSeverity', () => {
    it('should return critical for config errors', () => {
      const error = new AppError(ErrorType.CONFIG_ERROR, 'Missing config');
      expect(ErrorHandler.getErrorSeverity(error)).toBe('critical');
    });

    it('should return error for auth errors', () => {
      const error = new AppError(ErrorType.AUTH_ERROR, 'Unauthorized', {}, 401);
      expect(ErrorHandler.getErrorSeverity(error)).toBe('error');
    });

    it('should return warning for forbidden errors', () => {
      const error = new AppError(ErrorType.AUTH_ERROR, 'Forbidden', {}, 403);
      expect(ErrorHandler.getErrorSeverity(error)).toBe('warning');
    });

    it('should return error for server API errors', () => {
      const error = new AppError(ErrorType.API_ERROR, 'Server error', {}, 500);
      expect(ErrorHandler.getErrorSeverity(error)).toBe('error');
    });

    it('should return warning for rate limit errors', () => {
      const error = new AppError(ErrorType.API_ERROR, 'Rate limited', {}, 429);
      expect(ErrorHandler.getErrorSeverity(error)).toBe('warning');
    });

    it('should return info for client errors', () => {
      const error = new AppError(ErrorType.API_ERROR, 'Bad request', {}, 400);
      expect(ErrorHandler.getErrorSeverity(error)).toBe('info');
    });

    it('should return warning for network errors', () => {
      const error = new AppError(ErrorType.NETWORK_ERROR, 'Connection failed');
      expect(ErrorHandler.getErrorSeverity(error)).toBe('warning');
    });

    it('should return info for validation errors', () => {
      const error = new AppError(ErrorType.VALIDATION_ERROR, 'Invalid input');
      expect(ErrorHandler.getErrorSeverity(error)).toBe('info');
    });

    it('should return error for tool errors', () => {
      const error = new AppError(ErrorType.TOOL_ERROR, 'Tool failed');
      expect(ErrorHandler.getErrorSeverity(error)).toBe('error');
    });

    it('should return error for generic errors', () => {
      const error = new Error('Generic error');
      expect(ErrorHandler.getErrorSeverity(error)).toBe('error');
    });
  });

  describe('isSystemHealthIssue', () => {
    it('should identify config errors as health issues', () => {
      const error = new AppError(ErrorType.CONFIG_ERROR, 'Missing config');
      expect(ErrorHandler.isSystemHealthIssue(error)).toBe(true);
    });

    it('should identify server API errors as health issues', () => {
      const error = new AppError(ErrorType.API_ERROR, 'Server error', {}, 500);
      expect(ErrorHandler.isSystemHealthIssue(error)).toBe(true);
    });

    it('should identify network errors as health issues', () => {
      const error = new AppError(ErrorType.NETWORK_ERROR, 'Connection failed');
      expect(ErrorHandler.isSystemHealthIssue(error)).toBe(true);
    });

    it('should not identify client errors as health issues', () => {
      const error = new AppError(ErrorType.API_ERROR, 'Bad request', {}, 400);
      expect(ErrorHandler.isSystemHealthIssue(error)).toBe(false);
    });

    it('should not identify auth errors as health issues', () => {
      const error = new AppError(ErrorType.AUTH_ERROR, 'Unauthorized');
      expect(ErrorHandler.isSystemHealthIssue(error)).toBe(false);
    });

    it('should identify generic errors as health issues', () => {
      const error = new Error('Generic error');
      expect(ErrorHandler.isSystemHealthIssue(error)).toBe(true);
    });
  });

  describe('createErrorMetrics', () => {
    it('should create metrics for AppError', () => {
      const error = new AppError(ErrorType.API_ERROR, 'API failed', {}, 500);
      const context = { operation: 'test-op', toolName: 'test-tool' };

      const metrics = ErrorHandler.createErrorMetrics(error, context);

      expect(metrics).toMatchObject({
        errorType: ErrorType.API_ERROR,
        severity: 'error',
        isHealthIssue: true,
        isRetryable: true,
        message: 'API failed',
        httpStatus: 500,
        operation: 'test-op',
        toolName: 'test-tool'
      });
      expect(metrics.timestamp).toBeDefined();
    });

    it('should create metrics for generic Error', () => {
      const error = new Error('Generic error');

      const metrics = ErrorHandler.createErrorMetrics(error);

      expect(metrics).toMatchObject({
        errorType: 'UnknownError',
        severity: 'error',
        isHealthIssue: true,
        isRetryable: false,
        message: 'Generic error'
      });
      expect(metrics.timestamp).toBeDefined();
    });

    it('should handle errors with circular references in details', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;
      
      const error = new AppError(ErrorType.API_ERROR, 'Circular error', circularObj);
      const metrics = ErrorHandler.createErrorMetrics(error);

      expect(metrics.errorType).toBe(ErrorType.API_ERROR);
      expect(metrics.message).toBe('Circular error');
    });

    it('should handle errors with very long messages', () => {
      const longMessage = 'Error message '.repeat(1000);
      const error = new AppError(ErrorType.API_ERROR, longMessage);
      
      const metrics = ErrorHandler.createErrorMetrics(error);
      expect(metrics.message).toBe(longMessage);
    });

    it('should handle errors with special characters in messages', () => {
      const specialMessage = 'Error with special chars: 测试 🔥 émoji & symbols!@#$%^&*()';
      const error = new AppError(ErrorType.API_ERROR, specialMessage);
      
      const metrics = ErrorHandler.createErrorMetrics(error);
      expect(metrics.message).toBe(specialMessage);
    });
  });

  describe('Performance and Memory Tests', () => {
    it('should handle large number of error translations efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        const error = new AppError(ErrorType.API_ERROR, `Error ${i}`, {}, 500);
        ErrorHandler.translateToMCPError(error);
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle errors with large detail objects', () => {
      const largeDetails = {
        data: 'x'.repeat(100000), // 100KB string
        array: new Array(10000).fill('item'),
        nested: {
          level1: {
            level2: {
              level3: 'deep nesting'
            }
          }
        }
      };

      const error = new AppError(ErrorType.API_ERROR, 'Large error', largeDetails);
      
      expect(() => ErrorHandler.translateToMCPError(error)).not.toThrow();
      expect(() => ErrorHandler.createErrorMetrics(error)).not.toThrow();
    });

    it('should handle concurrent error processing', async () => {
      const errors = Array.from({ length: 100 }, (_, i) => 
        new AppError(ErrorType.API_ERROR, `Concurrent error ${i}`, {}, 500)
      );

      const promises = errors.map(error => 
        Promise.resolve(ErrorHandler.translateToMCPError(error))
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);
      results.forEach((result, i) => {
        expect(result.message).toContain(`Concurrent error ${i}`);
      });
    });
  });

  describe('Error Context Handling', () => {
    it('should handle undefined context gracefully', () => {
      const error = new AppError(ErrorType.API_ERROR, 'Test error');
      
      const mcpError = ErrorHandler.translateToMCPError(error, undefined);
      expect(mcpError.data.context).toBeUndefined();
    });

    it('should handle null context gracefully', () => {
      const error = new AppError(ErrorType.API_ERROR, 'Test error');
      
      const mcpError = ErrorHandler.translateToMCPError(error, null);
      // When context is null, it gets spread into baseData, so individual properties are undefined
      expect(mcpError.data).toBeDefined();
      expect(mcpError.data.errorType).toBe(ErrorType.API_ERROR);
    });

    it('should handle complex context objects', () => {
      const complexContext = {
        operation: 'complex-op',
        metadata: {
          userId: 'user123',
          sessionId: 'session456',
          requestId: 'req789'
        },
        timing: {
          startTime: Date.now(),
          duration: 1500
        }
      };

      const error = new AppError(ErrorType.API_ERROR, 'Test error');
      const mcpError = ErrorHandler.translateToMCPError(error, complexContext);
      
      // The complex context gets spread into the data object
      expect(mcpError.data.operation).toBe('complex-op');
      expect(mcpError.data.metadata).toEqual(complexContext.metadata);
      expect(mcpError.data.timing).toEqual(complexContext.timing);
    });

    it('should handle context with circular references', () => {
      const circularContext: any = { operation: 'test' };
      circularContext.self = circularContext;

      const error = new AppError(ErrorType.API_ERROR, 'Test error');
      
      expect(() => ErrorHandler.translateToMCPError(error, circularContext)).not.toThrow();
    });
  });
});