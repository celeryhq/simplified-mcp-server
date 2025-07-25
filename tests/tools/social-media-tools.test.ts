/**
 * Tests for social media tools
 */

import { getSocialMediaAccountsTool, createSocialMediaPostTool, socialMediaTools } from '../../src/tools/implementations/social-media-tools.js';
import { ToolRegistry } from '../../src/tools/registry.js';

describe('Social Media Tools', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('getSocialMediaAccountsTool', () => {
    it('should have correct tool definition', () => {
      expect(getSocialMediaAccountsTool.name).toBe('get_social_media_accounts');
      expect(getSocialMediaAccountsTool.description).toBe('Retrieve all connected social media accounts');
      expect(getSocialMediaAccountsTool.category).toBe('social-media');
      expect(getSocialMediaAccountsTool.version).toBe('1.0.0');
      expect(typeof getSocialMediaAccountsTool.handler).toBe('function');
    });

    it('should have correct input schema', () => {
      const schema = getSocialMediaAccountsTool.inputSchema;
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      
      // Check optional network parameter
      expect(schema.properties!.network).toBeDefined();
      
      // Check network enum values
      const networkSchema = schema.properties!.network as any;
      expect(networkSchema.enum).toEqual(['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'threads', 'google', 'bluesky', 'tiktokBusiness']);
    });

    it('should register successfully', () => {
      expect(() => registry.registerTool(getSocialMediaAccountsTool)).not.toThrow();
      expect(registry.getTool('get_social_media_accounts')).toBeDefined();
    });

    it('should handle API client not available', async () => {
      await expect(getSocialMediaAccountsTool.handler({}, null)).rejects.toThrow('API client not available');
    });

    it('should make API call when client is available', async () => {
      const mockApiClient = {
        get: jest.fn().mockResolvedValue({
          data: {
            accounts: [
              { id: 'acc1', platform: 'facebook', status: 'active' }
            ]
          }
        })
      };

      const result = await getSocialMediaAccountsTool.handler({}, mockApiClient as any);
      const response = JSON.parse(result.content[0].text);

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/service/social-media/get-accounts', {});
      expect(response.success).toBe(true);
      expect(response.accounts).toHaveLength(1);
    });
  });

  describe('createSocialMediaPostTool', () => {
    it('should have correct tool definition', () => {
      expect(createSocialMediaPostTool.name).toBe('create_social_media_post');
      expect(createSocialMediaPostTool.description).toBe('Create a new social media post with platform-specific settings for Google, TikTok, Threads, YouTube, Facebook, LinkedIn, Instagram, and Pinterest');
      expect(createSocialMediaPostTool.category).toBe('social-media');
      expect(createSocialMediaPostTool.version).toBe('1.1.0');
      expect(typeof createSocialMediaPostTool.handler).toBe('function');
    });

    it('should have correct input schema', () => {
      const schema = createSocialMediaPostTool.inputSchema;
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.required).toEqual(['message', 'accountId', 'action']);
      
      // Check required parameters
      expect(schema.properties!.message).toBeDefined();
      expect(schema.properties!.accountId).toBeDefined();
      expect(schema.properties!.action).toBeDefined();
      
      // Check message constraints
      const messageSchema = schema.properties!.message as any;
      expect(messageSchema.type).toBe('string');
      expect(messageSchema.minLength).toBe(1);
      expect(messageSchema.maxLength).toBe(5000);
      
      // Check action enum
      const actionSchema = schema.properties!.action as any;
      expect(actionSchema.type).toBe('string');
      expect(actionSchema.enum).toEqual(['schedule', 'add_to_queue', 'draft']);
      
      // Check accountId constraints
      const accountIdSchema = schema.properties!.accountId as any;
      expect(accountIdSchema.type).toBe('string');
      expect(accountIdSchema.minLength).toBe(1);
      expect(accountIdSchema.maxLength).toBe(100);
    });

    it('should register successfully', () => {
      expect(() => registry.registerTool(createSocialMediaPostTool)).not.toThrow();
      expect(registry.getTool('create_social_media_post')).toBeDefined();
    });

    it('should handle API client not available', async () => {
      const params = {
        message: 'Test post',
        accountId: 'acc123',
        action: 'draft'
      };
      
      await expect(createSocialMediaPostTool.handler(params, null)).rejects.toThrow('API client not available');
    });

    it('should create post when API client is available', async () => {
      const mockApiClient = {
        post: jest.fn().mockResolvedValue({
          data: {
            id: 'post123',
            message: 'Test post',
            action: 'draft',
            status: 'created'
          }
        })
      };

      const params = {
        message: 'Test post',
        accountId: 'acc123',
        action: 'draft'
      };

      const result = await createSocialMediaPostTool.handler(params, mockApiClient as any);
      const response = JSON.parse(result.content[0].text);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/service/social-media/create', {
        action: 'draft',
        message: 'Test post',
        account_ids: ['acc123'],
        date: null,
        media: [],
        additional: {}
      });
      expect(response.success).toBe(true);
      expect(response.message).toContain('saved as draft');
    });

    it('should validate required parameters', () => {
      registry.registerTool(createSocialMediaPostTool);
      
      // Missing message
      expect(() => {
        registry.validateToolParameters('create_social_media_post', { accountId: 'acc123', action: 'draft' });
      }).toThrow('Missing required parameter: message');
      
      // Missing accountId
      expect(() => {
        registry.validateToolParameters('create_social_media_post', { message: 'Test', action: 'draft' });
      }).toThrow('Missing required parameter: accountId');
      
      // Missing action
      expect(() => {
        registry.validateToolParameters('create_social_media_post', { message: 'Test', accountId: 'acc123' });
      }).toThrow('Missing required parameter: action');
    });

    it('should validate parameter types', () => {
      registry.registerTool(createSocialMediaPostTool);
      
      // Invalid message type
      expect(() => {
        registry.validateToolParameters('create_social_media_post', { 
          message: 123, 
          accountId: 'acc123',
          action: 'draft'
        });
      }).toThrow('Parameter \'message\' must be a string');
      
      // Invalid accountId type
      expect(() => {
        registry.validateToolParameters('create_social_media_post', { 
          message: 'Test', 
          accountId: 123,
          action: 'draft'
        });
      }).toThrow('Parameter \'accountId\' must be a string');
      
      // Invalid action type
      expect(() => {
        registry.validateToolParameters('create_social_media_post', { 
          message: 'Test', 
          accountId: 'acc123',
          action: 123
        });
      }).toThrow('Parameter \'action\' must be a string');
    });

    it('should validate enum values', () => {
      registry.registerTool(createSocialMediaPostTool);
      
      // Valid action
      expect(() => {
        registry.validateToolParameters('create_social_media_post', { 
          message: 'Test', 
          accountId: 'acc123',
          action: 'draft'
        });
      }).not.toThrow();
      
      // Invalid action
      expect(() => {
        registry.validateToolParameters('create_social_media_post', { 
          message: 'Test', 
          accountId: 'acc123',
          action: 'invalid_action'
        });
      }).toThrow('Parameter \'action\' must be one of: schedule, add_to_queue, draft');
      
      // Test date pattern validation
      expect(() => {
        registry.validateToolParameters('create_social_media_post', { 
          message: 'Test', 
          accountId: 'acc123',
          action: 'schedule',
          date: 'invalid-date-format'
        });
      }).toThrow('Parameter \'date\' does not match required pattern');
      
      // Test valid date format
      expect(() => {
        registry.validateToolParameters('create_social_media_post', { 
          message: 'Test', 
          accountId: 'acc123',
          action: 'schedule',
          date: '2024-01-22 12:30'
        });
      }).not.toThrow();
    });
  });

  describe('socialMediaTools array', () => {
    it('should export both tools', () => {
      expect(socialMediaTools).toHaveLength(2);
      expect(socialMediaTools).toContain(getSocialMediaAccountsTool);
      expect(socialMediaTools).toContain(createSocialMediaPostTool);
    });

    it('should register all tools successfully', () => {
      socialMediaTools.forEach(tool => {
        expect(() => registry.registerTool(tool)).not.toThrow();
      });
      
      expect(registry.getToolCount()).toBe(2);
      expect(registry.getToolsByCategory('social-media')).toHaveLength(2);
    });
  });

  describe('Tool parameter validation edge cases', () => {
    beforeEach(() => {
      registry.registerTool(createSocialMediaPostTool);
    });

    it('should validate message length constraints', () => {
      // Message too short (empty string)
      expect(() => {
        registry.validateToolParameters('create_social_media_post', { 
          message: '', 
          accountId: 'acc123',
          action: 'draft'
        });
      }).toThrow('Parameter \'message\' must be at least 1 characters long');
      
      // Message too long
      const longMessage = 'a'.repeat(5001);
      expect(() => {
        registry.validateToolParameters('create_social_media_post', { 
          message: longMessage, 
          accountId: 'acc123',
          action: 'draft'
        });
      }).toThrow('Parameter \'message\' must be at most 5000 characters long');
    });

    it('should validate media array constraints', () => {
      // Valid media array
      expect(() => {
        registry.validateToolParameters('create_social_media_post', { 
          message: 'Test', 
          accountId: 'acc123',
          action: 'draft',
          media: [
            'https://example.com/image.jpg'
          ]
        });
      }).not.toThrow();
      
      // Too many media items
      const manyMedia = Array(11).fill('https://example.com/image.jpg');
      expect(() => {
        registry.validateToolParameters('create_social_media_post', { 
          message: 'Test', 
          accountId: 'acc123',
          action: 'draft',
          media: manyMedia
        });
      }).toThrow('Parameter \'media\' must have at most 10 items');
    });

    it('should validate optional parameters', () => {
      // Valid optional parameters
      expect(() => {
        registry.validateToolParameters('create_social_media_post', { 
          message: 'Test', 
          accountId: 'acc123',
          action: 'draft',
          date: '2024-01-22 12:00',
          additional: {
            hashtags: ['test', 'post'],
            location: 'New York'
          }
        });
      }).not.toThrow();
      
      // Invalid additional type
      expect(() => {
        registry.validateToolParameters('create_social_media_post', { 
          message: 'Test', 
          accountId: 'acc123',
          action: 'draft',
          additional: 'invalid'
        });
      }).toThrow('Parameter \'additional\' must be an object');
    });
  });
});