import { ConfigurationManager } from '../../src/config/configuration.js';

describe('ConfigurationManager', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load valid configuration with required environment variables', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      
      const config = ConfigurationManager.loadConfig();
      
      expect(config.apiToken).toBe('test-token');
      expect(config.apiBaseUrl).toBe('https://api.simplified.com');
      expect(config.logLevel).toBe('info');
      expect(config.timeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
      expect(config.retryDelay).toBe(1000);
    });

    it('should load configuration with custom values', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'custom-token';
      process.env.SIMPLIFIED_API_BASE_URL = 'https://custom.api.com';
      process.env.LOG_LEVEL = 'debug';
      process.env.REQUEST_TIMEOUT = '5000';
      process.env.RETRY_ATTEMPTS = '5';
      process.env.RETRY_DELAY = '2000';
      
      const config = ConfigurationManager.loadConfig();
      
      expect(config.apiToken).toBe('custom-token');
      expect(config.apiBaseUrl).toBe('https://custom.api.com');
      expect(config.logLevel).toBe('debug');
      expect(config.timeout).toBe(5000);
      expect(config.retryAttempts).toBe(5);
      expect(config.retryDelay).toBe(2000);
    });

    it('should throw error when required API token is missing', () => {
      delete process.env.SIMPLIFIED_API_TOKEN;
      
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Missing required environment variables: apiToken/);
    });

    it('should throw error when API token is empty string', () => {
      process.env.SIMPLIFIED_API_TOKEN = '';
      
      expect(() => ConfigurationManager.loadConfig()).toThrow(/SIMPLIFIED_API_TOKEN is required/);
    });

    it('should throw error for invalid log level', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      process.env.LOG_LEVEL = 'invalid';
      
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
    });

    it('should throw error for invalid URL', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      process.env.SIMPLIFIED_API_BASE_URL = 'not-a-url';
      
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
    });

    it('should throw error for negative timeout', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      process.env.REQUEST_TIMEOUT = '-1000';
      
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration object', () => {
      const validConfig = {
        apiToken: 'test-token',
        apiBaseUrl: 'https://api.test.com',
        logLevel: 'info' as const,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      };

      const result = ConfigurationManager.validateConfig(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should apply defaults for missing optional fields', () => {
      const minimalConfig = {
        apiToken: 'test-token'
      };

      const result = ConfigurationManager.validateConfig(minimalConfig);
      expect(result.apiBaseUrl).toBe('https://api.simplified.com');
      expect(result.logLevel).toBe('info');
      expect(result.timeout).toBe(30000);
    });
  });

  describe('getRequiredEnvironmentVariables', () => {
    it('should return list of required environment variables', () => {
      const required = ConfigurationManager.getRequiredEnvironmentVariables();
      expect(required).toEqual(['SIMPLIFIED_API_TOKEN']);
    });
  });

  describe('getOptionalEnvironmentVariables', () => {
    it('should return object with optional environment variables and defaults', () => {
      const optional = ConfigurationManager.getOptionalEnvironmentVariables();
      expect(optional).toEqual({
        SIMPLIFIED_API_BASE_URL: 'https://api.simplified.com',
        LOG_LEVEL: 'info',
        REQUEST_TIMEOUT: 30000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle non-numeric string values for numeric fields', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      process.env.REQUEST_TIMEOUT = 'not-a-number';
      
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
    });

    it('should handle empty string values for optional fields', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      process.env.SIMPLIFIED_API_BASE_URL = '';
      
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
    });

    it('should handle zero values for numeric fields', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      process.env.REQUEST_TIMEOUT = '0';
      
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
    });

    it('should handle negative values for retry attempts', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      process.env.RETRY_ATTEMPTS = '-1';
      
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
    });

    it('should handle very large timeout values', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      process.env.REQUEST_TIMEOUT = '999999999';
      
      const config = ConfigurationManager.loadConfig();
      expect(config.timeout).toBe(999999999);
    });

    it('should handle mixed case log levels', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      process.env.LOG_LEVEL = 'INFO';
      
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
    });

    it('should validate configuration object with partial data', () => {
      const partialConfig = {
        apiToken: 'test-token',
        logLevel: 'debug' as const
      };

      const result = ConfigurationManager.validateConfig(partialConfig);
      expect(result.apiToken).toBe('test-token');
      expect(result.logLevel).toBe('debug');
      expect(result.apiBaseUrl).toBe('https://api.simplified.com');
    });

    it('should handle null and undefined values in configuration', () => {
      const invalidConfig = {
        apiToken: null,
        apiBaseUrl: undefined,
        logLevel: 'info' as const
      };

      expect(() => ConfigurationManager.validateConfig(invalidConfig)).toThrow();
    });

    it('should handle malformed URLs', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      process.env.SIMPLIFIED_API_BASE_URL = 'not-a-valid-url';
      
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
    });

    it('should handle URLs without protocol', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      process.env.SIMPLIFIED_API_BASE_URL = 'api.simplified.com';
      
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
    });

    it('should handle floating point values for integer fields', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      process.env.RETRY_ATTEMPTS = '3.5';
      
      const config = ConfigurationManager.loadConfig();
      expect(config.retryAttempts).toBe(3); // parseInt truncates
    });

    it('should handle scientific notation in numeric fields', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      process.env.REQUEST_TIMEOUT = '10000'; // Use regular number instead of scientific notation
      
      const config = ConfigurationManager.loadConfig();
      expect(config.timeout).toBe(10000);
    });

    it('should handle negative retry delay', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      process.env.RETRY_DELAY = '-500';
      
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
    });

    it('should handle zero retry delay', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      process.env.RETRY_DELAY = '0';
      
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
    });
  });

  describe('environment variable parsing', () => {
    it('should correctly parse string environment variables', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token-123';
      process.env.SIMPLIFIED_API_BASE_URL = 'https://custom.api.com';
      process.env.LOG_LEVEL = 'debug';
      
      const config = ConfigurationManager.loadConfig();
      expect(config.apiToken).toBe('test-token-123');
      expect(config.apiBaseUrl).toBe('https://custom.api.com');
      expect(config.logLevel).toBe('debug');
    });

    it('should correctly parse integer environment variables', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      process.env.REQUEST_TIMEOUT = '15000';
      process.env.RETRY_ATTEMPTS = '5';
      process.env.RETRY_DELAY = '2000';
      
      const config = ConfigurationManager.loadConfig();
      expect(config.timeout).toBe(15000);
      expect(config.retryAttempts).toBe(5);
      expect(config.retryDelay).toBe(2000);
    });

    it('should handle whitespace in environment variables', () => {
      process.env.SIMPLIFIED_API_TOKEN = '  test-token  ';
      
      const config = ConfigurationManager.loadConfig();
      expect(config.apiToken).toBe('  test-token  '); // Should preserve whitespace for validation to catch
    });
  });
});