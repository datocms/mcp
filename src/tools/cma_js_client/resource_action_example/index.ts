import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { renderExample } from "../../../lib/cma/examples.js";
import {
	fetchCmaHyperschema,
	findCmaHyperschemaLink,
} from "../../../lib/cma/utils.js";
import { invariant } from "../../../lib/invariant.js";
import {
	fetchCmaJsClientSchema,
	findCmaJsClientEndpointByRel,
	findCmaJsClientEntityByNamespace,
} from "../../../lib/js_client/utils.js";
import { simplifiedRegisterTool } from "../../../lib/simplifiedRegisterTool.js";

export function register(server: McpServer) {
	simplifiedRegisterTool(
		server,
		"cma_js_client_resource_action_example",
		{
			title: "View a complete @datocms/cma-client-node resource action example",
			description:
				"Returns the complete code example for a specific resource action, including title, description, and full code",
			inputSchema: {
				resource: z.string().describe("The resource (ie. items)"),
				action: z.string().describe("The action (ie. create)"),
				exampleId: z.string().describe("The example ID to retrieve"),
			},
		},
		async ({ resource: namespace, action: rel, exampleId }) => {
			const jsClientSchema = await fetchCmaJsClientSchema();
			const hyperschema = await fetchCmaHyperschema();

			const jsClientEntity = findCmaJsClientEntityByNamespace(
				jsClientSchema,
				namespace,
			);

			invariant(
				jsClientEntity,
				"Invalid resource name: Use the `cma_js_client_resources` tool to learn about the available resources.",
			);

			const jsClientEndpoint = findCmaJsClientEndpointByRel(
				jsClientEntity,
				rel,
			);

			invariant(
				jsClientEndpoint && !jsClientEndpoint.deprecated,
				"Invalid action name: Use the `cma_js_client_resource` tool to learn about the available actions for a resource.",
			);

			const hyperschemaLink = findCmaHyperschemaLink(
				hyperschema,
				jsClientEndpoint.jsonApiType,
				jsClientEndpoint.rel,
			);

			invariant(
				hyperschemaLink,
				"Invalid resource/action name: Use the `cma_js_client_resources`/`cma_js_client_resource` tools to learn about the available resources and actions.",
			);

			const examples =
				hyperschemaLink?.documentation?.javascript?.examples || [];
			const example = examples.find((ex) => ex.id === exampleId);

			invariant(
				example,
				`Invalid example ID: "${exampleId}". Use the \`cma_js_client_resource_action\` tool to see available examples.`,
			);

			return renderExample(example);
		},
	);
}
