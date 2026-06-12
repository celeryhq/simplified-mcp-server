// AUTO-GENERATED from comments_openapi.yaml. Do not edit by hand.
// Regenerate with: npm run generate:tools
import type { OpenAPIToolDescriptor } from '../openapi-tool-factory.js';

export const comments: OpenAPIToolDescriptor[] = [
  {
    "name": "list_comments",
    "description": "List comments",
    "category": "comments",
    "method": "GET",
    "path": "/api/v1/comments",
    "paramLocations": {
      "Organization": "header",
      "Space": "header",
      "object_pk": "query",
      "content_type": "query",
      "page": "query",
      "page_size": "query"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        },
        "object_pk": {
          "type": "string",
          "description": "UUID of the resource whose comments you want."
        },
        "content_type": {
          "type": "string",
          "enum": [
            "task"
          ],
          "description": "Resource type. Currently `task`."
        },
        "page": {
          "type": "integer",
          "description": "1-based page number for paginated list endpoints."
        },
        "page_size": {
          "type": "integer",
          "description": "Page size for paginated list endpoints."
        }
      },
      "required": [
        "object_pk",
        "content_type"
      ]
    }
  },
  {
    "name": "add_comment",
    "description": "Add a comment",
    "category": "comments",
    "method": "POST",
    "path": "/api/v1/comments",
    "paramLocations": {
      "Organization": "header",
      "Space": "header",
      "object_pk": "body",
      "content_type": "body",
      "comment": "body",
      "parent": "body"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        },
        "object_pk": {
          "type": "string",
          "description": "UUID of the resource being commented on (the task ID for\ncontent_type=task, etc.).\n"
        },
        "content_type": {
          "type": "string",
          "enum": [
            "task"
          ],
          "description": "Commentable resource type. Currently supports `task`; other\ntypes (e.g. `document`, `project`) will be added as the\ncommentable surface grows.\n"
        },
        "comment": {
          "type": "string",
          "description": "Comment text."
        },
        "parent": {
          "type": "integer",
          "description": "Parent comment ID for threaded replies. Omit for a top-level\ncomment.\n"
        }
      },
      "required": [
        "object_pk",
        "content_type",
        "comment"
      ]
    }
  }
];
