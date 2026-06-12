// AUTO-GENERATED from agent_notification_openapi.yaml. Do not edit by hand.
// Regenerate with: npm run generate:tools
import type { OpenAPIToolDescriptor } from '../openapi-tool-factory.js';

export const agent_notification: OpenAPIToolDescriptor[] = [
  {
    "name": "send_agent_notification",
    "description": "Send a notification from an AI agent to a user",
    "category": "agent_notification",
    "method": "POST",
    "path": "/api/v1/service/agent/notify",
    "paramLocations": {
      "userId": "body",
      "workspaceId": "body",
      "title": "body",
      "message": "body",
      "link": "body",
      "category": "body",
      "_extra": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "userId": {
          "type": "string",
          "maxLength": 18,
          "description": "ID of the user to notify"
        },
        "workspaceId": {
          "type": "string",
          "maxLength": 18,
          "description": "ID of the workspace"
        },
        "title": {
          "type": "string",
          "maxLength": 250,
          "description": "Notification title (sentence case)"
        },
        "message": {
          "type": "string",
          "maxLength": 1000,
          "description": "Notification body text"
        },
        "link": {
          "type": "string",
          "format": "uri",
          "description": "Deep link to the relevant page in Simplified"
        },
        "category": {
          "type": "string",
          "enum": [
            "agentTaskCompleted",
            "agentNeedsInput",
            "agentError",
            "agentProgress",
            "agentNudge"
          ],
          "description": "Determines delivery channels: - `agentTaskCompleted` — in-app + websocket + email - `agentNeedsInput` — in-app + websocket + email - `agentError` — in-app + websocket + Slack (#agent-alerts) - `agentProgress` — websocket only - `agentNudge` — in-app + websocket\n"
        },
        "_extra": {
          "type": "object",
          "description": "Arbitrary metadata stored in the notification's JSON field. Frontend uses `event_type` to render each card differently.\n",
          "properties": {
            "event_type": {
              "type": "string",
              "description": "Machine-readable event type"
            },
            "agent": {
              "type": "string",
              "description": "Name of the agent sending the notification"
            },
            "task_id": {
              "type": "string",
              "description": "ID of the task this notification relates to"
            }
          },
          "additionalProperties": true
        }
      },
      "required": [
        "userId",
        "workspaceId",
        "title",
        "message",
        "category"
      ]
    }
  }
];
