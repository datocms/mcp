# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server implementation that provides AI assistants with tools to interact with the DatoCMS Content Management API. The server enables LLMs to explore and execute DatoCMS API operations through structured documentation and safe execution capabilities.

## Development Commands

### Build and Run
- `npm run build` - Compile TypeScript to JavaScript (output: `dist/`)
- `npm start` - Build and run the MCP server via stdio
- `npm run format` - Format code using Biome

### Testing
- `npm test` - Currently a placeholder (echoes 1)
- `node test/run.js` - Run the interactive test script using LangChain and mcp-use (requires `.env` with Anthropic API key)

### Publishing
- `npm run prepublish` - Automatically runs build before publishing
- Use `np` package for releases (available in devDependencies)

## Architecture

### Entry Points
- **[bin/stdio](bin/stdio)** - CLI entry point that imports the compiled stdio.js
- **[src/stdio.ts](src/stdio.ts)** - Main stdio transport implementation (reads `DATOCMS_API_TOKEN` from env)
- **[src/web.ts](src/web.ts)** - Alternative web-based transport (for development/testing)
- **[src/server.ts](src/server.ts)** - Core server factory that registers all MCP tools

### Tool Registration Pattern

The codebase uses a consistent pattern for registering MCP tools:

1. Each tool is implemented in `src/tools/cma_js_client/<tool_name>/index.ts`
2. Tools export a `register(server, [apiToken])` function
3. Registration happens in [src/server.ts](src/server.ts:9-23) via `createServer()`
4. Tools use `simplifiedRegisterTool()` helper that wraps the MCP SDK and provides automatic error formatting

### Available Tools

**Documentation tools** (always available):
- `cma_js_client_usage_rules` - Critical usage guidelines (must be called first)
- `cma_js_client_resources` - List all DatoCMS API resources
- `cma_js_client_resource` - Get resource details
- `cma_js_client_resource_action` - Show available actions for a resource
- `cma_js_client_resource_action_method` - Get detailed method documentation with examples

**Execution tools** (require `DATOCMS_API_TOKEN`):
- `cma_js_client_resource_action_readonly_method_execute` - Execute read-only operations
- `cma_js_client_resource_action_destructive_method_execute` - Execute create/update/delete operations

### Key Libraries and Utilities

- **[src/lib/simplifiedRegisterTool.ts](src/lib/simplifiedRegisterTool.ts)** - Wrapper around MCP SDK's `registerTool()` that handles error serialization and response formatting
- **[src/lib/js_client/utils.ts](src/lib/js_client/utils.ts)** - Utilities for fetching and navigating the CMA JS client schema
- **[src/lib/cma/types.ts](src/lib/cma/types.ts)** - TypeScript types for the CMA hyperschema (links, examples, etc.)
- **[src/lib/markdown.ts](src/lib/markdown.ts)** - Markdown formatting helpers for tool responses
- **[src/lib/cacheFor.ts](src/lib/cacheFor.ts)** - Caching utility wrapper

### Data Flow

1. MCP client connects via stdio transport
2. Client calls tool (e.g., `cma_js_client_resource_action_method`)
3. Tool fetches CMA schema from DatoCMS API (cached)
4. Tool navigates schema to find requested resource/action/method
5. Tool formats response as markdown with examples and type information
6. For execution tools: instantiate DatoCMS client with API token and execute method
7. Results optionally filtered through `jq` (using `node-jq`) before returning

### TypeScript Configuration

The project uses strict TypeScript settings with:
- ES2022 target with NodeNext module resolution
- All strict checks enabled (noImplicitAny, strictNullChecks, etc.)
- noUncheckedIndexedAccess for safer array/object access
- Source files in `src/`, compiled output in `dist/`

### Important Implementation Details

- The server conditionally registers execution tools only when `DATOCMS_API_TOKEN` is provided
- Execution tools are split into "readonly" (GET) and "destructive" (POST/PUT/DELETE/PATCH) variants
- The `usage_rules` tool contains critical instructions that LLMs must follow (e.g., always verify method schemas before writing code)
- Response sizes are capped to 5k characters for execution tools; use `jqSelector` parameter to filter large responses
- All tool callbacks are wrapped to catch errors and return formatted error responses