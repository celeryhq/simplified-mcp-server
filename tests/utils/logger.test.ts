import { ConfigurableLogger, createLogger, createMCPLogger, logger, LogEntry } from '../../src/utils/logger.js';
import { LogLevel } from '../../src/types/index.js';

describe('ConfigurableLogger', () => {
  let testLogger: ConfigurableLogger;
  let consoleSpy: {
    debug: jest.SpyInstance;
    info: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
    log: jest.SpyInstance;
  };
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock console methods
    consoleSpy = {
      debug: jest.spyOn(console, 'debug').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
      log: jest.spyOn(console, 'log').mockImplementation()
    };

    // Mock stderr for structured logging
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation();

    testLogger = new ConfigurableLogger({
      level: LogLevel.DEBUG,
      environment: 'test',
      enableColors: false,
      enableTimestamp: false,
      enableStructured: false
    });
  });

  afterEach(() => {
    // Restore console methods
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
    stderrSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create logger with default configuration', () => {
      const defaultLogger = new ConfigurableLogger();
      
      // Test that it doesn't throw and can log
      expect(() => defaultLogger.info('test')).not.toThrow();
    });

    it('should create logger with custom configuration', () => {
      const customLogger = new ConfigurableLogger({
        level: LogLevel.WARN,
        environment: 'production',
        enableColors: true,
        enableTimestamp: true,
        enableStructured: true,
        context: 'test-context'
      });

      expect(() => customLogger.warn('test')).not.toThrow();
    });

    it('should use environment-based defaults', () => {
      const originalEnv = process.env.NODE_ENV;
      
      // Test production environment
      process.env.NODE_ENV = 'production';
      const prodLogger = new ConfigurableLogger();
      expect(() => prodLogger.info('test')).not.toThrow();
      
      // Test development environment
      process.env.NODE_ENV = 'development';
      const devLogger = new ConfigurableLogger();
      expect(() => devLogger.info('test')).not.toThrow();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('logging methods', () => {
    it('should log debug messages', () => {
      testLogger.debug('debug message', { data: 'test' });
      
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        '[DEBUG] debug message',
        { data: 'test' }
      );
    });

    it('should log info messages', () => {
      testLogger.info('info message', { data: 'test' });
      
      expect(consoleSpy.info).toHaveBeenCalledWith(
        '[INFO] info message',
        { data: 'test' }
      );
    });

    it('should log warning messages', () => {
      testLogger.warn('warning message', { data: 'test' });
      
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '[WARN] warning message',
        { data: 'test' }
      );
    });

    it('should log error messages', () => {
      testLogger.error('error message', { data: 'test' });
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[ERROR] error message',
        { data: 'test' }
      );
    });

    it('should handle multiple arguments', () => {
      testLogger.info('message', 'arg1', 'arg2', { data: 'test' });
      
      expect(consoleSpy.info).toHaveBeenCalledWith(
        '[INFO] message',
        'arg1',
        'arg2',
        { data: 'test' }
      );
    });
  });

  describe('log level filtering', () => {
    it('should respect log level filtering', () => {
      const warnLogger = new ConfigurableLogger({
        level: LogLevel.WARN,
        enableColors: false,
        enableTimestamp: false,
        enableStructured: false
      });

      warnLogger.debug('debug message');
      warnLogger.info('info message');
      warnLogger.warn('warn message');
      warnLogger.error('error message');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledWith('[WARN] warn message');
      expect(consoleSpy.error).toHaveBeenCalledWith('[ERROR] error message');
    });

    it('should silence all logs when level is SILENT', () => {
      const silentLogger = new ConfigurableLogger({
        level: LogLevel.SILENT,
        enableColors: false,
        enableTimestamp: false,
        enableStructured: false
      });

      silentLogger.debug('debug');
      silentLogger.info('info');
      silentLogger.warn('warn');
      silentLogger.error('error');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  describe('setLevel', () => {
    it('should set log level using LogLevel enum', () => {
      testLogger.setLevel(LogLevel.ERROR);
      
      testLogger.info('info message');
      testLogger.error('error message');

      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledWith('[ERROR] error message');
    });

    it('should set log level using string', () => {
      testLogger.setLevel('warn');
      
      testLogger.info('info message');
      testLogger.warn('warn message');

      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledWith('[WARN] warn message');
    });

    it('should handle case-insensitive string levels', () => {
      testLogger.setLevel('ERROR');
      
      testLogger.warn('warn message');
      testLogger.error('error message');

      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledWith('[ERROR] error message');
    });

    it('should warn about invalid string levels', () => {
      testLogger.setLevel('invalid');
      
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid log level: invalid')
      );
    });
  });

  describe('context handling', () => {
    it('should set and use context', () => {
      testLogger.setContext('test-context');
      testLogger.info('test message');

      expect(consoleSpy.info).toHaveBeenCalledWith(
        '[test-context] [INFO] test message'
      );
    });

    it('should update context', () => {
      testLogger.setContext('context1');
      testLogger.info('message1');
      
      testLogger.setContext('context2');
      testLogger.info('message2');

      expect(consoleSpy.info).toHaveBeenNthCalledWith(1, '[context1] [INFO] message1');
      expect(consoleSpy.info).toHaveBeenNthCalledWith(2, '[context2] [INFO] message2');
    });
  });

  describe('child logger', () => {
    it('should create child logger with nested context', () => {
      testLogger.setContext('parent');
      const childLogger = testLogger.child('child');
      
      childLogger.info('child message');

      expect(consoleSpy.info).toHaveBeenCalledWith(
        '[parent:child] [INFO] child message'
      );
    });

    it('should create child logger without parent context', () => {
      const childLogger = testLogger.child('child');
      
      childLogger.info('child message');

      expect(consoleSpy.info).toHaveBeenCalledWith(
        '[child] [INFO] child message'
      );
    });

    it('should inherit parent configuration', () => {
      const parentLogger = new ConfigurableLogger({
        level: LogLevel.WARN,
        enableColors: false,
        enableTimestamp: false,
        enableStructured: false
      });
      
      const childLogger = parentLogger.child('child');
      
      childLogger.info('info message'); // Should be filtered out
      childLogger.warn('warn message'); // Should be logged

      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledWith('[child] [WARN] warn message');
    });
  });

  describe('error logging', () => {
    it('should log error objects with stack trace', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test';
      
      testLogger.logError(error);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[ERROR] Test error',
        {
          error: {
            name: 'Error',
            message: 'Test error',
            stack: 'Error: Test error\n    at test'
          }
        }
      );
    });

    it('should log error objects with context', () => {
      const error = new Error('Test error');
      
      testLogger.logError(error, 'test-context');

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[ERROR] Test error',
        {
          error: {
            name: 'Error',
            message: 'Test error',
            stack: error.stack
          }
        }
      );
    });

    it('should handle errors without message', () => {
      const error = new Error();
      error.name = 'CustomError';
      
      testLogger.logError(error);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[ERROR] CustomError',
        {
          error: {
            name: 'CustomError',
            message: '',
            stack: error.stack
          }
        }
      );
    });
  });

  describe('structured logging', () => {
    let structuredLogger: ConfigurableLogger;

    beforeEach(() => {
      structuredLogger = new ConfigurableLogger({
        level: LogLevel.DEBUG,
        enableStructured: true,
        context: 'test-context'
      });
    });

    it('should log in JSON format when structured logging is enabled', () => {
      structuredLogger.info('test message', { data: 'test' });

      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"info"')
      );
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"test message"')
      );
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('"context":"test-context"')
      );
    });

    it('should include timestamp in structured logs', () => {
      structuredLogger.info('test message');

      const logCall = stderrSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry.timestamp).toBeDefined();
      expect(new Date(logEntry.timestamp)).toBeInstanceOf(Date);
    });

    it('should include data in structured logs', () => {
      structuredLogger.info('test message', { key: 'value' }, 'extra arg');

      const logCall = stderrSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry.data).toEqual({
        args: [{ key: 'value' }, 'extra arg']
      });
    });

    it('should log errors in structured format', () => {
      const error = new Error('Test error');
      structuredLogger.logError(error, 'error-context');

      const logCall = stderrSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry.level).toBe('error');
      expect(logEntry.message).toBe('Test error');
      expect(logEntry.context).toBe('error-context');
      expect(logEntry.data.error).toEqual({
        name: 'Error',
        message: 'Test error',
        stack: error.stack
      });
    });
  });

  describe('timestamp formatting', () => {
    it('should include timestamp when enabled', () => {
      const timestampLogger = new ConfigurableLogger({
        level: LogLevel.INFO,
        enableTimestamp: true,
        enableColors: false,
        enableStructured: false
      });

      timestampLogger.info('test message');

      const logCall = consoleSpy.info.mock.calls[0][0];
      expect(logCall).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] test message$/);
    });

    it('should exclude timestamp when disabled', () => {
      const noTimestampLogger = new ConfigurableLogger({
        level: LogLevel.INFO,
        enableTimestamp: false,
        enableColors: false,
        enableStructured: false
      });

      noTimestampLogger.info('test message');

      expect(consoleSpy.info).toHaveBeenCalledWith('[INFO] test message');
    });
  });

  describe('color formatting', () => {
    let colorLogger: ConfigurableLogger;

    beforeEach(() => {
      colorLogger = new ConfigurableLogger({
        level: LogLevel.DEBUG,
        enableColors: true,
        enableTimestamp: false,
        enableStructured: false
      });
    });

    it('should apply colors to debug messages', () => {
      colorLogger.debug('debug message');

      const logCall = consoleSpy.debug.mock.calls[0][0];
      expect(logCall).toContain('\x1b[90m'); // Gray color
      expect(logCall).toContain('\x1b[0m');  // Reset color
    });

    it('should apply colors to info messages', () => {
      colorLogger.info('info message');

      const logCall = consoleSpy.info.mock.calls[0][0];
      expect(logCall).toContain('\x1b[34m'); // Blue color
      expect(logCall).toContain('\x1b[0m');  // Reset color
    });

    it('should apply colors to warning messages', () => {
      colorLogger.warn('warn message');

      const logCall = consoleSpy.warn.mock.calls[0][0];
      expect(logCall).toContain('\x1b[33m'); // Yellow color
      expect(logCall).toContain('\x1b[0m');  // Reset color
    });

    it('should apply colors to error messages', () => {
      colorLogger.error('error message');

      const logCall = consoleSpy.error.mock.calls[0][0];
      expect(logCall).toContain('\x1b[31m'); // Red color
      expect(logCall).toContain('\x1b[0m');  // Reset color
    });

    it('should not apply colors when disabled', () => {
      const noColorLogger = new ConfigurableLogger({
        level: LogLevel.INFO,
        enableColors: false,
        enableTimestamp: false,
        enableStructured: false
      });

      noColorLogger.error('error message');

      const logCall = consoleSpy.error.mock.calls[0][0];
      expect(logCall).not.toContain('\x1b[');
      expect(logCall).toBe('[ERROR] error message');
    });
  });

  describe('updateConfig', () => {
    it('should update logger configuration', () => {
      testLogger.updateConfig({
        level: LogLevel.ERROR,
        enableColors: true,
        context: 'updated-context'
      });

      testLogger.info('info message'); // Should be filtered
      testLogger.error('error message'); // Should be logged

      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[updated-context]')
      );
    });

    it('should merge configuration partially', () => {
      const originalConfig = {
        level: LogLevel.DEBUG,
        enableColors: false,
        enableTimestamp: false,
        enableStructured: false,
        context: 'original'
      };

      const partialLogger = new ConfigurableLogger(originalConfig);
      
      partialLogger.updateConfig({ level: LogLevel.WARN });
      
      partialLogger.info('info message'); // Should be filtered
      partialLogger.warn('warn message'); // Should be logged

      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledWith('[original] [WARN] warn message');
    });

    it('should handle empty config update', () => {
      const originalLevel = testLogger['config'].level;
      testLogger.updateConfig({});
      
      // Configuration should remain unchanged
      expect(testLogger['config'].level).toBe(originalLevel);
    });

    it('should handle null config update', () => {
      expect(() => testLogger.updateConfig(null as any)).not.toThrow();
    });

    it('should handle undefined config update', () => {
      expect(() => testLogger.updateConfig(undefined as any)).not.toThrow();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very long log messages', () => {
      const longMessage = 'This is a very long message. '.repeat(1000);
      
      expect(() => testLogger.info(longMessage)).not.toThrow();
      expect(consoleSpy.info).toHaveBeenCalledWith(`[INFO] ${longMessage}`);
    });

    it('should handle unicode characters in log messages', () => {
      const unicodeMessage = 'Unicode test: 你好世界 🌍 émojis & symbols!@#$%^&*()';
      
      testLogger.info(unicodeMessage);
      expect(consoleSpy.info).toHaveBeenCalledWith(`[INFO] ${unicodeMessage}`);
    });

    it('should handle circular references in log data', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;
      
      expect(() => testLogger.info('Circular test', circularObj)).not.toThrow();
    });

    it('should handle null and undefined arguments', () => {
      expect(() => testLogger.info(null as any)).not.toThrow();
      expect(() => testLogger.info(undefined as any)).not.toThrow();
      expect(() => testLogger.info('test', null, undefined)).not.toThrow();
    });

    it('should handle functions as arguments', () => {
      const testFunction = () => 'test function';
      
      expect(() => testLogger.info('Function test', testFunction)).not.toThrow();
    });

    it('should handle symbols as arguments', () => {
      const testSymbol = Symbol('test');
      
      expect(() => testLogger.info('Symbol test', testSymbol)).not.toThrow();
    });

    it('should handle large number of arguments', () => {
      const args = Array.from({ length: 100 }, (_, i) => `arg${i}`);
      
      expect(() => testLogger.info('Many args', ...args)).not.toThrow();
    });

    it('should handle concurrent logging', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => 
        Promise.resolve(testLogger.info(`Concurrent log ${i}`))
      );

      await Promise.all(promises);
      expect(consoleSpy.info).toHaveBeenCalledTimes(100);
    });

    it('should handle rapid successive logging', () => {
      for (let i = 0; i < 1000; i++) {
        testLogger.info(`Rapid log ${i}`);
      }
      
      expect(consoleSpy.info).toHaveBeenCalledTimes(1000);
    });

    it('should handle logging with Date objects', () => {
      const now = new Date();
      
      testLogger.info('Date test', { timestamp: now });
      expect(consoleSpy.info).toHaveBeenCalledWith('[INFO] Date test', { timestamp: now });
    });

    it('should handle logging with RegExp objects', () => {
      const regex = /test-pattern/gi;
      
      testLogger.info('RegExp test', { pattern: regex });
      expect(consoleSpy.info).toHaveBeenCalledWith('[INFO] RegExp test', { pattern: regex });
    });

    it('should handle logging with Error objects as data', () => {
      const error = new Error('Test error');
      
      testLogger.info('Error as data', { error });
      expect(consoleSpy.info).toHaveBeenCalledWith('[INFO] Error as data', { error });
    });

    it('should handle deeply nested objects', () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: 'deep value'
              }
            }
          }
        }
      };
      
      expect(() => testLogger.info('Deep object', deepObject)).not.toThrow();
    });

    it('should handle arrays with mixed types', () => {
      const mixedArray = [
        'string',
        123,
        true,
        null,
        undefined,
        { object: 'value' },
        ['nested', 'array'],
        new Date(),
        /regex/
      ];
      
      expect(() => testLogger.info('Mixed array', mixedArray)).not.toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory with repeated child logger creation', () => {
      // Create and discard many child loggers
      for (let i = 0; i < 1000; i++) {
        const child = testLogger.child(`child-${i}`);
        child.info(`Child log ${i}`);
      }
      
      // This test mainly ensures no errors are thrown
      // Memory leak detection would require more sophisticated tooling
      expect(consoleSpy.info).toHaveBeenCalledTimes(1000);
    });

    it('should handle logger destruction gracefully', () => {
      const tempLogger = new ConfigurableLogger();
      tempLogger.info('Before destruction');
      
      // Simulate logger going out of scope
      // In a real scenario, this would be handled by garbage collection
      expect(() => tempLogger.info('After destruction')).not.toThrow();
    });
  });
});

