import type {
	McpServer,
	RegisteredTool,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
	CallToolResult,
	ServerNotification,
	ServerRequest,
	ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import { serializeError } from "serialize-error";
import type { ZodRawShape, ZodTypeAny, z } from "zod";
import { h1, pre, render } from "./markdown.js";

type SimplifiedToolCallback<Args extends undefined | ZodRawShape = undefined> =
	Args extends ZodRawShape
		? (
				args: z.objectOutputType<Args, ZodTypeAny>,
				extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
			) => string | Promise<string>
		: (
				extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
			) => string | Promise<string>;

function formatResponse(result: string | Error): CallToolResult {
	if (result instanceof Error) {
		return {
			content: [
				{
					type: "text",
					text: render(
						h1("Error: ", result.message),
						pre(
							{ language: "json" },
							JSON.stringify(serializeError(result), null, 2),
						),
					),
				},
			],
			isError: true,
		};
	}

	return {
		content: [
			{
				type: "text",
				text: result,
			},
		],
	};
}

export function simplifiedRegisterTool<InputArgs extends ZodRawShape>(
	server: McpServer,
	name: string,
	config: {
		title?: string;
		description?: string;
		inputSchema: InputArgs;
		annotations?: ToolAnnotations;
	},
	cb: SimplifiedToolCallback<InputArgs>,
): RegisteredTool;

export function simplifiedRegisterTool(
	server: McpServer,
	name: string,
	config: {
		title?: string;
		description?: string;
		annotations?: ToolAnnotations;
	},
	cb: SimplifiedToolCallback<undefined>,
): RegisteredTool;

export function simplifiedRegisterTool<
	InputArgs extends ZodRawShape | undefined = undefined,
>(
	server: McpServer,
	name: string,
	config: {
		title?: string;
		description?: string;
		inputSchema?: InputArgs;
		annotations?: ToolAnnotations;
	},
	cb: SimplifiedToolCallback<InputArgs>,
): RegisteredTool {
	// Create the wrapped callback that handles the response formatting
	const wrappedCallback = async (...args: any[]) => {
		try {
			let result: string;

			if (config.inputSchema) {
				// With input schema: args[0] is the parsed input, args[1] is extra
				const [parsedArgs, extra] = args as [
					z.objectOutputType<InputArgs & ZodRawShape, ZodTypeAny>,
					RequestHandlerExtra<ServerRequest, ServerNotification>,
				];
				result = await (cb as any)(parsedArgs, extra);
			} else {
				// Without input schema: args[0] is extra
				const [extra] = args as [
					RequestHandlerExtra<ServerRequest, ServerNotification>,
				];
				result = await (cb as any)(extra);
			}

			return formatResponse(result);
		} catch (error) {
			return formatResponse(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	};

	// Register the tool with the original server method
	return server.registerTool(
		name,
		{
			title: config.title,
			description: config.description,
			inputSchema: config.inputSchema,
			outputSchema: undefined, // Not used in the simplified version
			annotations: config.annotations,
		},
		wrappedCallback as any,
	);
}
