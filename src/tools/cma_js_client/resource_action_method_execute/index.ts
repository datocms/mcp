import { buildClient } from "@datocms/cma-client-node";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import jq from "node-jq";
import { serializeError } from "serialize-error";
import z from "zod";
import { invariant } from "../../../lib/invariant.js";
import {
	extractJsClientEndpointMethods,
	fetchCmaJsClientSchema,
	findCmaJsClientEndpointByRel,
	findCmaJsClientEntityByNamespace,
} from "../../../lib/js_client/utils.js";
import { h1, p, pre, render } from "../../../lib/markdown.js";
import { simplifiedRegisterTool } from "../../../lib/simplifiedRegisterTool.js";

export function register(server: McpServer, apiToken: string) {
	for (const variant of ["destructive", "readonly"]) {
		const humanizedVariant =
			variant === "destructive"
				? "destructive (ie. create/update/delete)"
				: "non-destructive (read-only)";

		simplifiedRegisterTool(
			server,
			`cma_js_client_resource_action_${variant}_method_execute`,
			{
				title: `Executes a specific JS CMA method (${humanizedVariant})`,
				description: `Returns the result of the execution of a ${humanizedVariant} client method. The output will be capped to 5k chars, so if you foresee that the output may be large, immediately pass a jqSelector to reduce the output`,
				inputSchema: {
					resource: z.string().describe("The resource (ie. items)"),
					action: z
						.string()
						.describe(
							`The action (ie. instances). The action MUST be ${humanizedVariant}`,
						),
					method: z
						.string()
						.describe(
							`The method to execute (ie. list, rawList, listPagedIterator)`,
						),
					arguments: z
						.array(z.any())
						.describe("The array of arguments to pass to the method"),
					jqSelector: z
						.string()
						.describe(
							"The response of a method call can be extremely big! Here you can pass a jq selector to filter it out (ie. .attributes.name)",
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
				resource: namespace,
				action: rel,
				method,
				arguments: args,
				jqSelector,
				environmentId,
			}) => {
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

				if (variant === "readonly") {
					invariant(
						jsClientEndpoint.method === "GET",
						"The requested method is destructive! Use the `cma_js_client_resource_action_destructive_method_execute` tool instead.",
					);
				} else {
					invariant(
						jsClientEndpoint.method !== "GET",
						"The requested method is non-destructive! Use the `cma_js_client_resource_action_readonly_method_execute` tool instead.",
					);
				}

				const methodInfos = extractJsClientEndpointMethods(jsClientEndpoint);

				const methodInfo = methodInfos.find(
					(methodInfo) => methodInfo.name === method,
				);

				invariant(
					methodInfo,
					"Invalid method name: Use the `cma_js_client_resource_action` tools to learn about the available methods for a resource action.",
				);

				const client = buildClient({
					apiToken,
					environment: environmentId,
				}) as any;

				try {
					const result = await client[namespace][method](...args);
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
						pre(
							{ language: "json" },
							JSON.stringify(serializeError(e), null, 2),
						),
					);
				}
			},
		);
	}
}
