/**
 * Tool definition utilities and builders
 */

import type { ToolDefinition } from '../types/index.js';

/**
 * JSON Schema property definition
 */
export interface SchemaProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: any[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  pattern?: string;
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
}

/**
 * Tool definition builder for creating well-structured tool definitions
 */
export class ToolDefinitionBuilder {
  private definition: Partial<ToolDefinition> = {
    inputSchema: {
      type: 'object',
      properties: {}
    }
  };

  /**
   * Set the tool name
   */
  name(name: string): ToolDefinitionBuilder {
    this.definition.name = name;
    return this;
  }

  /**
   * Set the tool description
   */
  description(description: string): ToolDefinitionBuilder {
    this.definition.description = description;
    return this;
  }

  /**
   * Set the tool category
   */
  category(category: string): ToolDefinitionBuilder {
    this.definition.category = category;
    return this;
  }

  /**
   * Set the tool version
   */
  version(version: string): ToolDefinitionBuilder {
    this.definition.version = version;
    return this;
  }

  /**
   * Add a parameter to the tool
   */
  parameter(name: string, property: SchemaProperty, required: boolean = false): ToolDefinitionBuilder {
    if (!this.definition.inputSchema!.properties) {
      this.definition.inputSchema!.properties = {};
    }
    
    this.definition.inputSchema!.properties[name] = property;
    
    if (required) {
      if (!this.definition.inputSchema!.required) {
        this.definition.inputSchema!.required = [];
      }
      this.definition.inputSchema!.required.push(name);
    }
    
    return this;
  }

  /**
   * Add a required string parameter
   */
  requiredString(name: string, description: string, options?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: string[];
  }): ToolDefinitionBuilder {
    return this.parameter(name, {
      type: 'string',
      description,
      ...options
    }, true);
  }

  /**
   * Add an optional string parameter
   */
  optionalString(name: string, description: string, options?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: string[];
  }): ToolDefinitionBuilder {
    return this.parameter(name, {
      type: 'string',
      description,
      ...options
    }, false);
  }

  /**
   * Add a required number parameter
   */
  requiredNumber(name: string, description: string, options?: {
    minimum?: number;
    maximum?: number;
  }): ToolDefinitionBuilder {
    return this.parameter(name, {
      type: 'number',
      description,
      ...options
    }, true);
  }

  /**
   * Add an optional number parameter
   */
  optionalNumber(name: string, description: string, options?: {
    minimum?: number;
    maximum?: number;
  }): ToolDefinitionBuilder {
    return this.parameter(name, {
      type: 'number',
      description,
      ...options
    }, false);
  }

  /**
   * Add a required integer parameter
   */
  requiredInteger(name: string, description: string, options?: {
    minimum?: number;
    maximum?: number;
  }): ToolDefinitionBuilder {
    return this.parameter(name, {
      type: 'integer',
      description,
      ...options
    }, true);
  }

  /**
   * Add an optional integer parameter
   */
  optionalInteger(name: string, description: string, options?: {
    minimum?: number;
    maximum?: number;
  }): ToolDefinitionBuilder {
    return this.parameter(name, {
      type: 'integer',
      description,
      ...options
    }, false);
  }

  /**
   * Add a required boolean parameter
   */
  requiredBoolean(name: string, description: string): ToolDefinitionBuilder {
    return this.parameter(name, {
      type: 'boolean',
      description
    }, true);
  }

  /**
   * Add an optional boolean parameter
   */
  optionalBoolean(name: string, description: string): ToolDefinitionBuilder {
    return this.parameter(name, {
      type: 'boolean',
      description
    }, false);
  }

  /**
   * Add a required array parameter
   */
  requiredArray(name: string, description: string, itemType: SchemaProperty, options?: {
    minItems?: number;
    maxItems?: number;
  }): ToolDefinitionBuilder {
    return this.parameter(name, {
      type: 'array',
      description,
      items: itemType,
      ...options
    }, true);
  }

  /**
   * Add an optional array parameter
   */
  optionalArray(name: string, description: string, itemType: SchemaProperty, options?: {
    minItems?: number;
    maxItems?: number;
  }): ToolDefinitionBuilder {
    return this.parameter(name, {
      type: 'array',
      description,
      items: itemType,
      ...options
    }, false);
  }

  /**
   * Add a required object parameter
   */
  requiredObject(name: string, description: string, properties: Record<string, SchemaProperty>, required?: string[]): ToolDefinitionBuilder {
    return this.parameter(name, {
      type: 'object',
      description,
      properties,
      ...(required && { required })
    }, true);
  }

  /**
   * Add an optional object parameter
   */
  optionalObject(name: string, description: string, properties: Record<string, SchemaProperty>, required?: string[]): ToolDefinitionBuilder {
    return this.parameter(name, {
      type: 'object',
      description,
      properties,
      ...(required && { required })
    }, false);
  }

  /**
   * Set the tool handler function
   */
  handler(handler: ToolDefinition['handler']): ToolDefinitionBuilder {
    this.definition.handler = handler;
    return this;
  }

  /**
   * Build the final tool definition
   */
  build(): ToolDefinition {
    if (!this.definition.name) {
      throw new Error('Tool name is required');
    }
    if (!this.definition.description) {
      throw new Error('Tool description is required');
    }
    if (!this.definition.handler) {
      throw new Error('Tool handler is required');
    }

    return this.definition as ToolDefinition;
  }
}

