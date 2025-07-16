import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { register as registerJsCmaClientResource } from "./tools/js_cma_client/resource";
import { register as registerJsCmaClientResourceMethod } from "./tools/js_cma_client/resource_method";
import { register as registerJsCmaClientResources } from "./tools/js_cma_client/resources";

export function createServer() {
  const server = new McpServer({
    name: "datocms-docs",
    version: "1.0.0"
  });

  registerJsCmaClientResources(server);
  registerJsCmaClientResource(server);
  registerJsCmaClientResourceMethod(server);

  return server;
}