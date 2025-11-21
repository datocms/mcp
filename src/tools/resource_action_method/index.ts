import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import {
	extractMethodSignature,
	formatMethodSignature,
} from "../../lib/code_analysis/extractMethodSignature.js";
import { extractTypeDependencies } from "../../lib/code_analysis/extractTypeDependencies.js";
import { getCmaClientProgram } from "../../lib/code_analysis/getCmaClientProgram.js";
import { invariant } from "../../lib/invariant.js";
import { pre, render } from "../../lib/markdown.js";
import { simplifiedRegisterTool } from "../../lib/simplifiedRegisterTool.js";

/**
 * Resource Action Method using TypeScript Compiler API
 *
 * Uses the TypeScript Compiler API to extract method signatures and type definitions
 * directly from the installed @datocms/cma-client-node package.
 *
 * Benefits:
 * - Handles cross-file type dependencies automatically
 * - Handles complex generics, circular references, etc.
 */
export function register(server: McpServer) {
	simplifiedRegisterTool(
		server,
		"resource_action_method",
		{
			title: "Describe a resource method",
			description:
				"Returns the complete TypeScript definition of a specific resource method (arguments and return value types)",
			inputSchema: {
				resource: z.string().describe("The resource (ie. uploads, items)"),
				method: z
					.string()
					.describe(
						"The method (ie. createFromLocalFile, list, rawList, listPagedIterator)",
					),
				expandTypes: z
					.array(z.string())
					.optional()
					.describe(
						"Type definitions to expand. By default, only types up to depth 2 are shown. Pass specific type names (e.g., ['SimpleSchemaTypes.Upload', 'SimpleSchemaTypes.UploadCreateSchema']) to expand those types fully, or ['*'] to show all types with no depth limit. ⚠️ Use ['*'] only if absolutely necessary — it can bloat the context and hinder performance.",
					),
			},
		},
		async ({ resource, method, expandTypes }) => {
			try {
				// 1. Get cached TypeScript program with Client class
				const { program, checker, clientClass } = await getCmaClientProgram();

				// 2. Extract method signature using TypeChecker
				const methodSignature = extractMethodSignature(
					checker,
					clientClass,
					resource,
					method,
				);

				invariant(
					methodSignature,
					`Method '${method}' not found on resource '${resource}'. Make sure both the resource and method names are correct.`,
				);

				// 3. Format the method signature
				const formattedSignature = formatMethodSignature(methodSignature);

				// 4. Extract all referenced types using TypeChecker
				const { expandedTypes, notExpandedTypes } = extractTypeDependencies(
					checker,
					program,
					Array.from(methodSignature.referencedTypeSymbols.keys()),
					methodSignature.referencedTypeSymbols,
					{ maxDepth: 3, expandTypes },
				);

				// 5. Return formatted result
				const isExpandingSpecificTypes =
					expandTypes && expandTypes.length > 0 && !expandTypes.includes("*");

				const outputParts: string[] = [];

				if (isExpandingSpecificTypes) {
					// When expanding specific types, only show type definitions
					if (expandedTypes) {
						outputParts.push(
							`// Expanded type definitions for: ${expandTypes.join(", ")}`,
						);
						outputParts.push("");
						outputParts.push(expandedTypes);
					}
					if (notExpandedTypes.length > 0) {
						if (expandedTypes) outputParts.push("");
						outputParts.push(
							`// Additional referenced types (not expanded): ${notExpandedTypes.join(", ")}`,
						);
					}
				} else {
					// Normal mode: show method signature and all types
					outputParts.push(`// Method: client.${resource}.${method}`);
					outputParts.push("");
					outputParts.push(formattedSignature);
					if (expandedTypes) {
						outputParts.push("");
						outputParts.push("// Referenced type definitions:");
						outputParts.push("");
						outputParts.push(expandedTypes);
					}
					if (notExpandedTypes.length > 0) {
						outputParts.push("");
						outputParts.push(
							`// Additional referenced types (not expanded): ${notExpandedTypes.join(", ")}`,
						);
					}
				}

				return render(pre({ language: "typescript" }, outputParts.join("\n")));
			} catch (error) {
				console.error("Error in resource_action_method tool:", error);
				throw error;
			}
		},
	);
}