describe('createLogger', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should create logger with default configuration', () => {
    const newLogger = createLogger();
    
    expect(() => newLogger.info('test')).not.toThrow();
  });

  it('should create logger with custom configuration', () => {
    const newLogger = createLogger({
      level: LogLevel.WARN,
      context: 'custom-logger'
    });
    
    expect(() => newLogger.warn('test')).not.toThrow();
  });
});

describe('default logger', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should be available as default export', () => {
    expect(logger).toBeDefined();
    expect(() => logger.info('test')).not.toThrow();
  });

  it('should be an instance of ConfigurableLogger', () => {
    expect(logger).toBeInstanceOf(ConfigurableLogger);
  });
});

describe('LogEntry interface', () => {
  it('should define the correct structure', () => {
    const entry: LogEntry = {
      timestamp: '2023-01-01T00:00:00.000Z',
      level: 'info',
      message: 'test message',
      context: 'test-context',
      data: { key: 'value' },
      error: {
        name: 'Error',
        message: 'error message',
        stack: 'stack trace'
      }
    };

    expect(entry.timestamp).toBe('2023-01-01T00:00:00.000Z');
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('test message');
    expect(entry.context).toBe('test-context');
    expect(entry.data).toEqual({ key: 'value' });
    expect(entry.error).toEqual({
      name: 'Error',
      message: 'error message',
      stack: 'stack trace'
    });
  });
});

