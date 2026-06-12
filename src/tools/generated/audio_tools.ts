// AUTO-GENERATED from audio_tools_openapi.yaml. Do not edit by hand.
// Regenerate with: npm run generate:tools
import type { OpenAPIToolDescriptor } from '../openapi-tool-factory.js';

export const audio_tools: OpenAPIToolDescriptor[] = [
  {
    "name": "transcribe_video",
    "description": "Start a video/audio transcription job (step 1 of 3)",
    "category": "audio_tools",
    "method": "POST",
    "path": "/api/v1/transcription/transcribe",
    "paramLocations": {
      "video_url": "body",
      "language_code": "body"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "video_url": {
          "type": "string",
          "format": "uri",
          "description": "URL of the source video or audio file."
        },
        "language_code": {
          "type": "string",
          "description": "BCP-47 language code of the source audio. Defaults to \"en-US\".",
          "default": "en-US"
        }
      },
      "required": [
        "video_url"
      ]
    }
  },
  {
    "name": "get_transcription",
    "description": "Poll a transcription job for status and transcript (step 2 of 3)",
    "category": "audio_tools",
    "method": "GET",
    "path": "/api/v1/transcription/{id}",
    "paramLocations": {
      "id": "path"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "description": "Transcription UUID returned from transcribeVideo."
        }
      },
      "required": [
        "id"
      ]
    }
  },
  {
    "name": "download_transcription_file",
    "description": "Download transcription as WebVTT or SRT (step 3 of 3)",
    "category": "audio_tools",
    "method": "GET",
    "path": "/api/v1/transcription/{id}/download_transcription_file",
    "paramLocations": {
      "id": "path",
      "requested_format": "query"
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "description": "Transcription UUID."
        },
        "requested_format": {
          "type": "string",
          "enum": [
            "vtt",
            "srt"
          ],
          "description": "Subtitle format. Defaults to \"srt\"."
        }
      },
      "required": [
        "id"
      ]
    }
  }
];
