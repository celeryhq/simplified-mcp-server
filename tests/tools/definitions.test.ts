/**
 * Tests for Tool Definition utilities
 */

import { 
  ToolDefinitionBuilder, 
  createTool, 
  CommonSchemas, 
  ToolDefinitionValidator,
  ToolTemplates
} from '../../src/tools/definitions.js';
import type { ToolDefinition } from '../../src/types/index.js';

describe('ToolDefinitionBuilder', () => {
  let builder: ToolDefinitionBuilder;

  beforeEach(() => {
    builder = new ToolDefinitionBuilder();
  });

  describe('Basic Tool Creation', () => {
    it('should create a simple tool', () => {
      const tool = builder
        .name('test-tool')
        .description('A test tool')
        .handler(async () => ({ content: [{ type: 'text', text: 'test' }] }))
        .build();

      expect(tool.name).toBe('test-tool');
      expect(tool.description).toBe('A test tool');
      expect(typeof tool.handler).toBe('function');
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toEqual({});
    });

    it('should create a tool with category and version', () => {
      const tool = builder
        .name('categorized-tool')
        .description('A categorized tool')
        .category('test')
        .version('1.0.0')
        .handler(async () => ({ content: [{ type: 'text', text: 'test' }] }))
        .build();

      expect(tool.category).toBe('test');
      expect(tool.version).toBe('1.0.0');
    });

    it('should throw error for missing name', () => {
      expect(() => {
        builder
          .description('A test tool')
          .handler(async () => ({ content: [{ type: 'text', text: 'test' }] }))
          .build();
      }).toThrow('Tool name is required');
    });

    it('should throw error for missing description', () => {
      expect(() => {
        builder
          .name('test-tool')
          .handler(async () => ({ content: [{ type: 'text', text: 'test' }] }))
          .build();
      }).toThrow('Tool description is required');
    });

    it('should throw error for missing handler', () => {
      expect(() => {
        builder
          .name('test-tool')
          .description('A test tool')
          .build();
      }).toThrow('Tool handler is required');
    });
  });

  describe('Parameter Addition', () => {
    beforeEach(() => {
      builder
        .name('param-tool')
        .description('A tool with parameters')
        .handler(async () => ({ content: [{ type: 'text', text: 'test' }] }));
    });

    it('should add required string parameter', () => {
      const tool = builder
        .requiredString('name', 'User name', { minLength: 1, maxLength: 50 })
        .build();

      expect(tool.inputSchema.properties!.name).toEqual({
        type: 'string',
        description: 'User name',
        minLength: 1,
        maxLength: 50
      });
      expect(tool.inputSchema.required).toContain('name');
    });

    it('should add optional string parameter', () => {
      const tool = builder
        .optionalString('email', 'User email', { pattern: '^[^@]+@[^@]+\\.[^@]+$' })
        .build();

      expect(tool.inputSchema.properties!.email).toEqual({
        type: 'string',
        description: 'User email',
        pattern: '^[^@]+@[^@]+\\.[^@]+$'
      });
      expect(tool.inputSchema.required).toBeUndefined();
    });

    it('should add required number parameter', () => {
      const tool = builder
        .requiredNumber('age', 'User age', { minimum: 0, maximum: 150 })
        .build();

      expect(tool.inputSchema.properties!.age).toEqual({
        type: 'number',
        description: 'User age',
        minimum: 0,
        maximum: 150
      });
      expect(tool.inputSchema.required).toContain('age');
    });

    it('should add optional integer parameter', () => {
      const tool = builder
        .optionalInteger('count', 'Item count', { minimum: 0 })
        .build();

      expect(tool.inputSchema.properties!.count).toEqual({
        type: 'integer',
        description: 'Item count',
        minimum: 0
      });
      expect(tool.inputSchema.required).toBeUndefined();
    });

    it('should add boolean parameter', () => {
      const tool = builder
        .requiredBoolean('active', 'Is active')
        .build();

      expect(tool.inputSchema.properties!.active).toEqual({
        type: 'boolean',
        description: 'Is active'
      });
      expect(tool.inputSchema.required).toContain('active');
    });

    it('should add array parameter', () => {
      const tool = builder
        .requiredArray('tags', 'Tag list', { type: 'string' }, { minItems: 1, maxItems: 10 })
        .build();

      expect(tool.inputSchema.properties!.tags).toEqual({
        type: 'array',
        description: 'Tag list',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 10
      });
      expect(tool.inputSchema.required).toContain('tags');
    });

    it('should add object parameter', () => {
      const tool = builder
        .requiredObject('metadata', 'Metadata object', {
          key: { type: 'string' },
          value: { type: 'string' }
        }, ['key'])
        .build();

      expect(tool.inputSchema.properties!.metadata).toEqual({
        type: 'object',
        description: 'Metadata object',
        properties: {
          key: { type: 'string' },
          value: { type: 'string' }
        },
        required: ['key']
      });
      expect(tool.inputSchema.required).toContain('metadata');
    });

    it('should add multiple parameters with mixed requirements', () => {
      const tool = builder
        .requiredString('name', 'User name')
        .optionalString('email', 'User email')
        .requiredNumber('age', 'User age')
        .optionalBoolean('active', 'Is active')
        .build();

      expect(Object.keys(tool.inputSchema.properties!)).toHaveLength(4);
      expect(tool.inputSchema.required).toEqual(['name', 'age']);
    });
  });

  describe('Fluent Interface', () => {
    it('should support method chaining', () => {
      const tool = builder
        .name('chained-tool')
        .description('A tool created with method chaining')
        .category('test')
        .version('1.0.0')
        .requiredString('param1', 'First parameter')
        .optionalNumber('param2', 'Second parameter')
        .handler(async () => ({ content: [{ type: 'text', text: 'test' }] }))
        .build();

      expect(tool.name).toBe('chained-tool');
      expect(tool.category).toBe('test');
      expect(tool.version).toBe('1.0.0');
      expect(Object.keys(tool.inputSchema.properties!)).toHaveLength(2);
    });
  });
});

