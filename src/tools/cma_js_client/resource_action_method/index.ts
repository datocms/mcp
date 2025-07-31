import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { invariant } from "../../../lib/invariant.js";
import {
	extractJsClientEndpointMethods,
	fetchCmaJsClientSchema,
	fetchSchemaTypes,
	fetchSimpleSchemaTypes,
	findCmaJsClientEndpointByRel,
	findCmaJsClientEntityByNamespace,
	retrieveJsClientEndpointMethodTypes,
} from "../../../lib/js_client/utils.js";
import { pre, render } from "../../../lib/markdown.js";
import { simplifiedRegisterTool } from "../../../lib/simplifiedRegisterTool.js";

export function register(server: McpServer) {
	simplifiedRegisterTool(
		server,
		"cma_js_client_resource_action_method",
		{
			title: "Describe a @datocms/cma-client-node resource method",
			description:
				"Returns the complete TypeScript definition of a specific resource method (arguments and return value types)",
			inputSchema: {
				resource: z.string().describe("The resource (ie. items)"),
				action: z.string().describe("The action (ie. instances)"),
				method: z
					.string()
					.describe("The method (ie. list, rawList, listPagedIterator)"),
			},
		},
		async ({ resource: namespace, action: rel, method }) => {
			const jsClientSchema = await fetchCmaJsClientSchema();

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

			const methodInfos = extractJsClientEndpointMethods(jsClientEndpoint);

			const methodInfo = methodInfos.find(
				(methodInfo) => methodInfo.name === method,
			);

			invariant(
				methodInfo,
				"Invalid method name: Use the `cma_js_client_resource_action` tools to learn about the available methods for a resource action.",
			);

			const sourceFile = await (methodInfo.simple
				? fetchSimpleSchemaTypes()
				: fetchSchemaTypes());

			return render(
				pre(
					{ language: "typescript" },
					[
						methodInfo.functionDefinition,
						await retrieveJsClientEndpointMethodTypes(
							sourceFile,
							Array.from(methodInfo.referencedTypes),
						),
					].join("\n\n"),
				),
			);
		},
	);
}