/**
 * Create a new tool definition builder
 */
export function createTool(): ToolDefinitionBuilder {
  return new ToolDefinitionBuilder();
}

/**
 * Common schema property definitions for reuse
 */
export const CommonSchemas = {
  /**
   * A URL string parameter
   */
  url: (description: string, required: boolean = false): SchemaProperty => ({
    type: 'string',
    description,
    pattern: '^https?://.+',
    maxLength: 2048
  }),

  /**
   * An email string parameter
   */
  email: (description: string): SchemaProperty => ({
    type: 'string',
    description,
    pattern: '^[^@]+@[^@]+\\.[^@]+$',
    maxLength: 254
  }),

  /**
   * A UUID string parameter
   */
  uuid: (description: string): SchemaProperty => ({
    type: 'string',
    description,
    pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  }),

  /**
   * A date string parameter (ISO 8601)
   */
  date: (description: string): SchemaProperty => ({
    type: 'string',
    description,
    pattern: '^\\d{4}-\\d{2}-\\d{2}$'
  }),

  /**
   * A datetime string parameter (ISO 8601)
   */
  datetime: (description: string): SchemaProperty => ({
    type: 'string',
    description,
    pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z?$'
  }),

  /**
   * A positive integer parameter
   */
  positiveInteger: (description: string): SchemaProperty => ({
    type: 'integer',
    description,
    minimum: 1
  }),

  /**
   * A non-negative integer parameter
   */
  nonNegativeInteger: (description: string): SchemaProperty => ({
    type: 'integer',
    description,
    minimum: 0
  }),

  /**
   * A percentage number parameter (0-100)
   */
  percentage: (description: string): SchemaProperty => ({
    type: 'number',
    description,
    minimum: 0,
    maximum: 100
  }),

  /**
   * A file path string parameter
   */
  filePath: (description: string): SchemaProperty => ({
    type: 'string',
    description,
    maxLength: 4096
  }),

  /**
   * A JSON string parameter
   */
  json: (description: string): SchemaProperty => ({
    type: 'string',
    description
  }),

  /**
   * An HTTP method enum parameter
   */
  httpMethod: (description: string): SchemaProperty => ({
    type: 'string',
    description,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
  }),

  /**
   * A content type string parameter
   */
  contentType: (description: string): SchemaProperty => ({
    type: 'string',
    description,
    pattern: '^[a-zA-Z0-9][a-zA-Z0-9!#$&\\-\\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\\-\\^_]*$'
  })
};

/**
 * Validation utilities for tool definitions
 */
