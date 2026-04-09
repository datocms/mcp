import {
	fetchHyperschema as fetchHyperschemaRaw,
	findHyperschemaEntity,
	findHyperschemaLink,
	type Hyperschema,
} from "@datocms/rest-api-reference";
import { memoized } from "../memoized.js";

export type { Hyperschema };

/**
 * Memoized wrapper around fetchHyperschema('cma') so the MCP server only
 * fetches the hyperschema once per process lifetime.
 */
export const fetchHyperschema = memoized(() => fetchHyperschemaRaw("cma"));

export { findHyperschemaEntity, findHyperschemaLink };
