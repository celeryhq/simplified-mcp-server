# OpenAPI Generated Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate ~100 MCP tools from the external `simplified-apikit` OpenAPI specs at build time, registered into the existing server with per-group enable flags.

**Architecture:** A build-time generator script reads the OpenAPI YAML specs (referenced from an external local checkout via env var) and emits committed TypeScript files containing tool *descriptors* (data only). A single shared runtime factory turns each descriptor into a `ToolDefinition` whose handler maps flat MCP arguments onto path/query/header/body and calls the existing `SimplifiedAPIClient`. Runtime has no YAML dependency.

**Tech Stack:** TypeScript (ESM, strict), Node ≥18, Jest + ts-jest, `yaml` (devDependency, generation-time only), Zod (config), `@modelcontextprotocol/sdk`.

---

## Background for the implementing engineer

Read these before starting — they define the patterns you must follow:

- `src/types/index.ts` — `ToolDefinition`, `APIClient`, `APIResponse`, `HttpMethod`, `ServerConfig` (via config).
- `src/api/client.ts` — `makeRequest(endpoint, method, data?, options?)`. It prepends the base URL, always sends `Authorization: Api-Key <token>`, merges `options.headers`, and JSON-stringifies `data` for POST/PUT/PATCH. **Generated tools call `makeRequest` directly** (not `get`/`post`) so they control the query string and headers uniformly.
- `src/tools/implementations/social-media-tools.ts` — the existing hand-written tools whose response shape (`{ content: [{ type:'text', text: JSON.stringify({ success, ... }) }] }`) we mirror. This file is **deleted** in Task 7.
- `src/server.ts:127` `registerDefaultTools()` — where tools get registered. We replace the `socialMediaTools` loop.
- `src/config/configuration.ts` — Zod-based config with a `rawConfig` env-mapping object. We extend it.
- `jest.config.js` — ESM preset; `moduleNameMapper` rewrites `.js` import specifiers to `.ts`. **All imports in source and tests use `.js` specifiers**, e.g. `import { x } from './foo.js'`.

### Specs

The 8 spec files live in the external repo at `$SIMPLIFIED_APIKIT_SPECS_PATH` (default `/Users/jacek/Projects/python_libs/simplified-apikit/smp/apikit/specs`), pinned at commit `b04c05209f9f49f483d68ece38d9acb5f399d64e`. Group key = filename without `_openapi.yaml`:

`social_media` (16 ops), `smp_pm` (31), `celeryhq` (33), `image_tools` (10), `video_tools` (8), `audio_tools` (3), `comments` (2), `agent_notification` (1).

Each operation has an `operationId` (→ snake_case tool name), parameters in `path`/`query`/`header` (some via `$ref` to `#/components/parameters/...`), and an optional `requestBody` JSON schema (often a `$ref` to `#/components/schemas/...`). Header params `Organization` and `Space` are workspace-scoping integers that fall back to env config.

---

## Task 1: Group-key constant + tooling deps

**Files:**
- Create: `src/tools/tool-groups.ts`
- Modify: `package.json`
- Test: `tests/tools/tool-groups.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/tools/tool-groups.test.ts
import { TOOL_GROUP_KEYS } from '../../src/tools/tool-groups.js';

describe('TOOL_GROUP_KEYS', () => {
  it('lists all 8 spec group keys', () => {
    expect([...TOOL_GROUP_KEYS].sort()).toEqual(
      [
        'agent_notification', 'audio_tools', 'celeryhq', 'comments',
        'image_tools', 'smp_pm', 'social_media', 'video_tools',
      ].sort()
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/tools/tool-groups.test.ts`
Expected: FAIL — cannot find module `tool-groups.js`.

- [ ] **Step 3: Create the constant**

