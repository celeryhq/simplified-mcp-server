# Design Document

## Overview

The TypeScript build is failing due to strict type checking with `exactOptionalPropertyTypes: true` and missing interface methods. The design addresses these issues systematically by updating type definitions, implementing missing methods, and ensuring proper handling of optional properties.

## Architecture

The fix strategy follows a layered approach:

1. **Type Definition Layer**: Update interfaces to properly handle optional properties with undefined values
2. **Service Implementation Layer**: Implement missing interface methods and fix type assignments
3. **Export Resolution Layer**: Resolve duplicate exports and naming conflicts
4. **Timer Management Layer**: Fix timer type assignments for cleanup operations

## Components and Interfaces

### 1. Type Definition Updates

**WorkflowDefinition Interface**
- Update `metadata` property to explicitly allow undefined: `metadata?: Record<string, any> | undefined`
- Ensure all optional properties can handle undefined values

**WorkflowExecutionResult Interface**
- Update `error` property to explicitly allow undefined: `error?: string | undefined`
- Update `correlationId` and related optional properties

**WorkflowStatus Interface**
- Update `error` property to explicitly allow undefined: `error?: string | undefined`

**WorkflowExecutionMetrics Interface**
- Update `correlationId` property to explicitly allow undefined: `correlationId?: string | undefined`

**Logger Interface**
- Add optional `child` method: `child?: (name: string) => Logger`

### 2. Service Interface Extensions

**IWorkflowDiscoveryService Interface**
- Add missing methods:
  - `clearCache(): void`
  - `getCacheStats(): { size: number; lastUpdate: number; hitRate: number }`

**IWorkflowToolGenerator Interface**
- Add missing methods:
  - `clearGeneratedNames(): void`
  - `getGenerationStats(): { totalGenerated: number; cacheHits: number; errors: number }`

### 3. Timer Type Handling

**Timer Properties**
- Update timer property types to allow undefined assignment
- Use `NodeJS.Timeout | undefined` for timer properties
- Ensure cleanup operations can set timers to undefined

### 4. Export Resolution

**workflow-status-tool.ts**
- Remove duplicate export declarations
- Consolidate to single export statement

## Data Models

### Updated Type Definitions

```typescript
// Updated interfaces with proper optional property handling
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  category?: string;
  version?: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  executionType?: 'sync' | 'async';
  metadata?: Record<string, any> | undefined; // Explicitly allow undefined
}

export interface WorkflowExecutionResult {
  success: boolean;
  correlationId: string;
  workflowInstanceId: string;
  originalWorkflowId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string | undefined; // Explicitly allow undefined
  // ... other properties
}

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  child?: (name: string) => Logger; // Optional child method
}
```

### Service Interface Extensions

```typescript
export interface IWorkflowDiscoveryService {
  // Existing methods...
  listWorkflows(): Promise<WorkflowDefinition[]>;
  validateWorkflow(workflow: any): WorkflowDefinition | null;
  isWorkflowsListToolAvailable(): Promise<boolean>;
  testConnection(): Promise<boolean>;
  
  // New required methods
  clearCache(): void;
  getCacheStats(): { size: number; lastUpdate: number; hitRate: number };
}

export interface IWorkflowToolGenerator {
  // Existing methods...
  generateToolFromWorkflow(workflow: WorkflowDefinition): ToolDefinition;
  
  // New required methods
  clearGeneratedNames(): void;
  getGenerationStats(): { totalGenerated: number; cacheHits: number; errors: number };
}
```

## Error Handling

### Type Assignment Errors
- Use explicit type assertions where necessary
- Ensure all optional properties are properly typed with undefined
- Handle cases where properties might be undefined in assignments

### Interface Compatibility
- Implement missing methods with appropriate default behavior
- Ensure all interface contracts are fulfilled
- Add proper error handling for new methods

### Timer Cleanup
- Use proper type definitions for timer properties
- Ensure cleanup operations can safely set timers to undefined
- Handle timer lifecycle properly

## Testing Strategy

### Type Checking Tests
1. Verify all type assignments compile without errors
2. Test optional property handling with undefined values
3. Validate interface implementations are complete

### Service Method Tests
1. Test new interface methods return expected values
2. Verify cache operations work correctly
3. Test generation statistics tracking

### Integration Tests
1. Verify build process completes successfully
2. Test that all services work together after fixes
3. Validate no runtime errors from type changes

### Regression Tests
1. Ensure existing functionality remains intact
2. Test that performance is not impacted
3. Verify error handling still works correctly