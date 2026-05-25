# DatoCMS MCP

> [!WARNING]
> **This local MCP server (`@datocms/mcp`) has been deprecated** in favor of the new, improved remote MCP server at [mcp.datocms.com](https://www.datocms.com/docs/mcp-server).
>
> The remote server offers streamable HTTP transport, OAuth authentication, regular updates, and zero local setup — no Node.js required.

## Use mcp.datocms.com

Update your MCP client configuration to point at the remote server:

```json
{
  "mcpServers": {
    "DatoCMS": {
      "type": "http",
      "url": "https://mcp.datocms.com"
    }
  }
}
```

See the [official documentation](https://www.datocms.com/docs/mcp-server) for setup instructions across Claude Code, Cursor, VS Code, Windsurf, and other clients.