export class ToolDefinitionValidator {
  /**
   * Validate a tool definition structure
   */
  static validate(definition: ToolDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate basic structure
    if (!definition.name || typeof definition.name !== 'string') {
      errors.push('Tool name is required and must be a string');
    }

    if (!definition.description || typeof definition.description !== 'string') {
      errors.push('Tool description is required and must be a string');
    }

    if (!definition.handler || typeof definition.handler !== 'function') {
      errors.push('Tool handler is required and must be a function');
    }

    // Validate input schema
    if (!definition.inputSchema || typeof definition.inputSchema !== 'object') {
      errors.push('Tool inputSchema is required and must be an object');
    } else {
      const schemaErrors = this.validateSchema(definition.inputSchema);
      errors.push(...schemaErrors);
    }

    // Validate optional fields
    if (definition.category && typeof definition.category !== 'string') {
      errors.push('Tool category must be a string');
    }

    if (definition.version && typeof definition.version !== 'string') {
      errors.push('Tool version must be a string');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a JSON schema structure
   */
  private static validateSchema(schema: any, path: string = 'inputSchema'): string[] {
    const errors: string[] = [];

    if (schema.type !== 'object') {
      errors.push(`${path}.type must be 'object'`);
      return errors;
    }

    if (!schema.properties || typeof schema.properties !== 'object') {
      errors.push(`${path}.properties is required and must be an object`);
      return errors;
    }

    // Validate each property
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const propPath = `${path}.properties.${propName}`;
      const propErrors = this.validateProperty(propSchema as any, propPath);
      errors.push(...propErrors);
    }

    // Validate required array
    if (schema.required && !Array.isArray(schema.required)) {
      errors.push(`${path}.required must be an array`);
    } else if (schema.required) {
      for (const requiredField of schema.required) {
        if (typeof requiredField !== 'string') {
          errors.push(`${path}.required must contain only strings`);
        } else if (!schema.properties[requiredField]) {
          errors.push(`${path}.required references non-existent property: ${requiredField}`);
        }
      }
    }

    return errors;
  }

  /**
   * Validate a schema property
   */
  private static validateProperty(property: any, path: string): string[] {
    const errors: string[] = [];

    if (!property.type) {
      errors.push(`${path}.type is required`);
      return errors;
    }

    const validTypes = ['string', 'number', 'integer', 'boolean', 'array', 'object'];
    if (!validTypes.includes(property.type)) {
      errors.push(`${path}.type must be one of: ${validTypes.join(', ')}`);
    }

    // Type-specific validations
    if (property.type === 'string') {
      if (property.minLength !== undefined && (typeof property.minLength !== 'number' || property.minLength < 0)) {
        errors.push(`${path}.minLength must be a non-negative number`);
      }
      if (property.maxLength !== undefined && (typeof property.maxLength !== 'number' || property.maxLength < 0)) {
        errors.push(`${path}.maxLength must be a non-negative number`);
      }
      if (property.pattern !== undefined && typeof property.pattern !== 'string') {
        errors.push(`${path}.pattern must be a string`);
      }
    }

    if (property.type === 'number' || property.type === 'integer') {
      if (property.minimum !== undefined && typeof property.minimum !== 'number') {
        errors.push(`${path}.minimum must be a number`);
      }
      if (property.maximum !== undefined && typeof property.maximum !== 'number') {
        errors.push(`${path}.maximum must be a number`);
      }
    }

    if (property.type === 'array') {
      if (property.minItems !== undefined && (typeof property.minItems !== 'number' || property.minItems < 0)) {
        errors.push(`${path}.minItems must be a non-negative number`);
      }
      if (property.maxItems !== undefined && (typeof property.maxItems !== 'number' || property.maxItems < 0)) {
        errors.push(`${path}.maxItems must be a non-negative number`);
      }
      if (property.items) {
        const itemErrors = this.validateProperty(property.items, `${path}.items`);
        errors.push(...itemErrors);
      }
    }

    if (property.type === 'object') {
      if (property.properties) {
        for (const [subPropName, subPropSchema] of Object.entries(property.properties)) {
          const subPropPath = `${path}.properties.${subPropName}`;
          const subPropErrors = this.validateProperty(subPropSchema as any, subPropPath);
          errors.push(...subPropErrors);
        }
      }
    }

    // Validate enum
    if (property.enum !== undefined && !Array.isArray(property.enum)) {
      errors.push(`${path}.enum must be an array`);
    }

    return errors;
  }
}

/**
 * Tool definition examples and templates
 */
export const ToolTemplates = {
  /**
   * Create a simple API call tool template
   */
  apiCall: (name: string, description: string, endpoint: string, method: string = 'GET') => 
    createTool()
      .name(name)
      .description(description)
      .category('api')
      .version('1.0.0')
      .requiredString('endpoint', 'API endpoint to call', { maxLength: 1000 })
      .optionalString('method', 'HTTP method', { enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] })
      .optionalObject('data', 'Request payload', {})
      .optionalObject('headers', 'Additional headers', {})
      .handler(async (params, apiClient) => {
        if (!apiClient) {
          throw new Error('API client not available');
        }
        
        const result = await apiClient.makeRequest(
          params.endpoint || endpoint,
          params.method || method,
          params.data
        );
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }),

  /**
   * Create a data processing tool template
   */
  dataProcessor: (name: string, description: string) =>
    createTool()
      .name(name)
      .description(description)
      .category('data')
      .version('1.0.0')
      .requiredString('input', 'Input data to process', { maxLength: 10000 })
      .optionalString('format', 'Output format', { enum: ['json', 'csv', 'xml', 'text'] })
      .handler(async (params) => {
        // Template implementation - to be customized
        const processed = params.input;
        
        return {
          content: [
            {
              type: 'text',
              text: processed
            }
          ]
        };
      }),

  /**
   * Create a utility tool template
   */
  utility: (name: string, description: string) =>
    createTool()
      .name(name)
      .description(description)
      .category('utility')
      .version('1.0.0')
      .handler(async (params) => {
        // Template implementation - to be customized
        return {
          content: [
            {
              type: 'text',
              text: 'Utility tool executed successfully'
            }
          ]
        };
      })
};