describe('createTool helper', () => {
  it('should create a new ToolDefinitionBuilder instance', () => {
    const builder = createTool();
    expect(builder).toBeInstanceOf(ToolDefinitionBuilder);
  });

  it('should create different instances', () => {
    const builder1 = createTool();
    const builder2 = createTool();
    expect(builder1).not.toBe(builder2);
  });
});

describe('CommonSchemas', () => {
  it('should provide URL schema', () => {
    const schema = CommonSchemas.url('Website URL');
    expect(schema).toEqual({
      type: 'string',
      description: 'Website URL',
      pattern: '^https?://.+',
      maxLength: 2048
    });
  });

  it('should provide email schema', () => {
    const schema = CommonSchemas.email('Email address');
    expect(schema).toEqual({
      type: 'string',
      description: 'Email address',
      pattern: '^[^@]+@[^@]+\\.[^@]+$',
      maxLength: 254
    });
  });

  it('should provide UUID schema', () => {
    const schema = CommonSchemas.uuid('Unique identifier');
    expect(schema).toEqual({
      type: 'string',
      description: 'Unique identifier',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    });
  });

  it('should provide date schema', () => {
    const schema = CommonSchemas.date('Date value');
    expect(schema).toEqual({
      type: 'string',
      description: 'Date value',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$'
    });
  });

  it('should provide datetime schema', () => {
    const schema = CommonSchemas.datetime('DateTime value');
    expect(schema).toEqual({
      type: 'string',
      description: 'DateTime value',
      pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z?$'
    });
  });

  it('should provide positive integer schema', () => {
    const schema = CommonSchemas.positiveInteger('Count');
    expect(schema).toEqual({
      type: 'integer',
      description: 'Count',
      minimum: 1
    });
  });

  it('should provide HTTP method schema', () => {
    const schema = CommonSchemas.httpMethod('HTTP method');
    expect(schema).toEqual({
      type: 'string',
      description: 'HTTP method',
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
    });
  });
});

