// AUTO-GENERATED from image_tools_openapi.yaml. Do not edit by hand.
// Regenerate with: npm run generate:tools
import type { OpenAPIToolDescriptor } from '../openapi-tool-factory.js';

export const image_tools: OpenAPIToolDescriptor[] = [
  {
    "name": "blur_background",
    "description": "Blur image background",
    "category": "image_tools",
    "method": "POST",
    "path": "/api/v1/image-tools/blur-background",
    "paramLocations": {
      "image_url": "body",
      "blur_value": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "image_url": {
          "type": "string",
          "description": "URL of the source image."
        },
        "blur_value": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "description": "Blur intensity (1–100)."
        }
      },
      "required": [
        "image_url",
        "blur_value"
      ]
    }
  },
  {
    "name": "remove_background",
    "description": "Remove image background",
    "category": "image_tools",
    "method": "POST",
    "path": "/api/v1/image-tools/remove-background",
    "paramLocations": {
      "image_url": "body",
      "magic_crop": "body",
      "background_color": "body",
      "output_format": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "image_url": {
          "type": "string",
          "description": "URL of the source image."
        },
        "magic_crop": {
          "type": "boolean",
          "description": "Auto-crop to subject bounding box after removal."
        },
        "background_color": {
          "type": "string",
          "description": "Fill color after removal (hex, e.g. \"#ffffff\"). Omit for transparent."
        },
        "output_format": {
          "type": "string",
          "enum": [
            "png",
            "jpeg"
          ],
          "description": "Output format. Default png (supports transparency)."
        }
      },
      "required": [
        "image_url"
      ]
    }
  },
  {
    "name": "upscale_image",
    "description": "Upscale image resolution",
    "category": "image_tools",
    "method": "POST",
    "path": "/api/v1/image-tools/upscale-image",
    "paramLocations": {
      "image_url": "body",
      "scale": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "image_url": {
          "type": "string",
          "description": "URL of the source image."
        },
        "scale": {
          "type": "integer",
          "enum": [
            2,
            4,
            8
          ],
          "default": 2,
          "description": "Upscale factor. Default 2×."
        }
      },
      "required": [
        "image_url"
      ]
    }
  },
  {
    "name": "generative_fill",
    "description": "Generative fill / inpaint with prompt",
    "category": "image_tools",
    "method": "POST",
    "path": "/api/v1/image-tools/generative-fill",
    "paramLocations": {
      "image_url": "body",
      "prompt": "body",
      "mask_url": "body",
      "mask_base64": "body",
      "negative_prompt": "body",
      "count": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "image_url": {
          "type": "string",
          "description": "URL of the source image."
        },
        "prompt": {
          "type": "string",
          "description": "Text description of what to generate in the masked area."
        },
        "mask_url": {
          "type": "string",
          "description": "URL of the mask image (white = fill area)."
        },
        "mask_base64": {
          "type": "string",
          "description": "Base64-encoded mask image (alternative to mask_url)."
        },
        "negative_prompt": {
          "type": "string",
          "description": "What to avoid in the generated content."
        },
        "count": {
          "type": "integer",
          "default": 4,
          "description": "Number of variations to generate."
        }
      },
      "required": [
        "image_url",
        "prompt"
      ]
    }
  },
  {
    "name": "image_outpainting",
    "description": "Outpaint / extend image beyond borders",
    "category": "image_tools",
    "method": "POST",
    "path": "/api/v1/image-tools/image-outpainting",
    "paramLocations": {
      "image_url": "body",
      "mask_url": "body",
      "prompt": "body",
      "negative_prompt": "body",
      "guidance_scale": "body",
      "count": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "image_url": {
          "type": "string",
          "description": "URL of the source image."
        },
        "mask_url": {
          "type": "string",
          "description": "URL of the mask defining the region to extend into."
        },
        "prompt": {
          "type": "string",
          "description": "Text description of what to generate in the extended area."
        },
        "negative_prompt": {
          "type": "string",
          "description": "What to avoid in the generated content."
        },
        "guidance_scale": {
          "type": "number",
          "default": 7.5,
          "description": "How closely to follow the prompt (higher = more literal)."
        },
        "count": {
          "type": "integer",
          "default": 4,
          "description": "Number of variations to generate."
        }
      },
      "required": [
        "image_url",
        "mask_url",
        "prompt"
      ]
    }
  },
  {
    "name": "magic_inpaint",
    "description": "Magic inpaint — AI object removal / replacement",
    "category": "image_tools",
    "method": "POST",
    "path": "/api/v1/image-tools/magic-inpaint",
    "paramLocations": {
      "image_url": "body",
      "prompt": "body",
      "scale": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "image_url": {
          "type": "string",
          "description": "URL of the source image."
        },
        "prompt": {
          "type": "string",
          "description": "Text description of the desired result."
        },
        "scale": {
          "type": "number",
          "default": 2,
          "description": "Guidance scale for generation strength."
        }
      },
      "required": [
        "image_url",
        "prompt"
      ]
    }
  },
  {
    "name": "pix_to_pix",
    "description": "Pix-to-pix image transformation",
    "category": "image_tools",
    "method": "POST",
    "path": "/api/v1/image-tools/pix-to-pix",
    "paramLocations": {
      "image_url": "body",
      "prompt": "body",
      "image_guidance_scale": "body",
      "counts": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "image_url": {
          "type": "string",
          "description": "URL of the source image."
        },
        "prompt": {
          "type": "string",
          "description": "Instruction describing the transformation (e.g. \"make it winter\")."
        },
        "image_guidance_scale": {
          "type": "number",
          "default": 1,
          "description": "How much to preserve the original image (higher = closer to original)."
        },
        "counts": {
          "type": "integer",
          "default": 4,
          "description": "Number of variations to generate."
        }
      },
      "required": [
        "image_url",
        "prompt"
      ]
    }
  },
  {
    "name": "replace_image_background",
    "description": "Replace image background",
    "category": "image_tools",
    "method": "POST",
    "path": "/api/v1/image-tools/replace-image",
    "paramLocations": {
      "image_url": "body",
      "replace_type": "body",
      "replace_color": "body",
      "replace_image": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "image_url": {
          "type": "string",
          "description": "URL of the source image."
        },
        "replace_type": {
          "type": "string",
          "enum": [
            "transparent",
            "image",
            "color"
          ],
          "description": "What to replace the background with."
        },
        "replace_color": {
          "type": "string",
          "description": "Hex color for replacement (required when replace_type=color)."
        },
        "replace_image": {
          "type": "string",
          "description": "URL of background image (required when replace_type=image)."
        }
      },
      "required": [
        "image_url",
        "replace_type"
      ]
    }
  },
  {
    "name": "restore_image",
    "description": "Restore / enhance image quality",
    "category": "image_tools",
    "method": "POST",
    "path": "/api/v1/image-tools/restore-image",
    "paramLocations": {
      "image_url": "body",
      "scale": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "image_url": {
          "type": "string",
          "description": "URL of the source image."
        },
        "scale": {
          "type": "number",
          "default": 1,
          "description": "Enhancement strength scale."
        }
      },
      "required": [
        "image_url"
      ]
    }
  },
  {
    "name": "sd_scribble",
    "description": "Scribble to image (ControlNet)",
    "category": "image_tools",
    "method": "POST",
    "path": "/api/v1/image-tools/sd-scribble",
    "paramLocations": {
      "prompt": "body",
      "negative_prompt": "body",
      "image_url": "body",
      "image": "body",
      "image_resolution": "body",
      "steps": "body",
      "guidance_scale": "body",
      "counts": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "prompt": {
          "type": "string",
          "description": "Text description of the desired output image."
        },
        "negative_prompt": {
          "type": "string",
          "description": "What to avoid in the generated image."
        },
        "image_url": {
          "type": "string",
          "description": "URL of the scribble/sketch input image."
        },
        "image": {
          "type": "string",
          "description": "Base64-encoded scribble image (alternative to image_url)."
        },
        "image_resolution": {
          "type": "integer",
          "description": "Output resolution in pixels."
        },
        "steps": {
          "type": "integer",
          "description": "Diffusion steps (higher = better quality, slower)."
        },
        "guidance_scale": {
          "type": "number",
          "description": "How closely to follow the prompt."
        },
        "counts": {
          "type": "integer",
          "default": 4,
          "description": "Number of variations to generate."
        }
      },
      "required": [
        "prompt",
        "negative_prompt"
      ]
    }
  }
];
