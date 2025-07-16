import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import dedent from "dedent";
import z from "zod";
import { fetchHyperSchema, findHyperSchemaEntity } from "../../../lib/cma/utils";
import { fetchJsClientResources } from "../../../lib/js_client/utils";
import { code, h1, li, p, pre, render, ul } from "../../../lib/markdown";

export function register(server: McpServer) {
  server.registerTool(
    "js_cma_client_resource",
    {
      title: "Describe a @datocms/cma-client-node resource",
      description: "Returns information about a specific resource and all the available methods to interact with it",
      inputSchema: { resource: z.string().describe("The resource (ie. items)") },
    },
    async ({ resource }) => {
      const resources = await fetchJsClientResources();
      const resourceSchema = resources.find(r => r.namespace === resource);

      if (!resourceSchema) {
        return {
          content: [{
            type: "text",
            text: "Invalid resource name: I suggest to use the `js_cma_client_resources` tool to learn about the available resources."
          }]
        };
      }

      const cma = await fetchHyperSchema();
      const cmaSchemaEntity = findHyperSchemaEntity(cma, resourceSchema?.jsonApiType);

      if (!cmaSchemaEntity) {
        return {
          content: [{
            type: "text",
            text: "Invalid resource name: I suggest to use the `js_cma_client_resources` tool to learn about the available resources."
          }]
        };
      }

      const methods = resourceSchema.endpoints.filter(endpoint => !endpoint.deprecated);

      return {
        content: [{
          type: "text",
          text: render(
            cmaSchemaEntity.description ? `${cmaSchemaEntity.description}\n\n` : '',
            h1('Available methods for resource ', code(resource)),
            ul(
              ...methods.map(m => li(m.paginatedResponse ? (`${m.name || m.rawName}PagedIterator`) : (m.name || m.rawName), ' (', m.comment, ')'))
            ),
            h1('Usage example'),
            pre({ language: 'js' },
              dedent(`
                import { buildClient } from "@datocms/cma-client-node";

                async function run() {
                const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });
                const results = await client.${resource}.<METHOD>(<ARGS>);
                console.log(results);
                }

                run();
              `)
            ),
            h1('Further documentation'),
            p('I recommend using the ', code('js_cma_client_resource_method'), ' tool to learn how to use a specific resource method.')
          ),
        }]
      };
    }
  );
}
