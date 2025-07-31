import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import dedent from "dedent";
import {
	fetchCmaHyperschema,
	findCmaHyperschemaEntity,
} from "../../../lib/cma/utils.js";
import { isDefined } from "../../../lib/isDefined.js";
import {
	fetchCmaJsClientSchema,
	findCmaJsClientEntityByJsonApiType,
} from "../../../lib/js_client/utils.js";
import { code, h1, h2, li, p, pre, render, ul } from "../../../lib/markdown.js";
import { simplifiedRegisterTool } from "../../../lib/simplifiedRegisterTool.js";

export function register(server: McpServer) {
	simplifiedRegisterTool(
		server,
		"cma_js_client_resources",
		{
			title: "List @datocms/cma-client-node controllable resources",
			description:
				"Lists all the available Content Management API REST resources that can be controlled",
		},
		async () => {
			const jsClientSchema = await fetchCmaJsClientSchema();
			const hyperschema = await fetchCmaHyperschema();

			const resourcesByGroup = hyperschema.groups.map((group) => ({
				title: group.title,
				resources: group.resources
					.map((jsonApiType) => {
						const jsClientEntity = findCmaJsClientEntityByJsonApiType(
							jsClientSchema,
							jsonApiType,
						);
						const hyperschemaEntity = findCmaHyperschemaEntity(
							hyperschema,
							jsonApiType,
						);

						if (!jsClientEntity || !hyperschemaEntity) {
							return undefined;
						}

						return {
							namespace: jsClientEntity.namespace,
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
					code("cma_js_client_resource"),
					" tool to learn about a specific resource and all the available actions to interact with it.",
				),
			);
		},
	);
}
