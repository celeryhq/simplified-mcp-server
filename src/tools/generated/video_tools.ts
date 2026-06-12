// AUTO-GENERATED from video_tools_openapi.yaml. Do not edit by hand.
// Regenerate with: npm run generate:tools
import type { OpenAPIToolDescriptor } from '../openapi-tool-factory.js';

export const video_tools: OpenAPIToolDescriptor[] = [
  {
    "name": "convert_video_format",
    "description": "Convert video to a different format",
    "category": "video_tools",
    "method": "POST",
    "path": "/api/v1/video-tools/convert-video-format",
    "paramLocations": {
      "video_url": "body",
      "output_format": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "video_url": {
          "type": "string",
          "description": "URL of the source video."
        },
        "output_format": {
          "type": "string",
          "enum": [
            "mp4",
            "avi",
            "mkv",
            "mov",
            "wmv",
            "flv",
            "webm",
            "mpeg",
            "mpg",
            "3gp",
            "ogv",
            "ts",
            "vob",
            "m4v",
            "f4v",
            "rm",
            "divx",
            "asf"
          ]
        }
      },
      "required": [
        "video_url"
      ]
    }
  },
  {
    "name": "merge_videos",
    "description": "Merge multiple videos into one",
    "category": "video_tools",
    "method": "POST",
    "path": "/api/v1/video-tools/merge-videos",
    "paramLocations": {
      "video_urls": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "video_urls": {
          "type": "array",
          "minItems": 2,
          "items": {
            "type": "string"
          },
          "description": "Ordered list of video URLs to merge (minimum 2)."
        }
      },
      "required": [
        "video_urls"
      ]
    }
  },
  {
    "name": "remove_audio",
    "description": "Remove audio track from video",
    "category": "video_tools",
    "method": "POST",
    "path": "/api/v1/video-tools/remove-audio",
    "paramLocations": {
      "video_url": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "video_url": {
          "type": "string",
          "description": "URL of the source video."
        }
      },
      "required": [
        "video_url"
      ]
    }
  },
  {
    "name": "reverse_video",
    "description": "Reverse a video",
    "category": "video_tools",
    "method": "POST",
    "path": "/api/v1/video-tools/reverse-video",
    "paramLocations": {
      "video_url": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "video_url": {
          "type": "string",
          "description": "URL of the source video."
        }
      },
      "required": [
        "video_url"
      ]
    }
  },
  {
    "name": "speedup_video",
    "description": "Change video playback speed",
    "category": "video_tools",
    "method": "POST",
    "path": "/api/v1/video-tools/speedup-video",
    "paramLocations": {
      "video_url": "body",
      "playbackrate": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "video_url": {
          "type": "string",
          "description": "URL of the source video."
        },
        "playbackrate": {
          "type": "number",
          "minimum": 0.5,
          "description": "Playback speed multiplier (e.g. 2.0 = double speed, 0.5 = half speed)."
        }
      },
      "required": [
        "video_url",
        "playbackrate"
      ]
    }
  },
  {
    "name": "add_b_rolls_video",
    "description": "Auto-add B-roll footage to a video",
    "category": "video_tools",
    "method": "POST",
    "path": "/api/v1/video-tools/add-b-rolls-video",
    "paramLocations": {
      "title": "body",
      "media_url": "body",
      "asset": "body",
      "language_code": "body",
      "should_export": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "title": {
          "type": "string",
          "description": "Title or topic of the video (used to source relevant B-roll)."
        },
        "media_url": {
          "type": "string",
          "description": "URL of the source video to add B-roll to."
        },
        "asset": {
          "type": "string",
          "description": "Asset ID of the source video (alternative to media_url)."
        },
        "language_code": {
          "type": "string",
          "description": "Language of the video content (e.g. \"en\", \"es\"). Default \"en\"."
        },
        "should_export": {
          "type": "boolean",
          "description": "Whether to export the final video. Default true."
        }
      },
      "required": [
        "title"
      ]
    }
  },
  {
    "name": "script_to_video",
    "description": "Generate a video from a script",
    "category": "video_tools",
    "method": "POST",
    "path": "/api/v1/video-tools/script-to-video",
    "paramLocations": {
      "payload": "body",
      "should_export": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "payload": {
          "type": "object",
          "required": [
            "title"
          ],
          "properties": {
            "title": {
              "type": "string",
              "description": "Script title or main topic."
            },
            "description": {
              "type": "string",
              "description": "Extended script content or description."
            },
            "keywords": {
              "type": "string",
              "description": "Comma-separated keywords to guide visuals."
            },
            "tone": {
              "type": "string",
              "enum": [
                "professional",
                "casual",
                "humorous",
                "inspirational",
                "educational",
                "dramatic",
                "energetic",
                "calm",
                "friendly",
                "authoritative",
                "storytelling",
                "persuasive"
              ]
            },
            "creativity_level": {
              "type": "number",
              "description": "Creative freedom level (higher = more creative)."
            },
            "language_code": {
              "type": "string",
              "description": "Language for voiceover and captions (e.g. \"en\")."
            },
            "voice_id": {
              "type": "string",
              "description": "Voice ID for the AI voiceover."
            },
            "format": {
              "type": "string",
              "enum": [
                "youtube-shorts",
                "youtube-video",
                "instagram-post-video",
                "mp4"
              ]
            },
            "no_runs": {
              "type": "integer",
              "description": "Number of video variations to generate."
            },
            "logo_id": {
              "type": "string",
              "description": "Asset ID of a logo to include in the video."
            },
            "caption_style_id": {
              "type": "string",
              "description": "ID of the caption style to apply."
            }
          }
        },
        "should_export": {
          "type": "boolean",
          "default": true,
          "description": "Whether to export the final video file."
        }
      },
      "required": [
        "payload"
      ]
    }
  },
  {
    "name": "text_to_video",
    "description": "Generate a video from a text prompt",
    "category": "video_tools",
    "method": "POST",
    "path": "/api/v1/video-tools/text-to-video",
    "paramLocations": {
      "payload": "body",
      "should_export": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "payload": {
          "type": "object",
          "required": [
            "title"
          ],
          "properties": {
            "title": {
              "type": "string",
              "description": "Text prompt describing the video to generate."
            },
            "description": {
              "type": "string",
              "description": "Additional detail or context for the generation."
            },
            "keywords": {
              "type": "string",
              "description": "Comma-separated keywords to guide visuals."
            },
            "tone": {
              "type": "string",
              "enum": [
                "professional",
                "casual",
                "humorous",
                "inspirational",
                "educational",
                "dramatic",
                "energetic",
                "calm",
                "friendly",
                "authoritative",
                "storytelling",
                "persuasive"
              ]
            },
            "creativity_level": {
              "type": "number",
              "description": "Creative freedom level (higher = more creative)."
            },
            "language_code": {
              "type": "string",
              "description": "Language for voiceover and captions (e.g. \"en\")."
            },
            "voice_id": {
              "type": "string",
              "description": "Voice ID for the AI voiceover."
            },
            "format": {
              "type": "string",
              "enum": [
                "youtube-shorts",
                "youtube-video",
                "instagram-post-video",
                "mp4"
              ]
            },
            "no_runs": {
              "type": "integer",
              "description": "Number of video variations to generate."
            },
            "logo_id": {
              "type": "string",
              "description": "Asset ID of a logo to include in the video."
            },
            "caption_style_id": {
              "type": "string",
              "description": "ID of the caption style to apply."
            }
          }
        },
        "should_export": {
          "type": "boolean",
          "default": true,
          "description": "Whether to export the final video file."
        }
      },
      "required": [
        "payload"
      ]
    }
  }
];
