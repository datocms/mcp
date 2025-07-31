import { buildClient } from "@datocms/cma-client-node";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import jq from "node-jq";
import { serializeError } from "serialize-error";
import z from "zod";
import { h1, p, pre, render } from "../../../lib/markdown.js";
import { simplifiedRegisterTool } from "../../../lib/simplifiedRegisterTool.js";

export function register(server: McpServer, apiToken: string) {
	simplifiedRegisterTool(
		server,
		"resource_action_method_execute",
		{
			title: "Executes a specifict JS CMA method",
			description:
				"Returns the result of the execution of a client method. The output will be capped to 5k chars, so if you foresee that the output may be large, immediately pass a jqSelector to reduce the output",
			inputSchema: {
				resource: z.string().describe("The resource (ie. items)"),
				action: z.string().describe("The action (ie. instances)"),
				method: z
					.string()
					.describe(
						"The method to execute (ie. list, rawList, listPagedIterator)",
					),
				arguments: z
					.array(z.any())
					.describe("The array of arguments to pass to the method"),
				jqSelector: z
					.string()
					.describe(
						"The response of a method call can be extremely big. Here you can pass a jq selector to filter it out (ie. .data | .attributes.name)",
					),
				environmentId: z
					.string()
					.optional()
					.describe(
						"The ID of the environment in which to perform the call. If not passed it defaults to the primary environment.",
					),
			},
		},
		async ({
			resource,
			method,
			arguments: args,
			jqSelector,
			environmentId,
		}) => {
			const client = buildClient({
				apiToken,
				environment: environmentId,
			}) as any;

			try {
				const result = await client[resource][method](...args);
				const serialized = jqSelector
					? ((await jq.run(jqSelector, result, {
							input: "json",
							output: "pretty",
						})) as string)
					: JSON.stringify(result, null, 2);
				const lines = serialized.split(`\n`);

				return render(
					...(lines.length > 500
						? [
								p("The response is too lengthy!"),
								h1("First 500 lines of the response:"),
								p(
									"If the method is idempotent, you may optionally use it to repeat your request with a `jqSelector` argument in order to reduce the response length:",
								),
								pre(
									{ language: "json" },
									serialized.split(`\n`).slice(0, 500).join("\n"),
								),
							]
						: [pre({ language: "json" }, serialized)]),
				);
			} catch (e) {
				return render(
					pre({ language: "json" }, JSON.stringify(serializeError(e), null, 2)),
				);
			}
		},
	);
}
