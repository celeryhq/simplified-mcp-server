# OpenAPI Tool Generation — Design

**Date:** 2026-06-12
**Status:** Approved (pending implementation plan)

## Goal

Extend the Simplified MCP server with tools covering the Simplified REST API as described by the OpenAPI specs in the external `simplified-apikit` repository (`smp/apikit/specs/*.yaml`). Today the server ships only two hand-written social-media tools; the specs describe ~100 operations across 8 groups. We generate MCP tools from these specs at build time.

## Decisions (from brainstorming)

- **Scope:** all 8 spec groups (~100 operations).
- **Approach:** build-time generator that emits committed TypeScript tool data. No runtime YAML parsing, no runtime dependency on the specs.
- **Spec source:** referenced from the external local checkout via env var — specs are **not** copied into this repo.
- **Enablement:** per-group env toggle, default on.
- **Existing tools:** the two hand-written social-media tools are replaced by generated equivalents.

## Spec groups

Group key = spec filename without `_openapi` suffix.

| Group key | Spec file | Ops | Domain |
|-----------|-----------|-----|--------|
| `social_media` | social_media_openapi.yaml | 16 | accounts, analytics, posts, drafts, tags, review-bundle |
| `smp_pm` | smp_pm_openapi.yaml | 31 | Project Manager: boards, statuses, tasks, dependencies, search |
| `celeryhq` | celeryhq_openapi.yaml | 33 | Brand Kit, projects/items, AI image/video, voices, assets, documents |
| `image_tools` | image_tools_openapi.yaml | 10 | image manipulation |
| `video_tools` | video_tools_openapi.yaml | 8 | video manipulation |
| `audio_tools` | audio_tools_openapi.yaml | 3 | transcription |
| `comments` | comments_openapi.yaml | 2 | comments |
| `agent_notification` | agent_notification_openapi.yaml | 1 | notifications |

## Architecture

### Source of specs

The generator reads specs from `SIMPLIFIED_APIKIT_SPECS_PATH`, defaulting to
`/Users/jacek/Projects/python_libs/simplified-apikit/smp/apikit/specs`.
If the path does not exist, the generator exits with a clear message instructing the developer to check out `simplified-apikit` or set the env var. The specs are pinned in the external repo at commit `b04c05209f9f49f483d68ece38d9acb5f399d64e` (identical to the local checkout's HEAD at design time).

### Generator — `scripts/generate-tools.ts`

Run via `tsx` (`npm run generate:tools`). Steps:

1. Read every `*.yaml` in the specs path. Parse with `yaml` (added as a **devDependency** — generation-time only; not a runtime dependency).
2. Resolve local `$ref`s (`#/components/...`) within each spec — parameters and request-body schemas use refs.
3. For each operation, build a tool descriptor (data, not code):
   - `name`: `operationId` converted to snake_case (e.g. `getSocialMediaAccounts` → `get_social_media_accounts`). This matches the existing convention.
   - `category`: the group key.
   - `method`, `path` (template with `{placeholders}`).
   - Parameter metadata grouped by location: `pathParams`, `queryParams`, `headerParams`, and request `body` (its resolved JSON Schema / property list).
   - `inputSchema`: a single flat JSON Schema (`type: object`) merging all four locations into one `properties` map, with `required` derived from each source. Descriptions come from the spec.
4. Emit one file per group: `src/tools/generated/<group>.ts`, exporting an array of tool definitions built via the shared factory (below). Also emit `src/tools/generated/index.ts` mapping group key → tool array.
5. **Collision handling:** fail loudly if two operations produce the same tool name, or if a single operation has two parameters with the same name across different locations (path/query/header/body). These are surfaced for explicit resolution rather than silently merged.

Generated files carry a header comment marking them as generated and naming the source commit; they are committed so runtime/publish never needs the specs or the `yaml` package.

### Runtime factory — `src/tools/openapi-tool-factory.ts`

Generated files contain data; all execution logic lives here in one tested place. `createOpenAPITool(descriptor): ToolDefinition` returns a standard `ToolDefinition` whose handler:

1. Receives the flat `params` object and `apiClient` (same signature as existing tools, dispatched by `ToolRegistry.executeTool`).
2. Splits `params` by the descriptor's location metadata.
3. Substitutes path params into the path template.
4. Builds the query string from query params.
5. Builds headers from header params, injecting them via `makeRequest`'s `options.headers`. For the common scoping headers `Organization` and `Space`, falls back to config values (`SIMPLIFIED_ORGANIZATION_ID` / `SIMPLIFIED_SPACE_ID`) when the caller omits them.
6. Builds the request body from body params (for POST/PUT/PATCH).
7. Calls `apiClient.makeRequest(finalPath, method, body, { headers })`.
8. Formats the response as an MCP `CallToolResult` — `{ content: [{ type: 'text', text: JSON.stringify({ success, ... }, null, 2) }] }` — and on error returns `{ ..., success: false, error }` (mirroring the existing social-media tools, which catch their own errors rather than throwing).

Authentication is unchanged: `SimplifiedAPIClient` already sends `Authorization: Api-Key <token>` for every request against `https://api.simplified.com`, which the existing tools use successfully. The specs' declared `bearerAuth`/`apiKey` schemes are not separately implemented; the shared client header is reused for all groups.

### Configuration — `src/config/configuration.ts` + `src/types/index.ts`

Extend `ServerConfig` with:

- `toolGroups: Record<string, boolean>` — one flag per group key, parsed from `TOOLS_<GROUP_UPPER>_ENABLED` env vars (e.g. `TOOLS_SMP_PM_ENABLED`, `TOOLS_CELERYHQ_ENABLED`), each defaulting to `true`.
- `organizationId?`, `spaceId?` — from `SIMPLIFIED_ORGANIZATION_ID` / `SIMPLIFIED_SPACE_ID`, used as header fallbacks.

`.env.example` documents the new variables.

### Registration — `src/server.ts`

`registerDefaultTools()` replaces the `socialMediaTools` import. It iterates the generated group map; for each group whose flag is enabled, it registers that group's tools into the `ToolRegistry`. The existing workflow-status tool registration is unchanged. `src/tools/implementations/social-media-tools.ts` and its test are deleted.

## File changes summary

- **New:** `scripts/generate-tools.ts`, `src/tools/openapi-tool-factory.ts`, `src/tools/generated/<group>.ts` (×8), `src/tools/generated/index.ts`.
- **Modified:** `src/config/configuration.ts`, `src/types/index.ts`, `src/server.ts`, `.env.example`, `package.json` (add `yaml` devDep + `generate:tools` script).
- **Deleted:** `src/tools/implementations/social-media-tools.ts` and `tests/tools/social-media-tools.test.ts`.

## Testing

- `tests/tools/openapi-tool-factory.test.ts` — the critical logic: param routing by location, path substitution, query-string building, header injection + env fallback, body assembly, response formatting, and error handling.
- A test loading every generated tool and asserting it passes `ToolRegistry.validateToolDefinition` (well-formed name/description/inputSchema/handler).
- A small generator unit test over an inline fixture spec (ref resolution, snake_case naming, collision detection).
- Update/replace affected existing tests (social-media tool tests, server registration tests, config tests).

## Non-goals (YAGNI)

- No runtime YAML parsing or hot-reload (that remains the workflow-tools domain).
- No per-operation hand-tuning beyond what the generator produces; corrections, if needed, are made by improving the generator or factory, not by editing generated files.
- No implementation of the specs' declared auth schemes beyond the existing shared `Api-Key` header.
