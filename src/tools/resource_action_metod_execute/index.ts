import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import jq from "node-jq";
import { serializeError } from "serialize-error";
import z from "zod";
import { extractResourcesEndpointMethods } from "../../lib/code_analysis/extractEndpointMethods.js";
import { datocmsClient, MAX_OUTPUT_BYTES } from "../../lib/config.js";
import { invariant } from "../../lib/invariant.js";
import { h1, p, pre, render } from "../../lib/markdown.js";
import { fetchResourcesSchema } from "../../lib/resources/fetchResourcesSchema.js";
import {
	findResourcesEndpointByRel,
	findResourcesEntityByNamespace,
} from "../../lib/resources/finders.js";
import { simplifiedRegisterTool } from "../../lib/simplifiedRegisterTool.js";

export function register(server: McpServer) {
	for (const variant of ["destructive", "readonly"]) {
		const humanizedVariant =
			variant === "destructive"
				? "destructive — ie. create/update/delete"
				: "non-destructive — read-only";

		simplifiedRegisterTool(
			server,
			`resource_action_${variant}_method_execute`,
			{
				title: `Execute single client method (${humanizedVariant})`,
				description: render(
					p(
						"Returns the result of the execution of a ",
						humanizedVariant,
						" client method.",
					),
					p(
						"Returns the result of the execution of a ",
						humanizedVariant,
						" client method.",
					),
					p(
						`The output will be capped to ${MAX_OUTPUT_BYTES} bytes, so if you foresee that the output may be large, immediately pass a jqSelector to reduce the output`,
					),
				),
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
				},
			},
			async ({
				resource: namespace,
				action: rel,
				method,
				arguments: args,
				jqSelector,
			}) => {
				invariant(datocmsClient);

				const jsClientSchema = await fetchResourcesSchema();

				const jsClientEntity = findResourcesEntityByNamespace(
					jsClientSchema,
					namespace,
				);

				invariant(
					jsClientEntity,
					"Invalid resource name: Use the `resources` tool to learn about the available resources.",
				);

				const jsClientEndpoint = findResourcesEndpointByRel(
					jsClientEntity,
					rel,
				);

				invariant(
					jsClientEndpoint && !jsClientEndpoint.deprecated,
					"Invalid action name: Use the `resource` tool to learn about the available actions for a resource.",
				);

				if (variant === "readonly") {
					invariant(
						jsClientEndpoint.method === "GET",
						"The requested method is destructive! Use the `resource_action_destructive_method_execute` tool instead.",
					);
				} else {
					invariant(
						jsClientEndpoint.method !== "GET",
						"The requested method is non-destructive! Use the `resource_action_readonly_method_execute` tool instead.",
					);
				}

				const methodInfos =
					await extractResourcesEndpointMethods(jsClientEndpoint);

				const methodInfo = methodInfos.find(
					(methodInfo) => methodInfo.name === method,
				);

				invariant(
					methodInfo,
					"Invalid method name: Use the `resource_action` tools to learn about the available methods for a resource action.",
				);

				try {
					const result = await (datocmsClient as any)[namespace][method](
						...args,
					);
					let serialized = jqSelector
						? ((await jq.run(jqSelector, result, {
								input: "json",
								output: "pretty",
							})) as string)
						: JSON.stringify(result, null, 2);

					const isTruncated = serialized.length > MAX_OUTPUT_BYTES;
					if (isTruncated) {
						serialized = `${serialized.slice(
							0,
							MAX_OUTPUT_BYTES,
						)}\n...[truncated]`;
					}

					return render(
						...(isTruncated
							? [
									p("The response is too lengthy!"),
									h1(`First ${MAX_OUTPUT_BYTES} bytes of the response:`),
									p(
										"If the method is idempotent, you may optionally use it to repeat your request with a `jqSelector` argument in order to reduce the response length:",
									),
									pre({ language: "json" }, serialized),
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
