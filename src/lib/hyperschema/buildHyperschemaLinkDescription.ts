import { collapseDetails } from "./collapseDetails.js";
import { renderExample } from "./renderExample.js";
import type { HyperschemaLink } from "./types.js";

/**
 * Pattern to match example references in descriptions (e.g., ::example[create-upload])
 */
export const pattern = /::example\[([^\]]+)\]/g;

/**
 * Builds a complete description for a hyperschema link including inline
 * and appended examples.
 *
 * Examples can be referenced inline using ::example[id] syntax or will be
 * automatically appended at the end if not referenced.
 *
 * When expandDetails is undefined or empty:
 * - Only example summaries are shown (collapsed details, no content)
 *
 * When expandDetails is provided:
 * - ONLY examples whose summaries match values in expandDetails are rendered
 * - Matching examples are shown in full with content (expanded)
 *
 * @param link - The hyperschema link to build description for
 * @param expandDetails - Optional array of detail summaries to filter and expand
 * @returns Complete description with filtered examples
 */
export function buildHyperschemaLinkDescription(
	link: HyperschemaLink,
	expandDetails?: string[],
) {
	const examples = link?.documentation?.javascript?.examples || [];
	const description = link.description || "";
	const examplesInDescription: string[] = [];
	const hasFilter = expandDetails && expandDetails.length > 0;

	const result = description.replace(pattern, (_match, name) => {
		examplesInDescription.push(name);
		const example = examples.find((example) => example.id === name);
		if (!example) {
			return "";
		}

		const exampleTitle = `Example: ${example.title}`;

		// If filtering, only render examples that match (with full content)
		if (hasFilter) {
			const shouldRender = expandDetails.includes(exampleTitle);
			if (!shouldRender) {
				return ""; // Skip this example
			}
			return `\n\n${renderExample(example, { renderFull: true, isExpanded: true })}`;
		}

		// Default: render collapsed details
		return `\n\n${renderExample(example)}`;
	});

	// Process the description to handle any existing <details> tags
	const processedResult = collapseDetails(result, expandDetails);

	// Append unreferenced examples at the end
	return examples
		.filter((example) => !examplesInDescription.includes(example.id))
		.reduce((acc, example) => {
			const exampleTitle = `Example: ${example.title}`;

			// If filtering, only render examples that match (with full content)
			if (hasFilter) {
				const shouldRender = expandDetails.includes(exampleTitle);
				if (!shouldRender) {
					return acc; // Skip this example
				}
				return `${acc}\n\n${renderExample(example, { renderFull: true, isExpanded: true })}`;
			}

			// Default: render collapsed details
			return `${acc}\n\n${renderExample(example)}`;
		}, processedResult);
}