```ts
// src/tools/tool-groups.ts
/**
 * Canonical list of OpenAPI tool group keys (one per spec file).
 * Kept here — not in generated code — so config can reference it without
 * depending on generator output.
 */
export const TOOL_GROUP_KEYS = [
  'social_media',
  'smp_pm',
  'celeryhq',
  'image_tools',
  'video_tools',
  'audio_tools',
  'comments',
  'agent_notification',
] as const;

export type ToolGroupKey = (typeof TOOL_GROUP_KEYS)[number];
```

- [ ] **Step 4: Add the `yaml` devDependency and generate script**

In `package.json`, add to `devDependencies`:

```json
    "yaml": "^2.4.0"
```

And to `scripts`, add:

```json
    "generate:tools": "tsx scripts/generate-tools.ts"
```

Then run: `npm install`
Expected: `yaml` installed, no errors.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest tests/tools/tool-groups.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/tools/tool-groups.ts tests/tools/tool-groups.test.ts package.json package-lock.json
git commit -m "feat: add tool group keys and yaml dev tooling"
```

---

## Task 2: Runtime OpenAPI tool factory

**Files:**
- Create: `src/tools/openapi-tool-factory.ts`
- Test: `tests/tools/openapi-tool-factory.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/tools/openapi-tool-factory.test.ts
import {
  buildRequest,
  createOpenAPITool,
  type OpenAPIToolDescriptor,
} from '../../src/tools/openapi-tool-factory.js';

const descriptor: OpenAPIToolDescriptor = {
  name: 'create_task',
  description: 'Create a task',
  category: 'smp_pm',
  method: 'POST',
  path: '/api/v1/pm/boards/{board_id}/tasks',
  paramLocations: {
    board_id: 'path',
    expand: 'query',
    Organization: 'header',
    title: 'body',
    status: 'body',
  },
  headerNames: { Organization: 'Organization' },
  inputSchema: { type: 'object', properties: {}, required: ['board_id', 'status'] },
};

describe('buildRequest', () => {
  it('routes params to path, query, header, and body', () => {
    const r = buildRequest(
      descriptor,
      { board_id: 'b1', expand: 'tags', Organization: 7, title: 'Hi', status: 's1' },
      {}
    );
    expect(r.endpoint).toBe('/api/v1/pm/boards/b1/tasks?expand=tags');
    expect(r.headers).toEqual({ Organization: '7' });
    expect(r.body).toEqual({ title: 'Hi', status: 's1' });
  });

  it('omits body for GET and skips null/undefined params', () => {
    const get: OpenAPIToolDescriptor = { ...descriptor, method: 'GET', path: '/api/v1/pm/tasks' };
    const r = buildRequest(get, { expand: undefined, status: null }, {});
    expect(r.endpoint).toBe('/api/v1/pm/tasks');
    expect(r.body).toBeUndefined();
  });

  it('falls back to context for Organization/Space scoping headers', () => {
    const r = buildRequest(descriptor, { board_id: 'b1', status: 's1' }, { organizationId: 42 });
    expect(r.headers).toEqual({ Organization: '42' });
  });

  it('throws when a required path param is missing', () => {
    expect(() => buildRequest(descriptor, { status: 's1' }, {})).toThrow(/path parameter/i);
  });
});

