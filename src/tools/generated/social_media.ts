// AUTO-GENERATED from social_media_openapi.yaml. Do not edit by hand.
// Regenerate with: npm run generate:tools
import type { OpenAPIToolDescriptor } from '../openapi-tool-factory.js';

export const social_media: OpenAPIToolDescriptor[] = [
  {
    "name": "get_social_media_accounts",
    "description": "List ALL connected social media accounts in one call (omit `network`)",
    "category": "social_media",
    "method": "GET",
    "path": "/api/v1/service/social-media/get-accounts",
    "paramLocations": {
      "network": "query"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "network": {
          "type": "string",
          "description": "DEPRECATED — do not pass this parameter. The unfiltered call already\nreturns every connected account across every platform; filter the\nresult client-side if you need accounts for one platform. Passing\n`network` with any value (including empty string) signals filtering\nand is the wrong default for \"list\", \"show all\", \"what do I have\nconnected\" requests. Backend still accepts the historical values\n(`facebook`, `instagram`, `linkedin`, `tiktok`, `youtube`, `pinterest`,\n`threads`, `google`, `bluesky`, `tiktokBusiness`) but new callers\nshould omit the field entirely.\n"
        }
      }
    }
  },
  {
    "name": "get_social_media_analytics_range",
    "description": "Get time-series analytics for specific metrics",
    "category": "social_media",
    "method": "POST",
    "path": "/api/v1/service/social-media/analytics/range",
    "paramLocations": {
      "account_id": "body",
      "metrics": "body",
      "date_from": "body",
      "date_to": "body",
      "tz": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "account_id": {
          "type": "integer",
          "description": "Social media account ID"
        },
        "metrics": {
          "type": "array",
          "description": "List of metrics to retrieve. Available values depend on the social network — see endpoint description.",
          "items": {
            "type": "string",
            "enum": [
              "impressions",
              "views",
              "reach",
              "profile_views",
              "follower_count",
              "text_message_clicks",
              "website_clicks",
              "email_contacts",
              "posts_count",
              "accounts_engaged",
              "profile_links_taps",
              "replies",
              "shares",
              "saves",
              "total_interactions",
              "engaged_users",
              "post_impression",
              "post_impression_total",
              "post_reach_total",
              "post_impression_paid",
              "post_reach_paid",
              "post_reach",
              "page_post_engagements",
              "new_fan",
              "reactions",
              "total_fans",
              "total_follows",
              "link_clicks",
              "video_play",
              "other_clicks",
              "photo_view",
              "post_reach_viral",
              "page_reach",
              "unique_impressions",
              "comments",
              "likes",
              "clicks",
              "engagement",
              "allFollowers",
              "organicFollowers",
              "paidFollowers",
              "memberFollowers",
              "retweetCount",
              "replyCount",
              "likeCount",
              "quoteCount",
              "dislikes",
              "estimatedMinutesWatched",
              "averageViewDuration",
              "engagement_rate",
              "save",
              "pin_click_rate",
              "outbound_click",
              "video_mrc_view",
              "video_avg_watch_time",
              "impression",
              "video_v50_watch_time",
              "outbound_click_rate",
              "save_rate",
              "quartile_95_percent_view",
              "video_start",
              "video_10s_view",
              "pin_click",
              "likes_count",
              "audience_genders",
              "audience_countries",
              "audience_activity",
              "followers_count",
              "video_views",
              "reposts",
              "quotes",
              "queries_indirect",
              "queries_direct",
              "queries_chain",
              "views_maps",
              "views_search",
              "actions_website",
              "actions_phone",
              "actions_driving_directions",
              "business_impressions_desktop_maps",
              "business_impressions_mobile_maps",
              "business_impressions_mobile_search",
              "business_impressions_desktop_search"
            ]
          }
        },
        "date_from": {
          "type": "string",
          "format": "date",
          "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
          "description": "Start date in format YYYY-MM-DD"
        },
        "date_to": {
          "type": "string",
          "format": "date",
          "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
          "description": "End date in format YYYY-MM-DD"
        },
        "tz": {
          "type": "string",
          "default": "UTC",
          "description": "Timezone (e.g. UTC, Europe/Warsaw)"
        }
      },
      "required": [
        "account_id",
        "metrics",
        "date_from",
        "date_to"
      ]
    }
  },
  {
    "name": "get_social_media_analytics_posts",
    "description": "Get analytics for social media posts",
    "category": "social_media",
    "method": "GET",
    "path": "/api/v1/service/social-media/analytics/posts",
    "paramLocations": {
      "account_id": "query",
      "date_from": "query",
      "date_to": "query",
      "page": "query",
      "per_page": "query"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "account_id": {
          "type": "integer",
          "description": "Social media account ID"
        },
        "date_from": {
          "type": "string",
          "format": "date",
          "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
          "description": "Start date in format YYYY-MM-DD"
        },
        "date_to": {
          "type": "string",
          "format": "date",
          "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
          "description": "End date in format YYYY-MM-DD"
        },
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1,
          "description": "Page number for pagination"
        },
        "per_page": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 10,
          "description": "Number of posts per page (max 100). Use with all_posts_count and pages_count from the response to paginate through all results."
        }
      },
      "required": [
        "account_id",
        "date_from",
        "date_to"
      ]
    }
  },
  {
    "name": "get_social_media_analytics_aggregated",
    "description": "Get aggregated analytics for a social media account",
    "category": "social_media",
    "method": "GET",
    "path": "/api/v1/service/social-media/analytics/aggregated",
    "paramLocations": {
      "account_id": "query",
      "account_ids": "query",
      "date_from": "query",
      "date_to": "query"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "account_id": {
          "type": "integer",
          "nullable": true,
          "description": "Social media account ID. Takes priority over account_ids if both provided."
        },
        "account_ids": {
          "type": "string",
          "description": "Comma-separated list of social media account IDs (e.g. \"123,456,789\"). Used when account_id is not provided.\n"
        },
        "date_from": {
          "type": "string",
          "format": "date",
          "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
          "description": "Start date in format YYYY-MM-DD"
        },
        "date_to": {
          "type": "string",
          "format": "date",
          "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
          "description": "End date in format YYYY-MM-DD"
        }
      },
      "required": [
        "date_from",
        "date_to"
      ]
    }
  },
  {
    "name": "get_social_media_analytics_audience",
    "description": "Get audience analytics for a social media account",
    "category": "social_media",
    "method": "GET",
    "path": "/api/v1/service/social-media/analytics/audience",
    "paramLocations": {
      "account_id": "query",
      "date_from": "query",
      "date_to": "query",
      "tz": "query"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "account_id": {
          "type": "integer",
          "description": "Social media account ID"
        },
        "date_from": {
          "type": "string",
          "format": "date",
          "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
          "description": "Start date in format YYYY-MM-DD"
        },
        "date_to": {
          "type": "string",
          "format": "date",
          "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
          "description": "End date in format YYYY-MM-DD"
        },
        "tz": {
          "type": "string",
          "description": "Timezone (e.g. UTC, Europe/Warsaw)"
        }
      },
      "required": [
        "account_id",
        "date_from",
        "date_to"
      ]
    }
  },
  {
    "name": "create_social_media_post",
    "description": "Create a social media post",
    "category": "social_media",
    "method": "POST",
    "path": "/api/v1/service/social-media/create",
    "paramLocations": {
      "message": "body",
      "account_ids": "body",
      "action": "body",
      "date": "body",
      "media": "body",
      "tags": "body",
      "additional": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "message": {
          "type": "string",
          "maxLength": 5000
        },
        "account_ids": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Target social media account IDs. Required for action 'schedule' and 'add_to_queue'. For action 'draft' this may be empty or omitted to create an accountless draft (saved without a connected account)."
        },
        "action": {
          "type": "string",
          "enum": [
            "schedule",
            "add_to_queue",
            "draft"
          ]
        },
        "date": {
          "type": "string",
          "pattern": "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$",
          "description": "Scheduled datetime in format: YYYY-MM-DD HH:MM"
        },
        "media": {
          "type": "array",
          "description": "Media items attached to the post. Each entry is either a Simplified asset UUID\nor a fully qualified URL. Asset UUIDs are resolved server-side to a fresh\npermanent URL before publishing; pass them whenever the media was produced\nvia `generateImage` with `storage: \"asset\"`. URLs are passed through as-is\nand should only be used for media that already lives at a permanent public\nlocation.\n",
          "items": {
            "oneOf": [
              {
                "type": "string",
                "format": "uuid",
                "description": "Simplified asset UUID — resolved server-side at publish time."
              },
              {
                "type": "string",
                "format": "uri",
                "description": "Direct media URL — used as-is."
              }
            ]
          },
          "maxItems": 10
        },
        "tags": {
          "type": "array",
          "description": "Tag (label) IDs to attach to the created post(s). Get IDs via `listSocialMediaTags`;\ncreate new ones via `createSocialMediaTag`. Tags are used by the user to filter\nposts in the Drafts/Publishing views and to deep-link the confirmation widget.\n",
          "items": {
            "type": "integer"
          }
        },
        "additional": {
          "type": "object",
          "properties": {
            "facebook": {
              "type": "object",
              "properties": {
                "postType": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "enum": [
                        "post",
                        "reel",
                        "story"
                      ],
                      "default": "post"
                    }
                  }
                }
              }
            },
            "instagram": {
              "type": "object",
              "properties": {
                "postType": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "enum": [
                        "post",
                        "reel",
                        "story"
                      ],
                      "default": "post"
                    }
                  }
                },
                "channel": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "enum": [
                        "direct",
                        "reminder"
                      ],
                      "default": "direct"
                    }
                  }
                },
                "postReel": {
                  "type": "object",
                  "properties": {
                    "audioName": {
                      "type": "string"
                    },
                    "shareToFeed": {
                      "type": "boolean",
                      "default": true
                    }
                  }
                }
              }
            },
            "tiktok": {
              "type": "object",
              "properties": {
                "postType": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "enum": [
                        "video",
                        "photo"
                      ],
                      "default": "video"
                    }
                  }
                },
                "post": {
                  "type": "object",
                  "properties": {
                    "privacyStatus": {
                      "type": "string",
                      "enum": [
                        "PUBLIC_TO_EVERYONE",
                        "MUTUAL_FOLLOW_FRIENDS",
                        "FOLLOWER_OF_CREATOR",
                        "SELF_ONLY"
                      ],
                      "default": "PUBLIC_TO_EVERYONE"
                    },
                    "brandContent": {
                      "type": "boolean",
                      "default": false
                    },
                    "brandOrganic": {
                      "type": "boolean",
                      "default": false
                    },
                    "duetDisabled": {
                      "type": "boolean",
                      "default": true
                    },
                    "stitchDisabled": {
                      "type": "boolean",
                      "default": true
                    },
                    "commentDisabled": {
                      "type": "boolean",
                      "default": true
                    }
                  }
                },
                "channel": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "enum": [
                        "direct",
                        "reminder"
                      ],
                      "default": "direct"
                    }
                  }
                },
                "postPhoto": {
                  "type": "object",
                  "properties": {
                    "title": {
                      "type": "string"
                    },
                    "privacyStatus": {
                      "type": "string",
                      "enum": [
                        "PUBLIC_TO_EVERYONE",
                        "MUTUAL_FOLLOW_FRIENDS",
                        "FOLLOWER_OF_CREATOR",
                        "SELF_ONLY"
                      ],
                      "default": "PUBLIC_TO_EVERYONE"
                    },
                    "brandContent": {
                      "type": "boolean",
                      "default": false
                    },
                    "brandOrganic": {
                      "type": "boolean",
                      "default": false
                    },
                    "commentDisabled": {
                      "type": "boolean",
                      "default": true
                    },
                    "autoAddMusic": {
                      "type": "boolean",
                      "default": false
                    }
                  }
                }
              }
            },
            "tiktokBusiness": {
              "type": "object",
              "properties": {
                "postType": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "enum": [
                        "video",
                        "photo"
                      ],
                      "default": "video"
                    }
                  }
                },
                "post": {
                  "type": "object",
                  "properties": {
                    "privacyStatus": {
                      "type": "string",
                      "enum": [
                        "PUBLIC_TO_EVERYONE",
                        "MUTUAL_FOLLOW_FRIENDS",
                        "FOLLOWER_OF_CREATOR",
                        "SELF_ONLY"
                      ],
                      "default": "PUBLIC_TO_EVERYONE"
                    },
                    "brandContent": {
                      "type": "boolean",
                      "default": false
                    },
                    "brandOrganic": {
                      "type": "boolean",
                      "default": false
                    },
                    "duetDisabled": {
                      "type": "boolean",
                      "default": true
                    },
                    "stitchDisabled": {
                      "type": "boolean",
                      "default": true
                    },
                    "commentDisabled": {
                      "type": "boolean",
                      "default": true
                    },
                    "aiGenerated": {
                      "type": "boolean",
                      "default": false
                    },
                    "uploadToDraft": {
                      "type": "boolean",
                      "default": false
                    }
                  }
                },
                "postPhoto": {
                  "type": "object",
                  "properties": {
                    "title": {
                      "type": "string"
                    },
                    "privacyStatus": {
                      "type": "string",
                      "enum": [
                        "PUBLIC_TO_EVERYONE",
                        "MUTUAL_FOLLOW_FRIENDS",
                        "FOLLOWER_OF_CREATOR",
                        "SELF_ONLY"
                      ],
                      "default": "PUBLIC_TO_EVERYONE"
                    },
                    "brandContent": {
                      "type": "boolean",
                      "default": false
                    },
                    "brandOrganic": {
                      "type": "boolean",
                      "default": false
                    },
                    "commentDisabled": {
                      "type": "boolean",
                      "default": true
                    },
                    "autoAddMusic": {
                      "type": "boolean",
                      "default": false
                    }
                  }
                }
              }
            },
            "youtube": {
              "type": "object",
              "properties": {
                "postType": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "enum": [
                        "video",
                        "short"
                      ],
                      "default": "video"
                    }
                  }
                },
                "post": {
                  "type": "object",
                  "properties": {
                    "title": {
                      "type": "string"
                    },
                    "privacyStatus": {
                      "type": "string",
                      "enum": [
                        "",
                        "public",
                        "private",
                        "unlisted"
                      ],
                      "default": ""
                    },
                    "license": {
                      "type": "string",
                      "enum": [
                        "",
                        "youtube",
                        "creativeCommon"
                      ],
                      "default": ""
                    },
                    "selfDeclaredMadeForKids": {
                      "type": "string",
                      "enum": [
                        "",
                        "yes",
                        "no"
                      ],
                      "default": ""
                    },
                    "publishAt": {
                      "type": "string"
                    }
                  }
                }
              }
            },
            "linkedin": {
              "type": "object",
              "properties": {
                "audience": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "enum": [
                        "PUBLIC",
                        "CONNECTIONS",
                        "LOGGED_IN"
                      ],
                      "default": "PUBLIC"
                    }
                  }
                }
              }
            },
            "pinterest": {
              "type": "object",
              "properties": {
                "post": {
                  "type": "object",
                  "properties": {
                    "title": {
                      "type": "string"
                    },
                    "link": {
                      "type": "string",
                      "format": "uri"
                    },
                    "imageAlt": {
                      "type": "string"
                    }
                  }
                }
              }
            },
            "threads": {
              "type": "object",
              "properties": {
                "channel": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "enum": [
                        "direct",
                        "reminder"
                      ],
                      "default": "direct"
                    }
                  }
                }
              }
            },
            "google": {
              "type": "object",
              "properties": {
                "post": {
                  "type": "object",
                  "properties": {
                    "title": {
                      "type": "string",
                      "maxLength": 58
                    },
                    "topicType": {
                      "type": "string",
                      "enum": [
                        "STANDARD",
                        "EVENT",
                        "OFFER"
                      ],
                      "default": "STANDARD"
                    },
                    "callToActionType": {
                      "type": "string",
                      "enum": [
                        "",
                        "BOOK",
                        "ORDER",
                        "SHOP",
                        "LEARN_MORE",
                        "SIGN_UP",
                        "CALL"
                      ],
                      "default": ""
                    },
                    "callToActionUrl": {
                      "type": "string",
                      "format": "uri"
                    },
                    "startDate": {
                      "type": "string"
                    },
                    "endDate": {
                      "type": "string"
                    },
                    "couponCode": {
                      "type": "string"
                    },
                    "redeemOnlineUrl": {
                      "type": "string",
                      "format": "uri"
                    },
                    "termsConditions": {
                      "type": "string"
                    }
                  }
                }
              }
            },
            "bluesky": {
              "type": "object"
            }
          }
        }
      },
      "required": [
        "message",
        "action"
      ]
    }
  },
  {
    "name": "get_social_media_posts",
    "description": "Get published social media posts",
    "category": "social_media",
    "method": "GET",
    "path": "/api/v1/service/social-media/get-posts",
    "paramLocations": {
      "account_ids": "query",
      "page": "query",
      "per_page": "query",
      "category": "query",
      "tz": "query",
      "search": "query",
      "query": "query"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "account_ids": {
          "type": "string",
          "description": "Comma-separated social media account IDs"
        },
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1,
          "description": "Page number for pagination"
        },
        "per_page": {
          "type": "integer",
          "minimum": 1,
          "default": 10,
          "description": "Number of posts per page"
        },
        "category": {
          "type": "string",
          "description": "Filter posts by category"
        },
        "tz": {
          "type": "string",
          "description": "Timezone (e.g. UTC, Europe/Warsaw)"
        },
        "search": {
          "type": "string",
          "description": "Search term to filter posts by content"
        },
        "query": {
          "type": "string",
          "description": "Additional query filter"
        }
      },
      "required": [
        "account_ids"
      ]
    }
  },
  {
    "name": "get_social_media_drafts",
    "description": "Get draft social media posts",
    "category": "social_media",
    "method": "GET",
    "path": "/api/v1/service/social-media/get-drafts",
    "paramLocations": {
      "account_ids": "query",
      "page": "query",
      "per_page": "query",
      "search": "query",
      "tz": "query",
      "order_by": "query",
      "order": "query"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "account_ids": {
          "type": "string",
          "description": "Comma-separated social media account IDs"
        },
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1,
          "description": "Page number for pagination"
        },
        "per_page": {
          "type": "integer",
          "minimum": 1,
          "default": 10,
          "description": "Number of drafts per page"
        },
        "search": {
          "type": "string",
          "description": "Search term to filter drafts by content"
        },
        "tz": {
          "type": "string",
          "description": "Timezone (e.g. UTC, Europe/Warsaw)"
        },
        "order_by": {
          "type": "string",
          "description": "Field to sort by"
        },
        "order": {
          "type": "string",
          "enum": [
            "asc",
            "desc"
          ],
          "description": "Sort direction"
        }
      },
      "required": [
        "account_ids"
      ]
    }
  },
  {
    "name": "delete_social_media_post",
    "description": "Delete a published social media post",
    "category": "social_media",
    "method": "POST",
    "path": "/api/v1/service/social-media/delete-post",
    "paramLocations": {
      "group_id": "body",
      "post_schedule_id": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "group_id": {
          "type": "string",
          "description": "Group ID of the post to delete"
        },
        "post_schedule_id": {
          "type": "string",
          "description": "Post schedule ID of the post to delete"
        }
      }
    }
  },
  {
    "name": "delete_social_media_draft",
    "description": "Delete a draft social media post",
    "category": "social_media",
    "method": "POST",
    "path": "/api/v1/service/social-media/delete-draft",
    "paramLocations": {
      "group_id": "body",
      "draft_ids": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "group_id": {
          "type": "string",
          "description": "Group ID of the draft to delete"
        },
        "draft_ids": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Array of draft IDs to delete"
        }
      }
    }
  },
  {
    "name": "update_social_media_post",
    "description": "Update a published social media post",
    "category": "social_media",
    "method": "PUT",
    "path": "/api/v1/service/social-media/update-post",
    "paramLocations": {
      "post_id": "body",
      "message": "body",
      "date": "body",
      "time": "body",
      "timezone": "body",
      "media": "body",
      "tags": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "post_id": {
          "type": "string",
          "description": "ID of the published post to update"
        },
        "message": {
          "type": "string",
          "description": "New post message content"
        },
        "date": {
          "type": "string",
          "description": "New scheduled date (e.g. 2026-04-15)"
        },
        "time": {
          "type": "string",
          "description": "New scheduled time (e.g. 14:30)"
        },
        "timezone": {
          "type": "string",
          "description": "Timezone for the scheduled date/time (e.g. Europe/Warsaw)"
        },
        "media": {
          "type": "array",
          "description": "Updated media for the post. Each entry is either a Simplified asset UUID\nor a fully qualified URL — see `CreatePostRequest.media` for resolution rules.\n",
          "items": {
            "oneOf": [
              {
                "type": "string",
                "format": "uuid",
                "description": "Simplified asset UUID — resolved server-side at publish time."
              },
              {
                "type": "string",
                "format": "uri",
                "description": "Direct media URL — used as-is."
              }
            ]
          }
        },
        "tags": {
          "type": "array",
          "description": "Replace the post's tag (label) IDs with this list. Use `listSocialMediaTags`\nto fetch existing IDs and `createSocialMediaTag` to add new ones.\n",
          "items": {
            "type": "integer"
          }
        }
      },
      "required": [
        "post_id"
      ]
    }
  },
  {
    "name": "list_social_media_tags",
    "description": "List social-media tags (labels)",
    "category": "social_media",
    "method": "GET",
    "path": "/api/v1/tags",
    "paramLocations": {
      "product": "query",
      "pagination": "query"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "product": {
          "type": "string",
          "enum": [
            "social_media"
          ],
          "default": "social_media",
          "description": "Always `social_media` for this MCP — filters out PM tags."
        },
        "pagination": {
          "type": "string",
          "enum": [
            "false"
          ],
          "default": "false",
          "description": "Always `\"false\"` — returns the full list without paging."
        }
      },
      "required": [
        "product"
      ]
    }
  },
  {
    "name": "create_social_media_tag",
    "description": "Create a new social-media tag (label)",
    "category": "social_media",
    "method": "POST",
    "path": "/api/v1/tags",
    "paramLocations": {
      "name": "body",
      "color": "body",
      "product": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "Display name for the new tag. Should be human-readable."
        },
        "color": {
          "type": "string",
          "description": "Optional hex color for the UI badge (e.g. \"#3F51B5\"). Backend assigns a default if omitted."
        },
        "product": {
          "type": "string",
          "enum": [
            "social_media"
          ],
          "default": "social_media",
          "description": "Always `social_media` for this MCP."
        }
      },
      "required": [
        "name",
        "product"
      ]
    }
  },
  {
    "name": "update_social_media_draft",
    "description": "Update a draft social media post",
    "category": "social_media",
    "method": "PUT",
    "path": "/api/v1/service/social-media/update-draft",
    "paramLocations": {
      "draft_id": "body",
      "message": "body",
      "date": "body",
      "time": "body",
      "timezone": "body",
      "media": "body",
      "tags": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "draft_id": {
          "type": "string",
          "description": "ID of the draft to update"
        },
        "message": {
          "type": "string",
          "description": "New draft message content"
        },
        "date": {
          "type": "string",
          "description": "New scheduled date (e.g. 2026-04-15)"
        },
        "time": {
          "type": "string",
          "description": "New scheduled time (e.g. 14:30)"
        },
        "timezone": {
          "type": "string",
          "description": "Timezone for the scheduled date/time (e.g. Europe/Warsaw)"
        },
        "media": {
          "type": "array",
          "description": "Updated media for the draft. Each entry is either a Simplified asset UUID\nor a fully qualified URL — see `CreatePostRequest.media` for resolution rules.\n",
          "items": {
            "oneOf": [
              {
                "type": "string",
                "format": "uuid",
                "description": "Simplified asset UUID — resolved server-side at publish time."
              },
              {
                "type": "string",
                "format": "uri",
                "description": "Direct media URL — used as-is."
              }
            ]
          }
        },
        "tags": {
          "type": "array",
          "description": "Replace the draft's tag (label) IDs with this list. Use `listSocialMediaTags`\nto fetch existing IDs and `createSocialMediaTag` to add new ones.\n",
          "items": {
            "type": "integer"
          }
        }
      },
      "required": [
        "draft_id"
      ]
    }
  },
  {
    "name": "create_social_media_review_bundle",
    "description": "Create a review bundle for social media drafts",
    "category": "social_media",
    "method": "POST",
    "path": "/api/v1/service/social-media/review-bundle/create",
    "paramLocations": {
      "title": "body",
      "description": "body",
      "draft_ids": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "title": {
          "type": "string",
          "maxLength": 255,
          "description": "The title of the review bundle."
        },
        "description": {
          "type": "string",
          "default": "",
          "description": "An optional description for the review bundle."
        },
        "draft_ids": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "default": [],
          "description": "An optional list of draft IDs to seed the bundle with on creation. Get IDs via `getSocialMediaDrafts`."
        }
      },
      "required": [
        "title"
      ]
    }
  },
  {
    "name": "add_drafts_to_social_media_review_bundle",
    "description": "Add drafts to an existing review bundle",
    "category": "social_media",
    "method": "POST",
    "path": "/api/v1/service/social-media/review-bundle/add-drafts",
    "paramLocations": {
      "bundle_id": "body",
      "draft_ids": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "bundle_id": {
          "type": "string",
          "description": "The ID of the existing review bundle to add drafts to."
        },
        "draft_ids": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "minItems": 1,
          "description": "A non-empty list of draft IDs to add to the bundle. Get IDs via `getSocialMediaDrafts`."
        }
      },
      "required": [
        "bundle_id",
        "draft_ids"
      ]
    }
  }
];
