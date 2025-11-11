import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { collapseDetails } from "../../lib/hyperschema/collapseDetails.js";
import {
	fetchHyperschema,
	findHyperschemaEntity,
} from "../../lib/hyperschema/utils.js";
import { invariant } from "../../lib/invariant.js";
import { code, h1, li, p, render, ul } from "../../lib/markdown.js";
import { fetchResourcesSchema } from "../../lib/resources/fetchResourcesSchema.js";
import { findResourcesEntityByNamespace } from "../../lib/resources/finders.js";
import { simplifiedRegisterTool } from "../../lib/simplifiedRegisterTool.js";

export function register(server: McpServer) {
	simplifiedRegisterTool(
		server,
		"resource",
		{
			title: "Describe resource",
			description:
				"Returns information about a specific resource and all the available API actions to interact with it",
			inputSchema: {
				resource: z.string().describe("The resource (ie. items)"),
				expandDetails: z
					.array(z.string())
					.optional()
					.describe(
						"Detail summaries to expand. By default, all <details /> are collapsed showing only their <summary />. Pass exact summary text (e.g., ['Single-line string', 'Boolean']) to get full content for those details only.",
					),
			},
		},
		async ({ resource: namespace, expandDetails }) => {
			const resourcesSchema = await fetchResourcesSchema();
			const hyperschema = await fetchHyperschema();

			const resourcesEntity = findResourcesEntityByNamespace(
				resourcesSchema,
				namespace,
			);

			invariant(
				resourcesEntity,
				"Invalid resource: use the `resources` tool to learn about the available resources.",
			);

			const hyperschemaEntity = findHyperschemaEntity(
				hyperschema,
				resourcesEntity.jsonApiType,
			);

			invariant(
				hyperschemaEntity,
				"Invalid resource: use the `resources` tool to learn about the available resources.",
			);

			const processedDescription = hyperschemaEntity.description
				? collapseDetails(hyperschemaEntity.description, expandDetails)
				: "";

			const hasFilter = expandDetails && expandDetails.length > 0;

			// When filtering, return ONLY the matching details
			if (hasFilter) {
				return processedDescription;
			}

			// When not filtering, return full output with actions and documentation
			return render(
				processedDescription ? `${processedDescription}\n\n` : "",
				h1("Available actions"),
				ul(
					...resourcesEntity.endpoints.map((endpoint) =>
						li(endpoint.rel, " (", endpoint.comment, ")"),
					),
				),
				h1("Further documentation"),
				p(
					"I recommend using the ",
					code("resource_action"),
					" tool to learn the available methods for a specific action. Do not use ",
					code("resource_action_method"),
					" directly. Pass through ",
					code("resource_action"),
					" first to properly understand all the available methods for the same action.",
				),
			);
		},
	);
}
