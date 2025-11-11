import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import dedent from "dedent";
import {
	fetchHyperschema,
	findHyperschemaEntity,
} from "../../lib/hyperschema/utils.js";
import { isDefined } from "../../lib/isDefined.js";
import { code, h1, h2, li, p, pre, render, ul } from "../../lib/markdown.js";
import { fetchResourcesSchema } from "../../lib/resources/fetchResourcesSchema.js";
import { findResourcesEntityByJsonApiType } from "../../lib/resources/finders.js";
import { simplifiedRegisterTool } from "../../lib/simplifiedRegisterTool.js";

export function register(server: McpServer) {
	simplifiedRegisterTool(
		server,
		"resources",
		{
			title: "List controllable resources",
			description:
				"Lists all the available Content Management API REST resources that can be controlled",
		},
		async () => {
			const resourcesSchema = await fetchResourcesSchema();
			const hyperschema = await fetchHyperschema();

			const resourcesByGroup = hyperschema.groups.map((group) => ({
				title: group.title,
				resources: group.resources
					.map((jsonApiType) => {
						const resourcesEntity = findResourcesEntityByJsonApiType(
							resourcesSchema,
							jsonApiType,
						);
						const hyperschemaEntity = findHyperschemaEntity(
							hyperschema,
							jsonApiType,
						);

						if (!resourcesEntity || !hyperschemaEntity) {
							return undefined;
						}

						return {
							namespace: resourcesEntity.namespace,
							title: hyperschemaEntity.title,
							description: (hyperschemaEntity.description || "").split(/\n/)[0],
						};
					})
					.filter(isDefined),
			}));

			return render(
				h1("Available resources grouped by theme"),
				...resourcesByGroup.flatMap((group) => [
					h2(group.title),
					ul(
						...group.resources.map((resource) =>
							li(
								resource.namespace,
								" (",
								[resource.title, resource.description]
									.filter(isDefined)
									.join(" — "),
								")",
							),
						),
					),
				]),
				h1("Usage example"),
				pre(
					{ language: "js" },
					dedent(`
						import { buildClient } from "@datocms/cma-client-node";

						async function run() {
						const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });
						await client.<RESOURCE>.<METHOD>(<ARGS>);
						}

						run();
					`),
				),
				h1("Further documentation"),
				p(
					"Use the ",
					code("resource"),
					" tool to learn about a specific resource and all the available actions to interact with it.",
				),
			);
		},
	);
}
