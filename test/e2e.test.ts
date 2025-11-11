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

describe("MCP Server E2E Tests", () => {
	let client: Client;
	let transport: StdioClientTransport;

	describe("Server without API token", () => {
		beforeEach(async () => {
			// Start server as subprocess without API token
			const env: Record<string, string> = {};
			for (const [key, value] of Object.entries(process.env)) {
				if (key !== "DATOCMS_API_TOKEN" && value !== undefined) {
					env[key] = value;
				}
			}

			transport = new StdioClientTransport({
				command: "node",
				args: ["./bin/stdio"],
				env,
			});

			client = new Client(
				{
					name: "test-client",
					version: "1.0.0",
				},
				{
					capabilities: {},
				},
			);

			await client.connect(transport);
		});

		afterEach(async () => {
			await client.close();
		});

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

	describe("Server initialization", () => {
		it("should connect and initialize successfully", async () => {
			transport = new StdioClientTransport({
				command: "node",
				args: ["./bin/stdio"],
			});

			client = new Client(
				{
					name: "test-client",
					version: "1.0.0",
				},
				{
					capabilities: {},
				},
			);

			await expect(client.connect(transport)).resolves.not.toThrow();

			// Verify server info
			const serverInfo = client.getServerVersion();
			expect(serverInfo).toBeDefined();

			await client.close();
		});

		it("should handle multiple sequential connections", async () => {
			// First connection
			transport = new StdioClientTransport({
				command: "node",
				args: ["./bin/stdio"],
			});

			client = new Client(
				{
					name: "test-client-1",
					version: "1.0.0",
				},
				{
					capabilities: {},
				},
			);

			await client.connect(transport);
			const result1 = await client.listTools();
			expect(result1.tools.length).toBeGreaterThan(0);
			await client.close();

			// Second connection
			const transport2 = new StdioClientTransport({
				command: "node",
				args: ["./bin/stdio"],
			});

			const client2 = new Client(
				{
					name: "test-client-2",
					version: "1.0.0",
				},
				{
					capabilities: {},
				},
			);

			await client2.connect(transport2);
			const result2 = await client2.listTools();
			expect(result2.tools.length).toBeGreaterThan(0);
			await client2.close();
		});
	});
});
