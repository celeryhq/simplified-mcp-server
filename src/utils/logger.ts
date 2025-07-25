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

    console.log(JSON.stringify(entry));
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
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(fullMessage, ...args);
        break;
      case LogLevel.INFO:
        console.info(fullMessage, ...args);
        break;
      case LogLevel.WARN:
        console.warn(fullMessage, ...args);
        break;
      case LogLevel.ERROR:
        console.error(fullMessage, ...args);
        break;
    }
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