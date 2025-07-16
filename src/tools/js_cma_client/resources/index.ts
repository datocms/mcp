import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import dedent from "dedent";
import { fetchHyperSchema, findHyperSchemaEntity } from "../../../lib/cma/utils";
import { isDefined } from "../../../lib/isDefined";
import { fetchJsClientResources } from "../../../lib/js_client/utils";
import { code, h1, h2, li, p, pre, render, ul } from "../../../lib/markdown";

export function register(server: McpServer) {
  server.registerTool(
    "js_cma_client_resources",
    {
      title: "List @datocms/cma-client-node controllable resources",
      description: "Lists all the available Content Management API REST resources that can be controlled",
    },
    async () => {
      const resources = await fetchJsClientResources();
      const cma = await fetchHyperSchema();

      const resourcesByGroup = cma.groups.map(group => ({
        title: group.title,
        resources: group.resources.map(jsonApiType => {
          const resource = resources.find(r => r.jsonApiType === jsonApiType);

          if (!resource) {
            return undefined;
          }

          const cmaSchemaEntity = findHyperSchemaEntity(cma, jsonApiType);

          if (!cmaSchemaEntity) {
            return undefined;
          }

          return {
            namespace: resource.namespace,
            title: cmaSchemaEntity.title,
            description: (cmaSchemaEntity.description || '').split(/\n/)[0],
          };
        }).filter(isDefined)
      }));

      return ({
        content: [{
          type: "text",
          text:
            render(
              h1('Available resources grouped by theme'),
              ...resourcesByGroup.flatMap(group =>
                [
                  h2(group.title),
                  ul(...group.resources.map(resource => li(resource.namespace, ' (', [resource.title, resource.description].filter(isDefined).join(' — '), ')'))),
                ]
              ),
              h1('Usage example'),
              pre({ language: 'js' },
                dedent(`
                  import { buildClient } from "@datocms/cma-client-node";

                  async function run() {
                  const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });
                  const results = await client.<RESOURCE>.<METHOD>(<ARGS>);
                  console.log(results);
                  }

                  run();
                `)
              ),
              h1('Further documentation'),
              p('I recommend using the ', code('js_cma_client_resource'), ' tool to learn about a specific resource and its methods.'),
            ),
        }]
      });
    }
  );
}