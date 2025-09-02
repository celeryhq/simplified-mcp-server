# Design Document

## Overview

This design addresses the logging consistency issues in the Simplified MCP Server by standardizing all logging to use the structured logger and separating CLI output from application logs. The solution ensures that when structured logging is enabled, all output is valid JSON, while maintaining backward compatibility for CLI operations.

## Architecture

### Current State Analysis

The application currently has mixed logging approaches:
1. **Structured JSON logging** via `ConfigurableLogger` in `src/utils/logger.ts`
2. **Direct console calls** in `src/server.ts` and `src/cli.ts` 
3. **Mixed output streams** where logs and CLI output both use stderr

### Target Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CLI Output    │    │  Application     │    │  Structured     │
│   (stdout)      │    │  Logging         │    │  Logs (stderr)  │
│                 │    │  (ConfigLogger)  │    │                 │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • Help text     │    │ • Server events  │    │ • JSON format   │
│ • Version info  │    │ • Error handling │    │ • Timestamps    │
│ • Documentation │    │ • Status updates │    │ • Context data  │
│ • Tool output   │    │ • Debug info     │    │ • Error details │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Components and Interfaces

### 1. Enhanced Logger Configuration

**Interface Updates:**
```typescript
interface LoggerConfig {
  level: LogLevel;
  environment: 'development' | 'production' | 'test';
  enableColors: boolean;
  enableTimestamp: boolean;
  enableStructured: boolean;
  context?: string;
  fallbackToConsole?: boolean; // New: fallback behavior
  outputStream?: 'stderr' | 'stdout'; // New: output control
}
```

### 2. Server Logging Wrapper

**New Component: `ServerLogger`**
- Wraps the ConfigurableLogger with server-specific context
- Handles server lifecycle events (startup, shutdown, errors)
- Provides methods for different types of server messages

```typescript
class ServerLogger {
  private logger: Logger;
  
  constructor(logger: Logger);
  logStartup(message: string, metadata?: any): void;
  logShutdown(message: string, metadata?: any): void;
  logToolRegistration(toolCount: number, workflowCount: number): void;
  logError(error: Error, context?: string): void;
}
```

### 3. CLI Output Manager

**New Component: `CLIOutputManager`**
- Separates CLI output from application logging
- Handles help, version, and documentation output
- Ensures CLI output goes to stdout

```typescript
class CLIOutputManager {
  static outputHelp(): void;
  static outputVersion(): void;
  static outputDocumentation(content: string): void;
  static outputError(message: string): void; // Uses stderr for CLI errors
}
```

### 4. Safe JSON Serialization

**Enhanced JSON handling:**
- Circular reference detection and handling
- Safe serialization of error objects
- Truncation of large objects to prevent memory issues

## Data Models

### Log Entry Structure (Enhanced)

```typescript
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  data?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string | number;
  };
  metadata?: {
    pid?: number;
    hostname?: string;
    version?: string;
    environment?: string;
  };
}
```

### Server Event Types

```typescript
enum ServerEventType {
  STARTUP = 'server_startup',
  SHUTDOWN = 'server_shutdown',
  TOOL_REGISTRATION = 'tool_registration',
  WORKFLOW_DISCOVERY = 'workflow_discovery',
  ERROR = 'server_error'
}
```

## Error Handling

### 1. Logging Failure Recovery

**Fallback Strategy:**
1. Try structured logging first
2. If JSON serialization fails, use safe serialization
3. If structured logging completely fails, fallback to console
4. Never let logging errors crash the application

### 2. Circular Reference Handling

**Safe Serialization:**
```typescript
function safeStringify(obj: any, maxDepth = 10): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    return value;
  });
}
```

### 3. Error Context Preservation

**Enhanced Error Logging:**
- Preserve original error properties
- Add contextual information
- Include stack traces in development
- Sanitize sensitive data

## Testing Strategy

### 1. Unit Tests

**Logger Tests:**
- Test structured vs formatted output modes
- Test fallback behavior when JSON serialization fails
- Test circular reference handling
- Test log level filtering

**Server Logger Tests:**
- Test server event logging
- Test error context preservation
- Test metadata inclusion

**CLI Output Tests:**
- Test output stream separation
- Test help/version output format
- Test error output handling

### 2. Integration Tests

**End-to-End Logging:**
- Test complete server startup/shutdown cycle
- Test mixed CLI and server operations
- Test log parsing with external tools
- Test error scenarios

### 3. Performance Tests

**Logging Performance:**
- Test structured logging overhead
- Test large object serialization
- Test high-frequency logging scenarios
- Test memory usage with log retention

## Implementation Plan

### Phase 1: Core Logger Enhancements
1. Add safe JSON serialization
2. Enhance error handling in logger
3. Add fallback mechanisms
4. Update logger configuration options

### Phase 2: Server Logging Standardization
1. Create ServerLogger wrapper
2. Replace all console.error calls in server.ts
3. Add proper server event logging
4. Update error handling to use structured logging

### Phase 3: CLI Output Separation
1. Create CLIOutputManager
2. Update CLI help/version output to use stdout
3. Separate CLI errors from application logs
4. Update documentation generation output

### Phase 4: Testing and Validation
1. Add comprehensive unit tests
2. Add integration tests for log parsing
3. Test fallback scenarios
4. Validate JSON output with external parsers

## Migration Strategy

### Backward Compatibility
- Maintain existing logger interface
- Keep default behavior for development mode
- Provide configuration options for gradual migration

### Deployment Considerations
- Update production configurations to enable structured logging
- Update log aggregation tools to handle new format
- Provide migration guide for existing deployments

## Security Considerations

### Data Sanitization
- Remove sensitive information from logs (API keys, passwords)
- Truncate large payloads to prevent log injection
- Validate log data before serialization

### Log Integrity
- Ensure logs cannot be manipulated through user input
- Prevent log injection attacks
- Maintain audit trail for security events