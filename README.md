## DatoCMS MCP Server

[![smithery badge](https://smithery.ai/badge/@datocms/mcp)](https://smithery.ai/server/@datocms/mcp)

A local Model Context Protocol (MCP) server that provides AI assistants with tools to interact with the [DatoCMS Content Management API](https://www.datocms.com/docs/content-management-api). This server enables LLMs to explore and execute DatoCMS API operations through structured documentation and safe execution capabilities.

### Key Features

- **Comprehensive API exploration**. Browse all DatoCMS resources, actions, and methods with live documentation.
- **Safe execution environment**. Built-in usage rules and guardrails prevent API misuse.
- **Optional project access**. Use with or without API token for documentation vs. execution capabilities.

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

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=datocms&config=eyJjb21tYW5kIjoibnB4IC15IEBkYXRvY21zL21jcEBsYXRlc3QiLCJlbnYiOnsiREFUT0NNU19BUElfVE9LRU4iOiIifX0%3D)

#### Or install manually:

Go to `Cursor Settings` -> `MCP` -> `Add new MCP Server`, then paste the following:

```json
{
  "mcpServers": {
    "datocms": {
      "command": "npx -y @datocms/mcp@latest",
      "env": {
        "DATOCMS_API_TOKEN": ""
      }
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

### Installing via Smithery

To install DatoCMS MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@datocms/mcp):

```bash
npx -y @smithery/cli install @datocms/mcp --client claude
```

### Configuration

The DatoCMS MCP server supports one optional environment variable:

- `DATOCMS_API_TOKEN`: Your DatoCMS API token for a specific project. When provided, enables read/write operations on your DatoCMS project. Without this token, only general knowledge and API documentation tools are available.

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

### Tools

The DatoCMS MCP server provides the following tools:

#### Documentation & Exploration Tools

- **cma_js_client_usage_rules**: General usage guidelines for the MCP
- **cma_js_client_resources**: List all available DatoCMS API resources
- **cma_js_client_resource**: Get details about a specific resource (e.g., items, assets)
- **cma_js_client_resource_action**: Show available actions for a resource
- **cma_js_client_resource_action_method**: Get detailed method documentation with examples

#### Execution Tools (require an API token with appropriate permission)

- **cma_js_client_resource_action_readonly_method_execute**: Perform an read-only operation to the project
- **cma_js_client_resource_action_destructive_method_execute**: Perform destructive operation to the project (create, update, destroy, etc.)