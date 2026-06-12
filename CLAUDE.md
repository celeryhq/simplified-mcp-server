# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

An MCP (Model Context Protocol) server that exposes the Simplified API (social media management) as tools for AI assistants. It speaks MCP over **stdio** using `@modelcontextprotocol/sdk` and is distributed as an npm package (`simplified-mcp-server` bin) and as a `.dxt` desktop extension.

## Commands

```bash
npm run build          # clean + tsc -> dist/
npm run build:prod     # production build (no comments/sourcemaps/declarationMap)
npm run dev            # run server from TS via tsx (no build step)
npm run dev:watch      # tsx watch mode
npm start              # run the built server (node dist/cli.js)

npm test               # run all Jest tests
npm run test:watch     # Jest watch mode
npm run test:coverage  # coverage report -> coverage/

# Run a single test file or test by name:
npx jest tests/services/workflow-execution.test.ts
npx jest -t "executes workflow"

# Inspect generated tool docs without starting the server:
node dist/cli.js --docs      # or: npm run dev -- --docs
```

`npm run lint` / `npm run format` are placeholders (echo only) — there is no configured linter or formatter.

Requires Node >= 18. Project is ESM (`"type": "module"`); TypeScript is `strict` with extra-strict flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`).

## Configuration

All runtime config comes from environment variables (loaded via `dotenv`), parsed and validated in `src/config/configuration.ts` (`ConfigurationManager.loadConfig()`). The server refuses to start on invalid config. `SIMPLIFIED_API_TOKEN` is the only required var. Copy `.env.example` to `.env` — it documents every variable, including the `WORKFLOW_*` family. CLI flags `--log-level` and `--verbose` override the parsed config.

## Architecture

Startup flow: `cli.ts` (arg parsing, signal handling, graceful shutdown) → `ConfigurationManager.loadConfig()` → `new SimplifiedMCPServer(config)` → `server.start()` (connects `StdioServerTransport`, then initializes workflow tools).

**`SimplifiedMCPServer` (`src/server.ts`)** is the composition root. It wires up the `SimplifiedAPIClient`, the `ToolRegistry`, and the `WorkflowToolManager`, and registers the two MCP request handlers (`ListTools`, `CallTool`). Tool calls are dispatched through `toolRegistry.executeTool(name, args, apiClient)`.

**Two kinds of tools share one registry:**

1. **Static tools** — hand-written, always registered. Currently the social media tools in `src/tools/implementations/social-media-tools.ts`, built with the fluent `createTool()` builder from `src/tools/definitions.ts`. Each tool carries its own `inputSchema` (JSON Schema) and an async `handler(params, apiClient)`.

2. **Dynamic workflow tools** — discovered at runtime from the Simplified API and registered as tools, only when `WORKFLOWS_ENABLED=true`. This is the most complex part of the codebase; the orchestration lives in `src/services/`:
   - `workflow-tool-manager.ts` — orchestrator: discovery → tool generation → registration, plus refresh/hot-reload lifecycle.
   - `workflow-discovery.ts` (and `-simple.ts`) — fetches workflow definitions from the API, with caching and optional periodic refresh.
   - `workflow-tool-generator.ts` — converts a `WorkflowDefinition` into a `ToolDefinition` (generates the JSON Schema and a handler).
   - `workflow-execution.ts` — runs a workflow via the API and polls `workflow-status.ts` until completion (status check interval enforced to a 1000ms minimum); tracks in-flight executions with `AbortController`s.
   - `workflow-performance-monitor.ts` — optional timing/metrics.
   - A static `workflow-status` tool (`src/tools/implementations/workflow-status-tool.ts`) is also registered when workflows are enabled, letting callers query execution status.

   Workflow initialization is **graceful-degradation**: if discovery fails, the server logs and continues with static tools only rather than crashing.

**`ToolRegistry` (`src/tools/registry.ts`)** holds all tools in a single map, validates definitions on registration (rejecting duplicates and malformed schemas), validates call params against each tool's schema before execution, tracks categories, and tags workflow tools separately. It also generates the `--docs` output.

**`SimplifiedAPIClient` (`src/api/client.ts`)** — thin axios-based wrapper around the Simplified REST API with bearer-token auth, configurable timeout, and retry-with-delay.

### Logging — critical constraint

Because MCP communicates over **stdio**, anything written to **stdout corrupts the protocol stream**. All diagnostic output must go to **stderr**.

- Use `createMCPLogger()` from `src/utils/logger.ts` for server-internal logging — it forces `outputStream: 'stderr'`.
- `cli.ts` deliberately uses `console.error` (not `console.log`) for all its startup/shutdown messages.
- When adding logging anywhere in the request path, never use `console.log` / `process.stdout`.

### Errors

Central error model in `src/utils/errors.ts` / `src/types/index.ts`: `AppError` with an `ErrorType` enum, plus an `ErrorHandler` that translates internal errors into MCP-compliant error responses. Tool handlers generally catch their own errors and return `{ content: [...], isError: true }` rather than throwing, so a single failing tool doesn't take down the connection. Workflow-specific error handling lives in `src/utils/workflow-error-handler.ts`.

## Types

`src/types/index.ts` is the shared type hub — `ToolDefinition`, `ToolCallParams`, `WorkflowDefinition`, `APIClient`, `Logger`, `ServerConfig`, plus re-exports of `ToolRegistry`, `AppError`, `ErrorType`, and `ErrorHandler`. Import shared types from here.

## Tests

Jest + ts-jest with ESM preset (`jest.config.js`). The MCP SDK is mocked under `tests/__mocks__/@modelcontextprotocol/`, and `moduleNameMapper` rewrites `.js` import specifiers back to `.ts` (required because the source uses `.js` extensions in imports for ESM output). Tests mirror `src/` under `tests/`.

Note: the root-level `test-*.js` / `test-*.ts` scripts (e.g. `test-complete-workflow.js`) are standalone manual/integration scripts, **not** part of the Jest suite.

## Specs

`.kiro/specs/` contains design/requirements/tasks docs (written for the Kiro tool) for each major feature — `dynamic-workflow-tools`, `dxt-manifest-support`, `logging-consistency-fix`, etc. Consult the relevant spec for the rationale behind a subsystem before making large changes to it.
