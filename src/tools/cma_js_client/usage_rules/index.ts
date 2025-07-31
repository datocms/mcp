import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import dedent from "dedent";
import { simplifiedRegisterTool } from "../../../lib/simplifiedRegisterTool.js";

export function register(server: McpServer) {
	simplifiedRegisterTool(
		server,
		"cma_js_client_usage_rules",
		{
			title: "🚨 DATOCMS CMA JS CLIENT USAGE RULES 🚨",
			description:
				"USE THIS TOOL BEFORE PROCEEDING WITH CALLING ANY OTHER cma_js_client_* TOOL",
		},
		async () => {
			return dedent(
				`
					🚨 CRITICAL SYSTEM REQUIREMENT - VIOLATION = IMMEDIATE FAILURE 🚨

					Before writing ANY code containing DatoCMS client methods:
					✅ CHECKPOINT: Have I called cma_js_client_resource_action_method for EVERY SINGLE method I'm about to use?

					If the answer is NO, STOP IMMEDIATELY and call the tool.
					If the answer is YES, list each method and its corresponding tool call in your response.

					MANDATORY PRE-CODE CHECKLIST (must be visible in response):
					□ Called cma_js_client_usage_rules
					□ Identified ALL methods: [list them here]
					□ Called cma_js_client_resource_action_method for: [list each method]
					□ Only now proceeding with code using exact schemas

					⚠️ If any checkbox is unchecked, CODE WRITING IS FORBIDDEN

					VIOLATION CONSEQUENCE:
					If you write code without verifying ALL method schemas:
					- Start your response with: "❌ RULE VIOLATION DETECTED"
					- Explain which method schemas you didn't verify
					- Refuse to provide code until schemas are verified
					- This applies even if you "think you know" the schema

					AUTOMATIC VERIFICATION REQUIRED:
					Before any code block containing client.<resource>.<method>:
					1. Scan the code for ALL client method calls
					2. For each method, verify: "Did I call cma_js_client_resource_action_method for X?"
					3. If ANY method lacks verification, abort and verify first

					---

					CLIENT INITIALIZATION

					The \`buildClient()\` function supports the following configuration object:

					\`\`\`typescript
					export type ClientConfigOptions = {
						/** The API token to use to perform requests */
						apiToken: string | null;
						/** The base URL of the server. Defaults to https://site-api.datocms.com */
						baseUrl?: string;
						/** The environment in which to perform every API request */
						environment?: string;
						/** Configure request timeout (in ms). When timeout is reached and \`autoRetry\` is active, a new request will be performed. Otherwise, a \`TimeoutError\` will be raised. Defaults to \`30000\` */
						requestTimeout?: number;
						/** Any extra header to add to every API request */
						extraHeaders?: Record<string, string>;
						/** Level of logging */
						logLevel?: LogLevel;
						/** Function to use to log. Defaults to console.log */
						logFn?: (message: string) => void;
						/** Whether to automatically retry failed requests (ie. timeout, rate-limiting, etc.), with a linear incremental backoff. Defaults to \`true\` */
						autoRetry?: boolean;
						/** If fetch() is not available in your environment, you can provide it */
						fetchFn?: typeof fetch;
					};

					declare enum LogLevel {
						/** No logging */
						NONE = 0,
						/** Logs HTTP requests (method, URL) and responses (status) */
						BASIC = 1,
						/** Logs HTTP requests (method, URL, body) and responses (status, body) */
						BODY = 2,
						/** Logs HTTP requests (method, URL, headers, body) and responses (status, headers, body) */
						BODY_AND_HEADERS = 3
					}
					\`\`\`

					---

					DATOCMS RESPONSE FORMATS

					Simple vs Raw Methods:
					- .list() / .find() = Clean, simplified responses (but missing detailed relationships/meta)
					- .rawList() / .rawFind() = Full JSON:API with .data, .included and .meta sections

					When to Use Raw Methods:
					- Use rawFind() when you need relationships, or metadata
					- Access related entities via: .included | map(select(.type == "item"))

					RAW JSON:API Structure:
					\`\`\`json
					{
						"data": /* Main record data, or array of record data */
						"included": [ /* Related records (ie. record relationships) */ ]
						"meta": /* Additional info (ie. total # of records in case of paginated response) */
					}
					\`\`\`

					---

					JQSELECTOR USAGE

					The \`jqSelector\` parameter filters and transforms API responses using jq syntax:

					Quoting: Use double quotes for strings/fields: \`.data[0].attributes["title"]\`. Escape quotes in literals: \`"Title: \"" + .title + "\""\`

					\`\`\`jq
					.data[0].attributes.title                           # Single field
					.data | map(.attributes.title)                      # All titles
					.data | map(select(.attributes.title | test("auto"; "i")))  # Regex filter (case-insensitive)
					\`\`\`

					---

					ERROR MANAGEMENT

					The client can throw \`ApiError\` for non 2xx HTTP responses, and \`TimeoutError\`, here are the types:

					\`\`\`typescript
					declare class TimeoutError extends Error {
						request: {
							url: string;
							method: string;
							headers: Record<string, string>;
							body?: unknown;
						};
						preCallStack?: string;
					}

					declare class ApiError extends Error {
						request: {
							url: string;
							method: string;
							headers: Record<string, string>;
							body?: unknown;
						};
						response: {
							status: number;
							statusText: string;
							headers: Record<string, string>;
							body?: unknown;
						};
						preCallStack?: string;
						get errors(): Array<{
							id: string;
							type: 'api_error';
							attributes: {
								code: string;
								transient?: true;
								doc_url: string;
								details: Record<string, unknown>;
							};
						}>;
						findError(
							codeOrCodes: string | string[],
							filterDetails?: Record<string, string> | ((details: Record<string, unknown>) => boolean)
						): {
							id: string;
							type: 'api_error';
							attributes: {
								code: string;
								transient?: true;
								doc_url: string;
								details: Record<string, unknown>;
							};
						} | undefined;
					}
					\`\`\`
				`,
			);
		},
	);
}
