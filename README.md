<!--datocms-autoinclude-header start-->

<a href="https://www.datocms.com/"><img src="https://www.datocms.com/images/full_logo.svg" height="60"></a>

👉 [Visit the DatoCMS homepage](https://www.datocms.com) or see [What is DatoCMS?](#what-is-datocms)

---

<!--datocms-autoinclude-header end-->

## DatoCMS MCP Server

⚠️ Alpha Release: This server is in early development. Features may change and stability is not guaranteed.

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
