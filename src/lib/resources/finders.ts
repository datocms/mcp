import type { ResourcesSchema } from "./fetchResourcesSchema.js";
import type { ResourcesEndpoint, ResourcesEntity } from "./types.js";

/**
 * Finds an entity by its JSON API type (e.g., "upload", "item", "site")
 *
 * @param schema - The parsed JS Client schema
 * @param jsonApiType - The JSON API type to search for
 * @returns The matching entity or undefined if not found
 */
export function findResourcesEntityByJsonApiType(
	schema: ResourcesSchema,
	jsonApiType: string,
): ResourcesEntity | undefined {
	return schema.find((r) => r.jsonApiType === jsonApiType);
}

/**
 * Finds an entity by its namespace (e.g., "SimpleResource::Upload")
 *
 * @param schema - The parsed JS Client schema
 * @param namespace - The namespace to search for
 * @returns The matching entity or undefined if not found
 */
export function findResourcesEntityByNamespace(
	schema: ResourcesSchema,
	namespace: string,
): ResourcesEntity | undefined {
	return schema.find((r) => r.namespace === namespace);
}

/**
 * Finds an endpoint within an entity by its rel value
 *
 * @param entity - The entity to search within
 * @param rel - The rel value to search for
 * @returns The matching endpoint or undefined if not found
 */
export function findResourcesEndpointByRel(
	entity: ResourcesEntity,
	rel: string,
): ResourcesEndpoint | undefined {
	return entity.endpoints.find((e) => e.rel === rel);
}

/**
 * Finds an endpoint within an entity by its name
 *
 * @param entity - The entity to search within
 * @param name - The endpoint name to search for
 * @returns The matching endpoint or undefined if not found
 */
export function findResourcesEndpointByName(
	entity: ResourcesEntity,
	name: string,
): ResourcesEndpoint | undefined {
	return entity.endpoints.find((e) => e.name === name);
}
