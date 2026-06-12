import type { ToolDefinition, APIClient, HttpMethod } from '../types/index.js';

export type ParamLocation = 'path' | 'query' | 'header' | 'body';

export interface OpenAPIToolDescriptor {
  name: string;
  description: string;
  category: string;
  method: HttpMethod;
  /** Path template containing `{placeholders}` for path params. */
  path: string;
  /** Maps each inputSchema property to where it goes in the request. */
  paramLocations: Record<string, ParamLocation>;
  /** Maps a header property name to its actual HTTP header name. */
  headerNames?: Record<string, string> | undefined;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[] | undefined;
  };
}

export interface OpenAPIToolContext {
  organizationId?: number | undefined;
  spaceId?: number | undefined;
}

interface BuiltRequest {
  endpoint: string;
  headers: Record<string, string>;
  body: Record<string, any> | undefined;
}

const BODY_METHODS: HttpMethod[] = ['POST', 'PUT', 'PATCH'];

/**
 * Split flat MCP arguments onto path/query/header/body using the descriptor's
 * location map, applying env-config fallbacks for scoping headers.
 */
export function buildRequest(
  descriptor: OpenAPIToolDescriptor,
  params: Record<string, any>,
  context: OpenAPIToolContext
): BuiltRequest {
  let endpoint = descriptor.path;
  const query = new URLSearchParams();
  const headers: Record<string, string> = {};
  const body: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const location: ParamLocation = descriptor.paramLocations[key] ?? 'body';
    if (location === 'path') {
      endpoint = endpoint.replace(`{${key}}`, encodeURIComponent(String(value)));
    } else if (location === 'query') {
      query.append(key, String(value));
    } else if (location === 'header') {
      const headerName = descriptor.headerNames?.[key] ?? key;
      headers[headerName] = String(value);
    } else {
      body[key] = value;
    }
  }

  applyScopingFallback(descriptor, params, context, headers);

  const unresolved = endpoint.match(/\{[^}]+\}/g);
  if (unresolved) {
    throw new Error(`Missing required path parameter(s): ${unresolved.join(', ')}`);
  }

  const qs = query.toString();
  if (qs) endpoint += `?${qs}`;

  return {
    endpoint,
    headers,
    body: BODY_METHODS.includes(descriptor.method) ? body : undefined,
  };
}

/** Inject Organization/Space headers from config when the caller omitted them. */
function applyScopingFallback(
  descriptor: OpenAPIToolDescriptor,
  params: Record<string, any>,
  context: OpenAPIToolContext,
  headers: Record<string, string>
): void {
  const fallbacks: Array<[string, number | undefined]> = [
    ['Organization', context.organizationId],
    ['Space', context.spaceId],
  ];
  for (const [key, headerName] of Object.entries(descriptor.headerNames ?? {})) {
    const match = fallbacks.find(([h]) => h === headerName);
    if (!match) continue;
    const [resolvedHeaderName, fallbackValue] = match;
    const callerProvided = params[key] !== undefined && params[key] !== null;
    if (!callerProvided && fallbackValue !== undefined) {
      headers[resolvedHeaderName] = String(fallbackValue);
    }
  }
}

/** Turn a descriptor into a standard ToolDefinition. */
export function createOpenAPITool(
  descriptor: OpenAPIToolDescriptor,
  context: OpenAPIToolContext = {}
): ToolDefinition {
  return {
    name: descriptor.name,
    description: descriptor.description,
    category: descriptor.category,
    inputSchema: descriptor.inputSchema,
    handler: async (params: Record<string, any>, apiClient: APIClient) => {
      try {
        const req = buildRequest(descriptor, params ?? {}, context);
        const response = await apiClient.makeRequest(
          req.endpoint,
          descriptor.method,
          req.body,
          { headers: req.headers }
        );
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify({ success: true, data: response.data }, null, 2) },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify({ success: false, error: message }, null, 2) },
          ],
          isError: true,
        };
      }
    },
  };
}
