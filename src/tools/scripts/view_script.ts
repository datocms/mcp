import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { pre, render } from "../../lib/markdown.js";
import { viewScript } from "../../lib/scripts/storage.js";
import { simplifiedRegisterTool } from "../../lib/simplifiedRegisterTool.js";

export function register(server: McpServer) {
	simplifiedRegisterTool(
		server,
		"view_script",
		{
			title: "View script file",
			description:
				"Returns the name, description, and content of a script file.",
			inputSchema: {
				name: z
					.string()
					.describe(
						"The name of the script to view (e.g., script://my-script.ts)",
					),
			},
		},
		async ({ name }) => {
			const script = viewScript(name);

			return render(pre({ language: "text" }, script.content));
		},
	);
}
