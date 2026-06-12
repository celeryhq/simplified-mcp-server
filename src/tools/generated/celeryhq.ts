// AUTO-GENERATED from celeryhq_openapi.yaml. Do not edit by hand.
// Regenerate with: npm run generate:tools
import type { OpenAPIToolDescriptor } from '../openapi-tool-factory.js';

export const celeryhq: OpenAPIToolDescriptor[] = [
  {
    "name": "get_workspace",
    "description": "Get a workspace",
    "category": "celeryhq",
    "method": "GET",
    "path": "/api/v1/workspaces/{id}",
    "paramLocations": {
      "id": "path"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "integer",
          "description": "Workspace/Organization ID"
        }
      },
      "required": [
        "id"
      ]
    }
  },
  {
    "name": "list_brand_kits",
    "description": "List brand kits",
    "category": "celeryhq",
    "method": "GET",
    "path": "/api/v2/brandkits",
    "paramLocations": {
      "search": "query"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "search": {
          "type": "string",
          "description": "Search term to filter brand kits by title"
        }
      }
    }
  },
  {
    "name": "create_brand_kit",
    "description": "Create a brand kit",
    "category": "celeryhq",
    "method": "POST",
    "path": "/api/v1/brandkit",
    "paramLocations": {
      "title": "body",
      "extra": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "title": {
          "type": "string",
          "description": "Brand name (the only required field)",
          "example": "Velle Studio"
        },
        "extra": {
          "type": "object",
          "description": "Optional extra brand metadata",
          "properties": {
            "description": {
              "type": "string",
              "description": "Short brand description"
            },
            "social_links": {
              "type": "array",
              "items": {
                "type": "object"
              },
              "description": "List of social media link objects"
            }
          }
        }
      },
      "required": [
        "title"
      ]
    }
  },
  {
    "name": "get_brand_book",
    "description": "Get brand book data",
    "category": "celeryhq",
    "method": "GET",
    "path": "/api/v1/brandkit/{brand_id}/brandbook",
    "paramLocations": {
      "brand_id": "path",
      "elements": "query"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "brand_id": {
          "type": "string",
          "format": "uuid",
          "description": "Brand kit UUID"
        },
        "elements": {
          "type": "string",
          "description": "Comma-separated list of elements to include in the response.\nIf omitted, returns only base data (id, title).\n\nAvailable elements (17 total):\n\n**Brand Identity:**\n- `voices` - Brand voice configurations (tone, language, audience)\n- `colors` - Color palettes (flattened RGB array)\n- `fonts` - Font definitions (family, source, payload)\n- `logos` - Logo/banner image (object with `asset_id` and `url`)\n- `cover` - Cover image with URL\n- `description` - Brand description text\n- `social_links` - Social media links array\n\n**Assets:**\n- `assets` - Image/shape assets (minimal: id, name, url, dimensions)\n- `videos` - Video assets (minimal: id, name, url, dimensions)\n\n**Content & Style:**\n- `knowledge` - Knowledge base entries (id, title, payload)\n- `captions` - Caption styles (id, title, animation info)\n- `brief` - AI-generated brand summary\n- `comprehensive` - AI-generated detailed guidelines\n\n**Marketing Brain (Strategy Components):**\n- `brand_icps` - Ideal Customer Profiles with nested jobs-to-be-done\n- `usps` - Unique Selling Propositions with target ICPs\n- `products` - Product definitions with messaging\n- `competitors` - Competitor analysis\n- `content_pillars` - Content strategy pillars\n"
        }
      },
      "required": [
        "brand_id"
      ]
    }
  },
  {
    "name": "import_brand_kit_modules",
    "description": "Import brand kit modules",
    "category": "celeryhq",
    "method": "PATCH",
    "path": "/api/v1/brandkit/{brand_id}/import-modules",
    "paramLocations": {
      "brand_id": "path",
      "company_research": "body",
      "brand_profile": "body",
      "brand_voice": "body",
      "competitor_analysis": "body",
      "market_positioning": "body",
      "icps": "body",
      "customer_journey": "body",
      "usps": "body",
      "messaging_framework": "body",
      "content_pillars": "body",
      "brand_guidelines": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "brand_id": {
          "type": "string",
          "format": "uuid",
          "description": "Brand kit UUID"
        },
        "company_research": {
          "type": "object",
          "additionalProperties": true,
          "description": "Company research data including products, brand assets,\ndigital presence, and market context.\n"
        },
        "brand_profile": {
          "type": "object",
          "additionalProperties": true,
          "description": "Brand identity including mission, vision, personality\narchetype, core values, and positioning statement.\n"
        },
        "brand_voice": {
          "type": "object",
          "additionalProperties": true,
          "description": "Voice characteristics, tone spectrum, vocabulary guidelines,\nand example copy pieces.\n"
        },
        "competitor_analysis": {
          "type": "object",
          "additionalProperties": true,
          "description": "Competitor profiles with threat levels, strengths, weaknesses,\nand competitive positioning.\n"
        },
        "market_positioning": {
          "type": "object",
          "additionalProperties": true,
          "description": "Market category, positioning map, white space opportunities,\nand market trends.\n"
        },
        "icps": {
          "type": "object",
          "additionalProperties": true,
          "description": "Ideal Customer Profiles with demographics, goals, pain points,\nand jobs-to-be-done.\n"
        },
        "customer_journey": {
          "type": "object",
          "additionalProperties": true,
          "description": "Multi-stage customer journeys with touchpoints, content needs,\nand conversion factors.\n"
        },
        "usps": {
          "type": "object",
          "additionalProperties": true,
          "description": "Unique Selling Propositions with proof points and ICP mapping.\nReferences ICPs by profile_name for M2M linking.\n"
        },
        "messaging_framework": {
          "type": "object",
          "additionalProperties": true,
          "description": "Elevator pitches, ICP-specific messages, objection handlers,\ntaglines, and social bios.\n"
        },
        "content_pillars": {
          "type": "object",
          "additionalProperties": true,
          "description": "Content pillars with allocation percentages, sample topics,\nICP matrix, and journey stage mapping.\n"
        },
        "brand_guidelines": {
          "type": "object",
          "additionalProperties": true,
          "description": "Consolidated brand guidelines document covering all brand\nelements, stored as a KnowledgeBase entry.\n"
        }
      },
      "required": [
        "brand_id"
      ]
    }
  },
  {
    "name": "list_context_documents",
    "description": "List context documents",
    "category": "celeryhq",
    "method": "GET",
    "path": "/api/v1/brandkit/{brand_id}/context-documents",
    "paramLocations": {
      "brand_id": "path",
      "canonical_key": "query",
      "search": "query",
      "ordering": "query"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "brand_id": {
          "type": "string",
          "format": "uuid",
          "description": "Brand kit UUID"
        },
        "canonical_key": {
          "type": "string",
          "description": "Filter by canonical type key (e.g. brand_voice, icps)"
        },
        "search": {
          "type": "string",
          "description": "Search by document name or doc_type"
        },
        "ordering": {
          "type": "string",
          "enum": [
            "created",
            "-created",
            "modified",
            "-modified"
          ],
          "default": "-modified",
          "description": "Sort order"
        }
      },
      "required": [
        "brand_id"
      ]
    }
  },
  {
    "name": "create_context_document",
    "description": "Create a context document",
    "category": "celeryhq",
    "method": "POST",
    "path": "/api/v1/brandkit/{brand_id}/context-documents",
    "paramLocations": {
      "brand_id": "path",
      "document_id": "body",
      "doc_type": "body",
      "name": "body",
      "description": "body",
      "data": "body",
      "content": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "brand_id": {
          "type": "string",
          "format": "uuid",
          "description": "Brand kit UUID"
        },
        "document_id": {
          "type": "string",
          "format": "uuid",
          "description": "Link an existing KnowledgeDoc by ID (mutually exclusive with inline fields)"
        },
        "doc_type": {
          "type": "string",
          "description": "Document type key for inline creation (e.g. brand_voice, style_guide)"
        },
        "name": {
          "type": "string",
          "maxLength": 200,
          "description": "Document name for inline creation"
        },
        "description": {
          "type": "string",
          "description": "Document description (optional, defaults to empty)"
        },
        "data": {
          "type": "object",
          "additionalProperties": true,
          "description": "Structured JSON data (optional, defaults to empty object)"
        },
        "content": {
          "type": "string",
          "description": "Markdown content (optional, defaults to empty)"
        }
      },
      "required": [
        "brand_id"
      ]
    }
  },
  {
    "name": "delete_context_document",
    "description": "Delete a context document",
    "category": "celeryhq",
    "method": "DELETE",
    "path": "/api/v1/brandkit/{brand_id}/context-documents/{document_link_id}",
    "paramLocations": {
      "brand_id": "path",
      "document_link_id": "path"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "brand_id": {
          "type": "string",
          "format": "uuid",
          "description": "Brand kit UUID"
        },
        "document_link_id": {
          "type": "string",
          "format": "uuid",
          "description": "Context document link UUID (BrandKitContextDocument ID)"
        }
      },
      "required": [
        "brand_id",
        "document_link_id"
      ]
    }
  },
  {
    "name": "update_context_document",
    "description": "Update a context document",
    "category": "celeryhq",
    "method": "PATCH",
    "path": "/api/v1/brandkit/{brand_id}/context-documents/{document_link_id}",
    "paramLocations": {
      "brand_id": "path",
      "document_link_id": "path",
      "name": "body",
      "description": "body",
      "data": "body",
      "content": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "brand_id": {
          "type": "string",
          "format": "uuid",
          "description": "Brand kit UUID"
        },
        "document_link_id": {
          "type": "string",
          "format": "uuid",
          "description": "Context document link UUID (BrandKitContextDocument ID)"
        },
        "name": {
          "type": "string",
          "maxLength": 200
        },
        "description": {
          "type": "string"
        },
        "data": {
          "type": "object",
          "additionalProperties": true,
          "description": "Structured JSON data"
        },
        "content": {
          "type": "string",
          "description": "Markdown content"
        }
      },
      "required": [
        "brand_id",
        "document_link_id"
      ]
    }
  },
  {
    "name": "get_context_document_by_type",
    "description": "Get context document by type",
    "category": "celeryhq",
    "method": "GET",
    "path": "/api/v1/brandkit/{brand_id}/context-documents/by-type/{context_type}",
    "paramLocations": {
      "brand_id": "path",
      "context_type": "path"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "brand_id": {
          "type": "string",
          "format": "uuid",
          "description": "Brand kit UUID"
        },
        "context_type": {
          "type": "string",
          "pattern": "^[a-z_]+$",
          "enum": [
            "brand_voice",
            "style_guide",
            "seo_guidelines",
            "internal_links",
            "target_keywords",
            "features",
            "competitor_analysis",
            "writing_examples",
            "cro_best_practices",
            "company_research",
            "brand_profile",
            "market_positioning",
            "icps",
            "usps",
            "content_pillars",
            "marketing_strategy"
          ],
          "description": "Canonical type key to retrieve"
        }
      },
      "required": [
        "brand_id",
        "context_type"
      ]
    }
  },
  {
    "name": "build_brand_kit",
    "description": "Populate a brand kit (canonical schema)",
    "category": "celeryhq",
    "method": "POST",
    "path": "/api/v2/brandkits/{brand_id}/build",
    "paramLocations": {
      "brand_id": "path",
      "id": "body",
      "version": "body",
      "extract_ref": "body",
      "brand": "body",
      "social_links": "body",
      "style": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "brand_id": {
          "type": "string",
          "format": "uuid",
          "description": "Brand kit UUID"
        },
        "id": {
          "type": "string",
          "format": "uuid",
          "readOnly": true,
          "description": "Brand kit UUID (GET only)."
        },
        "version": {
          "type": "integer",
          "readOnly": true,
          "description": "Envelope schema version. `1` = legacy kit, `2` = canonical V2.\nServer-stamped. Client values in POST are ignored.\n"
        },
        "extract_ref": {
          "type": "string",
          "description": "Handle returned by `web_brand_extract` (as the `_extract_ref` field).\nWhen set, the agent runtime fetches the cached extraction and fills\nmissing `brand` (name, description, website) and `social_links`\nfields before forwarding to the API. Explicit fields on the request\noverride the inflated values. `style` is NOT auto-filled — the\nagent constructs that payload from the slim extract data.\nThis field is consumed by the apikit pre-hook and is never\nforwarded to the API itself.\n"
        },
        "brand": {
          "type": "object",
          "nullable": true,
          "description": "Core brand identity.",
          "properties": {
            "name": {
              "type": "string",
              "description": "Brand display name. Mirrors BrandKit.title."
            },
            "description": {
              "type": "string",
              "maxLength": 2000,
              "description": "Short brand description."
            },
            "website": {
              "type": "string",
              "description": "Primary website URL. Prepended to social_links as type \"website\"."
            }
          }
        },
        "social_links": {
          "type": "array",
          "description": "Social media and web presence links.",
          "items": {
            "type": "object",
            "properties": {
              "type": {
                "type": "string",
                "description": "Platform type (linkedin, twitter, x, youtube, facebook, instagram, github, website, etc.)"
              },
              "url": {
                "type": "string",
                "description": "Full URL to the profile or page."
              }
            }
          }
        },
        "style": {
          "type": "object",
          "nullable": true,
          "description": "Visual identity sub-document. Versioned independently via `schema_version`.\nSub-fields permit unknown keys for forward-compat (motion tokens, dark-mode palette, etc.)\n",
          "properties": {
            "schema_version": {
              "type": "integer",
              "default": 1,
              "description": "Style sub-schema version. Bump when shape changes."
            },
            "name": {
              "type": "string",
              "description": "Snapshot of brand.name when style was authored."
            },
            "phase": {
              "type": "integer"
            },
            "generated_at": {
              "type": "string",
              "description": "ISO date string."
            },
            "colors": {
              "type": "object",
              "description": "Brand colors grouped by role.",
              "properties": {
                "primary": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "hex": {
                        "type": "string",
                        "description": "Hex code with leading #"
                      },
                      "name": {
                        "type": "string",
                        "description": "Token name (e.g. brand.primary)"
                      },
                      "role": {
                        "type": "string",
                        "description": "Free-form description of where this color is used"
                      }
                    }
                  }
                },
                "secondary": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "hex": {
                        "type": "string",
                        "description": "Hex code with leading #"
                      },
                      "name": {
                        "type": "string",
                        "description": "Token name (e.g. brand.primary)"
                      },
                      "role": {
                        "type": "string",
                        "description": "Free-form description of where this color is used"
                      }
                    }
                  }
                },
                "accent": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "hex": {
                        "type": "string",
                        "description": "Hex code with leading #"
                      },
                      "name": {
                        "type": "string",
                        "description": "Token name (e.g. brand.primary)"
                      },
                      "role": {
                        "type": "string",
                        "description": "Free-form description of where this color is used"
                      }
                    }
                  }
                },
                "neutral": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "hex": {
                        "type": "string",
                        "description": "Hex code with leading #"
                      },
                      "name": {
                        "type": "string",
                        "description": "Token name (e.g. brand.primary)"
                      },
                      "role": {
                        "type": "string",
                        "description": "Free-form description of where this color is used"
                      }
                    }
                  }
                }
              }
            },
            "typography": {
              "type": "object",
              "description": "Brand fonts keyed by slot.",
              "properties": {
                "headline": {
                  "type": "object",
                  "additionalProperties": true,
                  "properties": {
                    "family": {
                      "type": "string"
                    },
                    "weights": {
                      "type": "array",
                      "items": {
                        "type": "integer"
                      }
                    }
                  }
                },
                "body": {
                  "type": "object",
                  "additionalProperties": true,
                  "properties": {
                    "family": {
                      "type": "string"
                    },
                    "weights": {
                      "type": "array",
                      "items": {
                        "type": "integer"
                      }
                    }
                  }
                },
                "accent": {
                  "type": "object",
                  "additionalProperties": true,
                  "properties": {
                    "family": {
                      "type": "string"
                    },
                    "weights": {
                      "type": "array",
                      "items": {
                        "type": "integer"
                      }
                    }
                  }
                }
              }
            },
            "logos": {
              "type": "object",
              "description": "Logo variants keyed by role + global rules.",
              "properties": {
                "primary": {
                  "type": "object",
                  "additionalProperties": true,
                  "properties": {
                    "url": {
                      "type": "string"
                    },
                    "asset_id": {
                      "type": "string",
                      "readOnly": true,
                      "description": "GET-only enrichment when linked to an Asset record."
                    },
                    "on_bg": {
                      "type": "string",
                      "description": "light | dark"
                    },
                    "min_width_px": {
                      "type": "integer"
                    }
                  }
                },
                "primary_dark": {
                  "type": "object",
                  "additionalProperties": true,
                  "properties": {
                    "url": {
                      "type": "string"
                    },
                    "asset_id": {
                      "type": "string",
                      "readOnly": true,
                      "description": "GET-only enrichment when linked to an Asset record."
                    },
                    "on_bg": {
                      "type": "string",
                      "description": "light | dark"
                    },
                    "min_width_px": {
                      "type": "integer"
                    }
                  }
                },
                "mark_only": {
                  "type": "object",
                  "additionalProperties": true,
                  "properties": {
                    "url": {
                      "type": "string"
                    },
                    "asset_id": {
                      "type": "string",
                      "readOnly": true,
                      "description": "GET-only enrichment when linked to an Asset record."
                    },
                    "on_bg": {
                      "type": "string",
                      "description": "light | dark"
                    },
                    "min_width_px": {
                      "type": "integer"
                    }
                  }
                },
                "wordmark_only": {
                  "type": "object",
                  "additionalProperties": true,
                  "properties": {
                    "url": {
                      "type": "string"
                    },
                    "asset_id": {
                      "type": "string",
                      "readOnly": true,
                      "description": "GET-only enrichment when linked to an Asset record."
                    },
                    "on_bg": {
                      "type": "string",
                      "description": "light | dark"
                    },
                    "min_width_px": {
                      "type": "integer"
                    }
                  }
                },
                "clearspace_ratio": {
                  "type": "number"
                },
                "do_not_recolor": {
                  "type": "boolean"
                },
                "do_not_distort": {
                  "type": "boolean"
                }
              }
            },
            "imagery": {
              "type": "object",
              "description": "Visual style guidance for AI image generation.",
              "additionalProperties": true
            },
            "logo_lockup": {
              "type": "object",
              "description": "Where logos appear in compositions.",
              "additionalProperties": true
            },
            "on_image_copy": {
              "type": "object",
              "description": "Rules for text rendered on top of an image.",
              "additionalProperties": true
            },
            "ai_guardrails": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "assets": {
              "type": "object",
              "description": "Reference imagery the brand uses on its website.",
              "properties": {
                "reference_images": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "url": {
                        "type": "string"
                      },
                      "note": {
                        "type": "string"
                      },
                      "asset_id": {
                        "type": "string",
                        "readOnly": true,
                        "description": "GET-only enrichment when linked to an Asset record."
                      }
                    }
                  }
                }
              }
            },
            "prose": {
              "type": "object",
              "description": "Human-readable paragraph descriptions.",
              "additionalProperties": true
            },
            "inferred_fields": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "Dot-paths to fields the agent inferred (vs extracted)."
            }
          }
        }
      },
      "required": [
        "brand_id"
      ]
    }
  },
  {
    "name": "get_brand_kit",
    "description": "Get brand kit",
    "category": "celeryhq",
    "method": "GET",
    "path": "/api/v2/brandkits/{brand_id}",
    "paramLocations": {
      "brand_id": "path",
      "expand": "query",
      "fields": "query",
      "omit": "query"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "brand_id": {
          "type": "string",
          "format": "uuid",
          "description": "Brand kit UUID"
        },
        "expand": {
          "type": "string",
          "description": "Comma-separated expansions (e.g. `extra`, `website`, `extra,website`)."
        },
        "fields": {
          "type": "string",
          "description": "Comma-separated top-level keys to include (sparse fieldset)."
        },
        "omit": {
          "type": "string",
          "description": "Comma-separated top-level keys to exclude."
        }
      },
      "required": [
        "brand_id"
      ]
    }
  },
  {
    "name": "convert_image_format",
    "description": "Convert image format",
    "category": "celeryhq",
    "method": "POST",
    "path": "/api/v1/tools/convert-image-format",
    "paramLocations": {
      "image_url": "body",
      "output_format": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "image_url": {
          "type": "string",
          "format": "uri",
          "description": "URL of the image to convert"
        },
        "output_format": {
          "type": "string",
          "enum": [
            "jpg",
            "jpeg",
            "png",
            "webp",
            "gif",
            "bmp",
            "tiff"
          ],
          "description": "Target format for the converted image"
        }
      },
      "required": [
        "output_format"
      ]
    }
  },
  {
    "name": "generate_image",
    "description": "Generate AI image",
    "category": "celeryhq",
    "method": "POST",
    "path": "/api/v1/ai/image/ai-generate-image-v2",
    "paramLocations": {
      "model": "body",
      "capability": "body",
      "parameters": "body",
      "storage": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "model": {
          "type": "string",
          "description": "AI model/engine ID. Accepts both engine IDs and labels.\nCommon models: flux.flux-realism, flux.flux-schnell,\nflux.flux-kontext-pro, google.gemini-2.5-flash-image,\nopenai.imgen, recraft.recraft, stability.diffusion,\nbytedance.seedream-4\n"
        },
        "capability": {
          "type": "string",
          "description": "Generation mode — NOT where the prompt text goes. The prompt text goes in parameters.prompt.\nImage capabilities:\n- \"prompt\" → text-to-image (most common; put your prompt in parameters.prompt)\n- \"reference_image\" → image-to-image (also requires parameters.reference_images)\n- \"multiple_images\" → batch generation\n- \"first_last_frame\" / \"video_to_video\" → video modes\n",
          "enum": [
            "prompt",
            "reference_image",
            "multiple_images",
            "first_last_frame",
            "video_to_video"
          ]
        },
        "parameters": {
          "type": "object",
          "additionalProperties": true,
          "description": "The generation payload — what the AI model needs to produce the image.\nFor capability=prompt: must contain prompt, aspect_ratio, and count.\nFor capability=reference_image: also include reference_images array.\n",
          "properties": {
            "prompt": {
              "type": "string",
              "description": "Plain-English description of the image to generate"
            },
            "aspect_ratio": {
              "type": "string",
              "description": "Aspect ratio, e.g. \"1:1\", \"16:9\", \"9:16\""
            },
            "count": {
              "type": "integer",
              "description": "Number of images to generate (default 1)"
            },
            "negative_prompt": {
              "type": "string",
              "description": "What to avoid in the generated image"
            }
          },
          "required": [
            "prompt"
          ]
        },
        "storage": {
          "type": "string",
          "enum": [
            "default",
            "transient",
            "asset"
          ],
          "default": "asset",
          "description": "\"asset\" saves as a persistent TldrAsset (recommended — no expiry, visible in asset library).\n\"transient\" generates without saving to database (temporary URL, expires).\n\"default\" persists to AiImageArt gallery.\n"
        }
      },
      "required": [
        "model",
        "capability",
        "parameters"
      ]
    }
  },
  {
    "name": "generate_video",
    "description": "Generate AI video (step 2 of 3)",
    "category": "celeryhq",
    "method": "POST",
    "path": "/api/v1/ai-imageart/ai-generate-video-v2",
    "paramLocations": {
      "model": "body",
      "capability": "body",
      "parameters": "body",
      "storage": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "model": {
          "type": "string",
          "default": "KLING_VIDEO_PRO",
          "description": "Engine id (e.g. `KLING_VIDEO_PRO`, `VEO_3_1`,\n`WAN_V25_PREVIEW`, `SORA_2`, etc.). Discover available\nids by calling `getVideoModelFields` with `type=video`\nand no `model_id` — the response lists every registered\nvideo engine.\n"
        },
        "capability": {
          "type": "string",
          "enum": [
            "prompt",
            "reference_image",
            "multiple_images",
            "first_last_frame",
            "video_to_video"
          ],
          "description": "Which input modality to use. Each model supports a\ndifferent subset — `getVideoModelFields` returns the\nsupported capabilities per model.\n"
        },
        "parameters": {
          "type": "object",
          "description": "Per-(model, capability) field schema is **dynamic** —\nalways call `getVideoModelFields` first. Common keys\nacross engines: `prompt`, `negative_prompt`,\n`aspect_ratio`, `duration`, `image_url`, `image_urls`,\n`first_frame_url`, `last_frame_url`, `video_url`,\n`resolution`, `generate_audio`. File-typed fields take\nan asset UUID (not a raw URL).\n",
          "additionalProperties": true
        },
        "storage": {
          "type": "string",
          "enum": [
            "default",
            "transient",
            "asset"
          ],
          "default": "default",
          "description": "Storage mode for the rendered video — see operation description."
        }
      },
      "required": [
        "model",
        "capability",
        "parameters"
      ]
    }
  },
  {
    "name": "get_video_variation",
    "description": "Poll a video generation job (step 3 of 3)",
    "category": "celeryhq",
    "method": "GET",
    "path": "/api/v1/ai/video/{art_id}/variations/{variation_id}",
    "paramLocations": {
      "art_id": "path",
      "variation_id": "path"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "art_id": {
          "type": "string",
          "description": "AiImageArt UUID returned as `id` from `generateVideo`."
        },
        "variation_id": {
          "type": "string",
          "description": "AIArtVariation UUID returned as `art_variation_id` from `generateVideo`."
        }
      },
      "required": [
        "art_id",
        "variation_id"
      ]
    }
  },
  {
    "name": "get_video_model_fields",
    "description": "Discover model field schema (step 1 of 3)",
    "category": "celeryhq",
    "method": "GET",
    "path": "/api/v1/ai-imageart/model-fields",
    "paramLocations": {
      "type": "query",
      "model_id": "query",
      "capability": "query"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "video",
            "image"
          ],
          "description": "Engine type to introspect."
        },
        "model_id": {
          "type": "string",
          "description": "Engine id (e.g. `KLING_VIDEO_PRO`). Omit to list all engines of `type`."
        },
        "capability": {
          "type": "string",
          "enum": [
            "prompt",
            "reference_image",
            "multiple_images",
            "first_last_frame",
            "video_to_video"
          ],
          "description": "Capability — required to receive the per-(model, capability) field schema; otherwise you get the model's capability map."
        }
      },
      "required": [
        "type"
      ]
    }
  },
  {
    "name": "get_task_result",
    "description": "Get async task result",
    "category": "celeryhq",
    "method": "GET",
    "path": "/api/v1/tasks/{task_id}",
    "paramLocations": {
      "task_id": "path"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "task_id": {
          "type": "string",
          "description": "Celery task ID"
        }
      },
      "required": [
        "task_id"
      ]
    }
  },
  {
    "name": "list_voices",
    "description": "List available TTS voices",
    "category": "celeryhq",
    "method": "GET",
    "path": "/api/v1/voices",
    "paramLocations": {
      "language_code": "query",
      "language_name": "query",
      "search": "query"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "language_code": {
          "type": "string",
          "description": "BCP-47 locale, exact match (e.g. `en-US`, `fr-FR`). Default filter — use this first."
        },
        "language_name": {
          "type": "string",
          "description": "Display name, exact match (e.g. `English (US)`). Use when you only have the display name."
        },
        "search": {
          "type": "string",
          "description": "Substring match across `language_code` and `language_name`. Use for genuinely vague locale requests."
        }
      }
    }
  },
  {
    "name": "generate_audio",
    "description": "Generate TTS audio from text using the selected voice",
    "category": "celeryhq",
    "method": "POST",
    "path": "/api/v1/voices/{voice_id}/translate",
    "paramLocations": {
      "voice_id": "path",
      "text": "body",
      "use_ssml": "body",
      "storage": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "voice_id": {
          "type": "string",
          "format": "uuid",
          "description": "Voice UUID from listVoices `voices[].id`"
        },
        "text": {
          "type": "string",
          "description": "Text to synthesize. HTML entities will be unescaped server-side."
        },
        "use_ssml": {
          "type": "boolean",
          "default": false,
          "description": "Set true ONLY when `text` contains SSML markup like `<speak>`, `<break>`, `<emphasis>`."
        },
        "storage": {
          "type": "string",
          "enum": [
            "default",
            "asset"
          ],
          "default": "default",
          "description": "`default` returns the audio URL only; `asset` also saves a\npersistent TldrAsset (library entry) for reuse.\n"
        }
      },
      "required": [
        "voice_id",
        "text"
      ]
    }
  },
  {
    "name": "create_asset",
    "description": "Create an asset from URL",
    "category": "celeryhq",
    "method": "POST",
    "path": "/api/v1/assets/from-url",
    "paramLocations": {
      "url": "body",
      "asset_type": "body",
      "name": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "url": {
          "type": "string",
          "format": "uri",
          "description": "Remote file URL to download and persist as a workspace asset.\nThe file is downloaded asynchronously (S3 upload + thumbnail\ngeneration). The returned asset UUID is usable immediately —\ne.g. in ProjectItem data.assets[].\n"
        },
        "asset_type": {
          "type": "integer",
          "default": 0,
          "description": "Asset type integer. Use 0 for images (default for AI-generated creatives).\nValues: 0=image, 2=video, 4=giphy, 6=font, 8=audio, 17=pdf.\n"
        },
        "name": {
          "type": "string",
          "description": "Display name for the asset. If omitted, auto-extracted\nfrom the URL filename.\n"
        }
      },
      "required": [
        "url"
      ]
    }
  },
  {
    "name": "create_document",
    "description": "Create a long-form document",
    "category": "celeryhq",
    "method": "POST",
    "path": "/api/v1/documents",
    "paramLocations": {
      "title": "body",
      "form": "body",
      "payload": "body",
      "content": "body",
      "parent": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "title": {
          "type": "string",
          "description": "Document title shown in the editor and the document list.\nFor AI-writer skills, use the essay/article title from\nthe originating show_article tool call.\n"
        },
        "form": {
          "type": "integer",
          "description": "Document form type enum. Use 1 for LONG_FORM\n(Quill-editor-backed documents — the standard for\nessays, articles, and any rich-text content).\n0 = SHORT_FORM (AI templates, not used by these skills).\n"
        },
        "payload": {
          "type": "object",
          "description": "Optional document metadata. Can be left empty ({}).\nSupported fields: description, tone, keywords, voice_id,\noutput. Used for AI template context — not required for\nskill-generated content.\n"
        },
        "content": {
          "type": "object",
          "required": [
            "ops"
          ],
          "description": "Quill Delta JSON representing the document body.\nContains an `ops` array of operations. Each op is a dict\nwith `insert` (string or embed object) and optional\n`attributes` (formatting like bold, italic, header, list,\nlink, code-block, blockquote).\n\nFor markdown-sourced content, call `markdown_to_quill_delta`\nto produce a compliant Delta before passing to this field.\n",
          "properties": {
            "ops": {
              "type": "array",
              "description": "Delta operations array",
              "items": {
                "type": "object"
              }
            }
          }
        },
        "parent": {
          "type": "string",
          "description": "Optional parent document id for creating a sub-document.\nNot used by AI-writer skills in v1.\n"
        }
      },
      "required": [
        "title",
        "form",
        "content"
      ]
    }
  },
  {
    "name": "list_projects",
    "description": "List projects",
    "category": "celeryhq",
    "method": "GET",
    "path": "/api/v1/projects/{resourcetype}",
    "paramLocations": {
      "resourcetype": "path",
      "primary_type": "query",
      "ordering": "query",
      "search": "query"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "resourcetype": {
          "type": "string",
          "description": "Project type selector. Determines the model and serializer used.\nThe API is polymorphic — the same URL structure serves different\nproject types depending on this value.\n"
        },
        "primary_type": {
          "type": "string",
          "description": "Filter by primary type (e.g. pm, blogger)"
        },
        "ordering": {
          "type": "string",
          "description": "Field to order results by"
        },
        "search": {
          "type": "string",
          "description": "Search term to filter projects"
        }
      },
      "required": [
        "resourcetype"
      ]
    }
  },
  {
    "name": "create_project",
    "description": "Create a project",
    "category": "celeryhq",
    "method": "POST",
    "path": "/api/v1/projects/{resourcetype}",
    "paramLocations": {
      "resourcetype": "path",
      "title": "body",
      "description": "body",
      "primary_type": "body",
      "data": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "resourcetype": {
          "type": "string",
          "description": "Project type selector. Determines the model and serializer used.\nThe API is polymorphic — the same URL structure serves different\nproject types depending on this value.\n"
        },
        "title": {
          "type": "string",
          "description": "Project title (defaults to \"Untitled Project\" if omitted)"
        },
        "description": {
          "type": "string",
          "description": "Optional project description"
        },
        "primary_type": {
          "type": "string",
          "description": "Free-form project category string. Known values include:\nad, SMQuotes, AIAvatarVideo, AiProductVideos, UGCVideo,\nImageYTThumb, campaign, blog, or any custom type.\n"
        },
        "data": {
          "type": "object",
          "additionalProperties": true,
          "description": "Flexible JSON data for this project. Has a base schema with\nflags (Dict[str,bool]) but accepts any additional fields.\nUsed to store project-specific config like campaign settings,\nprompts, image params, etc.\n"
        }
      },
      "required": [
        "resourcetype"
      ]
    }
  },
  {
    "name": "get_project",
    "description": "Get a project",
    "category": "celeryhq",
    "method": "GET",
    "path": "/api/v1/projects/{resourcetype}/{id}",
    "paramLocations": {
      "resourcetype": "path",
      "id": "path"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "resourcetype": {
          "type": "string",
          "description": "Project type selector"
        },
        "id": {
          "type": "string",
          "description": "Project ID (UUID or integer depending on type)"
        }
      },
      "required": [
        "resourcetype",
        "id"
      ]
    }
  },
  {
    "name": "delete_project",
    "description": "Delete a project",
    "category": "celeryhq",
    "method": "DELETE",
    "path": "/api/v1/projects/{resourcetype}/{id}",
    "paramLocations": {
      "resourcetype": "path",
      "id": "path"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "resourcetype": {
          "type": "string",
          "description": "Project type selector"
        },
        "id": {
          "type": "string",
          "description": "Project ID (UUID or integer depending on type)"
        }
      },
      "required": [
        "resourcetype",
        "id"
      ]
    }
  },
  {
    "name": "export_project_items",
    "description": "Export project items",
    "category": "celeryhq",
    "method": "POST",
    "path": "/api/v1/projects/{resourcetype}/{id}/export-items",
    "paramLocations": {
      "resourcetype": "path",
      "id": "path",
      "partner_id": "body",
      "item_ids": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "resourcetype": {
          "type": "string",
          "description": "Project type selector"
        },
        "id": {
          "type": "string",
          "description": "Project ID"
        },
        "partner_id": {
          "type": "integer",
          "description": "Partner integration ID to export items to"
        },
        "item_ids": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "uuid"
          },
          "description": "List of ProjectItem UUIDs to export"
        }
      },
      "required": [
        "resourcetype",
        "id",
        "partner_id",
        "item_ids"
      ]
    }
  },
  {
    "name": "list_project_items",
    "description": "List project items",
    "category": "celeryhq",
    "method": "GET",
    "path": "/api/v1/projects/{resourcetype}/{parent_lookup_project_id}/items",
    "paramLocations": {
      "resourcetype": "path",
      "parent_lookup_project_id": "path",
      "primary_type": "query",
      "ordering": "query",
      "search": "query"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "resourcetype": {
          "type": "string",
          "description": "Project type selector"
        },
        "parent_lookup_project_id": {
          "type": "string",
          "description": "Parent project ID"
        },
        "primary_type": {
          "type": "string",
          "description": "Filter by primary type"
        },
        "ordering": {
          "type": "string",
          "description": "Field to order results by"
        },
        "search": {
          "type": "string",
          "description": "Search term to filter items"
        }
      },
      "required": [
        "resourcetype",
        "parent_lookup_project_id"
      ]
    }
  },
  {
    "name": "create_project_item",
    "description": "Create a project item",
    "category": "celeryhq",
    "method": "POST",
    "path": "/api/v1/projects/{resourcetype}/{parent_lookup_project_id}/items",
    "paramLocations": {
      "resourcetype": "path",
      "parent_lookup_project_id": "path",
      "title": "body",
      "description": "body",
      "primary_type": "body",
      "data": "body",
      "start_date": "body",
      "due_date": "body",
      "status": "body",
      "priority": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "resourcetype": {
          "type": "string",
          "description": "Project type selector"
        },
        "parent_lookup_project_id": {
          "type": "string",
          "description": "Parent project ID"
        },
        "title": {
          "type": "string",
          "description": "Item title (defaults to \"Untitled Task\" if omitted)"
        },
        "description": {
          "type": "string",
          "description": "Optional item description"
        },
        "primary_type": {
          "type": "string",
          "description": "Free-form item category string"
        },
        "data": {
          "type": "object",
          "additionalProperties": true,
          "description": "Flexible JSON data for this item. Base schema has assets (list\nof asset IDs) and flags (Dict[str,bool]) but accepts any\nadditional fields.\n"
        },
        "start_date": {
          "type": "string",
          "format": "date-time",
          "description": "Optional start date"
        },
        "due_date": {
          "type": "string",
          "format": "date-time",
          "description": "Optional due date"
        },
        "status": {
          "type": "string",
          "description": "Optional status string (max 16 chars)"
        },
        "priority": {
          "type": "integer",
          "description": "Priority level (default 0)"
        }
      },
      "required": [
        "resourcetype",
        "parent_lookup_project_id"
      ]
    }
  },
  {
    "name": "get_project_item",
    "description": "Get a project item",
    "category": "celeryhq",
    "method": "GET",
    "path": "/api/v1/projects/{resourcetype}/{parent_lookup_project_id}/items/{id}",
    "paramLocations": {
      "resourcetype": "path",
      "parent_lookup_project_id": "path",
      "id": "path"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "resourcetype": {
          "type": "string",
          "description": "Project type selector"
        },
        "parent_lookup_project_id": {
          "type": "string",
          "description": "Parent project ID"
        },
        "id": {
          "type": "string",
          "description": "Item ID (UUID)"
        }
      },
      "required": [
        "resourcetype",
        "parent_lookup_project_id",
        "id"
      ]
    }
  },
  {
    "name": "delete_project_item",
    "description": "Delete a project item",
    "category": "celeryhq",
    "method": "DELETE",
    "path": "/api/v1/projects/{resourcetype}/{parent_lookup_project_id}/items/{id}",
    "paramLocations": {
      "resourcetype": "path",
      "parent_lookup_project_id": "path",
      "id": "path"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "resourcetype": {
          "type": "string",
          "description": "Project type selector"
        },
        "parent_lookup_project_id": {
          "type": "string",
          "description": "Parent project ID"
        },
        "id": {
          "type": "string",
          "description": "Item ID (UUID)"
        }
      },
      "required": [
        "resourcetype",
        "parent_lookup_project_id",
        "id"
      ]
    }
  },
  {
    "name": "assign_agent_to_item",
    "description": "Assign agent to item",
    "category": "celeryhq",
    "method": "POST",
    "path": "/api/v1/projects/{resourcetype}/{parent_lookup_project_id}/items/{id}/assign-agent",
    "paramLocations": {
      "resourcetype": "path",
      "parent_lookup_project_id": "path",
      "id": "path",
      "agent_id": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "resourcetype": {
          "type": "string",
          "description": "Project type selector"
        },
        "parent_lookup_project_id": {
          "type": "string",
          "description": "Parent project ID"
        },
        "id": {
          "type": "string",
          "description": "Item ID (UUID)"
        },
        "agent_id": {
          "type": "string",
          "format": "uuid",
          "description": "UUID of the agent (Chatbot) to assign to this item"
        }
      },
      "required": [
        "resourcetype",
        "parent_lookup_project_id",
        "id",
        "agent_id"
      ]
    }
  },
  {
    "name": "reorder_project_item",
    "description": "Reorder a project item",
    "category": "celeryhq",
    "method": "POST",
    "path": "/api/v1/projects/{resourcetype}/{parent_lookup_project_id}/items/{id}/reorder",
    "paramLocations": {
      "resourcetype": "path",
      "parent_lookup_project_id": "path",
      "id": "path",
      "position": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "resourcetype": {
          "type": "string",
          "description": "Project type selector"
        },
        "parent_lookup_project_id": {
          "type": "string",
          "description": "Parent project ID"
        },
        "id": {
          "type": "string",
          "description": "Item ID (UUID)"
        },
        "position": {
          "type": "integer",
          "description": "New position index for the item"
        }
      },
      "required": [
        "resourcetype",
        "parent_lookup_project_id",
        "id"
      ]
    }
  }
];
