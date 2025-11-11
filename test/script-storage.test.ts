import { describe, expect, it } from "vitest";
import {
	createScript,
	updateScript,
	viewScript,
} from "../src/lib/scripts/storage.js";

// Mock the scripts storage by importing and clearing it before each test
// Since the storage is module-scoped, we need to work around it
describe("Script Storage", () => {
	describe("createScript", () => {
		it("should create a valid script and return no validation errors", () => {
			const validScript = `
import type { Client } from "@datocms/cma-client-node";

export default async function run(client: Client) {
  const items = await client.items.list();
  return items;
}
`;

			const result = createScript("script://test-valid.ts", validScript);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);

			// Verify the script was saved
			const saved = viewScript("script://test-valid.ts");
			expect(saved.name).toBe("script://test-valid.ts");
			expect(saved.content).toBe(validScript);
		});

		it("should create a script with validation errors and still save it", () => {
			const invalidScript = `
import axios from "axios";

function run(client) {
  return axios.get("https://example.com");
}
`;

			const result = createScript("script://test-invalid.ts", invalidScript);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);

			// Verify the script was still saved despite validation errors
			const saved = viewScript("script://test-invalid.ts");
			expect(saved.name).toBe("script://test-invalid.ts");
			expect(saved.content).toBe(invalidScript);
		});

		it("should throw error for duplicate script names", () => {
			const script = `
import type { Client } from "@datocms/cma-client-node";
export default async function run(client: Client) { return true; }
`;

			createScript("script://duplicate.ts", script);

			expect(() => {
				createScript("script://duplicate.ts", script);
			}).toThrow("already exists");
		});
	});

	describe("updateScript", () => {
		it("should update a script and return no validation errors for valid content", () => {
			const initialScript = `
import type { Client } from "@datocms/cma-client-node";

export default async function run(client: Client) {
  const items = await client.items.list();
  return items;
}
`;

			createScript("script://test-update.ts", initialScript);

			const result = updateScript(
				"script://test-update.ts",
				"items.list()",
				"items.find('123')",
			);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);

			const updated = viewScript("script://test-update.ts");
			expect(updated.content).toContain("items.find('123')");
			expect(updated.content).not.toContain("items.list()");
		});

		it("should update a script even if it results in validation errors", () => {
			const initialScript = `
import type { Client } from "@datocms/cma-client-node";

export default async function run(client: Client) {
  return true;
}
`;

			createScript("script://test-update-invalid.ts", initialScript);

			// Remove the export statement, making it invalid
			const result = updateScript(
				"script://test-update-invalid.ts",
				"export default",
				"",
			);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);

			// Verify the script was still updated despite validation errors
			const updated = viewScript("script://test-update-invalid.ts");
			expect(updated.content).not.toContain("export default");
		});

		it("should throw error if script not found", () => {
			expect(() => {
				updateScript("non-existent", "foo", "bar");
			}).toThrow("not found");
		});

		it("should throw error if old_str not found in script", () => {
			const script = `
import type { Client } from "@datocms/cma-client-node";
export default async function run(client: Client) { return true; }
`;

			createScript("script://test-not-found.ts", script);

			expect(() => {
				updateScript(
					"script://test-not-found.ts",
					"non-existent-string",
					"replacement",
				);
			}).toThrow("String not found");
		});

		it("should throw error if old_str appears multiple times", () => {
			const script = `
import type { Client } from "@datocms/cma-client-node";

export default async function run(client: Client) {
  const x = true;
  const y = true;
  return true;
}
`;

			createScript("script://test-multiple.ts", script);

			expect(() => {
				updateScript("script://test-multiple.ts", "true", "false");
			}).toThrow("must be unique");
		});
	});
});
