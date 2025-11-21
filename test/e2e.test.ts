import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/**
 * Helper function to extract and type-assert text content from tool call results
 */
function getTextContent(result: any): TextContent[] {
	return result.content as TextContent[];
}

function getInheritedEnv(): Record<string, string> {
	const env: Record<string, string> = {};
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined) env[key] = value;
	}
	return env;
}

async function createMcpClient() {
	const transport = new StdioClientTransport({
		command: "node",
		args: ["./bin/stdio"],
		env: getInheritedEnv(),
	});

	const client = new Client(
		{ name: "test-client", version: "1.0.0" },
		{ capabilities: {} },
	);

	await client.connect(transport);
	return client;
}

describe("MCP Server E2E Tests", () => {
	let client: Client;

	beforeEach(async () => {
		client = await createMcpClient();
	});

	afterEach(async () => {
		await client.close();
	});

	describe("Tool calls", () => {
		it("should call resources successfully", async () => {
			const result = await client.callTool({
				name: "resources",
				arguments: {},
			});

			const content = getTextContent(result);
			expect(content).toBeDefined();
			expect(Array.isArray(content)).toBe(true);
			expect(content.length).toBeGreaterThan(0);

			// Verify response matches expected snapshot
			expect(content).toMatchSnapshot();
		});

		it("should call resource with valid resource name", async () => {
			// Call resource with a known DatoCMS resource
			const result = await client.callTool({
				name: "resource",
				arguments: {
					resource: "items",
				},
			});

			const content = getTextContent(result);
			expect(content).toBeDefined();
			expect(Array.isArray(content)).toBe(true);
			expect(content.length).toBeGreaterThan(0);

			// Verify response matches expected snapshot
			expect(content).toMatchSnapshot();
		});

		it("should call resource_action with valid resource and action", async () => {
			const result = await client.callTool({
				name: "resource_action",
				arguments: {
					resource: "items",
					action: "create",
				},
			});

			const content = getTextContent(result);
			expect(content).toBeDefined();
			expect(Array.isArray(content)).toBe(true);
			expect(content.length).toBeGreaterThan(0);

			// Verify response matches expected snapshot
			expect(content).toMatchSnapshot();
		});

		it("should call resource_action_method with valid resource and method", async () => {
			const result = await client.callTool({
				name: "resource_action_method",
				arguments: {
					resource: "items",
					method: "create",
				},
			});

			const content = getTextContent(result);
			expect(content).toBeDefined();
			expect(Array.isArray(content)).toBe(true);
			expect(content.length).toBeGreaterThan(0);

			// Verify response matches expected snapshot
			expect(content).toMatchSnapshot();
		});

		it("should call resource_action_method with valid resource and method /2", async () => {
			const result = await client.callTool({
				name: "resource_action_method",
				arguments: {
					resource: "fields",
					method: "create",
					expandTypes: ["*"],
				},
			});

			const content = getTextContent(result);
			expect(content).toBeDefined();
			expect(Array.isArray(content)).toBe(true);
			expect(content.length).toBeGreaterThan(0);

			// Verify response matches expected snapshot
			expect(content).toMatchSnapshot();
		});

		it("should call resource_action_method with specific expandTypes", async () => {
			const result = await client.callTool({
				name: "resource_action_method",
				arguments: {
					resource: "items",
					method: "create",
					expandTypes: ["ToItemAttributes", "GalleryFieldValue"],
				},
			});

			const content = getTextContent(result);
			expect(content).toBeDefined();
			expect(Array.isArray(content)).toBe(true);
			expect(content.length).toBeGreaterThan(0);

			// Verify response matches expected snapshot
			expect(content).toMatchSnapshot();
		});

		it("should call resource_action with itemTypes and instances action", async () => {
			const result = await client.callTool({
				name: "resource_action",
				arguments: {
					resource: "itemTypes",
					action: "instances",
				},
			});

			const content = getTextContent(result);
			expect(content).toBeDefined();
			expect(Array.isArray(content)).toBe(true);
			expect(content.length).toBeGreaterThan(0);

			// Verify response matches expected snapshot
			expect(content).toMatchSnapshot();
		});

		it("should return empty collapsed details by default in resource", async () => {
			const result = await client.callTool({
				name: "resource",
				arguments: {
					resource: "items",
				},
			});

			const content = getTextContent(result);
			expect(content).toMatchSnapshot();
		});

		it("should return empty collapsed details by default in resource_action", async () => {
			const result = await client.callTool({
				name: "resource_action",
				arguments: {
					resource: "items",
					action: "create",
				},
			});

			const content = getTextContent(result);
			expect(content).toMatchSnapshot();
		});

		it("should filter and expand sections in resource when expandDetails is provided", async () => {
			const result = await client.callTool({
				name: "resource",
				arguments: {
					resource: "items",
					expandDetails: ["Single-line string"],
				},
			});

			const content = getTextContent(result);
			expect(content).toMatchSnapshot();
		});

		it("should filter and expand example in resource_action when expandDetails is provided", async () => {
			const result = await client.callTool({
				name: "resource_action",
				arguments: {
					resource: "items",
					action: "create",
					expandDetails: ["Example: Basic example"],
				},
			});

			const content = getTextContent(result);
			expect(content).toMatchSnapshot();
		});

		it("should return no examples when expandDetails does not match any sections", async () => {
			const result = await client.callTool({
				name: "resource_action",
				arguments: {
					resource: "items",
					action: "create",
					expandDetails: ["Example: Nonexistent Example"],
				},
			});

			const content = getTextContent(result);
			expect(content).toMatchSnapshot();
		});

		it("should filter and expand multiple matching sections", async () => {
			const result = await client.callTool({
				name: "resource",
				arguments: {
					resource: "items",
					expandDetails: ["Single-line string", "Boolean"],
				},
			});

			const content = getTextContent(result);
			expect(content).toMatchSnapshot();
		});

		it("should handle errors gracefully for invalid tool calls", async () => {
			await expect(
				client.callTool({
					name: "nonexistent_tool",
					arguments: {},
				}),
			).rejects.toThrow();
		});
	});

	describe("Script tools", () => {
		const testScriptName = "script://test-script.ts";
		const testScriptContent = `import { type Client } from '@datocms/cma-client-node';

export default async function (client: Client) {
  // Line 4: Test function
  const items = await client.items.list();

  // Line 7: Log results
  console.log('Total items:', items.length);

  // Line 10: Process items
  for (const item of items) {
    console.log('Item ID:', item.id);
  }
}`;

		beforeEach(async () => {
			// Create a test script
			await client.callTool({
				name: "create_script",
				arguments: {
					name: testScriptName,
					content: testScriptContent,
				},
			});
		});

		it("should view full script without line range arguments", async () => {
			const result = await client.callTool({
				name: "view_script",
				arguments: {
					name: testScriptName,
				},
			});

			const content = getTextContent(result);
			expect(content).toMatchSnapshot();
		});

		it("should view script with start_line only", async () => {
			const result = await client.callTool({
				name: "view_script",
				arguments: {
					name: testScriptName,
					start_line: 5,
				},
			});

			const content = getTextContent(result);
			expect(content).toMatchSnapshot();
		});

		it("should view script with limit only", async () => {
			const result = await client.callTool({
				name: "view_script",
				arguments: {
					name: testScriptName,
					limit: 5,
				},
			});

			const content = getTextContent(result);
			expect(content).toMatchSnapshot();
		});

		it("should view script with both start_line and limit", async () => {
			const result = await client.callTool({
				name: "view_script",
				arguments: {
					name: testScriptName,
					start_line: 4,
					limit: 3,
				},
			});

			const content = getTextContent(result);
			expect(content).toMatchSnapshot();
		});

		it("should handle start_line beyond script length", async () => {
			const result = await client.callTool({
				name: "view_script",
				arguments: {
					name: testScriptName,
					start_line: 1000,
				},
			});

			const content = getTextContent(result);
			expect(content).toMatchSnapshot();
		});

		it("should handle viewing last few lines of script", async () => {
			const result = await client.callTool({
				name: "view_script",
				arguments: {
					name: testScriptName,
					start_line: 12,
				},
			});

			const content = getTextContent(result);
			expect(content).toMatchSnapshot();
		});
	});
});
