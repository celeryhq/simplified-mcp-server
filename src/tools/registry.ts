/**
 * Tool Registry for managing MCP tools
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolDefinition, ToolCallParams, APIClient, WorkflowDefinition, ServerConfig } from '../types/index.js';
import { AppError, ErrorType } from '../types/index.js';

/**
 * Tool Registry class that manages tool definitions and validation
 */
export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private categories: Map<string, string[]> = new Map();
  private workflowTools: Map<string, WorkflowDefinition> = new Map();
  private config?: ServerConfig;

  /**
   * Set server configuration for enhanced documentation
   */
  public setConfig(config: ServerConfig): void {
    this.config = config;
  }

  /**
   * Register a new tool with the registry
   */
  public registerTool(toolDef: ToolDefinition): void {
    // Validate tool definition
    this.validateToolDefinition(toolDef);

    // Register the tool
    this.tools.set(toolDef.name, toolDef);

    // Update category mapping
    if (toolDef.category) {
      const categoryTools = this.categories.get(toolDef.category) || [];
      if (!categoryTools.includes(toolDef.name)) {
        categoryTools.push(toolDef.name);
        this.categories.set(toolDef.category, categoryTools);
      }
    }
  }

  /**
   * Register a workflow tool with additional workflow metadata
   */
  public registerWorkflowTool(toolDef: ToolDefinition, workflowDef: WorkflowDefinition): void {
    // Register as regular tool first
    this.registerTool(toolDef);
    
    // Store workflow metadata
    this.workflowTools.set(toolDef.name, workflowDef);
  }

  /**
   * Unregister a tool from the registry
   */
  public unregisterTool(name: string): boolean {
    const tool = this.tools.get(name);
    if (!tool) {
      return false;
    }

    // Remove from tools map
    this.tools.delete(name);

    // Remove from workflow tools if it exists
    this.workflowTools.delete(name);

    // Remove from category mapping
    if (tool.category) {
      const categoryTools = this.categories.get(tool.category) || [];
      const index = categoryTools.indexOf(name);
      if (index > -1) {
        categoryTools.splice(index, 1);
        if (categoryTools.length === 0) {
          this.categories.delete(tool.category);
        } else {
          this.categories.set(tool.category, categoryTools);
        }
      }
    }

    return true;
  }

  /**
   * Get a tool by name
   */
  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tools in MCP format
   */
  public getAvailableTools(): Tool[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
  }

  /**
   * Get tools by category
   */
  public getToolsByCategory(category: string): ToolDefinition[] {
    const toolNames = this.categories.get(category) || [];
    return toolNames.map(name => this.tools.get(name)!).filter(Boolean);
  }

  /**
   * Get all categories
   */
  public getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  /**
   * Get tool count
   */
  public getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Get all tool names
   */
  public getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if a tool is a workflow tool
   */
  public isWorkflowTool(name: string): boolean {
    return this.workflowTools.has(name);
  }

  /**
   * Get workflow definition for a workflow tool
   */
  public getWorkflowDefinition(name: string): WorkflowDefinition | undefined {
    return this.workflowTools.get(name);
  }

  /**
   * Get all workflow tool names
   */
  public getWorkflowToolNames(): string[] {
    return Array.from(this.workflowTools.keys());
  }

  /**
   * Get count of workflow tools
   */
  public getWorkflowToolCount(): number {
    return this.workflowTools.size;
  }

  /**
   * Get count of static (non-workflow) tools
   */
  public getStaticToolCount(): number {
    return this.tools.size - this.workflowTools.size;
  }

  /**
   * Validate tool definition structure
   */
  private validateToolDefinition(toolDef: ToolDefinition): void {
    if (!toolDef.name || typeof toolDef.name !== 'string') {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Tool name is required and must be a string'
      );
    }

    if (!toolDef.description || typeof toolDef.description !== 'string') {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Tool description is required and must be a string'
      );
    }

    if (!toolDef.inputSchema || typeof toolDef.inputSchema !== 'object') {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Tool inputSchema is required and must be an object'
      );
    }

    if (toolDef.inputSchema.type !== 'object') {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Tool inputSchema type must be "object"'
      );
    }

    if (!toolDef.inputSchema.properties || typeof toolDef.inputSchema.properties !== 'object') {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Tool inputSchema must have properties object'
      );
    }

    if (!toolDef.handler || typeof toolDef.handler !== 'function') {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Tool handler is required and must be a function'
      );
    }

    // Check for duplicate tool names
    if (this.tools.has(toolDef.name)) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        `Tool with name '${toolDef.name}' is already registered`
      );
    }
  }

  /**
   * Validate tool call parameters against tool schema
   */
  public validateToolParameters(toolName: string, params: any): void {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        `Tool '${toolName}' not found`
      );
    }

    const schema = tool.inputSchema;

    // Validate required parameters
    if (schema.required && Array.isArray(schema.required)) {
      for (const requiredField of schema.required) {
        if (!(requiredField in params)) {
          throw new AppError(
            ErrorType.VALIDATION_ERROR,
            `Missing required parameter: ${requiredField}`
          );
        }
      }
    }

    // Validate parameter types and constraints
    if (schema.properties) {
      for (const [key, value] of Object.entries(params)) {
        const propSchema = schema.properties[key];
        if (propSchema) {
          this.validateParameterValue(key, value, propSchema);
        }
      }
    }
  }

  /**
   * Validate individual parameter value against its schema
   */
  private validateParameterValue(paramName: string, value: any, schema: any): void {
    if (schema.type) {
      const actualType = this.getValueType(value);
      const expectedType = schema.type;

      if (expectedType === 'string' && actualType !== 'string') {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be a string, got ${actualType}`
        );
      }

      if (expectedType === 'number' && actualType !== 'number') {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be a number, got ${actualType}`
        );
      }

      if (expectedType === 'integer' && (!Number.isInteger(value) || actualType !== 'number')) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be an integer, got ${actualType}`
        );
      }

      if (expectedType === 'boolean' && actualType !== 'boolean') {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be a boolean, got ${actualType}`
        );
      }

      if (expectedType === 'array' && !Array.isArray(value)) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be an array, got ${actualType}`
        );
      }

      if (expectedType === 'object' && (actualType !== 'object' || value === null || Array.isArray(value))) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be an object, got ${actualType}`
        );
      }
    }

    // Validate enum values
    if (schema.enum && Array.isArray(schema.enum)) {
      if (!schema.enum.includes(value)) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be one of: ${schema.enum.join(', ')}, got: ${value}`
        );
      }
    }

    // Validate string constraints
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength && value.length < schema.minLength) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be at least ${schema.minLength} characters long`
        );
      }

      if (schema.maxLength && value.length > schema.maxLength) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be at most ${schema.maxLength} characters long`
        );
      }

      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' does not match required pattern: ${schema.pattern}`
        );
      }
    }

    // Validate number constraints
    if ((schema.type === 'number' || schema.type === 'integer') && typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be at least ${schema.minimum}`
        );
      }

      if (schema.maximum !== undefined && value > schema.maximum) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must be at most ${schema.maximum}`
        );
      }
    }

    // Validate array constraints
    if (schema.type === 'array' && Array.isArray(value)) {
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must have at least ${schema.minItems} items`
        );
      }

      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Parameter '${paramName}' must have at most ${schema.maxItems} items`
        );
      }
    }
  }

  /**
   * Get the type of a value for validation
   */
  private getValueType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Execute a tool with the given parameters
   */
  public async executeTool(toolName: string, params: any, apiClient: APIClient | null): Promise<any> {
    // Validate parameters first
    this.validateToolParameters(toolName, params);

    const tool = this.tools.get(toolName)!; // We know it exists from validation

    try {
      // Execute the tool handler
      const result = await tool.handler(params, apiClient);
      return result;
    } catch (error) {
      // Wrap execution errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new AppError(
        ErrorType.TOOL_ERROR,
        `Error executing tool '${toolName}': ${errorMessage}`,
        { toolName, params, originalError: error }
      );
    }
  }

  /**
   * Generate documentation for all tools
   */
  public generateDocumentation(): string {
    const docs: string[] = [];
    docs.push('# Simplified MCP Server Tools Documentation\n');

    // Add overview section
    docs.push(this.generateOverviewSection());

    // Add workflow configuration section if workflows are enabled
    if (this.config?.workflowsEnabled && this.workflowTools.size > 0) {
      docs.push(this.generateWorkflowConfigurationSection());
    }

    // Group tools by category
    const categorizedTools = new Map<string, ToolDefinition[]>();
    const uncategorizedTools: ToolDefinition[] = [];

    for (const tool of this.tools.values()) {
      if (tool.category) {
        const categoryTools = categorizedTools.get(tool.category) || [];
        categoryTools.push(tool);
        categorizedTools.set(tool.category, categoryTools);
      } else {
        uncategorizedTools.push(tool);
      }
    }

    // Document categorized tools
    for (const [category, tools] of categorizedTools.entries()) {
      docs.push(`## ${this.formatCategoryName(category)}\n`);
      
      // Add category-specific information for workflow tools
      if (category === 'workflow' && this.workflowTools.size > 0) {
        docs.push(this.generateWorkflowCategoryIntro());
      }
      
      for (const tool of tools) {
        docs.push(this.generateToolDocumentation(tool));
      }
    }

    // Document uncategorized tools
    if (uncategorizedTools.length > 0) {
      docs.push('## General Tools\n');
      for (const tool of uncategorizedTools) {
        docs.push(this.generateToolDocumentation(tool));
      }
    }

    // Add workflow examples section if workflows exist
    if (this.workflowTools.size > 0) {
      docs.push(this.generateWorkflowExamplesSection());
    }

    return docs.join('\n');
  }

  /**
   * Generate documentation for a single tool
   */
  private generateToolDocumentation(tool: ToolDefinition): string {
    const docs: string[] = [];
    const isWorkflow = this.isWorkflowTool(tool.name);
    const workflowDef = isWorkflow ? this.getWorkflowDefinition(tool.name) : undefined;
    
    docs.push(`### ${tool.name}\n`);
    
    // Add workflow badge if it's a workflow tool
    if (isWorkflow) {
      docs.push(`*🔄 Dynamic Workflow Tool*\n`);
    }
    
    docs.push(`${tool.description}\n`);
    
    // Add workflow-specific metadata
    if (isWorkflow && workflowDef) {
      docs.push(`**Workflow ID:** \`${workflowDef.id}\`\n`);
      docs.push(`**Execution Type:** ${workflowDef.executionType || 'async'}\n`);
      
      if (workflowDef.metadata) {
        const metadataEntries = Object.entries(workflowDef.metadata);
        if (metadataEntries.length > 0) {
          docs.push('**Workflow Metadata:**\n');
          for (const [key, value] of metadataEntries) {
            docs.push(`- ${key}: ${JSON.stringify(value)}`);
          }
          docs.push('');
        }
      }
    }
    
    if (tool.version) {
      docs.push(`**Version:** ${tool.version}\n`);
    }

    // Document parameters
    if (tool.inputSchema.properties && Object.keys(tool.inputSchema.properties).length > 0) {
      docs.push('**Parameters:**\n');
      
      for (const [paramName, paramSchema] of Object.entries(tool.inputSchema.properties)) {
        const isRequired = tool.inputSchema.required?.includes(paramName) ? ' (required)' : ' (optional)';
        const paramType = (paramSchema as any).type || 'any';
        const paramDesc = (paramSchema as any).description || 'No description';
        
        docs.push(`- \`${paramName}\` (${paramType})${isRequired}: ${paramDesc}`);
        
        // Add enum values if present
        if ((paramSchema as any).enum) {
          docs.push(`  - Allowed values: ${(paramSchema as any).enum.join(', ')}`);
        }
        
        // Add constraints
        const constraints: string[] = [];
        if ((paramSchema as any).minLength) constraints.push(`min length: ${(paramSchema as any).minLength}`);
        if ((paramSchema as any).maxLength) constraints.push(`max length: ${(paramSchema as any).maxLength}`);
        if ((paramSchema as any).minimum) constraints.push(`minimum: ${(paramSchema as any).minimum}`);
        if ((paramSchema as any).maximum) constraints.push(`maximum: ${(paramSchema as any).maximum}`);
        if ((paramSchema as any).pattern) constraints.push(`pattern: ${(paramSchema as any).pattern}`);
        
        if (constraints.length > 0) {
          docs.push(`  - Constraints: ${constraints.join(', ')}`);
        }
      }
      docs.push('');
    } else {
      docs.push('**Parameters:** None\n');
    }

    // Add workflow-specific execution notes
    if (isWorkflow) {
      docs.push('**Execution Notes:**\n');
      docs.push('- This tool executes a workflow via the Simplified API');
      docs.push('- Execution is asynchronous and may take time to complete');
      docs.push('- Status updates are provided during execution');
      docs.push('- Results include execution timing and metadata\n');
    }

    return docs.join('\n') + '\n';
  }

  /**
   * Clear all registered tools
   */
  public clear(): void {
    this.tools.clear();
    this.categories.clear();
    this.workflowTools.clear();
  }

  /**
   * Generate overview section for documentation
   */
  private generateOverviewSection(): string {
    const docs: string[] = [];
    const totalTools = this.tools.size;
    const workflowTools = this.workflowTools.size;
    const staticTools = totalTools - workflowTools;

    docs.push('## Overview\n');
    docs.push(`This server provides ${totalTools} tools across ${this.categories.size} categories:\n`);
    docs.push(`- **Static Tools:** ${staticTools} (built-in functionality)`);
    
    if (workflowTools > 0) {
      docs.push(`- **Dynamic Workflow Tools:** ${workflowTools} (discovered from workflows)`);
    }
    
    docs.push('');

    if (this.config?.workflowsEnabled) {
      docs.push('**Dynamic Workflow Tools** are automatically discovered and registered based on available workflows.');
      docs.push('These tools provide access to workflow execution capabilities through the MCP protocol.\n');
    }

    return docs.join('\n');
  }

  /**
   * Generate workflow configuration section
   */
  private generateWorkflowConfigurationSection(): string {
    const docs: string[] = [];
    
    docs.push('## Workflow Configuration\n');
    docs.push('Dynamic workflow tools are configured through environment variables:\n');
    
    docs.push('### Required Configuration\n');
    docs.push('- `WORKFLOWS_ENABLED=true` - Enable dynamic workflow tool discovery\n');
    
    docs.push('### Optional Configuration\n');
    docs.push('- `WORKFLOW_DISCOVERY_INTERVAL` - Auto-refresh interval in milliseconds (default: 0, disabled)');
    docs.push('- `WORKFLOW_EXECUTION_TIMEOUT` - Execution timeout in milliseconds (default: 300000, 5 minutes)');
    docs.push('- `WORKFLOW_MAX_CONCURRENT_EXECUTIONS` - Maximum concurrent executions (default: 10)');
    docs.push('- `WORKFLOW_FILTER_PATTERNS` - Comma-separated patterns to filter workflows (default: none)');
    docs.push('- `WORKFLOW_STATUS_CHECK_INTERVAL` - Status polling interval in milliseconds (default: 5000)');
    docs.push('- `WORKFLOW_RETRY_ATTEMPTS` - Retry attempts for failed operations (default: 3)\n');

    if (this.config) {
      docs.push('### Current Configuration\n');
      docs.push(`- Workflows Enabled: ${this.config.workflowsEnabled}`);
      docs.push(`- Discovery Interval: ${this.config.workflowDiscoveryInterval}ms`);
      docs.push(`- Execution Timeout: ${this.config.workflowExecutionTimeout}ms`);
      docs.push(`- Max Concurrent Executions: ${this.config.workflowMaxConcurrentExecutions}`);
      docs.push(`- Status Check Interval: ${this.config.workflowStatusCheckInterval}ms`);
      docs.push(`- Retry Attempts: ${this.config.workflowRetryAttempts}`);
      
      if (this.config.workflowFilterPatterns.length > 0) {
        docs.push(`- Filter Patterns: ${this.config.workflowFilterPatterns.join(', ')}`);
      }
      docs.push('');
    }

    return docs.join('\n');
  }

  /**
   * Generate workflow category introduction
   */
  private generateWorkflowCategoryIntro(): string {
    const docs: string[] = [];
    
    docs.push('These tools are dynamically generated from available workflows. Each workflow tool:');
    docs.push('- Executes asynchronously via the Simplified API');
    docs.push('- Provides real-time status updates during execution');
    docs.push('- Returns structured results with execution metadata');
    docs.push('- Handles parameter validation based on workflow schemas\n');
    
    return docs.join('\n');
  }

  /**
   * Generate workflow examples section
   */
  private generateWorkflowExamplesSection(): string {
    const docs: string[] = [];
    
    docs.push('## Workflow Tool Usage Examples\n');
    
    // Get a few example workflow tools
    const workflowToolNames = Array.from(this.workflowTools.keys()).slice(0, 3);
    
    for (const toolName of workflowToolNames) {
      const tool = this.tools.get(toolName);
      const workflow = this.workflowTools.get(toolName);
      
      if (tool && workflow) {
        docs.push(`### Example: ${tool.name}\n`);
        docs.push('```json');
        docs.push('{');
        docs.push(`  "method": "tools/call",`);
        docs.push(`  "params": {`);
        docs.push(`    "name": "${tool.name}",`);
        docs.push(`    "arguments": {`);
        
        // Generate example parameters
        const exampleParams = this.generateExampleParameters(tool.inputSchema);
        const paramEntries = Object.entries(exampleParams);
        
        paramEntries.forEach(([key, value], index) => {
          const comma = index < paramEntries.length - 1 ? ',' : '';
          docs.push(`      "${key}": ${JSON.stringify(value)}${comma}`);
        });
        
        docs.push(`    }`);
        docs.push(`  }`);
        docs.push('}');
        docs.push('```\n');
        
        docs.push('**Expected Response:**');
        docs.push('```json');
        docs.push('{');
        docs.push('  "content": [');
        docs.push('    {');
        docs.push('      "type": "text",');
        docs.push('      "text": "Workflow execution completed successfully\\n\\nExecution Details:\\n- Workflow ID: ' + workflow.id + '\\n- Status: COMPLETED\\n- Duration: 2.5s\\n\\nResults:\\n[workflow output data]"');
        docs.push('    }');
        docs.push('  ]');
        docs.push('}');
        docs.push('```\n');
      }
    }

    docs.push('### Status Checking\n');
    docs.push('Use the `workflow-status-check` tool to monitor running workflows:');
    docs.push('```json');
    docs.push('{');
    docs.push('  "method": "tools/call",');
    docs.push('  "params": {');
    docs.push('    "name": "workflow-status-check",');
    docs.push('    "arguments": {');
    docs.push('      "workflowId": "2724",');
    docs.push('      "workflowInstanceId": "8f496b6a-c905-41bb-b7b7-200a8982ab30"');
    docs.push('    }');
    docs.push('  }');
    docs.push('}');
    docs.push('```\n');

    return docs.join('\n');
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    return category
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') + ' Tools';
  }

  /**
   * Generate example parameters for a tool schema
   */
  private generateExampleParameters(inputSchema: any): Record<string, any> {
    const examples: Record<string, any> = {};
    
    if (inputSchema.properties) {
      for (const [paramName, paramSchema] of Object.entries(inputSchema.properties)) {
        const schema = paramSchema as any;
        
        if (schema.example !== undefined) {
          examples[paramName] = schema.example;
        } else if (schema.enum && schema.enum.length > 0) {
          examples[paramName] = schema.enum[0];
        } else {
          switch (schema.type) {
            case 'string':
              examples[paramName] = schema.pattern ? 'example-value' : `example-${paramName}`;
              break;
            case 'number':
            case 'integer':
              examples[paramName] = schema.minimum || 1;
              break;
            case 'boolean':
              examples[paramName] = true;
              break;
            case 'array':
              examples[paramName] = ['example-item'];
              break;
            case 'object':
              examples[paramName] = { key: 'value' };
              break;
            default:
              examples[paramName] = 'example-value';
          }
        }
      }
    }
    
    return examples;
  }
}