import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file in development
dotenv.config();

/**
 * Configuration schema for validation
 */
const ConfigSchema = z.object({
  apiToken: z.string().min(1, 'SIMPLIFIED_API_TOKEN is required'),
  apiBaseUrl: z.string().url().default('https://api.simplified.com'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  timeout: z.number().positive().default(30000),
  retryAttempts: z.number().min(0).default(3),
  retryDelay: z.number().positive().default(1000)
});

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
      retryDelay: process.env.RETRY_DELAY ? parseInt(process.env.RETRY_DELAY, 10) : undefined
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
  static getOptionalEnvironmentVariables(): Record<string, string | number> {
    return {
      SIMPLIFIED_API_BASE_URL: 'https://api.simplified.com',
      LOG_LEVEL: 'info',
      REQUEST_TIMEOUT: 30000,
      RETRY_ATTEMPTS: 3,
      RETRY_DELAY: 1000
    };
  }
}