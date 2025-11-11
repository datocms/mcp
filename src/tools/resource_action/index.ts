import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { extractResourcesEndpointMethods } from "../../lib/code_analysis/extractEndpointMethods.js";
import { buildHyperschemaLinkDescription } from "../../lib/hyperschema/buildHyperschemaLinkDescription.js";
import {
	fetchHyperschema,
	findHyperschemaLink,
} from "../../lib/hyperschema/utils.js";
import { invariant } from "../../lib/invariant.js";
import { h1, pre, render } from "../../lib/markdown.js";
import { fetchResourcesSchema } from "../../lib/resources/fetchResourcesSchema.js";
import {
	findResourcesEndpointByRel,
	findResourcesEntityByNamespace,
} from "../../lib/resources/finders.js";
import { simplifiedRegisterTool } from "../../lib/simplifiedRegisterTool.js";

export function register(server: McpServer) {
	simplifiedRegisterTool(
		server,
		"resource_action",
		{
			title: "Describe resource action",
			description:
				"Returns information about a specific resource action and all the available client methods that can be used to trigger it",
			inputSchema: {
				resource: z.string().describe("The resource (ie. items)"),
				action: z.string().describe("The action (ie. create)"),
				expandDetails: z
					.array(z.string())
					.optional()
					.describe(
						"Detail summaries to expand. By default, all <details /> are collapsed showing only their <summary />. Pass exact summary text (e.g., ['Example: Basic example', 'Example: Managing localized fields']) to get full content for those details only.",
					),
			},
		},
		async ({ resource: namespace, action: rel, expandDetails }) => {
			const resourcesSchema = await fetchResourcesSchema();
			const hyperschema = await fetchHyperschema();

			const resourcesEntity = findResourcesEntityByNamespace(
				resourcesSchema,
				namespace,
			);

			invariant(
				resourcesEntity,
				"Invalid resource name: Use the `resources` tool to learn about the available resources.",
			);

			const resourcesEndpoint = findResourcesEndpointByRel(
				resourcesEntity,
				rel,
			);

			invariant(
				resourcesEndpoint,
				"Invalid action name: Use the `resource` tool to learn about the available actions for a resource.",
			);

			const hyperschemaLink = findHyperschemaLink(
				hyperschema,
				resourcesEndpoint.jsonApiType,
				resourcesEndpoint.rel,
			);

			invariant(
				hyperschemaLink,
				"Invalid resource/action name: Use the `resources`/`resource` tools to learn about the available resources and actions.",
			);

			const methods = await extractResourcesEndpointMethods(resourcesEndpoint);
			const hasFilter = expandDetails && expandDetails.length > 0;

			const description = hyperschemaLink.description
				? buildHyperschemaLinkDescription(hyperschemaLink, expandDetails)
				: "";

			// When filtering, return ONLY the matching examples
			if (hasFilter) {
				return description;
			}

			// When not filtering, return full output with available methods
			return render(
				description ? `${description}\n\n` : "",
				h1(`Available methods (client.${namespace}.<METHOD>(<ARGS>))`),
				pre(
					{ language: "typescript" },
					methods.map((method) => method.functionDefinition).join("\n\n"),
				),
			);
		},
	);
}
