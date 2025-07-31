import $RefParser from "@apidevtools/json-schema-ref-parser";
import ky from "ky";
import { cacheFor } from "../cacheFor.js";
import { invariant } from "../invariant.js";
import type { CmaHyperschema, RestApiEntity } from "./types.js";

export const fetchCmaHyperschema = cacheFor(100000, async () => {
	const unreferencedSchema = await ky(
		"https://site-api.datocms.com/docs/site-api-hyperschema.json",
	).json();

	const schema = await $RefParser.dereference(unreferencedSchema);

	return schema as CmaHyperschema;
});

export function findCmaHyperschemaEntity(
	schema: CmaHyperschema,
	jsonApiType: string,
) {
	invariant(schema.properties);

	return schema.properties[jsonApiType] as RestApiEntity | undefined;
}

export function findCmaHyperschemaLink(
	schema: CmaHyperschema,
	jsonApiType: string,
	rel: string,
) {
	const entity = findCmaHyperschemaEntity(schema, jsonApiType);

	if (!entity) {
		return undefined;
	}

	return entity.links?.find((link) => link.rel === rel);
}
