import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file in development
dotenv.config();

/**
 * Workflow configuration schema with enhanced validation
 */
const WorkflowConfigSchema = z.object({
  workflowsEnabled: z.boolean().default(true),
  workflowDiscoveryInterval: z.number()
    .min(0, 'Workflow discovery interval must be 0 or positive (0 = disabled)')
    .max(86400000, 'Workflow discovery interval cannot exceed 24 hours (86400000ms)')
    .default(0),
  workflowExecutionTimeout: z.number()
    .positive('Workflow execution timeout must be positive')
    .min(1000, 'Workflow execution timeout must be at least 1000ms (1 second)')
    .max(3600000, 'Workflow execution timeout cannot exceed 1 hour (3600000ms)')
    .default(300000), // 5 minutes
  workflowMaxConcurrentExecutions: z.number()
    .positive('Maximum concurrent executions must be positive')
    .min(1, 'Maximum concurrent executions must be at least 1')
    .max(100, 'Maximum concurrent executions cannot exceed 100')
    .default(10),
  workflowFilterPatterns: z.array(z.string().min(1, 'Filter patterns cannot be empty strings'))
    .default([])
    .refine(patterns => patterns.every(pattern => pattern.trim() === pattern), {
      message: 'Filter patterns cannot have leading or trailing whitespace'
    }),
  workflowStatusCheckInterval: z.number()
    .positive('Status check interval must be positive')
    .min(1000, 'Status check interval must be at least 1000ms to avoid excessive API calls')
    .max(300000, 'Status check interval cannot exceed 5 minutes (300000ms)')
    .default(5000), // 5 seconds
  workflowRetryAttempts: z.number()
    .min(0, 'Retry attempts must be 0 or positive')
    .max(10, 'Retry attempts cannot exceed 10')
    .default(3)
});

/**
 * Configuration schema for validation
 */
