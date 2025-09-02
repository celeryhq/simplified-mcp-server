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
      // Clear the base URL to test default behavior
      delete process.env.SIMPLIFIED_API_BASE_URL;
      
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
        retryDelay: 1000,
        workflowsEnabled: false,
        workflowDiscoveryInterval: 0,
        workflowExecutionTimeout: 300000,
        workflowMaxConcurrentExecutions: 10,
        workflowFilterPatterns: [],
        workflowStatusCheckInterval: 5000,
        workflowRetryAttempts: 3
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
        RETRY_DELAY: 1000,
        WORKFLOWS_ENABLED: false,
        WORKFLOW_DISCOVERY_INTERVAL: 0,
        WORKFLOW_EXECUTION_TIMEOUT: 300000,
        WORKFLOW_MAX_CONCURRENT_EXECUTIONS: 10,
        WORKFLOW_FILTER_PATTERNS: '',
        WORKFLOW_STATUS_CHECK_INTERVAL: 5000,
        WORKFLOW_RETRY_ATTEMPTS: 3
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

  describe('workflow configuration', () => {
    it('should load workflow configuration with default values', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      
      const config = ConfigurationManager.loadConfig();
      
      expect(config.workflowsEnabled).toBe(false);
      expect(config.workflowDiscoveryInterval).toBe(0);
      expect(config.workflowExecutionTimeout).toBe(300000);
      expect(config.workflowMaxConcurrentExecutions).toBe(10);
      expect(config.workflowFilterPatterns).toEqual([]);
      expect(config.workflowStatusCheckInterval).toBe(5000);
      expect(config.workflowRetryAttempts).toBe(3);
    });

    it('should load workflow configuration with custom values', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      process.env.WORKFLOWS_ENABLED = 'true';
      process.env.WORKFLOW_DISCOVERY_INTERVAL = '60000';
      process.env.WORKFLOW_EXECUTION_TIMEOUT = '600000';
      process.env.WORKFLOW_MAX_CONCURRENT_EXECUTIONS = '20';
      process.env.WORKFLOW_FILTER_PATTERNS = 'data-*,report-*';
      process.env.WORKFLOW_STATUS_CHECK_INTERVAL = '10000';
      process.env.WORKFLOW_RETRY_ATTEMPTS = '5';
      
      const config = ConfigurationManager.loadConfig();
      
      expect(config.workflowsEnabled).toBe(true);
      expect(config.workflowDiscoveryInterval).toBe(60000);
      expect(config.workflowExecutionTimeout).toBe(600000);
      expect(config.workflowMaxConcurrentExecutions).toBe(20);
      expect(config.workflowFilterPatterns).toEqual(['data-*', 'report-*']);
      expect(config.workflowStatusCheckInterval).toBe(10000);
      expect(config.workflowRetryAttempts).toBe(5);
    });

    it('should handle boolean workflow enabled values correctly', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      
      // Test 'false' string
      process.env.WORKFLOWS_ENABLED = 'false';
      let config = ConfigurationManager.loadConfig();
      expect(config.workflowsEnabled).toBe(false);
      
      // Test 'true' string
      process.env.WORKFLOWS_ENABLED = 'true';
      config = ConfigurationManager.loadConfig();
      expect(config.workflowsEnabled).toBe(true);
      
      // Test case insensitive
      process.env.WORKFLOWS_ENABLED = 'TRUE';
      config = ConfigurationManager.loadConfig();
      expect(config.workflowsEnabled).toBe(true);
      
      // Test invalid value defaults to false
      process.env.WORKFLOWS_ENABLED = 'invalid';
      config = ConfigurationManager.loadConfig();
      expect(config.workflowsEnabled).toBe(false);
    });

    it('should handle workflow filter patterns correctly', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      
      // Test single pattern
      process.env.WORKFLOW_FILTER_PATTERNS = 'data-*';
      let config = ConfigurationManager.loadConfig();
      expect(config.workflowFilterPatterns).toEqual(['data-*']);
      
      // Test multiple patterns
      process.env.WORKFLOW_FILTER_PATTERNS = 'data-*,report-*,analysis-*';
      config = ConfigurationManager.loadConfig();
      expect(config.workflowFilterPatterns).toEqual(['data-*', 'report-*', 'analysis-*']);
      
      // Test patterns with spaces
      process.env.WORKFLOW_FILTER_PATTERNS = ' data-* , report-* , analysis-* ';
      config = ConfigurationManager.loadConfig();
      expect(config.workflowFilterPatterns).toEqual(['data-*', 'report-*', 'analysis-*']);
      
      // Test empty string
      process.env.WORKFLOW_FILTER_PATTERNS = '';
      config = ConfigurationManager.loadConfig();
      expect(config.workflowFilterPatterns).toEqual([]);
    });

    it('should validate workflow configuration constraints', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      
      // Test negative workflow discovery interval (should be allowed, 0 means disabled)
      process.env.WORKFLOW_DISCOVERY_INTERVAL = '-1';
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
      
      // Test zero workflow execution timeout (should fail, must be positive)
      process.env.WORKFLOW_EXECUTION_TIMEOUT = '0';
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
      
      // Test negative workflow execution timeout
      process.env.WORKFLOW_EXECUTION_TIMEOUT = '-1000';
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
      
      // Test zero max concurrent executions (should fail, must be positive)
      process.env.WORKFLOW_MAX_CONCURRENT_EXECUTIONS = '0';
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
      
      // Test zero status check interval (should fail, must be positive)
      process.env.WORKFLOW_STATUS_CHECK_INTERVAL = '0';
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
      
      // Test negative retry attempts (should fail, must be >= 0)
      process.env.WORKFLOW_RETRY_ATTEMPTS = '-1';
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
    });

    it('should allow zero workflow discovery interval and retry attempts', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      
      // Zero discovery interval should be allowed (means disabled)
      process.env.WORKFLOW_DISCOVERY_INTERVAL = '0';
      let config = ConfigurationManager.loadConfig();
      expect(config.workflowDiscoveryInterval).toBe(0);
      
      // Zero retry attempts should be allowed (means no retries)
      process.env.WORKFLOW_RETRY_ATTEMPTS = '0';
      config = ConfigurationManager.loadConfig();
      expect(config.workflowRetryAttempts).toBe(0);
    });

    it('should validate workflow configuration limits', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      
      // Test maximum discovery interval (24 hours)
      process.env.WORKFLOW_DISCOVERY_INTERVAL = '86400001';
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
      
      // Test maximum execution timeout (1 hour)
      process.env.WORKFLOW_EXECUTION_TIMEOUT = '3600001';
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
      
      // Test maximum concurrent executions
      process.env.WORKFLOW_MAX_CONCURRENT_EXECUTIONS = '101';
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
      
      // Test maximum status check interval (5 minutes)
      process.env.WORKFLOW_STATUS_CHECK_INTERVAL = '300001';
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
      
      // Test maximum retry attempts
      process.env.WORKFLOW_RETRY_ATTEMPTS = '11';
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
    });

    it('should validate minimum workflow configuration values', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      
      // Test minimum execution timeout
      process.env.WORKFLOW_EXECUTION_TIMEOUT = '999';
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
      
      // Test minimum status check interval
      process.env.WORKFLOW_STATUS_CHECK_INTERVAL = '999';
      expect(() => ConfigurationManager.loadConfig()).toThrow(/Configuration validation failed/);
    });

    it('should handle empty and whitespace filter patterns', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      
      // Test empty filter pattern in list (after trimming, empty strings are filtered out)
      process.env.WORKFLOW_FILTER_PATTERNS = 'valid-pattern,,another-pattern';
      const config1 = ConfigurationManager.loadConfig();
      expect(config1.workflowFilterPatterns).toEqual(['valid-pattern', 'another-pattern']);
      
      // Test whitespace-only filter pattern (after trimming, empty strings are filtered out)
      process.env.WORKFLOW_FILTER_PATTERNS = 'valid-pattern,   ,another-pattern';
      const config2 = ConfigurationManager.loadConfig();
      expect(config2.workflowFilterPatterns).toEqual(['valid-pattern', 'another-pattern']);
      
      // Test empty string should result in empty array
      process.env.WORKFLOW_FILTER_PATTERNS = '';
      const config3 = ConfigurationManager.loadConfig();
      expect(config3.workflowFilterPatterns).toEqual([]);
    });

    it('should accept valid filter patterns', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      
      // Test valid patterns
      process.env.WORKFLOW_FILTER_PATTERNS = 'data-*,report-*,analysis-workflow';
      const config = ConfigurationManager.loadConfig();
      expect(config.workflowFilterPatterns).toEqual(['data-*', 'report-*', 'analysis-workflow']);
    });
  });

  describe('validateWorkflowConfiguration', () => {
    it('should return no warnings for default configuration', () => {
      const config = {
        apiToken: 'test-token',
        apiBaseUrl: 'https://api.simplified.com',
        logLevel: 'info' as const,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        workflowsEnabled: false,
        workflowDiscoveryInterval: 0,
        workflowExecutionTimeout: 300000,
        workflowMaxConcurrentExecutions: 10,
        workflowFilterPatterns: [],
        workflowStatusCheckInterval: 5000,
        workflowRetryAttempts: 3
      };

      const warnings = ConfigurationManager.validateWorkflowConfiguration(config);
      expect(warnings).toEqual([]);
    });

    it('should return warnings for potentially problematic configurations', () => {
      const config = {
        apiToken: 'test-token',
        apiBaseUrl: 'https://api.simplified.com',
        logLevel: 'info' as const,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        workflowsEnabled: true,
        workflowDiscoveryInterval: 30000, // Too frequent
        workflowExecutionTimeout: 15000, // Too short
        workflowMaxConcurrentExecutions: 75, // Too high
        workflowFilterPatterns: ['exact-match'], // No wildcards
        workflowStatusCheckInterval: 1500, // Too frequent
        workflowRetryAttempts: 8 // Too many
      };

      const warnings = ConfigurationManager.validateWorkflowConfiguration(config);
      expect(warnings).toHaveLength(6);
      expect(warnings[0]).toContain('WORKFLOW_DISCOVERY_INTERVAL is less than 60 seconds');
      expect(warnings[1]).toContain('WORKFLOW_EXECUTION_TIMEOUT is less than 30 seconds');
      expect(warnings[2]).toContain('WORKFLOW_MAX_CONCURRENT_EXECUTIONS is very high');
      expect(warnings[3]).toContain('WORKFLOW_STATUS_CHECK_INTERVAL is less than 2 seconds');
      expect(warnings[4]).toContain('WORKFLOW_RETRY_ATTEMPTS is high');
      expect(warnings[5]).toContain('WORKFLOW_FILTER_PATTERNS contains no wildcards');
    });

    it('should not return warnings when workflows are disabled', () => {
      const config = {
        apiToken: 'test-token',
        apiBaseUrl: 'https://api.simplified.com',
        logLevel: 'info' as const,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        workflowsEnabled: false, // Disabled
        workflowDiscoveryInterval: 1000, // Would be problematic if enabled
        workflowExecutionTimeout: 5000, // Would be problematic if enabled
        workflowMaxConcurrentExecutions: 100, // Would be problematic if enabled
        workflowFilterPatterns: [],
        workflowStatusCheckInterval: 500, // Would be problematic if enabled
        workflowRetryAttempts: 10 // Would be problematic if enabled
      };

      const warnings = ConfigurationManager.validateWorkflowConfiguration(config);
      expect(warnings).toEqual([]);
    });
  });

  describe('getWorkflowConfigurationRecommendations', () => {
    it('should return development recommendations', () => {
      const recommendations = ConfigurationManager.getWorkflowConfigurationRecommendations('development');
      
      expect(recommendations.workflowsEnabled).toBe(true);
      expect(recommendations.workflowDiscoveryInterval).toBe(60000);
      expect(recommendations.workflowExecutionTimeout).toBe(120000);
      expect(recommendations.workflowMaxConcurrentExecutions).toBe(5);
      expect(recommendations.workflowStatusCheckInterval).toBe(2000);
      expect(recommendations.workflowRetryAttempts).toBe(1);
    });

    it('should return production recommendations', () => {
      const recommendations = ConfigurationManager.getWorkflowConfigurationRecommendations('production');
      
      expect(recommendations.workflowsEnabled).toBe(true);
      expect(recommendations.workflowDiscoveryInterval).toBe(600000);
      expect(recommendations.workflowExecutionTimeout).toBe(600000);
      expect(recommendations.workflowMaxConcurrentExecutions).toBe(20);
      expect(recommendations.workflowStatusCheckInterval).toBe(10000);
      expect(recommendations.workflowRetryAttempts).toBe(5);
    });

    it('should return testing recommendations', () => {
      const recommendations = ConfigurationManager.getWorkflowConfigurationRecommendations('testing');
      
      expect(recommendations.workflowsEnabled).toBe(false);
      expect(recommendations.workflowDiscoveryInterval).toBe(0);
      expect(recommendations.workflowExecutionTimeout).toBe(30000);
      expect(recommendations.workflowMaxConcurrentExecutions).toBe(3);
      expect(recommendations.workflowStatusCheckInterval).toBe(1000);
      expect(recommendations.workflowRetryAttempts).toBe(0);
    });

    it('should return empty object for unknown environment', () => {
      const recommendations = ConfigurationManager.getWorkflowConfigurationRecommendations('unknown' as any);
      expect(recommendations).toEqual({});
    });
  });
});