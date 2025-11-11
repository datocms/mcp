import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { memoized } from "../memoized.js";
import type { ResourcesEntity, ResourcesRawEndpoint } from "./types.js";

/**
 * Raw schema structure as stored in the resources.json file
 */
type RawResourcesSchema = Array<{
	jsonApiType: string;
	namespace: string;
	resourceClassName: string;
	endpoints: ResourcesRawEndpoint[];
}>;

/**
 * Processed schema with flattened endpoint information
 */
export type ResourcesSchema = ResourcesEntity[];

/**
 * Fetches and parses the DatoCMS JS Client resources.json from the npm package.
 * Results are cached permanently to avoid repeated file reads.
 *
 * @returns Promise resolving to the parsed schema
 * @throws Error if the resources.json file cannot be read
 */
export const fetchResourcesSchema = memoized(
	async (): Promise<ResourcesSchema> => {
		const resourcesJsonPath = fileURLToPath(
			import.meta.resolve("@datocms/cma-client/resources.json"),
		);

		const fileContent = await readFile(resourcesJsonPath, "utf-8");
		const resources: RawResourcesSchema = JSON.parse(fileContent);

		// Flatten the structure: copy entity info into each endpoint
		return resources.map(({ endpoints, ...rest }) => ({
			...rest,
			endpoints: endpoints.map((rawEndpoint) => ({ ...rawEndpoint, ...rest })),
		}));
	},
);
