/**
 * Tests for ServerLogger wrapper
 */

import { ServerLogger, ServerEventType, createServerLogger } from '../../src/utils/server-logger.js';
import { ConfigurableLogger, LogLevel, createMCPLogger } from '../../src/utils/logger.js';
import type { ServerConfig } from '../../src/types/index.js';

describe('ServerLogger', () => {
  let mockLogger: jest.Mocked<ConfigurableLogger>;
  let serverLogger: ServerLogger;
  let serverConfig: Partial<ServerConfig>;

  beforeEach(() => {
    // Create a mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      logError: jest.fn(),
      setContext: jest.fn(),
      setLevel: jest.fn(),
      child: jest.fn(),
      updateConfig: jest.fn()
    } as jest.Mocked<ConfigurableLogger>;

    serverConfig = {
      apiBaseUrl: 'https://api.example.com',
      workflowsEnabled: true
    };

    serverLogger = new ServerLogger(mockLogger, serverConfig);
  });

  describe('constructor', () => {
    it('should create ServerLogger with provided logger', () => {
      expect(serverLogger).toBeInstanceOf(ServerLogger);
      expect(serverLogger.getWrappedLogger()).toBe(mockLogger);
    });

    it('should create ServerLogger with default MCP logger when none provided', () => {
      const defaultServerLogger = new ServerLogger();
      expect(defaultServerLogger).toBeInstanceOf(ServerLogger);
      expect(defaultServerLogger.getWrappedLogger()).toBeDefined();
    });

    it('should build server metadata from config and environment', () => {
      const metadata = serverLogger.getServerMetadata();
      
      expect(metadata.pid).toBe(process.pid);
      expect(metadata.serverName).toBe('simplified-mcp-server');
      expect(metadata.apiBaseUrl).toBe('https://api.example.com');
      expect(metadata.workflowsEnabled).toBe(true);
    });
  });

  describe('server lifecycle logging', () => {
    it('should log startup events with metadata', () => {
      const message = 'Server starting up';
      const additionalMetadata = { port: 3000 };

      serverLogger.logStartup(message, additionalMetadata);

      expect(mockLogger.info).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          eventType: ServerEventType.STARTUP,
          serverMetadata: expect.objectContaining({
            pid: process.pid,
            serverName: 'simplified-mcp-server'
          }),
          port: 3000
        })
      );
    });

    it('should log shutdown events with metadata', () => {
      const message = 'Server shutting down';
      const additionalMetadata = { reason: 'graceful' };

      serverLogger.logShutdown(message, additionalMetadata);

      expect(mockLogger.info).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          eventType: ServerEventType.SHUTDOWN,
          serverMetadata: expect.objectContaining({
            pid: process.pid,
            serverName: 'simplified-mcp-server'
          }),
          reason: 'graceful'
        })
      );
    });

    it('should log tool registration with counts', () => {
      const toolCount = 5;
      const workflowCount = 3;

      serverLogger.logToolRegistration(toolCount, workflowCount);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tool registration completed: 8 tools total',
        expect.objectContaining({
          eventType: ServerEventType.TOOL_REGISTRATION,
          toolCount: 5,
          workflowCount: 3,
          totalTools: 8,
          serverMetadata: expect.objectContaining({
            serverName: 'simplified-mcp-server'
          })
        })
      );
    });

    it('should log workflow discovery events', () => {
      const message = 'Discovered new workflows';
      const workflowData = { count: 2, names: ['workflow1', 'workflow2'] };

      serverLogger.logWorkflowDiscovery(message, workflowData);

      expect(mockLogger.info).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          eventType: ServerEventType.WORKFLOW_DISCOVERY,
          workflowData,
          serverMetadata: expect.objectContaining({
            serverName: 'simplified-mcp-server'
          })
        })
      );
    });
  });

  describe('error logging', () => {
    it('should log errors with proper context preservation', () => {
      const error = new Error('Test error');
      const context = 'server-startup';
      const metadata = { operation: 'initialization' };

      serverLogger.logError(error, context, metadata);

      expect(mockLogger.logError).toHaveBeenCalledWith(error, context);
    });

    it('should log errors using error method when logError is not available', () => {
      // Remove logError method from mock
      delete (mockLogger as any).logError;

      const error = new Error('Test error');
      const context = 'server-startup';

      serverLogger.logError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        error.message,
        expect.objectContaining({
          eventType: ServerEventType.ERROR,
          context,
          error: expect.objectContaining({
            name: 'Error',
            message: 'Test error',
            stack: error.stack
          }),
          serverMetadata: expect.objectContaining({
            serverName: 'simplified-mcp-server'
          })
        })
      );
    });

    it('should include error code when available', () => {
      const error = new Error('Test error') as any;
      error.code = 'ECONNREFUSED';
      
      // Remove logError method to test error method path
      delete (mockLogger as any).logError;

      serverLogger.logError(error, 'connection');

      expect(mockLogger.error).toHaveBeenCalledWith(
        error.message,
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'ECONNREFUSED'
          })
        })
      );
    });
  });

  describe('standard logger interface', () => {
    it('should delegate debug calls with server metadata', () => {
      const message = 'Debug message';
      const args = ['arg1', 'arg2'];

      serverLogger.debug(message, ...args);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          serverMetadata: expect.objectContaining({
            serverName: 'simplified-mcp-server'
          }),
          args
        })
      );
    });

    it('should delegate info calls with server metadata', () => {
      const message = 'Info message';

      serverLogger.info(message);

      expect(mockLogger.info).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          serverMetadata: expect.objectContaining({
            serverName: 'simplified-mcp-server'
          })
        })
      );
    });

    it('should delegate warn calls with server metadata', () => {
      const message = 'Warning message';

      serverLogger.warn(message);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          serverMetadata: expect.objectContaining({
            serverName: 'simplified-mcp-server'
          })
        })
      );
    });

    it('should delegate error calls with server metadata', () => {
      const message = 'Error message';

      serverLogger.error(message);

      expect(mockLogger.error).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          serverMetadata: expect.objectContaining({
            serverName: 'simplified-mcp-server'
          })
        })
      );
    });
  });

  describe('logger configuration methods', () => {
    it('should delegate setContext when available', () => {
      const context = 'new-context';

      serverLogger.setContext(context);

      expect(mockLogger.setContext).toHaveBeenCalledWith(context);
    });

    it('should delegate setLevel when available', () => {
      const level = LogLevel.ERROR;

      serverLogger.setLevel(level);

      expect(mockLogger.setLevel).toHaveBeenCalledWith(level);
    });

    it('should delegate updateConfig when available', () => {
      const config = { level: LogLevel.DEBUG };

      serverLogger.updateConfig(config);

      expect(mockLogger.updateConfig).toHaveBeenCalledWith(config);
    });
  });

  describe('child logger creation', () => {
    it('should create child logger using wrapped logger when available', () => {
      const childMockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      } as any;

      mockLogger.child.mockReturnValue(childMockLogger);

      const childLogger = serverLogger.child('child-context');

      expect(mockLogger.child).toHaveBeenCalledWith('child-context');
      expect(childLogger).toBeInstanceOf(ServerLogger);
    });

    it('should create fallback child logger when wrapped logger does not support child', () => {
      // Remove child method from mock
      delete (mockLogger as any).child;

      const childLogger = serverLogger.child('child-context');

      expect(childLogger).toBeInstanceOf(ServerLogger);
    });
  });

  describe('metadata management', () => {
    it('should update server metadata', () => {
      const newMetadata = { customField: 'customValue' };

      serverLogger.updateServerMetadata(newMetadata);

      const metadata = serverLogger.getServerMetadata();
      expect(metadata.customField).toBe('customValue');
      expect(metadata.serverName).toBe('simplified-mcp-server'); // Original metadata preserved
    });

    it('should return copy of server metadata', () => {
      const metadata1 = serverLogger.getServerMetadata();
      const metadata2 = serverLogger.getServerMetadata();

      expect(metadata1).toEqual(metadata2);
      expect(metadata1).not.toBe(metadata2); // Different objects
    });
  });
});

describe('createServerLogger', () => {
  it('should create ServerLogger with provided logger and config', () => {
    const mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as any;

    const config = { apiBaseUrl: 'https://test.com' };
    const serverLogger = createServerLogger(mockLogger, config);

    expect(serverLogger).toBeInstanceOf(ServerLogger);
    expect(serverLogger.getWrappedLogger()).toBe(mockLogger);
    expect(serverLogger.getServerMetadata().apiBaseUrl).toBe('https://test.com');
  });

  it('should create ServerLogger with defaults when no parameters provided', () => {
    const serverLogger = createServerLogger();

    expect(serverLogger).toBeInstanceOf(ServerLogger);
    expect(serverLogger.getWrappedLogger()).toBeDefined();
  });
});