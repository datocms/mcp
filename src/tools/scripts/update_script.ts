import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { code, h1, p, render } from "../../lib/markdown.js";
import { updateScript } from "../../lib/scripts/storage.js";
import { DEFAULT_ALLOWED_PACKAGES } from "../../lib/scripts/validation.js";
import { simplifiedRegisterTool } from "../../lib/simplifiedRegisterTool.js";
import { validateAndExecuteScript } from "../../lib/workspace/execute.js";

export function register(server: McpServer, apiToken?: string) {
	const allowedPackagesStr = DEFAULT_ALLOWED_PACKAGES.join(", ");

	simplifiedRegisterTool(
		server,
		"update_script",
		{
			title: "Update script file",
			description: `Updates an existing script file by replacing a unique string with new content. The old_str must appear exactly once in the script. Pass an empty new_str to delete the old_str. The updated script will be validated to ensure it still follows the required format: 1) Only imports from these packages are allowed: ${allowedPackagesStr}, 2) Must export a default async function that takes exactly one parameter of type Client and returns a Promise`,
			inputSchema: {
				name: z
					.string()
					.describe(
						"The name of the script to update (e.g., script://my-script.ts)",
					),
				old_str: z
					.string()
					.describe("The string to replace (must be unique in the script)"),
				new_str: z
					.string()
					.describe("The string to replace with (empty to delete)"),
				execute: z
					.boolean()
					.optional()
					.describe(
						"If true, automatically execute the script after successful validation (requires API token)",
					),
			},
		},
		async ({ name, old_str, new_str, execute }) => {
			const validation = updateScript(name, old_str, new_str);

			// If basic validation failed, report those errors
			if (!validation.valid) {
				return render(
					h1("Script updated with validation errors"),
					p(
						"Script ",
						code(name),
						" has been updated, but the following validation errors were found:",
					),
					...validation.errors.map((error) => p("  - ", error)),
					p(
						"You can use ",
						code("view_script"),
						" to view the script and ",
						code("update_script"),
						" again to fix the errors.",
					),
				);
			}

			// Run TypeScript validation and optionally execute
			const result = await validateAndExecuteScript(
				name,
				apiToken,
				execute,
				"updated",
			);

			if (result) {
				return result;
			}

			return render(
				h1("Script updated successfully"),
				p(
					"Script ",
					code(name),
					" has been updated with no validation errors.",
				),
				p("Use ", code("view_script"), " to view its updated content."),
			);
		},
	);
}