describe('ToolDefinitionValidator', () => {
  describe('Valid Tool Definitions', () => {
    it('should validate a correct tool definition', () => {
      const tool: ToolDefinition = {
        name: 'valid-tool',
        description: 'A valid tool',
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string', description: 'First parameter' }
          },
          required: ['param1']
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };

      const result = ToolDefinitionValidator.validate(tool);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a tool with optional fields', () => {
      const tool: ToolDefinition = {
        name: 'complete-tool',
        description: 'A complete tool',
        category: 'test',
        version: '1.0.0',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };

      const result = ToolDefinitionValidator.validate(tool);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Invalid Tool Definitions', () => {
    it('should reject tool without name', () => {
      const tool = {
        description: 'A tool without name',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      } as ToolDefinition;

      const result = ToolDefinitionValidator.validate(tool);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tool name is required and must be a string');
    });

    it('should reject tool without description', () => {
      const tool = {
        name: 'no-description-tool',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      } as ToolDefinition;

      const result = ToolDefinitionValidator.validate(tool);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tool description is required and must be a string');
    });

    it('should reject tool without handler', () => {
      const tool = {
        name: 'no-handler-tool',
        description: 'A tool without handler',
        inputSchema: { type: 'object', properties: {} }
      } as ToolDefinition;

      const result = ToolDefinitionValidator.validate(tool);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tool handler is required and must be a function');
    });

    it('should reject tool with invalid input schema type', () => {
      const tool = {
        name: 'invalid-schema-tool',
        description: 'A tool with invalid schema',
        inputSchema: { type: 'string', properties: {} },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      } as ToolDefinition;

      const result = ToolDefinitionValidator.validate(tool);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('inputSchema.type must be \'object\'');
    });

    it('should reject tool with invalid property types', () => {
      const tool = {
        name: 'invalid-prop-tool',
        description: 'A tool with invalid property',
        inputSchema: {
          type: 'object',
          properties: {
            invalidProp: { type: 'invalid-type' }
          }
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      } as ToolDefinition;

      const result = ToolDefinitionValidator.validate(tool);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('inputSchema.properties.invalidProp.type must be one of: string, number, integer, boolean, array, object');
    });

    it('should reject tool with invalid required field reference', () => {
      const tool = {
        name: 'invalid-required-tool',
        description: 'A tool with invalid required field',
        inputSchema: {
          type: 'object',
          properties: {
            existingProp: { type: 'string' }
          },
          required: ['nonExistentProp']
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      } as ToolDefinition;

      const result = ToolDefinitionValidator.validate(tool);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('inputSchema.required references non-existent property: nonExistentProp');
    });
  });
});

describe('ToolTemplates', () => {
  describe('API Call Template', () => {
    it('should create API call tool template', () => {
      const toolBuilder = ToolTemplates.apiCall('test-api', 'Test API call', '/test', 'GET');
      const tool = toolBuilder.build();

      expect(tool.name).toBe('test-api');
      expect(tool.description).toBe('Test API call');
      expect(tool.category).toBe('api');
      expect(tool.version).toBe('1.0.0');
      expect(tool.inputSchema.properties!.endpoint).toBeDefined();
      expect(tool.inputSchema.properties!.method).toBeDefined();
      expect(tool.inputSchema.required).toContain('endpoint');
    });

    it('should execute API call tool handler', async () => {
      const mockApiClient = {
        makeRequest: jest.fn().mockResolvedValue({ success: true })
      };

      const toolBuilder = ToolTemplates.apiCall('test-api', 'Test API call', '/test', 'GET');
      const tool = toolBuilder.build();

      const result = await tool.handler({ endpoint: '/test' }, mockApiClient);
      
      expect(mockApiClient.makeRequest).toHaveBeenCalledWith('/test', 'GET', undefined);
      expect(result.content[0].text).toContain('success');
    });
  });

  describe('Data Processor Template', () => {
    it('should create data processor tool template', () => {
      const toolBuilder = ToolTemplates.dataProcessor('test-processor', 'Test data processor');
      const tool = toolBuilder.build();

      expect(tool.name).toBe('test-processor');
      expect(tool.description).toBe('Test data processor');
      expect(tool.category).toBe('data');
      expect(tool.inputSchema.properties!.input).toBeDefined();
      expect(tool.inputSchema.properties!.format).toBeDefined();
      expect(tool.inputSchema.required).toContain('input');
    });
  });

  describe('Utility Template', () => {
    it('should create utility tool template', () => {
      const toolBuilder = ToolTemplates.utility('test-utility', 'Test utility');
      const tool = toolBuilder.build();

      expect(tool.name).toBe('test-utility');
      expect(tool.description).toBe('Test utility');
      expect(tool.category).toBe('utility');
    });

    it('should execute utility tool handler', async () => {
      const toolBuilder = ToolTemplates.utility('test-utility', 'Test utility');
      const tool = toolBuilder.build();

      const result = await tool.handler({}, null);
      
      expect(result.content[0].text).toBe('Utility tool executed successfully');
    });
  });
});