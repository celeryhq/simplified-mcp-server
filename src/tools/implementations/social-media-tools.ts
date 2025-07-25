/**
 * Social media management tools for Simplified API
 */

import { createTool } from '../definitions.js';
import type { ToolDefinition } from '../../types/index.js';
import { AppError, ErrorType } from '../../types/index.js';

/**
 * Get social media accounts tool
 */
export const getSocialMediaAccountsTool: ToolDefinition = createTool()
  .name('get_social_media_accounts')
  .description('Retrieve all connected social media accounts')
  .category('social-media')
  .version('1.0.0')
  .optionalString('network', 'Filter by specific social media platform', {
    enum: ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'threads', 'google', 'bluesky', 'tiktokBusiness']
  })
  .handler(async (params, apiClient) => {
    if (!apiClient) {
      throw new AppError(
        ErrorType.TOOL_ERROR,
        'API client not available - server configuration error'
      );
    }

    try {
      const queryParams: Record<string, any> = {};

      if (params.network) queryParams.network = params.network;

      const response = await apiClient.get('/api/v1/service/social-media/get-accounts', queryParams);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              accounts: response.data.accounts || response.data,
              total: response.data.total || (Array.isArray(response.data) ? response.data.length : 1),
              filters: {
                network: params.network || 'all'
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Failed to retrieve social media accounts: ${errorMessage}`
            }, null, 2)
          }
        ]
      };
    }
  })
  .build();

/**
 * Create social media post tool
 */
export const createSocialMediaPostTool: ToolDefinition = createTool()
  .name('create_social_media_post')
  .description('Create a new social media post with platform-specific settings for Google, TikTok, Threads, YouTube, Facebook, LinkedIn, Instagram, and Pinterest')
  .category('social-media')
  .version('1.1.0')
  .requiredString('message', 'Post message/content', {
    minLength: 1,
    maxLength: 5000
  })
  .requiredString('accountId', 'Social media account ID', {
    minLength: 1,
    maxLength: 100
  })
  .requiredString('action', 'Action to perform with the post', {
    enum: ['schedule', 'add_to_queue', 'draft']
  })
  .optionalString('date', 'Scheduled date for the post (format: YYYY-MM-DD HH:MM)', {
    pattern: '^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$'
  })
  .optionalArray('media', 'Media file URLs to attach to the post', {
    type: 'string',
    pattern: '^https?://.+'
  }, {
    maxItems: 10
  })
  .optionalObject('additional', 'Platform-specific post settings and metadata', {
    // Google Business Profile
    google: {
      type: 'object',
      properties: {
        post: {
          type: 'object',
          properties: {
            title: { type: 'string', maxLength: 300 },
            topicType: { type: 'string', enum: ['STANDARD', 'EVENT', 'OFFER', 'PRODUCT'] },
            couponCode: { type: 'string', maxLength: 50 },
            callToActionUrl: { type: 'string', pattern: '^https?://.+' },
            redeemOnlineUrl: { type: 'string', pattern: '^https?://.+' },
            termsConditions: { type: 'string', maxLength: 1000 },
            callToActionType: {
              type: 'string',
              enum: ['SIGN_UP', 'LEARN_MORE', 'BOOK', 'ORDER', 'SHOP', 'CALL', 'GET_OFFER']
            }
          }
        }
      }
    },
    // TikTok / TikTok Business
    tiktok: {
      type: 'object',
      properties: {
        post: {
          type: 'object',
          properties: {
            brandContent: { type: 'boolean' },
            brandOrganic: { type: 'boolean' },
            duetDisabled: { type: 'boolean' },
            privacyStatus: {
              type: 'string',
              enum: ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIEND', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY']
            },
            stitchDisabled: { type: 'boolean' },
            commentDisabled: { type: 'boolean' }
          }
        },
        channel: {
          type: 'object',
          properties: {
            value: { type: 'string', enum: ['direct', 'business'] }
          }
        },
        postType: {
          type: 'object',
          properties: {
            value: { type: 'string', enum: ['video', 'image'] }
          }
        },
        postPhoto: {
          type: 'object',
          properties: {
            title: { type: 'string', maxLength: 150 },
            brandContent: { type: 'boolean' },
            brandOrganic: { type: 'boolean' },
            duetDisabled: { type: 'boolean' },
            privacyStatus: {
              type: 'string',
              enum: ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIEND', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY']
            },
            stitchDisabled: { type: 'boolean' },
            commentDisabled: { type: 'boolean' }
          }
        }
      }
    },
    // Threads
    threads: {
      type: 'object',
      properties: {
        channel: {
          type: 'object',
          properties: {
            value: { type: 'string', enum: ['direct'] }
          }
        }
      }
    },
    // YouTube
    youtube: {
      type: 'object',
      properties: {
        post: {
          type: 'object',
          properties: {
            title: { type: 'string', maxLength: 100 },
            license: { type: 'string', enum: ['standard', 'creativeCommon'] },
            privacyStatus: { type: 'string', enum: ['public', 'private', 'unlisted'] },
            selfDeclaredMadeForKids: { type: 'string', enum: ['yes', 'no'] }
          }
        },
        postType: {
          type: 'object',
          properties: {
            value: { type: 'string', enum: ['short', 'video'] }
          }
        }
      }
    },
    // Facebook
    facebook: {
      type: 'object',
      properties: {
        postType: {
          type: 'object',
          properties: {
            value: { type: 'string', enum: ['story', 'feed', 'reel'] }
          }
        }
      }
    },
    // LinkedIn
    linkedin: {
      type: 'object',
      properties: {
        audience: {
          type: 'object',
          properties: {
            value: { type: 'string', enum: ['PUBLIC', 'CONNECTIONS', 'LOGGED_IN_MEMBERS'] }
          }
        }
      }
    },
    // Instagram
    instagram: {
      type: 'object',
      properties: {
        postReel: {
          type: 'object',
          properties: {
            audioName: { type: 'string', maxLength: 100 },
            shareToFeed: { type: 'boolean' }
          }
        },
        postType: {
          type: 'object',
          properties: {
            value: { type: 'string', enum: ['post', 'reel', 'story'] }
          }
        }
      }
    },
    // Pinterest
    pinterest: {
      type: 'object',
      properties: {
        post: {
          type: 'object',
          properties: {
            link: { type: 'string', pattern: '^https?://.+' },
            title: { type: 'string', maxLength: 100 },
            imageAlt: { type: 'string', maxLength: 500 }
          }
        }
      }
    },
    // Legacy fields for backward compatibility
    hashtags: {
      type: 'array',
      items: { type: 'string', maxLength: 50 },
      maxItems: 30
    },
    mentions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          username: { type: 'string' },
          displayName: { type: 'string' }
        },
        required: ['username']
      },
      maxItems: 20
    },
    location: {
      type: 'string',
      maxLength: 100
    },
    settings: {
      type: 'object',
      properties: {
        enableComments: { type: 'boolean' },
        enableSharing: { type: 'boolean' },
        targetAudience: { type: 'string', enum: ['public', 'friends', 'custom'] }
      }
    }
  })
  .handler(async (params, apiClient) => {
    if (!apiClient) {
      throw new AppError(
        ErrorType.TOOL_ERROR,
        'API client not available - server configuration error'
      );
    }

    try {
      // Format the date if provided
      let formattedDate = null;
      if (params.date) {
        formattedDate = params.date;
      }

      // Prepare the payload according to the API specification
      const postData = {
        action: params.action,
        message: params.message.trim(),
        account_ids: [params.accountId],
        date: formattedDate,
        media: params.media || [],
        additional: params.additional || {}
      };

      // Always use the specified endpoint
      const response = await apiClient.post('/api/v1/service/social-media/create', postData);

      // Determine the action type for the response message
      const actionMessages = {
        schedule: 'scheduled',
        add_to_queue: 'added to queue',
        draft: 'saved as draft'
      };

      const actionType = actionMessages[params.action as keyof typeof actionMessages] || 'processed';

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Social media post ${actionType} successfully`,
              post: response.data,
              action: params.action,
              accountId: params.accountId,
              scheduledDate: formattedDate
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Failed to create social media post: ${errorMessage}`
            }, null, 2)
          }
        ]
      };
    }
  })
  .build();

/**
 * Export all social media tools
 */
export const socialMediaTools: ToolDefinition[] = [
  getSocialMediaAccountsTool,
  createSocialMediaPostTool
];