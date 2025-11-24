<!--datocms-autoinclude-header start-->

<a href="https://www.datocms.com/"><img src="https://www.datocms.com/images/full_logo.svg" height="60"></a>

👉 [Visit the DatoCMS homepage](https://www.datocms.com) or see [What is DatoCMS?](#what-is-datocms)

---

<!--datocms-autoinclude-header end-->

## DatoCMS MCP Server

⚠️ **Beta Release**: This server is functional but has known limitations. Operations can be slow (complex tasks may take several minutes), token-intensive, and results can be unpredictable. Success rates improve with clear, precise prompts and as the LLM learns your content model. Read our [honest assessment](#limitations--known-issues) before getting started.

A local Model Context Protocol (MCP) server that provides AI assistants with tools to interact with the [DatoCMS Content Management API](https://www.datocms.com/docs/content-management-api). Unlike typical MCPs that expose 100+ raw API endpoints, this server uses a **layered approach** with just 10 carefully designed tools that guide LLMs through discovery, planning, and execution stages.

### Key Features

- **Layered tool design**: 10 tools instead of 150+ API endpoints. Guides LLMs through discovery → planning → execution stages, reducing malformed calls and improving success rates.
- **Script-based approach**: Write and execute complete TypeScript scripts that batch multiple operations together. Validated before execution with incremental editing support for faster iteration.
- **Documentation-aware**: Retrieves detailed method documentation and concrete examples (yes, this consumes tokens, but it's necessary for the LLM to succeed).
- **Schema introspection**: Access detailed information about your project's content models, fields, and relationships.
- **Safe execution environment**: Built-in validation and guardrails prevent API misuse and malicious code execution.
- **Optional project access**: Use with or without API token for documentation vs. execution capabilities.

### Requirements
- Node.js 18 or newer
- VS Code, Cursor, Windsurf, Claude Desktop, Goose or any other MCP client

### Getting started

First, install the DatoCMS MCP server with your client.

**Standard config** works in most of the tools:

```json
{
  "mcpServers": {
    "datocms": {
      "command": "npx",
      "args": [
        "-y",
        "@datocms/mcp@latest"
      ],
      "env": {
        "DATOCMS_API_TOKEN": "your-project-api-token-here"
      }
    }
  }
}
```

<details>
<summary>Claude Code</summary>

Use the Claude Code CLI to add the DatoCMS MCP server:

```bash
claude mcp add datocms npx @datocms/mcp@latest -e DATOCMS_API_TOKEN=your-project-api-token-here
```
</details>

<details>
<summary>Claude Desktop</summary>

Follow the MCP install [guide](https://modelcontextprotocol.io/quickstart/user), use the standard config above.

</details>

<details>
<summary>Cursor</summary>

#### Click the button to install:

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=DatoCMS&config=eyJjb21tYW5kIjoibnB4IC15IEBkYXRvY21zL21jcEBsYXRlc3QiLCJlbnYiOnsiREFUT0NNU19BUElfVE9LRU4iOiIifSwiYXJncyI6W119)

#### Or install manually:

Go to `Cursor Settings` -> `Tools & Integrations` -> `New MCP Server`, then paste the following:

```json
{
  "mcpServers": {
    "DatoCMS": {
      "command": "npx -y @datocms/mcp@latest",
      "env": {
        "DATOCMS_API_TOKEN": ""
      },
      "args": []
    }
  }
}
```
</details>

<details>
<summary>Gemini CLI</summary>

Follow the MCP install [guide](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md#configure-the-mcp-server-in-settingsjson), use the standard config above.

</details>

<details>
<summary>VS Code</summary>

#### Click the button to install:

[<img src="https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF" alt="Install in VS Code">](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522datocms%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522%2540datocms%252Fmcp%2540latest%2522%255D%257D)

#### Or install manually:

Follow the MCP install [guide](https://code.visualstudio.com/docs/copilot/chat/mcp-servers#_add-an-mcp-server), use the standard config above. You can also install the DatoCMS MCP server using the VS Code CLI:

```bash
# For VS Code
code --add-mcp '{"name":"datocms","command":"npx","args":["-y", "@datocms/mcp@latest"], "env": {"DATOCMS_API_TOKEN": ""}}'
```

After installation, the DatoCMS MCP server will be available for use with your GitHub Copilot agent in VS Code.
</details>

<details>
<summary>Windsurf</summary>

Follow Windsurf MCP [documentation](https://docs.windsurf.com/windsurf/cascade/mcp). Use the standard config above.

</details>

### Configuration

The DatoCMS MCP server supports the following environment variables:

- `DATOCMS_API_TOKEN`: Your DatoCMS API token for a specific project. When provided, enables full access including schema introspection, API execution, and script execution. Without this token, only API documentation and exploration tools are available, along with the ability to create and validate scripts (but not execute them).
- `DATOCMS_ENVIRONMENT`: Specifies which DatoCMS environment the MCP server should interact with. If not set, the server automatically uses the project’s primary environment.
- `EXECUTION_TIMEOUT_SECONDS` (optional): Script execution timeout in seconds. Defaults to 60 seconds.
- `MAX_OUTPUT_BYTES` (optional): Maximum output size in bytes for all executions. Defaults to 2048 bytes (2 KB).

**With API token** (full project access):
```js
{
  "mcpServers": {
    "datocms": {
      "command": "npx",
      "args": ["-y", "@datocms/mcp@latest"],
      "env": {
        "DATOCMS_API_TOKEN": ""
      }
    }
  }
}
```

**Without API token** (documentation only):
```js
{
  "mcpServers": {
    "datocms": {
      "command": "npx",
      "args": ["-y", "@datocms/mcp@latest"]
    }
  }
}
```

### Design Philosophy

Most MCPs take the easy path: wrap every API endpoint in a thin layer and hope the LLM figures it out. This rarely works well. DatoCMS has 40+ resources and 150+ API endpoints — exposing all of them would overwhelm any LLM.

Instead, we use a **layered approach** inspired by [how Block built their MCP tools](https://engineering.block.xyz/blog/build-mcp-tools-like-ogres-with-layers):

1. **Discovery layer**: Tools to explore what resources, actions, and methods are available
2. **Planning layer**: Tools to understand how to use specific methods (with documentation and examples)
3. **Execution layer**: Tools to actually perform operations (read-only or destructive)

This structure guides the LLM through a workflow that matches how humans would approach an unfamiliar API. It reduces the chance of malformed calls and makes debugging much easier.

Additionally, our **script-based approach** lets LLMs write complete TypeScript programs instead of making one API call at a time. This:
- Reduces round-trips and token overhead
- Gives the LLM full context to reason about entire operations
- Enables incremental editing when errors occur (fixing specific issues without rewriting everything)
- Allows complex multi-step operations that would fail with individual API calls

### Tools

The DatoCMS MCP server provides the following tools:

#### Documentation & Exploration Tools

- **resources**: List all available DatoCMS API resources
- **resource**: Get details about a specific resource (e.g., items, assets)
- **resource_action**: Show available actions for a resource
- **resource_action_method**: Get detailed method documentation with examples

#### Schema Tools (require an API token)

- **schema_info**: Get detailed information about DatoCMS models and modular blocks, including fields, fieldsets, nested blocks, and relationships

#### API Execution Tools (require an API token)

- **resource_action_readonly_method_execute**: Execute read-only operations (e.g., list, find, raw queries)
- **resource_action_destructive_method_execute**: Execute write operations (e.g., create, update, destroy)

#### Script Management Tools

- **create_script**: Create and store TypeScript scripts that can interact with the DatoCMS API
- **view_script**: View the content of a previously created script
- **update_script**: Update an existing script
- **execute_script**: Run a script against your DatoCMS project (requires an API token)

### Limitations & Known Issues

This MCP is more reliable than most alternatives, but let's be honest about what to expect:

- **Speed**: Complex operations are slow. Generating a landing page can take 5-10 minutes. Simple tasks that would take seconds via direct API calls may take a minute or more through the MCP due to the discovery and planning stages.

- **Token consumption**: The documentation-aware approach is expensive. Each operation can burn through thousands of tokens because we retrieve full method documentation and examples. This is necessary for success, but it comes at a cost.

- **Unpredictability**: LLMs sometimes take inefficient paths, forget context, or make mistakes even with complete information. Success rates improve significantly when you:
  - Provide clear, precise prompts
  - Anticipate sources of uncertainty and address them upfront
  - Allow the LLM to learn your content model through initial operations

- **Scale limitations**: Very large records or particularly complex batch operations may hit timeout or output limits. The server can handle most real-world scenarios, but edge cases exist.

**Why release it?** Because despite these limitations, it successfully handles complex multi-step operations that break other MCPs. It can generate landing pages, translate content, modify schemas, and perform batch updates — tasks that require genuine understanding of your content model. When it works, it works well. And it works often enough to be genuinely useful.

### Security

The DatoCMS MCP server implements multiple layers of security to prevent prompt injection and malicious code execution:

#### Script Validation

All scripts created through the `create_script` and `update_script` tools undergo strict structural validation before being stored or executed:

1. **Package Whitelist**: Scripts can only import from explicitly allowed packages:
   - `@datocms/*` - DatoCMS official packages
   - `datocms-*` - DatoCMS-prefixed packages
   - `./schema` - Local schema definitions

   Any attempt to import from other packages (e.g., `fs`, `child_process`, `net`) will be rejected.

2. **Enforced Function Signature**: Scripts must export a default async function with exactly one parameter of type `Client`:
   ```typescript
   export default async function(client: Client): Promise<void> {
     // Script code here
   }
   ```
   This ensures scripts can only interact with the DatoCMS API through the provided client, with no access to Node.js system APIs.

3. **Type Safety**: Scripts cannot use `any` or `unknown` types. This prevents type-unsafe operations and encourages developers to use proper type definitions from the schema.

4. **AST-Level Validation**: The server uses TypeScript's compiler API to parse and validate the script's Abstract Syntax Tree (AST), ensuring structural requirements are met before any code execution.

These validations are performed at script creation/update time, preventing malicious code from ever being stored or executed. For implementation details, see [src/lib/scripts/validation.ts](src/lib/scripts/validation.ts).

### Feedback & Contributing

This MCP is functional but far from perfect. We're releasing it in beta because:
- It solves real problems despite its limitations
- More users means better feedback and faster improvements
- The MCP ecosystem needs more honest, working implementations

We'd love to hear about your experience:
- What works well?
- What breaks or frustrates you?
- What use cases succeed or fail?
- How does it compare to other MCPs you've tried?

Open an issue on [GitHub](https://github.com/datocms/mcp/issues) or reach out to us at [support@datocms.com](mailto:support@datocms.com).

## License

The package is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).

<!--datocms-autoinclude-footer start-->

---

# What is DatoCMS?

<a href="https://www.datocms.com/"><img src="https://www.datocms.com/images/full_logo.svg" height="60" alt="DatoCMS - The Headless CMS for the Modern Web"></a>

[DatoCMS](https://www.datocms.com/) is the REST & GraphQL Headless CMS for the modern web.

Trusted by over 25,000 enterprise businesses, agencies, and individuals across the world, DatoCMS users create online content at scale from a central hub and distribute it via API. We ❤️ our [developers](https://www.datocms.com/team/best-cms-for-developers), [content editors](https://www.datocms.com/team/content-creators) and [marketers](https://www.datocms.com/team/cms-digital-marketing)!

**Why DatoCMS?**

- **API-First Architecture**: Built for both REST and GraphQL, enabling flexible content delivery
- **Just Enough Features**: We believe in keeping things simple, and giving you [the right feature-set tools](https://www.datocms.com/features) to get the job done
- **Developer Experience**: First-class TypeScript support with powerful developer tools

**Getting Started:**

- ⚡️ [Create Free Account](https://dashboard.datocms.com/signup) - Get started with DatoCMS in minutes
- 🔖 [Documentation](https://www.datocms.com/docs) - Comprehensive guides and API references
- ⚙️ [Community Support](https://community.datocms.com/) - Get help from our team and community
- 🆕 [Changelog](https://www.datocms.com/product-updates) - Latest features and improvements

**Official Libraries:**

- [**Content Delivery Client**](https://github.com/datocms/cda-client) - TypeScript GraphQL client for content fetching
- [**REST API Clients**](https://github.com/datocms/js-rest-api-clients) - Node.js/Browser clients for content management
- [**CLI Tools**](https://github.com/datocms/cli) - Command-line utilities for schema migrations (includes [Contentful](https://github.com/datocms/cli/tree/main/packages/cli-plugin-contentful) and [WordPress](https://github.com/datocms/cli/tree/main/packages/cli-plugin-wordpress) importers)

**Official Framework Integrations**

Helpers to manage SEO, images, video and Structured Text coming from your DatoCMS projects:

- [**React Components**](https://github.com/datocms/react-datocms)
- [**Vue Components**](https://github.com/datocms/vue-datocms)
- [**Svelte Components**](https://github.com/datocms/datocms-svelte)
- [**Astro Components**](https://github.com/datocms/astro-datocms)

**Additional Resources:**

- [**Plugin Examples**](https://github.com/datocms/plugins) - Example plugins we've made that extend the editor/admin dashboard
- [**Starter Projects**](https://www.datocms.com/marketplace/starters) - Example website implementations for popular frameworks
- [**All Public Repositories**](https://github.com/orgs/datocms/repositories?q=&type=public&language=&sort=stargazers)

<!--datocms-autoinclude-footer end-->