describe('createOpenAPITool', () => {
  it('calls makeRequest and wraps a success response', async () => {
    const calls: any[] = [];
    const apiClient: any = {
      makeRequest: async (...args: any[]) => {
        calls.push(args);
        return { status: 200, statusText: 'OK', data: { id: 'x' } };
      },
    };
    const tool = createOpenAPITool(descriptor, { organizationId: 42 });
    const res = await tool.handler({ board_id: 'b1', status: 's1' }, apiClient);
    expect(calls[0][0]).toBe('/api/v1/pm/boards/b1/tasks');
    expect(calls[0][1]).toBe('POST');
    expect(calls[0][3]).toEqual({ headers: { Organization: '42' } });
    expect(JSON.parse(res.content[0].text)).toEqual({ success: true, data: { id: 'x' } });
  });

  it('wraps thrown errors as a failure response', async () => {
    const apiClient: any = { makeRequest: async () => { throw new Error('boom'); } };
    const tool = createOpenAPITool(descriptor, {});
    const res = await tool.handler({ board_id: 'b1', status: 's1' }, apiClient);
    expect(res.isError).toBe(true);
    expect(JSON.parse(res.content[0].text)).toEqual({ success: false, error: 'boom' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/tools/openapi-tool-factory.test.ts`
Expected: FAIL — cannot find module `openapi-tool-factory.js`.

- [ ] **Step 3: Implement the factory**

```ts
// src/tools/openapi-tool-factory.ts
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
  headerNames?: Record<string, string>;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
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
    const location = descriptor.paramLocations[key] ?? 'body';
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
  for (const [key, propName] of Object.entries(descriptor.headerNames ?? {})) {
    const match = fallbacks.find(([h]) => h === propName);
    if (!match) continue;
    const [headerName, fallbackValue] = match;
    const callerProvided = params[key] !== undefined && params[key] !== null;
    if (!callerProvided && fallbackValue !== undefined) {
      headers[headerName] = String(fallbackValue);
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
            { type: 'text', text: JSON.stringify({ success: true, data: response.data }, null, 2) },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: false, error: message }, null, 2) },
          ],
          isError: true,
        };
      }
    },
  };
}
```

Note: `descriptor.headerNames` maps property-name → header-name. In `applyScopingFallback` the `Object.entries` gives `[propName, headerName]`; the variable names above reflect that (`key` = property name, `propName` = header name). Keep this mapping direction consistent with the generator (Task 3), which emits `headerNames[propertyName] = headerName`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/tools/openapi-tool-factory.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/openapi-tool-factory.ts tests/tools/openapi-tool-factory.test.ts
git commit -m "feat: add runtime OpenAPI tool factory"
```

---

## Task 3: Generator core (pure functions)

**Files:**
- Create: `scripts/generate-tools.ts`
- Test: `tests/scripts/generate-tools.test.ts`

This task builds the pure, testable core. File IO (`main()`) is wired in Task 4.

- [ ] **Step 1: Write the failing test**

```ts
// tests/scripts/generate-tools.test.ts
import { toSnakeCase, specToDescriptors } from '../../scripts/generate-tools.js';

describe('toSnakeCase', () => {
  it('converts camelCase operationIds to snake_case', () => {
    expect(toSnakeCase('getSocialMediaAccounts')).toBe('get_social_media_accounts');
    expect(toSnakeCase('createTask')).toBe('create_task');
  });
});

const spec = {
  components: {
    parameters: {
      OrgHeader: { in: 'header', name: 'Organization', required: false, schema: { type: 'integer' }, description: 'Org' },
    },
    schemas: {
      TaskCreateRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', description: 'Status UUID' },
          title: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/api/v1/pm/boards/{board_id}/tasks': {
      parameters: [{ $ref: '#/components/parameters/OrgHeader' }],
      post: {
        operationId: 'createTask',
        summary: 'Create a task',
        parameters: [
          { in: 'path', name: 'board_id', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'expand', required: false, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskCreateRequest' } } },
        },
      },
    },
  },
};

describe('specToDescriptors', () => {
  const [d] = specToDescriptors(spec as any, 'smp_pm');

  it('derives name, method, path, and category', () => {
    expect(d.name).toBe('create_task');
    expect(d.method).toBe('POST');
    expect(d.path).toBe('/api/v1/pm/boards/{board_id}/tasks');
    expect(d.category).toBe('smp_pm');
  });

  it('routes params across path/query/header/body and resolves $refs', () => {
    expect(d.paramLocations).toEqual({
      Organization: 'header',
      board_id: 'path',
      expand: 'query',
      status: 'body',
      title: 'body',
    });
    expect(d.headerNames).toEqual({ Organization: 'Organization' });
  });

  it('merges every param into a flat inputSchema with unioned required', () => {
    expect(Object.keys(d.inputSchema.properties).sort()).toEqual(
      ['Organization', 'board_id', 'expand', 'status', 'title']
    );
    expect(d.inputSchema.required!.sort()).toEqual(['board_id', 'status']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/scripts/generate-tools.test.ts`
