import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { buildHyperschemaLinkDescription } from "../../../lib/cma/examples.js";
import {
	fetchCmaHyperschema,
	findCmaHyperschemaLink,
} from "../../../lib/cma/utils.js";
import { invariant } from "../../../lib/invariant.js";
import {
	extractJsClientEndpointMethods,
	fetchCmaJsClientSchema,
	findCmaJsClientEndpointByRel,
	findCmaJsClientEntityByNamespace,
} from "../../../lib/js_client/utils.js";
import { h1, pre, render } from "../../../lib/markdown.js";
import { simplifiedRegisterTool } from "../../../lib/simplifiedRegisterTool.js";

export function register(server: McpServer) {
	simplifiedRegisterTool(
		server,
		"cma_js_client_resource_action",
		{
			title: "Describe a @datocms/cma-client-node resource action",
			description:
				"Returns information about a specific resource action and all the available client methods that can be used to trigger it",
			inputSchema: {
				resource: z.string().describe("The resource (ie. items)"),
				action: z.string().describe("The action (ie. create)"),
			},
		},
		async ({ resource: namespace, action: rel }) => {
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

			const methods = extractJsClientEndpointMethods(jsClientEndpoint);

			return render(
				hyperschemaLink.description
					? `${buildHyperschemaLinkDescription(hyperschemaLink)}\n\n`
					: "",
				h1(`Available methods (client.${namespace}.<METHOD>(<ARGS>))`),
				pre(
					{ language: "typescript" },
					methods.map((method) => method.functionDefinition).join("\n\n"),
				),
			);
		},
	);
}
