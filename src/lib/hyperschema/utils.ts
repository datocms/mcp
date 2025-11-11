import $RefParser from "@apidevtools/json-schema-ref-parser";
import ky from "ky";
import { invariant } from "../invariant.js";
import { memoized } from "../memoized.js";
import type { Hyperschema, HyperschemaRestApiEntity } from "./types.js";

/**
 * Fetches and dereferences the DatoCMS REST API hyperschema.
 * Results are cached permanently to avoid repeated HTTP requests.
 *
 * The hyperschema is fetched from the official DatoCMS API documentation
 * and all $ref pointers are resolved to create a fully dereferenced schema.
 *
 * @returns Promise resolving to the dereferenced hyperschema
 */
export const fetchHyperschema = memoized(async () => {
	const unreferencedSchema = await ky(
		"https://site-api.datocms.com/docs/site-api-hyperschema.json",
	).json();

	const schema = await $RefParser.dereference(unreferencedSchema);

	return schema as Hyperschema;
});

/**
 * Finds an entity (resource type) in the hyperschema by its JSON API type.
 *
 * @param schema - The hyperschema to search in
 * @param jsonApiType - The JSON API type (e.g., "upload", "item")
 * @returns The entity definition or undefined if not found
 */
export function findHyperschemaEntity(
	schema: Hyperschema,
	jsonApiType: string,
) {
	invariant(schema.properties);

	return schema.properties[jsonApiType] as HyperschemaRestApiEntity | undefined;
}

/**
 * Finds a specific link (API action) for an entity in the hyperschema.
 *
 * @param schema - The hyperschema to search in
 * @param jsonApiType - The JSON API type of the entity
 * @param rel - The rel value identifying the link (e.g., "create", "update")
 * @returns The link definition or undefined if not found
 */
export function findHyperschemaLink(
	schema: Hyperschema,
	jsonApiType: string,
	rel: string,
) {
	const entity = findHyperschemaEntity(schema, jsonApiType);

	if (!entity) {
		return undefined;
	}

	return entity.links?.find((link) => link.rel === rel);
}