describe('Enhanced Logger Features', () => {
  let stderrSpy: jest.SpyInstance;
  let consoleSpy: {
    debug: jest.SpyInstance;
    info: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation();
    consoleSpy = {
      debug: jest.spyOn(console, 'debug').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation()
    };
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('Safe JSON Serialization', () => {
    it('should handle circular references', () => {
      const logger = new ConfigurableLogger({
        enableStructured: true,
        outputStream: 'stderr'
      });

      const obj: any = { name: 'test' };
      obj.self = obj; // Create circular reference

      logger.info('test message', obj);

      expect(stderrSpy).toHaveBeenCalled();
      const logCall = stderrSpy.mock.calls[0][0];
      expect(logCall).toContain('[Circular Reference]');
    });

    it('should handle functions in data', () => {
      const logger = new ConfigurableLogger({
        enableStructured: true,
        outputStream: 'stderr'
      });

      logger.info('test message', { fn: () => 'test' });

      expect(stderrSpy).toHaveBeenCalled();
      const logCall = stderrSpy.mock.calls[0][0];
      expect(logCall).toContain('[Function]');
    });

    it('should handle undefined values', () => {
      const logger = new ConfigurableLogger({
        enableStructured: true,
        outputStream: 'stderr'
      });

      logger.info('test message', { value: undefined });

      expect(stderrSpy).toHaveBeenCalled();
      const logCall = stderrSpy.mock.calls[0][0];
      expect(logCall).toContain('[Undefined]');
    });

    it('should handle symbols', () => {
      const logger = new ConfigurableLogger({
        enableStructured: true,
        outputStream: 'stderr'
      });

      const sym = Symbol('test');
      logger.info('test message', { symbol: sym });

      expect(stderrSpy).toHaveBeenCalled();
      const logCall = stderrSpy.mock.calls[0][0];
      expect(logCall).toContain('Symbol(test)');
    });

    it('should handle bigint values', () => {
      const logger = new ConfigurableLogger({
        enableStructured: true,
        outputStream: 'stderr'
      });

      logger.info('test message', { bigNum: BigInt(123) });

      expect(stderrSpy).toHaveBeenCalled();
      const logCall = stderrSpy.mock.calls[0][0];
      expect(logCall).toContain('"123"');
    });

    it('should handle Error objects in data', () => {
      const logger = new ConfigurableLogger({
        enableStructured: true,
        outputStream: 'stderr'
      });

      const error = new Error('test error');
      logger.info('test message', { error });

      expect(stderrSpy).toHaveBeenCalled();
      const logCall = stderrSpy.mock.calls[0][0];
      const parsed = JSON.parse(logCall);
      expect(parsed.data.args[0].error.name).toBe('Error');
      expect(parsed.data.args[0].error.message).toBe('test error');
    });

    it('should respect max depth limit', () => {
      const logger = new ConfigurableLogger({
        enableStructured: true,
        outputStream: 'stderr',
        maxDepth: 2
      });

      const deepObj = { level1: { level2: { level3: { level4: 'deep' } } } };
      logger.info('test message', deepObj);

      expect(stderrSpy).toHaveBeenCalled();
      const logCall = stderrSpy.mock.calls[0][0];
      expect(logCall).toContain('[Max depth exceeded]');
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should fallback to console logging when JSON serialization fails', () => {
      const logger = new ConfigurableLogger({
        enableStructured: true,
        enableFallback: true,
        outputStream: 'stderr'
      });

      // Mock stderr.write to throw an error
      stderrSpy.mockImplementation(() => {
        throw new Error('Write failed');
      });

      logger.info('test message');

      expect(consoleSpy.info).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('JSON serialization failed:'),
        'Write failed'
      );
    });

    it('should not fallback when fallback is disabled', () => {
      const logger = new ConfigurableLogger({
        enableStructured: true,
        enableFallback: false,
        outputStream: 'stderr'
      });

      // Mock stderr.write to throw an error
      stderrSpy.mockImplementation(() => {
        throw new Error('Write failed');
      });

      logger.info('test message');

      expect(consoleSpy.info).not.toHaveBeenCalled();
    });
  });

  describe('Output Stream Configuration', () => {
    it('should use stderr by default for structured logging', () => {
      const logger = new ConfigurableLogger({
        enableStructured: true
      });

      logger.info('test message');

      expect(stderrSpy).toHaveBeenCalled();
    });

    it('should use stdout when configured', () => {
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
      
      const logger = new ConfigurableLogger({
        enableStructured: true,
        outputStream: 'stdout'
      });

      logger.info('test message');

      expect(stdoutSpy).toHaveBeenCalled();
      expect(stderrSpy).not.toHaveBeenCalled();
      
      stdoutSpy.mockRestore();
    });
  });
});

describe('createMCPLogger', () => {
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation();
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it('should create logger with MCP-safe defaults', () => {
    const mcpLogger = createMCPLogger();

    mcpLogger.info('test message');

    expect(stderrSpy).toHaveBeenCalled();
    const logCall = stderrSpy.mock.calls[0][0];
    const parsed = JSON.parse(logCall);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('test message');
  });

  it('should allow custom configuration while maintaining MCP safety', () => {
    const mcpLogger = createMCPLogger({
      level: LogLevel.WARN,
      context: 'mcp-server'
    });

    mcpLogger.info('info message'); // Should be filtered
    mcpLogger.warn('warn message'); // Should be logged

    expect(stderrSpy).toHaveBeenCalledTimes(1);
    const logCall = stderrSpy.mock.calls[0][0];
    const parsed = JSON.parse(logCall);
    expect(parsed.level).toBe('warn');
    expect(parsed.context).toBe('mcp-server');
  });
});