Expected: FAIL — cannot find module `generate-tools.js`.

- [ ] **Step 3: Implement the generator core**

```ts
// scripts/generate-tools.ts
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { OpenAPIToolDescriptor, ParamLocation } from '../src/tools/openapi-tool-factory.js';

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;
const SCOPING_HEADERS = new Set(['Organization', 'Space']);

export function toSnakeCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/** Resolve a single local `$ref` (`#/components/...`) against the spec. */
function resolveRef(spec: any, ref: string): any {
  const path = ref.replace(/^#\//, '').split('/');
  let node = spec;
  for (const key of path) node = node?.[key];
  if (node === undefined) throw new Error(`Unresolvable $ref: ${ref}`);
  return node;
}

/** Recursively inline every `$ref` inside a schema/parameter node. */
function deepResolve(spec: any, node: any, seen = new Set<string>()): any {
  if (Array.isArray(node)) return node.map((n) => deepResolve(spec, n, seen));
  if (node && typeof node === 'object') {
    if (typeof node.$ref === 'string') {
      if (seen.has(node.$ref)) return {}; // cycle guard
      seen.add(node.$ref);
      return deepResolve(spec, resolveRef(spec, node.$ref), seen);
    }
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(node)) out[k] = deepResolve(spec, v, seen);
    return out;
  }
  return node;
}

function addProperty(
  descriptor: OpenAPIToolDescriptor,
  propName: string,
  location: ParamLocation,
  schema: any,
  description: string | undefined,
  required: boolean
): void {
  if (descriptor.paramLocations[propName]) {
    throw new Error(
      `Parameter name collision in "${descriptor.name}": "${propName}" appears more than once`
    );
  }
  descriptor.paramLocations[propName] = location;
  const prop: Record<string, any> = { ...schema };
  if (description && !prop.description) prop.description = description;
  descriptor.inputSchema.properties[propName] = prop;
  if (required && !descriptor.inputSchema.required!.includes(propName)) {
    descriptor.inputSchema.required!.push(propName);
  }
}

/** Build tool descriptors for every operation in one spec. */
export function specToDescriptors(spec: any, groupKey: string): OpenAPIToolDescriptor[] {
  const descriptors: OpenAPIToolDescriptor[] = [];
  const paths = spec.paths ?? {};

  for (const [path, pathItem] of Object.entries<any>(paths)) {
    const sharedParams: any[] = pathItem.parameters ?? [];
    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (!op || !op.operationId) continue;

      const descriptor: OpenAPIToolDescriptor = {
        name: toSnakeCase(op.operationId),
        description: op.summary || op.description || op.operationId,
        category: groupKey,
        method: method.toUpperCase() as OpenAPIToolDescriptor['method'],
        path,
        paramLocations: {},
        headerNames: {},
        inputSchema: { type: 'object', properties: {}, required: [] },
      };

      // Parameters (path-level shared + operation-level), $refs resolved.
      const rawParams = [...sharedParams, ...(op.parameters ?? [])];
      for (const raw of rawParams) {
        const param = deepResolve(spec, raw);
        const location = param.in as ParamLocation;
        if (location !== 'path' && location !== 'query' && location !== 'header') continue;
        addProperty(descriptor, param.name, location, param.schema ?? { type: 'string' }, param.description, Boolean(param.required));
        if (location === 'header') descriptor.headerNames![param.name] = param.name;
      }

      // Request body — flatten its top-level properties as body params.
      const bodySchemaRef = op.requestBody?.content?.['application/json']?.schema;
      if (bodySchemaRef) {
        const bodySchema = deepResolve(spec, bodySchemaRef);
        const required: string[] = bodySchema.required ?? [];
        for (const [propName, propSchema] of Object.entries<any>(bodySchema.properties ?? {})) {
          addProperty(descriptor, propName, 'body', propSchema, propSchema.description, required.includes(propName));
        }
      }

      if (descriptor.inputSchema.required!.length === 0) delete descriptor.inputSchema.required;
      if (Object.keys(descriptor.headerNames!).length === 0) delete descriptor.headerNames;
      descriptors.push(descriptor);
    }
  }
  return descriptors;
}

