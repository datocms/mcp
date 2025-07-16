import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import z from "zod";
import { fetchHyperSchema, findHyperSchemaEntity } from "../../../lib/cma/utils";
import { isDefined } from "../../../lib/isDefined";
import { extractTypeDependenciesFromUrl } from "../../../lib/js_client/extractTypeDependencies";
import { fetchJsClientResources, getMethodArguments, getMethodReturnType } from "../../../lib/js_client/utils";
import { code, h1, li, p, pre, render, ul } from "../../../lib/markdown";

export function register(server: McpServer) {
  server.registerTool(
    "js_cma_client_resource_method",
    {
      title: "Describe a @datocms/cma-client-node resource",
      description: "Returns information about a specific resource and all the available methods to interact with it",
      inputSchema: {
        resource: z.string().describe("The resource (ie. items)"),
        method: z.string().describe("The method (ie. create)")
      },
    },
    async ({ resource, method }) => {
      const rawVariant = method.startsWith('raw');
      const pagedIterator = method.endsWith('PagedIterator');
      const normalizedMethod = method.replace('PagedIterator', '');

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

      const clientMethod = resourceSchema.endpoints.filter(endpoint => !endpoint.deprecated).find(e => e.name === normalizedMethod || e.rawName === normalizedMethod);

      if (!clientMethod) {
        return {
          content: [{
            type: "text",
            text: "Invalid method name: I suggest to use the `js_cma_client_resource` tool to learn about the available methods."
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

      const link = cmaSchemaEntity.links!.find(link => clientMethod.rel === link.rel)!;

      const methodArguments = getMethodArguments(clientMethod, rawVariant, pagedIterator);
      const [methodReturnType, typeToRetrieve] = getMethodReturnType(clientMethod, rawVariant, pagedIterator);

      const result = await extractTypeDependenciesFromUrl(
        `https://cdn.jsdelivr.net/npm/@datocms/cma-client/src/generated/${rawVariant ? '' : 'Simple'}SchemaTypes.ts`,
        [typeToRetrieve, ...methodArguments.map(arg => arg.typeToRetrieve)].filter(isDefined),
      );

      return {
        content: [{
          type: "text",
          text: render(
            link.description ? `${link.description}\n\n` : '',
            h1('Arguments'),
            ul(
              ...methodArguments.map(arg => li(
                code(
                  `${arg.argumentName}${arg.optional ? '?' : ''}: ${arg.typescriptType}`
                )
              ))
            ),
            h1('Return type'),
            p(code(methodReturnType)),
            h1('Involved types'),
            pre({ language: 'typescript' }, result),
          ),
        }]
      };
    }
  );
}
