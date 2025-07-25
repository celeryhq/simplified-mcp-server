/**
 * Tool Registry for managing MCP tools
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolDefinition, ToolCallParams, APIClient } from '../types/index.js';
import { ErrorHandler, MCPErrorCodes } from '../utils/errors.js';
import { AppError, ErrorType } from '../types/index.js';

/**
 * Tool Registry class that manages tool definitions and validation
 */
export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private categories: Map<string, string[]> = new Map();

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
   * Unregister a tool from the registry
   */
  public unregisterTool(name: string): boolean {
    const tool = this.tools.get(name);
    if (!tool) {
      return false;
    }

    // Remove from tools map
    this.tools.delete(name);

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
      docs.push(`## ${category}\n`);
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

    return docs.join('\n');
  }

  /**
   * Generate documentation for a single tool
   */
  private generateToolDocumentation(tool: ToolDefinition): string {
    const docs: string[] = [];
    
    docs.push(`### ${tool.name}\n`);
    docs.push(`${tool.description}\n`);
    
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

    return docs.join('\n') + '\n';
  }

  /**
   * Clear all registered tools
   */
  public clear(): void {
    this.tools.clear();
    this.categories.clear();
  }
}