export function renderGroupFile(groupKey: string, descriptors: OpenAPIToolDescriptor[], sourceFile: string): string {
  return [
    `// AUTO-GENERATED from ${sourceFile}. Do not edit by hand.`,
    `// Regenerate with: npm run generate:tools`,
    `import type { OpenAPIToolDescriptor } from '../openapi-tool-factory.js';`,
    ``,
    `export const ${groupKey}: OpenAPIToolDescriptor[] = ${JSON.stringify(descriptors, null, 2)};`,
    ``,
  ].join('\n');
}

export function renderIndexFile(groupKeys: string[]): string {
  const imports = groupKeys.map((g) => `import { ${g} } from './${g}.js';`).join('\n');
  const entries = groupKeys.map((g) => `  ${g},`).join('\n');
  return [
    `// AUTO-GENERATED. Do not edit by hand. Regenerate with: npm run generate:tools`,
    `import type { OpenAPIToolDescriptor } from '../openapi-tool-factory.js';`,
    imports,
    ``,
    `export const generatedToolGroups: Record<string, OpenAPIToolDescriptor[]> = {`,
    entries,
    `};`,
    ``,
  ].join('\n');
}

export function main(): void {
  const specsPath =
    process.env.SIMPLIFIED_APIKIT_SPECS_PATH ||
    '/Users/jacek/Projects/python_libs/simplified-apikit/smp/apikit/specs';

  if (!existsSync(specsPath)) {
    console.error(
      `Specs path not found: ${specsPath}\n` +
        `Check out the simplified-apikit repo or set SIMPLIFIED_APIKIT_SPECS_PATH.`
    );
    process.exit(1);
  }

  const outDir = join(process.cwd(), 'src', 'tools', 'generated');
  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(specsPath).filter((f) => f.endsWith('_openapi.yaml')).sort();
  const seenNames = new Map<string, string>();
  const groupKeys: string[] = [];

  for (const file of files) {
    const groupKey = basename(file, '_openapi.yaml');
    const spec = parseYaml(readFileSync(join(specsPath, file), 'utf8'));
    const descriptors = specToDescriptors(spec, groupKey);

    for (const d of descriptors) {
      const prev = seenNames.get(d.name);
      if (prev) throw new Error(`Tool name collision: "${d.name}" in both ${prev} and ${groupKey}`);
      seenNames.set(d.name, groupKey);
    }

    writeFileSync(join(outDir, `${groupKey}.ts`), renderGroupFile(groupKey, descriptors, file));
    groupKeys.push(groupKey);
    console.error(`Generated ${descriptors.length} tools for ${groupKey}`);
  }

  writeFileSync(join(outDir, 'index.ts'), renderIndexFile(groupKeys));
  console.error(`Wrote index with ${groupKeys.length} groups (${seenNames.size} tools total)`);
}

