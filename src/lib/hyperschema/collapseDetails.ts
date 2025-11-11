/**
 * Processes HTML <details> tags in text to control their display.
 *
 * When expandDetails is undefined or empty:
 * - Keeps <details> tags but removes all content after </summary>
 * - Results in collapsed details with only the summary visible
 * - Preserves all other text in the document
 *
 * When expandDetails is provided:
 * - Returns ONLY the matching details with full content (expanded)
 * - All other content (text, non-matching details) is removed
 *
 * @param text - The text containing <details> tags
 * @param expandDetails - Optional array of summary texts to expand
 * @returns The processed text
 */
export function collapseDetails(
	text: string,
	expandDetails?: string[],
): string {
	// Match <details> tags and their content, including the open attribute if present
	const detailsPattern = /<details(\s+open)?>([\s\S]*?)<\/details>/gi;

	const hasFilter = expandDetails && expandDetails.length > 0;

	if (hasFilter) {
		// When filtering, collect ONLY matching details and return them
		const matches: string[] = [];
		let match;
		const regex = new RegExp(detailsPattern);

		while ((match = regex.exec(text)) !== null) {
			const content = match[2];
			if (!content) continue;

			const summaryMatch = content.match(/<summary>([\s\S]*?)<\/summary>/i);

			if (summaryMatch?.[1]) {
				const summaryText = summaryMatch[1].trim();
				if (expandDetails.some((summary) => summary === summaryText)) {
					matches.push(`<details open>${content}</details>`);
				}
			}
		}

		return matches.join("\n\n");
	}

	// When not filtering, replace each details tag but keep other content
	return text.replace(detailsPattern, (_match, _openAttr, content) => {
		// Extract summary text from <summary> tag
		const summaryMatch = content.match(/<summary>([\s\S]*?)<\/summary>/i);

		if (!summaryMatch) {
			// If no summary found, remove entirely
			return "";
		}

		const summaryTag = summaryMatch[0];

		// Keep details but remove content after summary
		return `<details>${summaryTag}</details>`;
	});
}
