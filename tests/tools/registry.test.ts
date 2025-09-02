/**
 * Tests for ToolRegistry
 */

import { ToolRegistry } from '../../src/tools/registry.js';
import type { ToolDefinition } from '../../src/types/index.js';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('Tool Registration', () => {
    it('should register a valid tool', () => {
      const tool: ToolDefinition = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string' }
          }
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };

      expect(() => registry.registerTool(tool)).not.toThrow();
      expect(registry.getToolCount()).toBe(1);
      expect(registry.getToolNames()).toContain('test-tool');
    });

    it('should register a tool with category', () => {
      const tool: ToolDefinition = {
        name: 'categorized-tool',
        description: 'A categorized tool',
        category: 'test-category',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };

      registry.registerTool(tool);
      expect(registry.getCategories()).toContain('test-category');
      expect(registry.getToolsByCategory('test-category')).toHaveLength(1);
    });

    it('should throw error for invalid tool name', () => {
      const tool = {
        name: '',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      } as ToolDefinition;

      expect(() => registry.registerTool(tool)).toThrow('Tool name is required');
    });

    it('should throw error for missing description', () => {
      const tool = {
        name: 'test-tool',
        description: '',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      } as ToolDefinition;

      expect(() => registry.registerTool(tool)).toThrow('Tool description is required');
    });

    it('should throw error for invalid input schema', () => {
      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: {
          type: 'string', // Should be 'object'
          properties: {}
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      } as ToolDefinition;

      expect(() => registry.registerTool(tool)).toThrow('Tool inputSchema type must be "object"');
    });

    it('should throw error for missing handler', () => {
      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {}
        }
        // Missing handler
      } as ToolDefinition;

      expect(() => registry.registerTool(tool)).toThrow('Tool handler is required');
    });

    it('should throw error for duplicate tool names', () => {
      const tool1: ToolDefinition = {
        name: 'duplicate-tool',
        description: 'First tool',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test1' }] })
      };

      const tool2: ToolDefinition = {
        name: 'duplicate-tool',
        description: 'Second tool',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test2' }] })
      };

      registry.registerTool(tool1);
      expect(() => registry.registerTool(tool2)).toThrow('Tool with name \'duplicate-tool\' is already registered');
    });
  });

  describe('Tool Retrieval', () => {
    beforeEach(() => {
      const tool1: ToolDefinition = {
        name: 'tool1',
        description: 'First tool',
        category: 'category1',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test1' }] })
      };

      const tool2: ToolDefinition = {
        name: 'tool2',
        description: 'Second tool',
        category: 'category1',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test2' }] })
      };

      const tool3: ToolDefinition = {
        name: 'tool3',
        description: 'Third tool',
        category: 'category2',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test3' }] })
      };

      registry.registerTool(tool1);
      registry.registerTool(tool2);
      registry.registerTool(tool3);
    });

    it('should get tool by name', () => {
      const tool = registry.getTool('tool1');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('tool1');
    });

    it('should return undefined for non-existent tool', () => {
      const tool = registry.getTool('non-existent');
      expect(tool).toBeUndefined();
    });

    it('should get tools by category', () => {
      const category1Tools = registry.getToolsByCategory('category1');
      expect(category1Tools).toHaveLength(2);
      expect(category1Tools.map(t => t.name)).toEqual(expect.arrayContaining(['tool1', 'tool2']));
    });

    it('should get all categories', () => {
      const categories = registry.getCategories();
      expect(categories).toHaveLength(2);
      expect(categories).toEqual(expect.arrayContaining(['category1', 'category2']));
    });

    it('should get available tools in MCP format', () => {
      const tools = registry.getAvailableTools();
      expect(tools).toHaveLength(3);
      expect(tools[0]).toHaveProperty('name');
      expect(tools[0]).toHaveProperty('description');
      expect(tools[0]).toHaveProperty('inputSchema');
    });
  });

  describe('Tool Unregistration', () => {
    beforeEach(() => {
      const tool: ToolDefinition = {
        name: 'test-tool',
        description: 'A test tool',
        category: 'test-category',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };

      registry.registerTool(tool);
    });

    it('should unregister existing tool', () => {
      expect(registry.unregisterTool('test-tool')).toBe(true);
      expect(registry.getToolCount()).toBe(0);
      expect(registry.getTool('test-tool')).toBeUndefined();
    });

    it('should return false for non-existent tool', () => {
      expect(registry.unregisterTool('non-existent')).toBe(false);
    });

    it('should remove tool from category when unregistered', () => {
      registry.unregisterTool('test-tool');
      expect(registry.getCategories()).not.toContain('test-category');
    });
  });

  describe('Parameter Validation', () => {
    beforeEach(() => {
      const tool: ToolDefinition = {
        name: 'validation-tool',
        description: 'A tool for testing validation',
        inputSchema: {
          type: 'object',
          properties: {
            requiredString: {
              type: 'string',
              minLength: 3,
              maxLength: 10
            },
            optionalNumber: {
              type: 'number',
              minimum: 0,
              maximum: 100
            },
            enumValue: {
              type: 'string',
              enum: ['option1', 'option2', 'option3']
            },
            booleanValue: {
              type: 'boolean'
            }
          },
          required: ['requiredString']
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };

      registry.registerTool(tool);
    });

    it('should validate required parameters', () => {
      expect(() => {
        registry.validateToolParameters('validation-tool', {});
      }).toThrow('Missing required parameter: requiredString');
    });

    it('should validate string type', () => {
      expect(() => {
        registry.validateToolParameters('validation-tool', {
          requiredString: 123
        });
      }).toThrow('Parameter \'requiredString\' must be a string');
    });

    it('should validate string length constraints', () => {
      expect(() => {
        registry.validateToolParameters('validation-tool', {
          requiredString: 'ab' // Too short
        });
      }).toThrow('Parameter \'requiredString\' must be at least 3 characters long');

      expect(() => {
        registry.validateToolParameters('validation-tool', {
          requiredString: 'this is too long' // Too long
        });
      }).toThrow('Parameter \'requiredString\' must be at most 10 characters long');
    });

    it('should validate number type and constraints', () => {
      expect(() => {
        registry.validateToolParameters('validation-tool', {
          requiredString: 'valid',
          optionalNumber: 'not a number'
        });
      }).toThrow('Parameter \'optionalNumber\' must be a number');

      expect(() => {
        registry.validateToolParameters('validation-tool', {
          requiredString: 'valid',
          optionalNumber: -1
        });
      }).toThrow('Parameter \'optionalNumber\' must be at least 0');

      expect(() => {
        registry.validateToolParameters('validation-tool', {
          requiredString: 'valid',
          optionalNumber: 101
        });
      }).toThrow('Parameter \'optionalNumber\' must be at most 100');
    });

    it('should validate enum values', () => {
      expect(() => {
        registry.validateToolParameters('validation-tool', {
          requiredString: 'valid',
          enumValue: 'invalid-option'
        });
      }).toThrow('Parameter \'enumValue\' must be one of: option1, option2, option3');
    });

    it('should validate boolean type', () => {
      expect(() => {
        registry.validateToolParameters('validation-tool', {
          requiredString: 'valid',
          booleanValue: 'not a boolean'
        });
      }).toThrow('Parameter \'booleanValue\' must be a boolean');
    });

    it('should pass validation with valid parameters', () => {
      expect(() => {
        registry.validateToolParameters('validation-tool', {
          requiredString: 'valid',
          optionalNumber: 50,
          enumValue: 'option1',
          booleanValue: true
        });
      }).not.toThrow();
    });

    it('should throw error for non-existent tool', () => {
      expect(() => {
        registry.validateToolParameters('non-existent', {});
      }).toThrow('Tool \'non-existent\' not found');
    });
  });

  describe('Tool Execution', () => {
    beforeEach(() => {
      const successTool: ToolDefinition = {
        name: 'success-tool',
        description: 'A tool that succeeds',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message']
        },
        handler: async (params) => ({
          content: [{ type: 'text', text: `Success: ${params.message}` }]
        })
      };

      const errorTool: ToolDefinition = {
        name: 'error-tool',
        description: 'A tool that throws an error',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => {
          throw new Error('Tool execution failed');
        }
      };

      registry.registerTool(successTool);
      registry.registerTool(errorTool);
    });

    it('should execute tool successfully', async () => {
      const result = await registry.executeTool('success-tool', { message: 'test' }, null);
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Success: test' }]
      });
    });

    it('should handle tool execution errors', async () => {
      await expect(registry.executeTool('error-tool', {}, null)).rejects.toThrow('Error executing tool \'error-tool\': Tool execution failed');
    });

    it('should validate parameters before execution', async () => {
      await expect(registry.executeTool('success-tool', {}, null)).rejects.toThrow('Missing required parameter: message');
    });
  });

  describe('Documentation Generation', () => {
    beforeEach(() => {
      const tool1: ToolDefinition = {
        name: 'documented-tool',
        description: 'A well-documented tool',
        category: 'documentation',
        version: '1.0.0',
        inputSchema: {
          type: 'object',
          properties: {
            requiredParam: {
              type: 'string',
              description: 'A required parameter',
              minLength: 1,
              maxLength: 100
            },
            optionalParam: {
              type: 'number',
              description: 'An optional parameter',
              minimum: 0
            },
            enumParam: {
              type: 'string',
              description: 'An enum parameter',
              enum: ['value1', 'value2']
            }
          },
          required: ['requiredParam']
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };

      const tool2: ToolDefinition = {
        name: 'simple-tool',
        description: 'A simple tool without category',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };

      registry.registerTool(tool1);
      registry.registerTool(tool2);
    });

    it('should generate documentation for all tools', () => {
      const docs = registry.generateDocumentation();
      expect(docs).toContain('# Simplified MCP Server Tools Documentation');
      expect(docs).toContain('## Documentation Tools');
      expect(docs).toContain('### documented-tool');
      expect(docs).toContain('A well-documented tool');
      expect(docs).toContain('**Version:** 1.0.0');
      expect(docs).toContain('**Parameters:**');
      expect(docs).toContain('`requiredParam` (string) (required): A required parameter');
      expect(docs).toContain('`optionalParam` (number) (optional): An optional parameter');
      expect(docs).toContain('Allowed values: value1, value2');
      expect(docs).toContain('Constraints: min length: 1, max length: 100');
      expect(docs).toContain('## General Tools');
      expect(docs).toContain('### simple-tool');
    });
  });

  describe('Registry Management', () => {
    it('should clear all tools', () => {
      const tool: ToolDefinition = {
        name: 'test-tool',
        description: 'A test tool',
        category: 'test',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };

      registry.registerTool(tool);
      expect(registry.getToolCount()).toBe(1);
      expect(registry.getCategories()).toHaveLength(1);

      registry.clear();
      expect(registry.getToolCount()).toBe(0);
      expect(registry.getCategories()).toHaveLength(0);
    });

    it('should handle clearing empty registry', () => {
      expect(() => registry.clear()).not.toThrow();
      expect(registry.getToolCount()).toBe(0);
      expect(registry.getCategories()).toHaveLength(0);
    });

    it('should handle multiple clear operations', () => {
      const tool: ToolDefinition = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };

      registry.registerTool(tool);
      registry.clear();
      registry.clear(); // Second clear should not throw
      
      expect(registry.getToolCount()).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle tools with very long names', () => {
      const longName = 'a'.repeat(1000);
      const tool: ToolDefinition = {
        name: longName,
        description: 'A tool with a very long name',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };

      expect(() => registry.registerTool(tool)).not.toThrow();
      expect(registry.getTool(longName)).toBeDefined();
    });

    it('should handle tools with special characters in names', () => {
      const specialName = 'tool-with-special-chars!@#$%^&*()_+{}|:"<>?[]\\;\',./ ';
      const tool: ToolDefinition = {
        name: specialName,
        description: 'A tool with special characters',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };

      expect(() => registry.registerTool(tool)).not.toThrow();
      expect(registry.getTool(specialName)).toBeDefined();
    });

    it('should handle tools with unicode characters', () => {
      const unicodeName = 'tool-测试-🔧-émoji';
      const tool: ToolDefinition = {
        name: unicodeName,
        description: 'A tool with unicode characters 测试 🌍',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };

      expect(() => registry.registerTool(tool)).not.toThrow();
      expect(registry.getTool(unicodeName)).toBeDefined();
    });

    it('should handle tools with very long descriptions', () => {
      const longDescription = 'This is a very long description. '.repeat(100);
      const tool: ToolDefinition = {
        name: 'long-description-tool',
        description: longDescription,
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };

      expect(() => registry.registerTool(tool)).not.toThrow();
      expect(registry.getTool('long-description-tool')?.description).toBe(longDescription);
    });

    it('should handle complex nested schemas', () => {
      const tool: ToolDefinition = {
        name: 'complex-schema-tool',
        description: 'A tool with complex nested schema',
        inputSchema: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                profile: {
                  type: 'object',
                  properties: {
                    settings: {
                      type: 'object',
                      properties: {
                        preferences: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              key: { type: 'string' },
                              value: { type: 'string' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          required: ['user']
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };

      expect(() => registry.registerTool(tool)).not.toThrow();
      expect(registry.getTool('complex-schema-tool')).toBeDefined();
    });

    it('should handle async handler errors gracefully', async () => {
      const tool: ToolDefinition = {
        name: 'async-error-tool',
        description: 'A tool that throws async errors',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => {
          await new Promise(resolve => setTimeout(resolve, 1));
          throw new Error('Async error');
        }
      };

      registry.registerTool(tool);
      
      await expect(registry.executeTool('async-error-tool', {}, null))
        .rejects.toThrow('Error executing tool \'async-error-tool\': Async error');
    });

    it('should handle handler that returns non-standard response', async () => {
      const tool: ToolDefinition = {
        name: 'non-standard-tool',
        description: 'A tool that returns non-standard response',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => {
          return { customField: 'value', nonStandardResponse: true };
        }
      };

      registry.registerTool(tool);
      
      const result = await registry.executeTool('non-standard-tool', {}, null);
      expect(result).toEqual({ customField: 'value', nonStandardResponse: true });
    });

    it('should handle handler that returns null', async () => {
      const tool: ToolDefinition = {
        name: 'null-return-tool',
        description: 'A tool that returns null',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => {
          return null;
        }
      };

      registry.registerTool(tool);
      
      const result = await registry.executeTool('null-return-tool', {}, null);
      expect(result).toBeNull();
    });

    it('should handle handler that returns undefined', async () => {
      const tool: ToolDefinition = {
        name: 'undefined-return-tool',
        description: 'A tool that returns undefined',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => {
          return undefined;
        }
      };

      registry.registerTool(tool);
      
      const result = await registry.executeTool('undefined-return-tool', {}, null);
      expect(result).toBeUndefined();
    });

    it('should handle very large parameter objects', () => {
      const tool: ToolDefinition = {
        name: 'large-params-tool',
        description: 'A tool with large parameter validation',
        inputSchema: {
          type: 'object',
          properties: {
            largeString: { type: 'string', maxLength: 1000000 },
            largeArray: { type: 'array', maxItems: 10000 }
          }
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };

      registry.registerTool(tool);

      const largeParams = {
        largeString: 'x'.repeat(500000),
        largeArray: new Array(5000).fill('item')
      };

      expect(() => registry.validateToolParameters('large-params-tool', largeParams)).not.toThrow();
    });

    it('should handle concurrent tool registrations', () => {
      const tools = Array.from({ length: 100 }, (_, i) => ({
        name: `concurrent-tool-${i}`,
        description: `Concurrent tool ${i}`,
        inputSchema: {
          type: 'object' as const,
          properties: {}
        },
        handler: async () => ({ content: [{ type: 'text', text: `test-${i}` }] })
      }));

      // Register all tools
      tools.forEach(tool => {
        expect(() => registry.registerTool(tool)).not.toThrow();
      });

      expect(registry.getToolCount()).toBe(100);
      
      // Verify all tools are accessible
      tools.forEach(tool => {
        expect(registry.getTool(tool.name)).toBeDefined();
      });
    });

    it('should handle tools with identical descriptions but different names', () => {
      const description = 'Identical description';
      
      const tool1: ToolDefinition = {
        name: 'tool-1',
        description,
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ content: [{ type: 'text', text: 'test1' }] })
      };

      const tool2: ToolDefinition = {
        name: 'tool-2',
        description,
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ content: [{ type: 'text', text: 'test2' }] })
      };

      expect(() => registry.registerTool(tool1)).not.toThrow();
      expect(() => registry.registerTool(tool2)).not.toThrow();
      
      expect(registry.getToolCount()).toBe(2);
      expect(registry.getTool('tool-1')).toBeDefined();
      expect(registry.getTool('tool-2')).toBeDefined();
    });
  });

  describe('Workflow Tool Support', () => {
    let mockConfig: any;
    let workflowDef: any;
    let toolDef: ToolDefinition;

    beforeEach(() => {
      mockConfig = {
        workflowsEnabled: true,
        workflowDiscoveryInterval: 60000,
        workflowExecutionTimeout: 300000,
        workflowMaxConcurrentExecutions: 10,
        workflowFilterPatterns: [],
        workflowStatusCheckInterval: 5000,
        workflowRetryAttempts: 3
      };

      workflowDef = {
        id: 'test-workflow-123',
        name: 'test-workflow',
        description: 'A test workflow',
        category: 'workflow',
        version: '1.0.0',
        inputSchema: {
          type: 'object',
          properties: {
            input_param: {
              type: 'string',
              description: 'Test input parameter'
            }
          },
          required: ['input_param']
        },
        executionType: 'async',
        metadata: {
          author: 'test-author',
          tags: ['test', 'workflow']
        }
      };

      toolDef = {
        name: 'test-workflow',
        description: 'A test workflow',
        category: 'workflow',
        version: '1.0.0',
        inputSchema: workflowDef.inputSchema,
        handler: async () => ({ content: [{ type: 'text', text: 'workflow result' }] })
      };

      registry.setConfig(mockConfig);
    });

    it('should register workflow tool with metadata', () => {
      registry.registerWorkflowTool(toolDef, workflowDef);

      expect(registry.getToolCount()).toBe(1);
      expect(registry.getWorkflowToolCount()).toBe(1);
      expect(registry.getStaticToolCount()).toBe(0);
      expect(registry.isWorkflowTool('test-workflow')).toBe(true);
      expect(registry.getWorkflowDefinition('test-workflow')).toEqual(workflowDef);
    });

    it('should track workflow tool names', () => {
      registry.registerWorkflowTool(toolDef, workflowDef);

      const workflowToolNames = registry.getWorkflowToolNames();
      expect(workflowToolNames).toContain('test-workflow');
      expect(workflowToolNames).toHaveLength(1);
    });

    it('should unregister workflow tools properly', () => {
      registry.registerWorkflowTool(toolDef, workflowDef);
      expect(registry.isWorkflowTool('test-workflow')).toBe(true);

      registry.unregisterTool('test-workflow');
      expect(registry.isWorkflowTool('test-workflow')).toBe(false);
      expect(registry.getWorkflowDefinition('test-workflow')).toBeUndefined();
      expect(registry.getWorkflowToolCount()).toBe(0);
    });

    it('should clear workflow tools when clearing registry', () => {
      registry.registerWorkflowTool(toolDef, workflowDef);
      expect(registry.getWorkflowToolCount()).toBe(1);

      registry.clear();
      expect(registry.getWorkflowToolCount()).toBe(0);
      expect(registry.getWorkflowToolNames()).toHaveLength(0);
    });

    it('should distinguish between static and workflow tools', () => {
      // Register a static tool
      const staticTool: ToolDefinition = {
        name: 'static-tool',
        description: 'A static tool',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ content: [{ type: 'text', text: 'static' }] })
      };
      registry.registerTool(staticTool);

      // Register a workflow tool
      registry.registerWorkflowTool(toolDef, workflowDef);

      expect(registry.getToolCount()).toBe(2);
      expect(registry.getStaticToolCount()).toBe(1);
      expect(registry.getWorkflowToolCount()).toBe(1);
      expect(registry.isWorkflowTool('static-tool')).toBe(false);
      expect(registry.isWorkflowTool('test-workflow')).toBe(true);
    });
  });

  describe('Enhanced Documentation Generation', () => {
    let mockConfig: any;

    beforeEach(() => {
      mockConfig = {
        workflowsEnabled: true,
        workflowDiscoveryInterval: 60000,
        workflowExecutionTimeout: 300000,
        workflowMaxConcurrentExecutions: 10,
        workflowFilterPatterns: ['test-*'],
        workflowStatusCheckInterval: 5000,
        workflowRetryAttempts: 3
      };

      registry.setConfig(mockConfig);
    });

    it('should generate enhanced documentation with workflow configuration', () => {
      // Register a static tool
      const staticTool: ToolDefinition = {
        name: 'static-tool',
        description: 'A static tool',
        category: 'utilities',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ content: [{ type: 'text', text: 'static' }] })
      };
      registry.registerTool(staticTool);

      // Register a workflow tool
      const workflowDef = {
        id: 'workflow-123',
        name: 'workflow-tool',
        description: 'A workflow tool',
        category: 'workflow',
        executionType: 'async',
        metadata: { author: 'test' },
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string', description: 'Test parameter' }
          }
        }
      };

      const workflowTool: ToolDefinition = {
        name: 'workflow-tool',
        description: 'A workflow tool',
        category: 'workflow',
        inputSchema: workflowDef.inputSchema,
        handler: async () => ({ content: [{ type: 'text', text: 'workflow' }] })
      };

      registry.registerWorkflowTool(workflowTool, workflowDef);

      const docs = registry.generateDocumentation();

      // Check overview section
      expect(docs).toContain('## Overview');
      expect(docs).toContain('This server provides 2 tools across 2 categories');
      expect(docs).toContain('**Static Tools:** 1 (built-in functionality)');
      expect(docs).toContain('**Dynamic Workflow Tools:** 1 (discovered from workflows)');

      // Check workflow configuration section
      expect(docs).toContain('## Workflow Configuration');
      expect(docs).toContain('### Current Configuration');
      expect(docs).toContain('- Workflows Enabled: true');
      expect(docs).toContain('- Discovery Interval: 60000ms');
      expect(docs).toContain('- Filter Patterns: test-*');

      // Check workflow tool documentation
      expect(docs).toContain('🔄 Dynamic Workflow Tool');
      expect(docs).toContain('**Workflow ID:** `workflow-123`');
      expect(docs).toContain('**Execution Type:** async');
      expect(docs).toContain('**Workflow Metadata:**');
      expect(docs).toContain('- author: "test"');
      expect(docs).toContain('**Execution Notes:**');
      expect(docs).toContain('- This tool executes a workflow via the Simplified API');

      // Check examples section
      expect(docs).toContain('## Workflow Tool Usage Examples');
      expect(docs).toContain('### Example: workflow-tool');
      expect(docs).toContain('"name": "workflow-tool"');
      expect(docs).toContain('### Status Checking');
      expect(docs).toContain('"name": "workflow-status-check"');
    });

    it('should generate documentation without workflow configuration when disabled', () => {
      mockConfig.workflowsEnabled = false;
      registry.setConfig(mockConfig);

      const staticTool: ToolDefinition = {
        name: 'static-tool',
        description: 'A static tool',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ content: [{ type: 'text', text: 'static' }] })
      };
      registry.registerTool(staticTool);

      const docs = registry.generateDocumentation();

      expect(docs).toContain('**Static Tools:** 1 (built-in functionality)');
      expect(docs).not.toContain('**Dynamic Workflow Tools:**');
      expect(docs).not.toContain('## Workflow Configuration');
      expect(docs).not.toContain('## Workflow Tool Usage Examples');
    });

    it('should format category names properly', () => {
      const tool: ToolDefinition = {
        name: 'test-tool',
        description: 'A test tool',
        category: 'data-processing',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };
      registry.registerTool(tool);

      const docs = registry.generateDocumentation();
      expect(docs).toContain('## Data Processing Tools');
    });

    it('should generate example parameters correctly', () => {
      const workflowDef = {
        id: 'example-workflow',
        name: 'example-tool',
        description: 'Example workflow',
        inputSchema: {
          type: 'object',
          properties: {
            stringParam: { type: 'string', example: 'custom-example' },
            numberParam: { type: 'number', minimum: 5 },
            enumParam: { type: 'string', enum: ['option1', 'option2'] },
            booleanParam: { type: 'boolean' },
            arrayParam: { type: 'array' },
            objectParam: { type: 'object' }
          }
        }
      };

      const workflowTool: ToolDefinition = {
        name: 'example-tool',
        description: 'Example workflow',
        category: 'workflow',
        inputSchema: workflowDef.inputSchema,
        handler: async () => ({ content: [{ type: 'text', text: 'example' }] })
      };

      registry.registerWorkflowTool(workflowTool, workflowDef);

      const docs = registry.generateDocumentation();

      expect(docs).toContain('"stringParam": "custom-example"');
      expect(docs).toContain('"numberParam": 5');
      expect(docs).toContain('"enumParam": "option1"');
      expect(docs).toContain('"booleanParam": true');
      expect(docs).toContain('"arrayParam": ["example-item"]');
      expect(docs).toContain('"objectParam": {"key":"value"}');
    });
  });
});