import { describe, expect, it } from "vitest";
import { validateScriptStructure } from "../src/lib/scripts/validation.js";

describe("Script Validation", () => {
	it("should accept a valid script with export default async function", () => {
		const validScript = `
import type { Client } from "@datocms/cma-client-node";

export default async function run(client: Client) {
  const items = await client.items.list();
  return items;
}
`;

		const result = validateScriptStructure(validScript);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("should accept script with multiple imports from @datocms packages", () => {
		const validScript = `
import {
  type ApiTypes,
  type BlockNodeInNestedResponse,
  buildBlockRecord,
  buildClient,
  duplicateBlockRecord,
  type ItemTypeDefinition,
  inspectItem,
  SchemaRepository,
} from "@datocms/cma-client-node";
import type { Client } from "@datocms/cma-client-node";
import { SomeUtility } from "@datocms/helper-package";

export default async function run(client: Client) {
  const schema = new SchemaRepository(client);
  const item = await client.items.find("123");
  const inspected = inspectItem(item, schema);
  return inspected;
}
`;

		const result = validateScriptStructure(validScript);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("should accept script with datocms-* package imports", () => {
		const validScript = `
import type { Client } from "@datocms/cma-client-node";
import { parseStructuredText } from "datocms-structured-text-utils";
import { render } from "datocms-react-helpers";

export default async function run(client: Client) {
  const item = await client.items.find("123");
  const parsed = parseStructuredText(item.content);
  return render(parsed);
}
`;

		const result = validateScriptStructure(validScript);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("should accept script with mixed @datocms/* and datocms-* imports", () => {
		const validScript = `
import type { Client } from "@datocms/cma-client-node";
import { SchemaRepository } from "@datocms/cma-client-node";
import { parseStructuredText } from "datocms-structured-text-utils";
import { buildClient } from "datocms-client-builder";

export default async function run(client: Client) {
  const schema = new SchemaRepository(client);
  const item = await client.items.find("123");
  const parsed = parseStructuredText(item.content);
  return { schema, parsed };
}
`;

		const result = validateScriptStructure(validScript);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("should accept a valid script with const arrow function", () => {
		const validScript = `
import type { Client } from "@datocms/cma-client-node";

const run = async (client: Client) => {
  const items = await client.items.list();
  return items;
};

export default run;
`;

		const result = validateScriptStructure(validScript);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("should accept a script with Promise return type", () => {
		const validScript = `
import type { Client } from "@datocms/cma-client-node";

export default function run(client: Client): Promise<void> {
  return client.items.list().then(() => {});
}
`;

		const result = validateScriptStructure(validScript);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("should reject script with non-whitelisted imports", () => {
		const invalidScript = `
import type { Client } from "@datocms/cma-client-node";
import axios from "axios";

export default async function run(client: Client) {
  const response = await axios.get("https://example.com");
  return response.data;
}
`;

		const result = validateScriptStructure(invalidScript);
		expect(result.valid).toBe(false);
		expect(
			result.errors.some(
				(e) =>
					e.includes('Invalid import: "axios"') &&
					e.includes("@datocms/*") &&
					e.includes("datocms-*"),
			),
		).toBe(true);
	});

	it("should reject script with mixed valid and invalid imports", () => {
		const invalidScript = `
import type { Client } from "@datocms/cma-client-node";
import { SchemaRepository } from "@datocms/cma-client-node";
import lodash from "lodash";
import { format } from "date-fns";

export default async function run(client: Client) {
  const items = await client.items.list();
  return lodash.map(items, item => format(new Date(item.created_at), "yyyy-MM-dd"));
}
`;

		const result = validateScriptStructure(invalidScript);
		expect(result.valid).toBe(false);
		// Should have exactly 2 import errors
		expect(
			result.errors.filter((e) => e.includes("Invalid import")),
		).toHaveLength(2);
		expect(
			result.errors.some((e) => e.includes('Invalid import: "lodash"')),
		).toBe(true);
		expect(
			result.errors.some((e) => e.includes('Invalid import: "date-fns"')),
		).toBe(true);
	});

	it("should reject script without default export", () => {
		const invalidScript = `
import type { Client } from "@datocms/cma-client-node";

async function run(client: Client) {
  return await client.items.list();
}
`;

		const result = validateScriptStructure(invalidScript);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("must export a default"))).toBe(
			true,
		);
	});

	it("should accept script with any parameter name", () => {
		const validScript = `
import type { Client } from "@datocms/cma-client-node";

export default async function run(apiClient: Client) {
  return await apiClient.items.list();
}
`;

		const result = validateScriptStructure(validScript);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("should reject script with wrong parameter type", () => {
		const invalidScript = `
import type { Client } from "@datocms/cma-client-node";

export default async function run(client: string) {
  return "test";
}
`;

		const result = validateScriptStructure(invalidScript);
		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.includes('must be of type "Client"')),
		).toBe(true);
	});

	it("should reject script with missing parameter type annotation", () => {
		const invalidScript = `
import type { Client } from "@datocms/cma-client-node";

export default async function run(dato) {
  return await dato.items.list();
}
`;

		const result = validateScriptStructure(invalidScript);
		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.includes("must have type annotation")),
		).toBe(true);
	});

	it("should reject non-async function without Promise return type", () => {
		const invalidScript = `
import type { Client } from "@datocms/cma-client-node";

export default function run(client: Client) {
  return "test";
}
`;

		const result = validateScriptStructure(invalidScript);
		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) =>
				e.includes("must be async or return a Promise"),
			),
		).toBe(true);
	});

	it("should reject script with wrong number of parameters", () => {
		const invalidScript = `
import type { Client } from "@datocms/cma-client-node";

export default async function run(client: Client, foo: string) {
  return await client.items.list();
}
`;

		const result = validateScriptStructure(invalidScript);
		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.includes("must have exactly one parameter")),
		).toBe(true);
	});

	it("should respect custom whitelist parameter", () => {
		const scriptWithLodash = `
import type { Client } from "@datocms/cma-client-node";
import lodash from "lodash";

export default async function run(client: Client) {
  const items = await client.items.list();
  return lodash.map(items, 'id');
}
`;

		// Should fail with default whitelist
		const resultDefault = validateScriptStructure(scriptWithLodash);
		expect(resultDefault.valid).toBe(false);
		expect(
			resultDefault.errors.some((e) => e.includes('Invalid import: "lodash"')),
		).toBe(true);

		// Should pass with custom whitelist that includes lodash
		const resultCustom = validateScriptStructure(scriptWithLodash, [
			"@datocms/*",
			"datocms-*",
			"lodash",
		]);
		expect(resultCustom.valid).toBe(true);
		expect(resultCustom.errors).toHaveLength(0);
	});

	it("should reject script with explicit 'any' type", () => {
		const scriptWithAny = `
import type { Client } from "@datocms/cma-client-node";

function helper(x: any): string {
  return x.toString();
}

export default async function run(client: Client) {
  return helper("test");
}
`;

		const result = validateScriptStructure(scriptWithAny);
		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.includes("Explicit 'any' type found")),
		).toBe(true);
	});

	it("should reject script with explicit 'unknown' type", () => {
		const scriptWithUnknown = `
import type { Client } from "@datocms/cma-client-node";

type MyType = {
  data: unknown;
};

export default async function run(client: Client) {
  const x: MyType = { data: {} };
  return x;
}
`;

		const result = validateScriptStructure(scriptWithUnknown);
		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.includes("Explicit 'unknown' type found")),
		).toBe(true);
	});

	it("should reject script with multiple 'any' occurrences", () => {
		const scriptWithMultipleAny = `
import type { Client } from "@datocms/cma-client-node";

function helper(x: any, y: any): any {
  return x + y;
}

export default async function run(client: Client) {
  return helper(1, 2);
}
`;

		const result = validateScriptStructure(scriptWithMultipleAny);
		expect(result.valid).toBe(false);
		// Should detect all three 'any' occurrences
		const anyErrors = result.errors.filter((e) =>
			e.includes("Explicit 'any' type found"),
		);
		expect(anyErrors.length).toBe(3);
	});

	it("should reject script with both 'any' and 'unknown' types", () => {
		const scriptWithBoth = `
import type { Client } from "@datocms/cma-client-node";

type MyType = {
  data: unknown;
};

function helper(x: any): MyType {
  return { data: x };
}

export default async function run(client: Client) {
  return helper("test");
}
`;

		const result = validateScriptStructure(scriptWithBoth);
		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.includes("Explicit 'any' type found")),
		).toBe(true);
		expect(
			result.errors.some((e) => e.includes("Explicit 'unknown' type found")),
		).toBe(true);
	});
});
