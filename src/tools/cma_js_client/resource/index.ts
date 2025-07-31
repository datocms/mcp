import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import {
	fetchCmaHyperschema,
	findCmaHyperschemaEntity,
} from "../../../lib/cma/utils.js";
import { invariant } from "../../../lib/invariant.js";
import {
	fetchCmaJsClientSchema,
	findCmaJsClientEntityByNamespace,
} from "../../../lib/js_client/utils.js";
import { code, h1, li, p, render, ul } from "../../../lib/markdown.js";
import { simplifiedRegisterTool } from "../../../lib/simplifiedRegisterTool.js";

export function register(server: McpServer) {
	simplifiedRegisterTool(
		server,
		"cma_js_client_resource",
		{
			title: "Describe a @datocms/cma-client-node resource",
			description:
				"Returns information about a specific resource and all the available methods to interact with it",
			inputSchema: {
				resource: z.string().describe("The resource (ie. items)"),
			},
		},
		async ({ resource: namespace }) => {
			const jsClientSchema = await fetchCmaJsClientSchema();
			const hyperschema = await fetchCmaHyperschema();

			const jsClientEntity = findCmaJsClientEntityByNamespace(
				jsClientSchema,
				namespace,
			);

			invariant(
				jsClientEntity,
				"Invalid resource: use the `cma_js_client_resources` tool to learn about the available resources.",
			);

			const hyperschemaEntity = findCmaHyperschemaEntity(
				hyperschema,
				jsClientEntity.jsonApiType,
			);

			invariant(
				hyperschemaEntity,
				"Invalid resource: use the `cma_js_client_resources` tool to learn about the available resources.",
			);

			const endpoints = jsClientEntity.endpoints.filter(
				(endpoint) => !endpoint.deprecated,
			);

			return render(
				hyperschemaEntity.description
					? `${hyperschemaEntity.description}\n\n`
					: "",
				h1("Available actions"),
				ul(
					...endpoints.map((endpoint) =>
						li(endpoint.rel, " (", endpoint.comment, ")"),
					),
				),
				h1("Further documentation"),
				p(
					"I recommend using the ",
					code("cma_js_client_resource_action"),
					" tool to learn the available methods for a specific action. Do not use ",
					code("cma_js_client_resource_action_method"),
					" directly. Pass through ",
					code("cma_js_client_resource_action"),
					" first to properly understand all the available methods for the same action.",
				),
			);
		},
	);
}
