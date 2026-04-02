import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import {
	environmentArgument,
	projectArgument,
	resolveProject,
} from "../../lib/resolveProject.js";
import { simplifiedRegisterTool } from "../../lib/simplifiedRegisterTool.js";
import { executeAndRender, validateAndRender } from "./utils.js";

export function register(server: McpServer) {
	simplifiedRegisterTool(
		server,
		"execute_script",
		{
			title: "Execute script file",
			description:
				"Validates and executes a script file against the DatoCMS API. The script will be validated for TypeScript errors before execution.",
			inputSchema: {
				project: projectArgument,
				environment: environmentArgument,
				name: z
					.string()
					.describe(
						"The name of the script to execute (e.g., script://my-script.ts)",
					),
			},
		},
		async ({ project, environment, name }) => {
			const { client } = await resolveProject(project, environment);

			const validationErrors = await validateAndRender(client, name);

			if (validationErrors) {
				return validationErrors;
			}

			return executeAndRender(client, name);
		},
	);
}
