/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

/**
 * ANSI color codes for console output
 */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

/**
 * Log level to string mapping
 */
const LOG_LEVEL_MAP: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.INFO]: 'info',
  [LogLevel.WARN]: 'warn',
  [LogLevel.ERROR]: 'error',
  [LogLevel.SILENT]: 'silent'
};

/**
 * Log entry structure for structured logging
 */
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  data?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  logError(error: Error, context?: string): void;
  setLevel(level: LogLevel | string): void;
  setContext(context: string): void;
  child(context: string): Logger;
  updateConfig(config: Partial<LoggerConfig>): void;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  level: LogLevel;
  environment: 'development' | 'production' | 'test';
  enableColors: boolean;
  enableTimestamp: boolean;
  enableStructured: boolean;
  context?: string;
  outputStream?: 'stdout' | 'stderr';
  maxDepth?: number;
  enableFallback?: boolean;
}

/**
 * Configurable Logger implementation with structured logging support
 */
export class ConfigurableLogger implements Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level ?? LogLevel.INFO,
      environment: config.environment ?? (process.env.NODE_ENV !== 'production' ? 'development' : 'production'),
      enableColors: config.enableColors ?? (process.env.NODE_ENV !== 'production'),
      enableTimestamp: config.enableTimestamp ?? true,
      enableStructured: config.enableStructured ?? (process.env.NODE_ENV === 'production'),
      outputStream: config.outputStream ?? 'stderr',
      maxDepth: config.maxDepth ?? 10,
      enableFallback: config.enableFallback ?? true,
      ...(config.context && { context: config.context })
    };
  }

  /**
   * Debug level logging
   */
  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  /**
   * Info level logging
   */
  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  /**
   * Warning level logging
   */
  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  /**
   * Error level logging
   */
  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  /**
   * Log an error object with stack trace
   */
  logError(error: Error, context?: string): void {
    const errorData = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };

    if (this.config.enableStructured) {
      this.logStructured(LogLevel.ERROR, error.message, context, { error: errorData });
    } else {
      this.log(LogLevel.ERROR, error.message || error.name, { error: errorData });
    }
  }

  /**
   * Set the logger context
   */
  setContext(context: string): void {
    this.config.context = context;
  }

  /**
   * Set the log level
   */
  setLevel(level: LogLevel | string): void {
    if (typeof level === 'string') {
      const mappedLevel = Object.entries(LOG_LEVEL_MAP).find(([_, value]) => value.toLowerCase() === level.toLowerCase())?.[0];
      if (mappedLevel !== undefined) {
        this.config.level = parseInt(mappedLevel) as LogLevel;
      } else {
        this.warn(`Invalid log level: ${level}. Using current level: ${LOG_LEVEL_MAP[this.config.level]}`);
      }
    } else {
      this.config.level = level;
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string): Logger {
    const childContext = this.config.context ? `${this.config.context}:${context}` : context;
    return new ConfigurableLogger({
      ...this.config,
      context: childContext
    });
  }

  /**
   * Update logger configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (level < this.config.level || this.config.level === LogLevel.SILENT) {
      return;
    }

    if (this.config.enableStructured) {
      this.logStructured(level, message, this.config.context, args.length > 0 ? { args } : undefined);
    } else {
      this.logFormatted(level, message, ...args);
    }
  }

  /**
   * Log in structured format (JSON)
   */
  private logStructured(level: LogLevel, message: string, context?: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LOG_LEVEL_MAP[level],
      message,
      ...(context && { context }),
      ...(data && { data })
    };

    try {
      const serialized = this.safeJsonStringify(entry);
      const outputStream = this.config.outputStream === 'stdout' ? process.stdout : process.stderr;
      // outputStream.write(serialized + '\n');
    } catch (error) {
      if (this.config.enableFallback) {
        this.fallbackToConsole(level, message, context, data, error as Error);
      }
    }
  }

  /**
   * Safe JSON serialization with circular reference detection
   */
  private safeJsonStringify(obj: any): string {
    const seen = new WeakSet();
    const maxDepth = this.config.maxDepth!;
    
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
        
        // Check depth by counting the nesting level
        const depth = this.getObjectDepth(value);
        if (depth > maxDepth) {
          return '[Max depth exceeded]';
        }
      }
      
      // Handle special types
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
      }
      
      if (typeof value === 'function') {
        return '[Function]';
      }
      
      if (typeof value === 'undefined') {
        return '[Undefined]';
      }
      
      if (typeof value === 'symbol') {
        return value.toString();
      }
      
      if (typeof value === 'bigint') {
        return value.toString();
      }
      
      return value;
    });
  }

  /**
   * Calculate the depth of an object
   */
  private getObjectDepth(obj: any, visited = new WeakSet()): number {
    if (obj === null || typeof obj !== 'object' || visited.has(obj)) {
      return 0;
    }
    
    visited.add(obj);
    let maxDepth = 0;
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const depth = this.getObjectDepth(obj[key], visited);
        maxDepth = Math.max(maxDepth, depth);
      }
    }
    
    visited.delete(obj);
    return maxDepth + 1;
  }

  /**
   * Fallback to console logging when structured logging fails
   */
  private fallbackToConsole(level: LogLevel, message: string, context?: string, data?: any, error?: Error): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    const levelStr = LOG_LEVEL_MAP[level].toUpperCase();
    
    const fallbackMessage = `${timestamp} ${contextStr} [${levelStr}] ${message}`;
    
    // Log the original message
    // switch (level) {
    //   case LogLevel.DEBUG:
    //     console.debug(fallbackMessage, data);
    //     break;
    //   case LogLevel.INFO:
    //     console.info(fallbackMessage, data);
    //     break;
    //   case LogLevel.WARN:
    //     console.warn(fallbackMessage, data);
    //     break;
    //   case LogLevel.ERROR:
    //     console.error(fallbackMessage, data);
    //     break;
    // }
    
    // Log the serialization error
    if (error) {
      console.error(`${timestamp} [LOGGER] [ERROR] JSON serialization failed:`, error.message);
    }
  }

  /**
   * Log in formatted console output
   */
  private logFormatted(level: LogLevel, message: string, ...args: any[]): void {
    const timestamp = this.config.enableTimestamp ? `[${new Date().toISOString()}]` : '';
    const context = this.config.context ? `[${this.config.context}]` : '';
    const levelStr = LOG_LEVEL_MAP[level].toUpperCase();
    
    let coloredLevel = levelStr;
    if (this.config.enableColors) {
      switch (level) {
        case LogLevel.DEBUG:
          coloredLevel = `${COLORS.gray}${levelStr}${COLORS.reset}`;
          break;
        case LogLevel.INFO:
          coloredLevel = `${COLORS.blue}${levelStr}${COLORS.reset}`;
          break;
        case LogLevel.WARN:
          coloredLevel = `${COLORS.yellow}${levelStr}${COLORS.reset}`;
          break;
        case LogLevel.ERROR:
          coloredLevel = `${COLORS.red}${levelStr}${COLORS.reset}`;
          break;
      }
    }

    const prefix = [timestamp, context, `[${coloredLevel}]`].filter(Boolean).join(' ');
    const fullMessage = prefix ? `${prefix} ${message}` : message;

    // Use appropriate console method based on level
    // switch (level) {
    //   case LogLevel.DEBUG:
    //     console.debug(fullMessage, ...args);
    //     break;
    //   case LogLevel.INFO:
    //     console.info(fullMessage, ...args);
    //     break;
    //   case LogLevel.WARN:
    //     console.warn(fullMessage, ...args);
    //     break;
    //   case LogLevel.ERROR:
    //     console.error(fullMessage, ...args);
    //     break;
    // }
  }
}

/**
 * Default logger instance
 */
export const logger = new ConfigurableLogger();

/**
 * Create a logger with specific configuration
 */
export function createLogger(config: Partial<LoggerConfig> = {}): Logger {
  return new ConfigurableLogger(config);
}

/**
 * Create a logger specifically for MCP servers that ensures all output goes to stderr
 */
export function createMCPLogger(config: Partial<LoggerConfig> = {}): Logger {
  return new ConfigurableLogger({
    ...config,
    outputStream: 'stderr',
    enableStructured: true,
    enableFallback: true
  });
}