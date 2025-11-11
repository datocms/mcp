import { pre, render } from "../markdown.js";
import type { HyperschemaLinkJsExample } from "./types.js";

/**
 * Renders a JavaScript example in markdown format
 *
 * @param example - The example to render
 * @param options - Rendering options
 * @param options.renderFull - Whether to render the full example with content
 * @param options.isExpanded - Whether the details should be expanded (open) by default (only used when renderFull is true)
 * @returns Markdown string with formatted example
 */

export function renderExample(
	example: HyperschemaLinkJsExample,
	options?: { renderFull?: boolean; isExpanded?: boolean },
): string {
	if (!example.request?.code) {
		return "";
	}

	// If not rendering full, return collapsed details (empty, just summary)
	if (!options?.renderFull) {
		return `<details><summary>Example: ${example.title}</summary></details>`;
	}

	// Render full example with content
	const content = render(
		example.description,
		pre({ language: "javascript" }, example.request?.code),
	);

	const openAttr = options.isExpanded ? " open" : "";
	return `<details${openAttr}>\n<summary>Example: ${example.title}</summary>\n\n${content}\n</details>`;
}
