import { buildClient } from "@datocms/cma-client-node";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { invariant } from "../../lib/invariant.js";
import { code, h1, p, pre, render } from "../../lib/markdown.js";
import { viewScript } from "../../lib/scripts/storage.js";
import { simplifiedRegisterTool } from "../../lib/simplifiedRegisterTool.js";
import { executeAndRender } from "../../lib/workspace/execute.js";
import { getWorkspace } from "../../lib/workspace/index.js";

export function register(server: McpServer) {
	simplifiedRegisterTool(
		server,
		"execute_script",
		{
			title: "Execute script file",
			description:
				"Validates and executes a script file against the DatoCMS API. The script will be validated for TypeScript errors before execution.",
			inputSchema: {
				name: z
					.string()
					.describe(
						"The name of the script to execute (e.g., script://my-script.ts)",
					),
			},
		},
		async ({ name }) => {
			invariant(process.env.DATOCMS_API_TOKEN);

			const script = viewScript(name);
			const wm = await getWorkspace();
			const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

			// First validate the script
			const validation = await wm.validateScript(script, client);

			if (!validation.passed) {
				return render(
					h1("Script validation failed"),
					p(
						"Script ",
						code(script.name),
						" has TypeScript validation errors and cannot be executed:",
					),
					pre({ language: "text" }, validation.output),
					p(
						"Please fix the errors using ",
						code("update_script"),
						" and try again.",
					),
				);
			}

			// Execute the script
			return executeAndRender(script, process.env.DATOCMS_API_TOKEN, wm);
		},
	);
}
