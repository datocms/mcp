import assert from "node:assert";
import { buildClient } from "@datocms/cma-client-node";
import dedent from "dedent";
import { describe, expect, it } from "vitest";
import { getWorkspace } from "../src/lib/workspace/index.js";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN! });

describe("Workspace", () => {
	describe("validateScript()", () => {
		it("works", async () => {
			const wm = await getWorkspace();

			const validation = await wm.validateScript(
				{
					name: "validation-working.ts",
					content: dedent(`
          import type { Client } from "@datocms/cma-client-node";
          export default async function run(client: Client) {
            const items = await client.items.list();
            return items;
          }
        `),
				},
				client,
			);

			expect(validation.passed).toBe(true);
		}, 30000);

		it("fails in case of errors", async () => {
			const wm = await getWorkspace();

			const validation = await wm.validateScript(
				{
					name: "validation-failing.ts",
					content: dedent(`
          import type { Client } from "@datocms/cma-client-node";
          export default async function run(client: Client) {
            const items = await client.items.list(true);
            return items;
          }
        `),
				},
				client,
			);

			expect(validation.passed).toBe(false);
			expect(validation.output).toMatch("No overload matches this call");
		}, 30000);
	});

	describe("executeScript()", () => {
		it("works", async () => {
			const wm = await getWorkspace();

			const result = await wm.executeScript(
				{
					name: "execute-working.ts",
					content: dedent(`
            import type { Client } from "@datocms/cma-client-node";
            export default async function run(client: Client) {
              const items = await client.items.list();
              return items;
            }
          `),
				},
				{
					client: buildClient({ apiToken: process.env.DATOCMS_API_TOKEN! }),
				},
			);

			expect(result.success).toBe(true);
			assert(result.success === true);
		}, 30000);
	});
});
