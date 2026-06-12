// AUTO-GENERATED from smp_pm_openapi.yaml. Do not edit by hand.
// Regenerate with: npm run generate:tools
import type { OpenAPIToolDescriptor } from '../openapi-tool-factory.js';

export const smp_pm: OpenAPIToolDescriptor[] = [
  {
    "name": "list_boards",
    "description": "List boards",
    "category": "smp_pm",
    "method": "GET",
    "path": "/api/v1/pm/boards",
    "paramLocations": {
      "Organization": "header",
      "Space": "header",
      "primary_type": "query",
      "is_public": "query",
      "expand": "query",
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
        "primary_type": {
          "type": "string",
          "description": "Filter by board primary type (defaults to `PM`)."
        },
        "is_public": {
          "type": "boolean"
        },
        "expand": {
          "type": "string",
          "description": "Comma-separated list of fields to expand inline on the response\n(FlexFields style, e.g. `assignees,tags,time_tracking`).\n"
        },
        "page": {
          "type": "integer",
          "description": "1-based page number for paginated list endpoints."
        },
        "page_size": {
          "type": "integer",
          "description": "Page size for paginated list endpoints."
        }
      }
    }
  },
  {
    "name": "create_board",
    "description": "Create a board",
    "category": "smp_pm",
    "method": "POST",
    "path": "/api/v1/pm/boards",
    "paramLocations": {
      "Organization": "header",
      "Space": "header",
      "title": "body",
      "description": "body",
      "access": "body",
      "primary_type": "body",
      "statuses": "body",
      "extra": "body"
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
        "title": {
          "type": "string",
          "maxLength": 2048,
          "description": "Board title. Defaults to \"{workspace} Project\" if omitted."
        },
        "description": {
          "type": "string",
          "description": "Board description."
        },
        "access": {
          "type": "integer",
          "description": "Board access: 0=PRIVATE (default), 1=PROTECTED (workspace-shared),\n2=PUBLIC.\n"
        },
        "primary_type": {
          "type": "string",
          "description": "Board type discriminator. Defaults to `PM`. Other values reserved\nfor non-project-manager boards.\n"
        },
        "statuses": {
          "type": "array",
          "description": "Optional inline status definitions to seed the board with.\nIf omitted, the board gets the 4 default statuses\n(Draft / To Do / In Progress / Completed).\n",
          "items": {
            "type": "object",
            "required": [
              "title"
            ],
            "properties": {
              "title": {
                "type": "string",
                "maxLength": 32
              },
              "color": {
                "type": "string",
                "description": "Hex color string, e.g. \"#008CD3\"."
              }
            }
          }
        },
        "extra": {
          "type": "object",
          "additionalProperties": true,
          "description": "Free-form board configuration (`_config` on the model)."
        }
      }
    }
  },
  {
    "name": "get_board",
    "description": "Get a board",
    "category": "smp_pm",
    "method": "GET",
    "path": "/api/v1/pm/boards/{board_id}",
    "paramLocations": {
      "board_id": "path",
      "Organization": "header",
      "Space": "header",
      "expand": "query"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "board_id": {
          "type": "string",
          "description": "Board UUID or slug."
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        },
        "expand": {
          "type": "string",
          "description": "Comma-separated list of fields to expand inline on the response\n(FlexFields style, e.g. `assignees,tags,time_tracking`).\n"
        }
      },
      "required": [
        "board_id"
      ]
    }
  },
  {
    "name": "delete_board",
    "description": "Delete a board",
    "category": "smp_pm",
    "method": "DELETE",
    "path": "/api/v1/pm/boards/{board_id}",
    "paramLocations": {
      "board_id": "path",
      "Organization": "header",
      "Space": "header"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "board_id": {
          "type": "string",
          "description": "Board UUID or slug."
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        }
      },
      "required": [
        "board_id"
      ]
    }
  },
  {
    "name": "update_board",
    "description": "Update a board",
    "category": "smp_pm",
    "method": "PATCH",
    "path": "/api/v1/pm/boards/{board_id}",
    "paramLocations": {
      "board_id": "path",
      "Organization": "header",
      "Space": "header",
      "title": "body",
      "description": "body",
      "access": "body",
      "extra": "body"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "board_id": {
          "type": "string",
          "description": "Board UUID or slug."
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        },
        "title": {
          "type": "string",
          "maxLength": 2048
        },
        "description": {
          "type": "string"
        },
        "access": {
          "type": "integer",
          "description": "0=PRIVATE, 1=PROTECTED, 2=PUBLIC."
        },
        "extra": {
          "type": "object",
          "additionalProperties": true,
          "description": "Free-form board configuration (merged into `_config`)."
        }
      },
      "required": [
        "board_id"
      ]
    }
  },
  {
    "name": "clone_board",
    "description": "Clone a board",
    "category": "smp_pm",
    "method": "POST",
    "path": "/api/v1/pm/boards/{board_id}/clone",
    "paramLocations": {
      "board_id": "path",
      "Organization": "header",
      "Space": "header",
      "target": "body"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "board_id": {
          "type": "string"
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        },
        "target": {
          "type": "integer",
          "description": "Target workspace or space ID. If omitted, clones into the current\nspace (or workspace if no space header).\n"
        }
      },
      "required": [
        "board_id"
      ]
    }
  },
  {
    "name": "list_statuses",
    "description": "List statuses on a board",
    "category": "smp_pm",
    "method": "GET",
    "path": "/api/v1/pm/boards/{board_id}/status",
    "paramLocations": {
      "board_id": "path",
      "Organization": "header",
      "Space": "header",
      "expand": "query"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "board_id": {
          "type": "string",
          "format": "uuid"
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        },
        "expand": {
          "type": "string",
          "description": "Comma-separated list of fields to expand inline on the response\n(FlexFields style, e.g. `assignees,tags,time_tracking`).\n"
        }
      },
      "required": [
        "board_id"
      ]
    }
  },
  {
    "name": "create_status",
    "description": "Create a status on a board",
    "category": "smp_pm",
    "method": "POST",
    "path": "/api/v1/pm/boards/{board_id}/status",
    "paramLocations": {
      "board_id": "path",
      "Organization": "header",
      "Space": "header",
      "title": "body",
      "description": "body",
      "color": "body",
      "order": "body"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "board_id": {
          "type": "string",
          "format": "uuid"
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        },
        "title": {
          "type": "string",
          "maxLength": 32
        },
        "description": {
          "type": "string"
        },
        "color": {
          "type": "string",
          "description": "Hex color string."
        },
        "order": {
          "type": "integer",
          "description": "Optional explicit order index."
        }
      },
      "required": [
        "board_id",
        "title"
      ]
    }
  },
  {
    "name": "get_status",
    "description": "Get a status",
    "category": "smp_pm",
    "method": "GET",
    "path": "/api/v1/pm/boards/{board_id}/status/{status_id}",
    "paramLocations": {
      "board_id": "path",
      "status_id": "path",
      "Organization": "header",
      "Space": "header",
      "expand": "query"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "board_id": {
          "type": "string",
          "format": "uuid"
        },
        "status_id": {
          "type": "string",
          "format": "uuid"
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        },
        "expand": {
          "type": "string",
          "description": "Comma-separated list of fields to expand inline on the response\n(FlexFields style, e.g. `assignees,tags,time_tracking`).\n"
        }
      },
      "required": [
        "board_id",
        "status_id"
      ]
    }
  },
  {
    "name": "delete_status",
    "description": "Delete a status",
    "category": "smp_pm",
    "method": "DELETE",
    "path": "/api/v1/pm/boards/{board_id}/status/{status_id}",
    "paramLocations": {
      "board_id": "path",
      "status_id": "path",
      "Organization": "header",
      "Space": "header"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "board_id": {
          "type": "string",
          "format": "uuid"
        },
        "status_id": {
          "type": "string",
          "format": "uuid"
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        }
      },
      "required": [
        "board_id",
        "status_id"
      ]
    }
  },
  {
    "name": "update_status",
    "description": "Update a status",
    "category": "smp_pm",
    "method": "PATCH",
    "path": "/api/v1/pm/boards/{board_id}/status/{status_id}",
    "paramLocations": {
      "board_id": "path",
      "status_id": "path",
      "Organization": "header",
      "Space": "header",
      "title": "body",
      "description": "body",
      "color": "body",
      "order": "body"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "board_id": {
          "type": "string",
          "format": "uuid"
        },
        "status_id": {
          "type": "string",
          "format": "uuid"
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        },
        "title": {
          "type": "string",
          "maxLength": 32
        },
        "description": {
          "type": "string"
        },
        "color": {
          "type": "string"
        },
        "order": {
          "type": "integer",
          "description": "Pass to reposition this status column."
        }
      },
      "required": [
        "board_id",
        "status_id"
      ]
    }
  },
  {
    "name": "move_status",
    "description": "Reassign all tasks under this status to another status",
    "category": "smp_pm",
    "method": "POST",
    "path": "/api/v1/pm/status/{status_id}/move",
    "paramLocations": {
      "status_id": "path",
      "Organization": "header",
      "Space": "header",
      "body_status_id": "body"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "bodyNames": {
      "body_status_id": "status_id"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "status_id": {
          "type": "string",
          "format": "uuid"
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        },
        "body_status_id": {
          "type": "string",
          "format": "uuid",
          "description": "Target status to receive the tasks."
        }
      },
      "required": [
        "status_id",
        "body_status_id"
      ]
    }
  },
  {
    "name": "list_tasks",
    "description": "List tasks",
    "category": "smp_pm",
    "method": "GET",
    "path": "/api/v1/pm/tasks",
    "paramLocations": {
      "Organization": "header",
      "Space": "header",
      "board": "query",
      "status": "query",
      "assignees": "query",
      "tags": "query",
      "task_type": "query",
      "start_date_after": "query",
      "start_date_before": "query",
      "due_date_after": "query",
      "due_date_before": "query",
      "search": "query",
      "expand": "query",
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
        "board": {
          "type": "string",
          "format": "uuid",
          "description": "Filter by board UUID."
        },
        "status": {
          "type": "string",
          "format": "uuid"
        },
        "assignees": {
          "type": "string",
          "description": "Comma-separated user IDs."
        },
        "tags": {
          "type": "string",
          "description": "Comma-separated tag IDs."
        },
        "task_type": {
          "type": "string",
          "enum": [
            "TASK",
            "SUBTASK",
            "CHECKLIST",
            "TEMPLATE"
          ]
        },
        "start_date_after": {
          "type": "string",
          "format": "date"
        },
        "start_date_before": {
          "type": "string",
          "format": "date"
        },
        "due_date_after": {
          "type": "string",
          "format": "date"
        },
        "due_date_before": {
          "type": "string",
          "format": "date"
        },
        "search": {
          "type": "string",
          "description": "Search over `title` and `description`."
        },
        "expand": {
          "type": "string",
          "description": "Comma-separated list of fields to expand inline on the response\n(FlexFields style, e.g. `assignees,tags,time_tracking`).\n"
        },
        "page": {
          "type": "integer",
          "description": "1-based page number for paginated list endpoints."
        },
        "page_size": {
          "type": "integer",
          "description": "Page size for paginated list endpoints."
        }
      }
    }
  },
  {
    "name": "create_task",
    "description": "Create a task",
    "category": "smp_pm",
    "method": "POST",
    "path": "/api/v1/pm/tasks",
    "paramLocations": {
      "Organization": "header",
      "Space": "header",
      "status": "body",
      "title": "body",
      "description": "body",
      "rich_description": "body",
      "start_date": "body",
      "due_date": "body",
      "priority": "body",
      "parent": "body",
      "task_type": "body",
      "complete": "body",
      "estimated_hours": "body",
      "order": "body",
      "extra": "body",
      "custom_fields": "body",
      "tags": "body",
      "assignees": "body"
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
        "status": {
          "type": "string",
          "format": "uuid",
          "description": "Target status UUID."
        },
        "title": {
          "type": "string",
          "maxLength": 2048
        },
        "description": {
          "type": "string",
          "description": "Plain text task description. This is the field agents and CLI users\nshould set. The toolkit converts it to a Quill Delta and writes\n`rich_description` automatically.\n"
        },
        "rich_description": {
          "type": "object",
          "additionalProperties": true,
          "description": "INTERNAL — Quill Delta representation. Set automatically by the\ntoolkit when you pass `description`. Do not pass directly unless\nyou have a pre-built Delta and know what you're doing.\n"
        },
        "start_date": {
          "type": "string",
          "format": "date-time"
        },
        "due_date": {
          "type": "string",
          "format": "date-time"
        },
        "priority": {
          "type": "integer",
          "description": "Priority enum value."
        },
        "parent": {
          "type": "string",
          "format": "uuid",
          "description": "Parent task UUID (for subtasks)."
        },
        "task_type": {
          "type": "string",
          "enum": [
            "TASK",
            "SUBTASK",
            "CHECKLIST",
            "TEMPLATE"
          ],
          "description": "Task discriminator. Defaults to `TASK`."
        },
        "complete": {
          "type": "boolean"
        },
        "estimated_hours": {
          "type": "number",
          "format": "float",
          "description": "Estimated completion time in hours."
        },
        "order": {
          "type": "integer"
        },
        "extra": {
          "type": "object",
          "additionalProperties": true,
          "description": "Free-form payload (`_extra` on the model)."
        },
        "custom_fields": {
          "type": "object",
          "additionalProperties": true,
          "description": "Map of custom field UUID → value. Validated against board's\ncustom-field configuration.\n"
        },
        "tags": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Tag names to apply to the task on creation (native — set in one call)."
        },
        "assignees": {
          "type": "array",
          "items": {
            "type": "integer"
          },
          "description": "Integer user IDs to assign (get from listWorkspaceMembers). Composite field —\ntoolkit calls POST /tasks/{id}/assignees/ automatically after creation.\nNote: assignees are NOT in the createTask response; use getTask?expand=assignees to verify.\n"
        }
      },
      "required": [
        "status"
      ]
    }
  },
  {
    "name": "get_task",
    "description": "Get a task",
    "category": "smp_pm",
    "method": "GET",
    "path": "/api/v1/pm/tasks/{task_id}",
    "paramLocations": {
      "task_id": "path",
      "Organization": "header",
      "Space": "header",
      "expand": "query"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "task_id": {
          "type": "string",
          "description": "Task UUID or slug."
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        },
        "expand": {
          "type": "string",
          "description": "Comma-separated list of fields to expand inline on the response\n(FlexFields style, e.g. `assignees,tags,time_tracking`).\n"
        }
      },
      "required": [
        "task_id"
      ]
    }
  },
  {
    "name": "delete_task",
    "description": "Delete a task",
    "category": "smp_pm",
    "method": "DELETE",
    "path": "/api/v1/pm/tasks/{task_id}",
    "paramLocations": {
      "task_id": "path",
      "Organization": "header",
      "Space": "header"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "task_id": {
          "type": "string",
          "description": "Task UUID or slug."
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        }
      },
      "required": [
        "task_id"
      ]
    }
  },
  {
    "name": "update_task",
    "description": "Update a task",
    "category": "smp_pm",
    "method": "PATCH",
    "path": "/api/v1/pm/tasks/{task_id}",
    "paramLocations": {
      "task_id": "path",
      "Organization": "header",
      "Space": "header",
      "title": "body",
      "description": "body",
      "rich_description": "body",
      "status": "body",
      "start_date": "body",
      "due_date": "body",
      "priority": "body",
      "complete": "body",
      "estimated_hours": "body",
      "order": "body",
      "extra": "body",
      "custom_fields": "body",
      "assignees_add": "body",
      "assignees_remove": "body",
      "tags_add": "body",
      "tags_remove": "body"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "task_id": {
          "type": "string",
          "description": "Task UUID or slug."
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        },
        "title": {
          "type": "string",
          "maxLength": 2048
        },
        "description": {
          "type": "string",
          "description": "Plain text task description. This is the field agents and CLI users\nshould set. The toolkit converts it to a Quill Delta and writes\n`rich_description` automatically.\n"
        },
        "rich_description": {
          "type": "object",
          "additionalProperties": true,
          "description": "INTERNAL — Quill Delta representation. Set automatically by the\ntoolkit when you pass `description`. Do not pass directly unless\nyou have a pre-built Delta and know what you're doing.\n"
        },
        "status": {
          "type": "string",
          "format": "uuid",
          "description": "Move task to a new status (on the same or different board)."
        },
        "start_date": {
          "type": "string",
          "format": "date-time",
          "nullable": true
        },
        "due_date": {
          "type": "string",
          "format": "date-time",
          "nullable": true
        },
        "priority": {
          "type": "integer"
        },
        "complete": {
          "type": "boolean",
          "description": "Marking a task complete is rejected if the task has incomplete\nblockers or a running timer.\n"
        },
        "estimated_hours": {
          "type": "number",
          "format": "float",
          "nullable": true
        },
        "order": {
          "type": "integer",
          "description": "Pass to reposition the task inside its status."
        },
        "extra": {
          "type": "object",
          "additionalProperties": true
        },
        "custom_fields": {
          "type": "object",
          "additionalProperties": true
        },
        "assignees_add": {
          "type": "array",
          "items": {
            "type": "integer"
          },
          "description": "Integer user IDs to add as assignees (get from listWorkspaceMembers). Toolkit calls\nPOST /tasks/{id}/assignees/ with {\"add\": [...]} after the PATCH.\n"
        },
        "assignees_remove": {
          "type": "array",
          "items": {
            "type": "integer"
          },
          "description": "Integer user IDs to remove from assignees (get from listWorkspaceMembers). Toolkit calls\nPOST /tasks/{id}/assignees/ with {\"remove\": [...]} after the PATCH.\n"
        },
        "tags_add": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Composite field — tag names to add. Toolkit calls\nPOST /tasks/{id}/tags/ with {\"add\": [...]} after the PATCH.\n"
        },
        "tags_remove": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Composite field — tag names to remove. Toolkit calls\nPOST /tasks/{id}/tags/ with {\"remove\": [...]} after the PATCH.\n"
        }
      },
      "required": [
        "task_id"
      ]
    }
  },
  {
    "name": "list_subtasks",
    "description": "List subtasks for a task",
    "category": "smp_pm",
    "method": "GET",
    "path": "/api/v1/pm/tasks/{task_id}/subtasks",
    "paramLocations": {
      "task_id": "path",
      "Organization": "header",
      "Space": "header"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "task_id": {
          "type": "string"
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        }
      },
      "required": [
        "task_id"
      ]
    }
  },
  {
    "name": "get_task_activity",
    "description": "Get task activity stream",
    "category": "smp_pm",
    "method": "GET",
    "path": "/api/v1/pm/tasks/{task_id}/activity",
    "paramLocations": {
      "task_id": "path",
      "Organization": "header",
      "Space": "header",
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
        "task_id": {
          "type": "string"
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
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
        "task_id"
      ]
    }
  },
  {
    "name": "update_task_assignees",
    "description": "Add or remove task assignees",
    "category": "smp_pm",
    "method": "POST",
    "path": "/api/v1/pm/tasks/{task_id}/assignees",
    "paramLocations": {
      "task_id": "path",
      "Organization": "header",
      "Space": "header",
      "add": "body",
      "remove": "body"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "task_id": {
          "type": "string"
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        },
        "add": {
          "type": "array",
          "items": {
            "type": "integer"
          },
          "description": "IDs to add."
        },
        "remove": {
          "type": "array",
          "items": {
            "type": "integer"
          },
          "description": "IDs to remove."
        }
      },
      "required": [
        "task_id"
      ]
    }
  },
  {
    "name": "update_task_tags",
    "description": "Add or remove task tags (by name)",
    "category": "smp_pm",
    "method": "POST",
    "path": "/api/v1/pm/tasks/{task_id}/tags",
    "paramLocations": {
      "task_id": "path",
      "Organization": "header",
      "Space": "header",
      "add": "body",
      "remove": "body"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "task_id": {
          "type": "string"
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        },
        "add": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "String values to add."
        },
        "remove": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "String values to remove."
        }
      },
      "required": [
        "task_id"
      ]
    }
  },
  {
    "name": "update_task_attachments",
    "description": "Add or remove task attachments",
    "category": "smp_pm",
    "method": "POST",
    "path": "/api/v1/pm/tasks/{task_id}/attachment",
    "paramLocations": {
      "task_id": "path",
      "Organization": "header",
      "Space": "header",
      "add": "body",
      "remove": "body"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "task_id": {
          "type": "string"
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        },
        "add": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": true
          }
        },
        "remove": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "task_id"
      ]
    }
  },
  {
    "name": "clone_task",
    "description": "Clone a task",
    "category": "smp_pm",
    "method": "POST",
    "path": "/api/v1/pm/tasks/{task_id}/clone",
    "paramLocations": {
      "task_id": "path",
      "Organization": "header",
      "Space": "header",
      "title": "body",
      "status": "body",
      "fields": "body"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "task_id": {
          "type": "string"
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        },
        "title": {
          "type": "string"
        },
        "status": {
          "type": "string",
          "description": "Target status UUID. Defaults to the source status."
        },
        "fields": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Subset of fields to copy. Common values: `title`, `description`,\n`rich_description`, `assignees`, `attachments`, `subtasks`, `tags`,\n`priority`, `start_date`, `due_date`, `checklist`.\n"
        }
      },
      "required": [
        "task_id",
        "fields"
      ]
    }
  },
  {
    "name": "update_task_custom_fields",
    "description": "Set custom field values on a task",
    "category": "smp_pm",
    "method": "PATCH",
    "path": "/api/v1/pm/tasks/{task_id}/custom-fields",
    "paramLocations": {
      "task_id": "path",
      "Organization": "header",
      "Space": "header",
      "custom_fields": "body"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "task_id": {
          "type": "string",
          "description": "Task UUID or slug."
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        },
        "custom_fields": {
          "type": "object",
          "additionalProperties": true,
          "description": "Map of custom field UUID → value."
        }
      },
      "required": [
        "task_id",
        "custom_fields"
      ]
    }
  },
  {
    "name": "get_task_dependencies",
    "description": "Get the dependency graph for a task",
    "category": "smp_pm",
    "method": "GET",
    "path": "/api/v1/pm/tasks/{task_id}/dependencies",
    "paramLocations": {
      "task_id": "path",
      "Organization": "header",
      "Space": "header"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "task_id": {
          "type": "string"
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        }
      },
      "required": [
        "task_id"
      ]
    }
  },
  {
    "name": "add_task_dependency",
    "description": "Add a dependency to a task",
    "category": "smp_pm",
    "method": "POST",
    "path": "/api/v1/pm/tasks/{task_id}/add_dependency",
    "paramLocations": {
      "task_id": "path",
      "Organization": "header",
      "Space": "header",
      "target_task_id": "body",
      "relation_type": "body"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "task_id": {
          "type": "string"
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        },
        "target_task_id": {
          "type": "string",
          "format": "uuid"
        },
        "relation_type": {
          "type": "string",
          "enum": [
            "BLOCKS",
            "RELATES_TO",
            "DUPLICATES"
          ],
          "default": "BLOCKS"
        }
      },
      "required": [
        "task_id",
        "target_task_id"
      ]
    }
  },
  {
    "name": "remove_task_dependency",
    "description": "Remove a task dependency",
    "category": "smp_pm",
    "method": "DELETE",
    "path": "/api/v1/pm/tasks/{task_id}/dependencies/{relationship_id}",
    "paramLocations": {
      "task_id": "path",
      "relationship_id": "path",
      "Organization": "header",
      "Space": "header"
    },
    "headerNames": {
      "Organization": "Organization",
      "Space": "Space"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "task_id": {
          "type": "string"
        },
        "relationship_id": {
          "type": "string",
          "format": "uuid"
        },
        "Organization": {
          "type": "integer",
          "description": "Workspace (organization) ID the request is scoped to."
        },
        "Space": {
          "type": "integer",
          "description": "Optional sub-space ID for further scoping inside the workspace."
        }
      },
      "required": [
        "task_id",
        "relationship_id"
      ]
    }
  },
  {
    "name": "search_boards",
    "description": "Search boards (Elasticsearch-backed) — prefer listBoards",
    "category": "smp_pm",
    "method": "GET",
    "path": "/api/v1/pm/search/boards",
    "paramLocations": {
      "Organization": "header",
      "Space": "header",
      "search": "query",
      "ordering": "query",
      "ids": "query",
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
        "search": {
          "type": "string",
          "description": "Full-text search over board titles."
        },
        "ordering": {
          "type": "string",
          "description": "Sort order (e.g. `-modified`)."
        },
        "ids": {
          "type": "string",
          "description": "Comma-separated board IDs."
        },
        "page": {
          "type": "integer",
          "description": "1-based page number for paginated list endpoints."
        },
        "page_size": {
          "type": "integer",
          "description": "Page size for paginated list endpoints."
        }
      }
    }
  },
  {
    "name": "search_tasks",
    "description": "Search tasks (Elasticsearch-backed)",
    "category": "smp_pm",
    "method": "GET",
    "path": "/api/v1/pm/search/tasks",
    "paramLocations": {
      "Organization": "header",
      "Space": "header",
      "search": "query",
      "board": "query",
      "status": "query",
      "assignees": "query",
      "tags": "query",
      "priority": "query",
      "complete": "query",
      "task_type": "query",
      "start_date": "query",
      "due_date": "query",
      "ordering": "query",
      "expand": "query",
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
        "search": {
          "type": "string"
        },
        "board": {
          "type": "string",
          "format": "uuid"
        },
        "status": {
          "type": "string",
          "format": "uuid"
        },
        "assignees": {
          "type": "string",
          "description": "Nested filter on assignees (e.g. `assignees:123`)."
        },
        "tags": {
          "type": "string",
          "description": "Nested filter on tags (e.g. `tags:42`)."
        },
        "priority": {
          "type": "integer"
        },
        "complete": {
          "type": "boolean"
        },
        "task_type": {
          "type": "string",
          "enum": [
            "TASK",
            "SUBTASK",
            "CHECKLIST",
            "TEMPLATE"
          ]
        },
        "start_date": {
          "type": "string"
        },
        "due_date": {
          "type": "string"
        },
        "ordering": {
          "type": "string"
        },
        "expand": {
          "type": "string",
          "description": "Comma-separated list of fields to expand inline on the response\n(FlexFields style, e.g. `assignees,tags,time_tracking`).\n"
        },
        "page": {
          "type": "integer",
          "description": "1-based page number for paginated list endpoints."
        },
        "page_size": {
          "type": "integer",
          "description": "Page size for paginated list endpoints."
        }
      }
    }
  },
  {
    "name": "list_workspace_members",
    "description": "List workspace members as assignee choices",
    "category": "smp_pm",
    "method": "GET",
    "path": "/api/v1/workspaces/members/as-choices",
    "paramLocations": {
      "Organization": "header",
      "Space": "header",
      "search": "query"
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
        "search": {
          "type": "string",
          "description": "Filter by name or email."
        }
      }
    }
  },
  {
    "name": "search_recent_tasks",
    "description": "Recently modified tasks (Elasticsearch-backed)",
    "category": "smp_pm",
    "method": "GET",
    "path": "/api/v1/pm/search/recent-tasks",
    "paramLocations": {
      "Organization": "header",
      "Space": "header",
      "search": "query",
      "board": "query",
      "expand": "query",
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
        "search": {
          "type": "string"
        },
        "board": {
          "type": "string",
          "format": "uuid"
        },
        "expand": {
          "type": "string",
          "description": "Comma-separated list of fields to expand inline on the response\n(FlexFields style, e.g. `assignees,tags,time_tracking`).\n"
        },
        "page": {
          "type": "integer",
          "description": "1-based page number for paginated list endpoints."
        },
        "page_size": {
          "type": "integer",
          "description": "Page size for paginated list endpoints."
        }
      }
    }
  }
];