// Run only when invoked directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/scripts/generate-tools.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-tools.ts tests/scripts/generate-tools.test.ts
git commit -m "feat: add OpenAPI-to-tool generator core"
```

---

## Task 4: Run the generator and validate output

**Files:**
- Create (generated): `src/tools/generated/*.ts`, `src/tools/generated/index.ts`
- Test: `tests/tools/generated-tools.test.ts`

- [ ] **Step 1: Run the generator**

Run: `npm run generate:tools`
Expected (stderr): 8 "Generated N tools for <group>" lines and "Wrote index with 8 groups (~104 tools total)". The `src/tools/generated/` directory now contains 9 `.ts` files.

If the specs path differs on your machine, set it: `SIMPLIFIED_APIKIT_SPECS_PATH=/path/to/specs npm run generate:tools`.

- [ ] **Step 2: Verify the build compiles the generated code**

Run: `npm run build`
Expected: `tsc` completes with no errors. (If a generated tool produces an invalid TS literal, fix the generator in Task 3, not the generated file.)

- [ ] **Step 3: Write the validation test**

```ts
// tests/tools/generated-tools.test.ts
import { generatedToolGroups } from '../../src/tools/generated/index.js';
import { createOpenAPITool } from '../../src/tools/openapi-tool-factory.js';
import { TOOL_GROUP_KEYS } from '../../src/tools/tool-groups.js';
import { ToolRegistry } from '../../src/tools/registry.js';

describe('generated tools', () => {
  it('produces one group per known key', () => {
    expect(Object.keys(generatedToolGroups).sort()).toEqual([...TOOL_GROUP_KEYS].sort());
  });

  it('registers every generated tool without validation errors and with unique names', () => {
    const registry = new ToolRegistry();
    let count = 0;
    for (const descriptors of Object.values(generatedToolGroups)) {
      for (const d of descriptors) {
        registry.registerTool(createOpenAPITool(d)); // throws on invalid/duplicate
        count++;
      }
    }
    expect(count).toBeGreaterThanOrEqual(100);
    expect(registry.getToolCount()).toBe(count);
  });

  it('includes known social-media tools that replace the old hand-written ones', () => {
    const names = generatedToolGroups.social_media.map((d) => d.name);
    expect(names).toContain('get_social_media_accounts');
    expect(names).toContain('create_social_media_post');
  });
});
```

- [ ] **Step 4: Run the validation test**

Run: `npx jest tests/tools/generated-tools.test.ts`
Expected: PASS (3 tests). If "name collision" or validation throws, fix the generator (Task 3) and re-run Step 1.

- [ ] **Step 5: Commit**

```bash
git add src/tools/generated tests/tools/generated-tools.test.ts
git commit -m "feat: generate OpenAPI tool descriptors for all spec groups"
```

---

## Task 5: Configuration — group flags + scoping IDs

**Files:**
- Modify: `src/config/configuration.ts`
- Test: `tests/config/configuration.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/config/configuration.test.ts` (inside the top-level describe, alongside existing tests):

```ts
  describe('tool group + scoping config', () => {
    const KEYS = [
      'TOOLS_SOCIAL_MEDIA_ENABLED', 'TOOLS_SMP_PM_ENABLED', 'TOOLS_CELERYHQ_ENABLED',
      'SIMPLIFIED_ORGANIZATION_ID', 'SIMPLIFIED_SPACE_ID',
    ];
    let saved: Record<string, string | undefined>;
    beforeEach(() => {
      saved = {};
      for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
    });
    afterEach(() => {
      for (const k of KEYS) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    });

    it('defaults every tool group to enabled', () => {
      const config = ConfigurationManager.loadConfig();
      expect(config.toolGroups.smp_pm).toBe(true);
      expect(config.toolGroups.celeryhq).toBe(true);
    });

    it('disables a group when its env flag is "false"', () => {
      process.env.TOOLS_SMP_PM_ENABLED = 'false';
      const config = ConfigurationManager.loadConfig();
      expect(config.toolGroups.smp_pm).toBe(false);
      expect(config.toolGroups.social_media).toBe(true);
    });

    it('parses Organization/Space scoping IDs', () => {
      process.env.SIMPLIFIED_ORGANIZATION_ID = '7';
      process.env.SIMPLIFIED_SPACE_ID = '12';
      const config = ConfigurationManager.loadConfig();
      expect(config.organizationId).toBe(7);
      expect(config.spaceId).toBe(12);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/config/configuration.test.ts -t "tool group"`
Expected: FAIL — `toolGroups`/`organizationId` undefined.

- [ ] **Step 3: Extend the config schema and loader**

In `src/config/configuration.ts`, add the import at the top (after existing imports):

```ts
import { TOOL_GROUP_KEYS } from '../tools/tool-groups.js';
```

Add these fields to `ConfigSchema` (inside `z.object({ ... })`, before `.merge(WorkflowConfigSchema)`):

```ts
  organizationId: z.number().optional(),
  spaceId: z.number().optional(),
  toolGroups: z.record(z.string(), z.boolean()).default({}),
```

In `loadConfig`'s `rawConfig` object, add these entries (after the workflow entries):

```ts
      // Tool group + scoping configuration
      organizationId: process.env.SIMPLIFIED_ORGANIZATION_ID
        ? parseInt(process.env.SIMPLIFIED_ORGANIZATION_ID, 10)
        : undefined,
      spaceId: process.env.SIMPLIFIED_SPACE_ID
        ? parseInt(process.env.SIMPLIFIED_SPACE_ID, 10)
        : undefined,
      toolGroups: TOOL_GROUP_KEYS.reduce((acc, key) => {
        const envVar = process.env[`TOOLS_${key.toUpperCase()}_ENABLED`];
        acc[key] = envVar === undefined ? true : envVar.toLowerCase() === 'true';
        return acc;
      }, {} as Record<string, boolean>),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/config/configuration.test.ts -t "tool group"`
Expected: PASS (3 tests). Then run the full file: `npx jest tests/config/configuration.test.ts` — Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/config/configuration.ts tests/config/configuration.test.ts
git commit -m "feat: add per-group enable flags and scoping config"
```

---

## Task 6: Register generated tools in the server

**Files:**
- Modify: `src/server.ts:127-139`
- Test: `tests/server.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/server.test.ts` (alongside existing server tests; `ServerConfig` and `SimplifiedMCPServer` are already imported there — match the existing import style):

```ts
  describe('generated tool registration', () => {
    const baseConfig = () => ConfigurationManager.loadConfig();

    it('registers generated tools for enabled groups', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      const server = new SimplifiedMCPServer(baseConfig());
      expect(server.getToolNames()).toContain('get_social_media_accounts');
      expect(server.getToolNames()).toContain('list_tasks');
    });

    it('skips tools from disabled groups', () => {
      process.env.SIMPLIFIED_API_TOKEN = 'test-token';
      const config = baseConfig();
      config.toolGroups = { ...config.toolGroups, smp_pm: false };
      const server = new SimplifiedMCPServer(config);
      expect(server.getToolNames()).not.toContain('list_tasks');
      expect(server.getToolNames()).toContain('get_social_media_accounts');
    });
  });
```

(If `ConfigurationManager` is not yet imported in `tests/server.test.ts`, add `import { ConfigurationManager } from '../src/config/configuration.js';` at the top. Verify `list_tasks` is a real generated name via `grep "name: 'list_tasks'" src/tools/generated/smp_pm.ts`; if the generator produced a different snake_case form, use that exact name.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/server.test.ts -t "generated tool registration"`
Expected: FAIL — `list_tasks`/generated names not registered (server still uses old social-media tools).

- [ ] **Step 3: Update `registerDefaultTools`**

In `src/server.ts`, replace the `socialMediaTools` import:

```ts
import { socialMediaTools } from './tools/implementations/social-media-tools.js';
```

with:

```ts
import { generatedToolGroups } from './tools/generated/index.js';
import { createOpenAPITool } from './tools/openapi-tool-factory.js';
```

Then replace the body of `registerDefaultTools()` (currently the `for (const tool of socialMediaTools)` loop) with:

```ts
  private registerDefaultTools(): void {
    // Register generated OpenAPI tools for each enabled group
    const context = {
      organizationId: this.config.organizationId,
      spaceId: this.config.spaceId,
    };
    for (const [group, descriptors] of Object.entries(generatedToolGroups)) {
      if (this.config.toolGroups[group] === false) continue;
      for (const descriptor of descriptors) {
        this.toolRegistry.registerTool(createOpenAPITool(descriptor, context));
      }
    }

    // Register workflow status tool if workflows are enabled
    if (this.config.workflowsEnabled) {
      const logger = this.logger || createMCPLogger({ context: 'WorkflowStatusTool' });
      this.toolRegistry.registerTool(createWorkflowStatusTool(logger));
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/server.test.ts -t "generated tool registration"`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server.ts tests/server.test.ts
git commit -m "feat: register generated OpenAPI tools by enabled group"
```

---

## Task 7: Remove the replaced hand-written tools

**Files:**
- Delete: `src/tools/implementations/social-media-tools.ts`
- Delete: `tests/tools/social-media-tools.test.ts`
- Modify: `src/tools/implementations/index.ts`

- [ ] **Step 1: Delete the replaced files**

```bash
git rm src/tools/implementations/social-media-tools.ts tests/tools/social-media-tools.test.ts
```

- [ ] **Step 2: Remove its re-export**

In `src/tools/implementations/index.ts`, delete this line:

```ts
export * from './social-media-tools.js';
```

(Leave the `workflow-status-tool.js` export.)

- [ ] **Step 3: Confirm nothing else imports the deleted module**

Run: `grep -rn "social-media-tools" src tests`
Expected: no results.

- [ ] **Step 4: Run the full test suite and build**

Run: `npm test`
Expected: all suites pass (no reference to the deleted file).
Run: `npm run build`
Expected: `tsc` succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: drop hand-written social-media tools replaced by generated ones"
```

---

## Task 8: Documentation

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Document the new env vars**

Append to `.env.example` a new section:

```bash
# =============================================================================
# GENERATED TOOL CONFIGURATION
# =============================================================================

# Per-group enable flags for OpenAPI-generated tools (default: true).
# Set to false to hide a group from the MCP client.
# Groups: SOCIAL_MEDIA, SMP_PM, CELERYHQ, IMAGE_TOOLS, VIDEO_TOOLS,
#         AUDIO_TOOLS, COMMENTS, AGENT_NOTIFICATION
# Example: TOOLS_AUDIO_TOOLS_ENABLED=false
# TOOLS_SMP_PM_ENABLED=true

# Default workspace scoping headers, used when a tool call omits them.
# SIMPLIFIED_ORGANIZATION_ID=
# SIMPLIFIED_SPACE_ID=
```

- [ ] **Step 2: Add a README section**

Under "Available Tools" in `README.md`, add a subsection explaining: tools are generated from the `simplified-apikit` OpenAPI specs via `npm run generate:tools` (which reads `SIMPLIFIED_APIKIT_SPECS_PATH`), grouped by spec, each group toggleable via `TOOLS_<GROUP>_ENABLED`, and that regeneration is required after spec changes. Keep it to one short paragraph plus the env var list.

- [ ] **Step 3: Commit**

```bash
git add .env.example README.md
git commit -m "docs: document generated tools and configuration"
```

---

## Self-Review notes

- **Spec coverage:** generator (T3) + run (T4) cover all 8 groups; factory (T2) covers path/query/header/body + scoping fallback + response/error shape; config (T5) covers per-group flags + org/space; server (T6) covers enable-by-group registration; deletion (T7) covers the "replace existing tools" decision; docs (T8) covers `.env.example`/README. The `SIMPLIFIED_APIKIT_SPECS_PATH` reference (no copy) is realized in T3/T4.
- **Type consistency:** `OpenAPIToolDescriptor` / `buildRequest` / `createOpenAPITool` signatures are identical across T2, T3, T4, T6. `headerNames` direction (propertyName → headerName) is consistent between generator (T3 emits `headerNames[param.name] = param.name`) and factory (T2 `applyScopingFallback`). `generatedToolGroups` shape (`Record<string, OpenAPIToolDescriptor[]>`) matches between T3's `renderIndexFile`, T4's test, and T6's registration. `toolGroups`/`organizationId`/`spaceId` added in T5 are consumed in T6.
- **Known fragile points called out inline:** generated tool names must be verified by grep before asserting them in T6 (snake_case edge cases); fixes to generated output go through the generator, never by editing generated files.