const ConfigSchema = z.object({
  apiToken: z.string().min(1, 'otkFyRGB.filbSnmLSINrg0eakfGkhSRa4clfo8aL'),
  apiBaseUrl: z.string().url().default('https://api.simplified.com'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  timeout: z.number().positive().default(30000),
  retryAttempts: z.number().min(0).default(3),
  retryDelay: z.number().positive().default(1000)
}).merge(WorkflowConfigSchema);

/**
 * Configuration type derived from schema
 */
export type ServerConfig = z.infer<typeof ConfigSchema>;

/**
 * Configuration Manager handles loading and validating server configuration
 */
export class ConfigurationManager {
  /**
   * Load configuration from environment variables
   * @returns Validated server configuration
   * @throws Error if required configuration is missing or invalid
   */
  static loadConfig(): ServerConfig {
    const rawConfig = {
      apiToken: process.env.SIMPLIFIED_API_TOKEN,
      apiBaseUrl: process.env.SIMPLIFIED_API_BASE_URL,
      logLevel: process.env.LOG_LEVEL,
      timeout: process.env.REQUEST_TIMEOUT ? parseInt(process.env.REQUEST_TIMEOUT, 10) : undefined,
      retryAttempts: process.env.RETRY_ATTEMPTS ? parseInt(process.env.RETRY_ATTEMPTS, 10) : undefined,
      retryDelay: process.env.RETRY_DELAY ? parseInt(process.env.RETRY_DELAY, 10) : undefined,
      
      // Workflow configuration
      workflowsEnabled: process.env.WORKFLOWS_ENABLED ? process.env.WORKFLOWS_ENABLED.toLowerCase() === 'true' : undefined,
      workflowDiscoveryInterval: process.env.WORKFLOW_DISCOVERY_INTERVAL ? parseInt(process.env.WORKFLOW_DISCOVERY_INTERVAL, 10) : undefined,
      workflowExecutionTimeout: process.env.WORKFLOW_EXECUTION_TIMEOUT ? parseInt(process.env.WORKFLOW_EXECUTION_TIMEOUT, 10) : undefined,
      workflowMaxConcurrentExecutions: process.env.WORKFLOW_MAX_CONCURRENT_EXECUTIONS ? parseInt(process.env.WORKFLOW_MAX_CONCURRENT_EXECUTIONS, 10) : undefined,
      workflowFilterPatterns: process.env.WORKFLOW_FILTER_PATTERNS ? process.env.WORKFLOW_FILTER_PATTERNS.split(',').map(p => p.trim()).filter(p => p.length > 0) : undefined,
      workflowStatusCheckInterval: process.env.WORKFLOW_STATUS_CHECK_INTERVAL ? parseInt(process.env.WORKFLOW_STATUS_CHECK_INTERVAL, 10) : undefined,
      workflowRetryAttempts: process.env.WORKFLOW_RETRY_ATTEMPTS ? parseInt(process.env.WORKFLOW_RETRY_ATTEMPTS, 10) : undefined
    };

    try {
      return this.validateConfig(rawConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const missingFields = error.errors
          .filter(err => err.code === 'invalid_type' && err.received === 'undefined')
          .map(err => err.path.join('.'));
        
        const invalidFields = error.errors
          .filter(err => err.code !== 'invalid_type' || err.received !== 'undefined')
          .map(err => `${err.path.join('.')}: ${err.message}`);

        let errorMessage = 'Configuration validation failed:\n';
        
        if (missingFields.length > 0) {
          errorMessage += `Missing required environment variables: ${missingFields.join(', ')}\n`;
        }
        
        if (invalidFields.length > 0) {
          errorMessage += `Invalid configuration values: ${invalidFields.join(', ')}\n`;
        }

        errorMessage += '\nRequired environment variables:\n';
        errorMessage += '- SIMPLIFIED_API_TOKEN: Your Simplified API token\n';
        errorMessage += '\nOptional environment variables:\n';
        errorMessage += '- SIMPLIFIED_API_BASE_URL: API base URL (default: https://api.simplified.com)\n';
        errorMessage += '- LOG_LEVEL: Logging level (debug|info|warn|error, default: info)\n';
        errorMessage += '- REQUEST_TIMEOUT: Request timeout in milliseconds (default: 30000)\n';
        errorMessage += '- RETRY_ATTEMPTS: Number of retry attempts (default: 3)\n';
        errorMessage += '- RETRY_DELAY: Delay between retries in milliseconds (default: 1000)\n';
        errorMessage += '\nWorkflow configuration (optional):\n';
        errorMessage += '- WORKFLOWS_ENABLED: Enable dynamic workflow tools (true|false, default: false)\n';
        errorMessage += '- WORKFLOW_DISCOVERY_INTERVAL: Auto-refresh interval in ms (0-86400000, default: 0=disabled)\n';
        errorMessage += '- WORKFLOW_EXECUTION_TIMEOUT: Execution timeout in ms (1000-3600000, default: 300000)\n';
        errorMessage += '- WORKFLOW_MAX_CONCURRENT_EXECUTIONS: Max concurrent executions (1-100, default: 10)\n';
        errorMessage += '- WORKFLOW_FILTER_PATTERNS: Comma-separated workflow name patterns (default: none)\n';
        errorMessage += '- WORKFLOW_STATUS_CHECK_INTERVAL: Status polling interval in ms (1000-300000, default: 5000)\n';
        errorMessage += '- WORKFLOW_RETRY_ATTEMPTS: Retry attempts for failed operations (0-10, default: 3)\n';
        
        // Add specific workflow configuration guidance
        errorMessage += '\nWorkflow configuration guidelines:\n';
        errorMessage += '- Set WORKFLOW_DISCOVERY_INTERVAL to 0 to disable automatic refresh\n';
        errorMessage += '- Use WORKFLOW_FILTER_PATTERNS to limit which workflows are exposed (e.g., "data-*,report-*")\n';
        errorMessage += '- Minimum WORKFLOW_STATUS_CHECK_INTERVAL is 1000ms to avoid excessive API calls\n';
        errorMessage += '- WORKFLOW_EXECUTION_TIMEOUT should be set based on your longest-running workflows\n';

        throw new Error(errorMessage);
      }
      throw error;
    }
  }

  /**
   * Validate configuration object against schema
   * @param config Raw configuration object
   * @returns Validated configuration
   * @throws ZodError if validation fails
   */
  static validateConfig(config: unknown): ServerConfig {
    return ConfigSchema.parse(config);
  }

  /**
   * Get list of required environment variables
   * @returns Array of required environment variable names
   */
  static getRequiredEnvironmentVariables(): string[] {
    return ['SIMPLIFIED_API_TOKEN'];
  }

  /**
   * Get list of optional environment variables with their defaults
   * @returns Object mapping optional environment variables to their default values
   */
  static getOptionalEnvironmentVariables(): Record<string, string | number | boolean> {
    return {
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
    };
  }

  /**
   * Validate workflow-specific configuration and provide recommendations
   * @param config Configuration object to validate
   * @returns Array of validation warnings and recommendations
   */
  static validateWorkflowConfiguration(config: ServerConfig): string[] {
    const warnings: string[] = [];

    // Check for potentially problematic configurations
    if (config.workflowsEnabled) {
      if (config.workflowDiscoveryInterval > 0 && config.workflowDiscoveryInterval < 60000) {
        warnings.push('WORKFLOW_DISCOVERY_INTERVAL is less than 60 seconds. Consider using a longer interval to reduce API load.');
      }

      if (config.workflowExecutionTimeout < 30000) {
        warnings.push('WORKFLOW_EXECUTION_TIMEOUT is less than 30 seconds. This may cause timeouts for longer-running workflows.');
      }

      if (config.workflowMaxConcurrentExecutions > 50) {
        warnings.push('WORKFLOW_MAX_CONCURRENT_EXECUTIONS is very high. This may cause resource exhaustion.');
      }

      if (config.workflowStatusCheckInterval < 2000) {
        warnings.push('WORKFLOW_STATUS_CHECK_INTERVAL is less than 2 seconds. This may cause excessive API calls.');
      }

      if (config.workflowRetryAttempts > 5) {
        warnings.push('WORKFLOW_RETRY_ATTEMPTS is high. This may cause long delays on failures.');
      }

      // Check filter patterns for common issues
      if (config.workflowFilterPatterns.length > 0) {
        const hasWildcard = config.workflowFilterPatterns.some(pattern => pattern.includes('*') || pattern.includes('?'));
        if (!hasWildcard) {
          warnings.push('WORKFLOW_FILTER_PATTERNS contains no wildcards. Consider using patterns like "prefix-*" for flexibility.');
        }
      }
    }

    return warnings;
  }

  /**
   * Get workflow configuration recommendations based on environment
   * @param environment Environment type ('development' | 'production' | 'testing')
   * @returns Object with recommended configuration values
   */
  static getWorkflowConfigurationRecommendations(environment: 'development' | 'production' | 'testing'): Partial<ServerConfig> {
    switch (environment) {
      case 'development':
        return {
          workflowsEnabled: true,
          workflowDiscoveryInterval: 60000, // 1 minute for faster development feedback
          workflowExecutionTimeout: 120000, // 2 minutes for faster feedback
          workflowMaxConcurrentExecutions: 5, // Lower for development
          workflowStatusCheckInterval: 2000, // 2 seconds for faster feedback
          workflowRetryAttempts: 1 // Fewer retries for faster failure feedback
        };
      
      case 'production':
        return {
          workflowsEnabled: true,
          workflowDiscoveryInterval: 600000, // 10 minutes for stability
          workflowExecutionTimeout: 600000, // 10 minutes for longer workloads
          workflowMaxConcurrentExecutions: 20, // Higher for production load
          workflowStatusCheckInterval: 10000, // 10 seconds to reduce API load
          workflowRetryAttempts: 5 // More retries for reliability
        };
      
      case 'testing':
        return {
          workflowsEnabled: false, // Disabled by default for testing
          workflowDiscoveryInterval: 0, // Disabled
          workflowExecutionTimeout: 30000, // 30 seconds for fast tests
          workflowMaxConcurrentExecutions: 3, // Low for testing
          workflowStatusCheckInterval: 1000, // 1 second minimum
          workflowRetryAttempts: 0 // No retries for predictable testing
        };
      
      default:
        return {};
    }
  }
}