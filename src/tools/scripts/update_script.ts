import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { code, h1, h2, li, ol, p, render } from "../../lib/markdown.js";
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
			description: render(
				p(
					"Updates an existing script file by performing multiple string replacements in a single operation.",
				),
				h2("How Replacements Work"),
				ol(
					li(
						"Each replacement's ",
						code("old_str"),
						" must appear exactly once in the script at the time it's processed",
					),
					li(
						"Replacements are applied sequentially in the order provided",
					),
					li(
						"Pass an empty ",
						code("new_str"),
						" to delete the ",
						code("old_str"),
					),
				),
				h2("Validation"),
				p(
					"The updated script will be validated to ensure it still follows the required format:",
				),
				ol(
					li("Only imports from these packages are allowed: ", allowedPackagesStr),
					li(
						"Must export a default async function that takes exactly one parameter of type ",
						code("Client"),
						" and returns a ",
						code("Promise<void>"),
					),
				),
			),
			inputSchema: {
				name: z
					.string()
					.describe(
						"The name of the script to update (e.g., script://my-script.ts)",
					),
				replacements: z
					.array(
						z.object({
							old_str: z
								.string()
								.describe(
									"The exact string to find and replace (must be unique in the script). IMPORTANT: Write the complete old_str first, then specify what it should be replaced with in new_str.",
								),
							new_str: z
								.string()
								.describe("The string to replace with (empty to delete)"),
						}),
					)
					.min(1)
					.describe(
						"Array of replacements to apply sequentially. Each old_str must be unique in the script at the time it's processed.",
					),
				execute: z
					.boolean()
					.optional()
					.describe(
						"If true, automatically execute the script after successful validation (requires API token)",
					),
			},
		},
		async ({ name, replacements, execute }) => {
			const validation = updateScript(
				name,
				replacements.map((r) => ({ oldStr: r.old_str, newStr: r.new_str })),
			);

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
