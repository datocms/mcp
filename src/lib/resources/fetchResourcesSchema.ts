import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
	parseResourcesSchema,
	type ResourcesSchema,
} from "@datocms/rest-api-reference";
import { memoized } from "../memoized.js";

export type { ResourcesSchema };

/**
 * Memoized: reads and parses @datocms/cma-client/resources.json once per
 * process lifetime.
 */
export const fetchResourcesSchema = memoized(
	async (): Promise<ResourcesSchema> => {
		const resourcesJsonPath = fileURLToPath(
			import.meta.resolve("@datocms/cma-client/resources.json"),
		);

		const fileContent = await readFile(resourcesJsonPath, "utf-8");
		const raw = JSON.parse(fileContent);

		return parseResourcesSchema(raw);
	},
);
