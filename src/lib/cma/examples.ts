import { h1, h2, p, pre, render } from "../markdown.js";
import type {
	CmaHyperschemaLink,
	CmaHyperschemaLinkJsExample,
} from "./types.js";

const pattern = /::example\[([^\]]+)\]/g;

export function renderExample(example: CmaHyperschemaLinkJsExample) {
	if (!example.request?.code) {
		return "";
	}

	return render(
		h1(example.title),
		p(example.description),
		h2("Code"),
		p(example.request?.description),
		pre({ language: "typescript" }, example.request?.code),
		h2("Returned output"),
		p(example.response?.description),
		pre({ language: "json" }, example.response?.code),
	);
}

function renderExampleTruncated(example: CmaHyperschemaLinkJsExample) {
	return render(
		h2("Example: ", example.title),
		`Use tool \`cma_js_client_resource_action_example\` with exampleId: "${example.id}" to view full example`,
	);
}

export function buildHyperschemaLinkDescription(
	link: CmaHyperschemaLink,
	maxExamples = 2,
) {
	const examples = link?.documentation?.javascript?.examples || [];
	const description = link.description || "";
	const examplesInDescription: string[] = [];
	const shouldTruncate = examples.length > maxExamples;

	const result = description.replace(pattern, (_match, name) => {
		examplesInDescription.push(name);
		const example = examples.find((example) => example.id === name);
		if (!example) {
			return "";
		}

		return shouldTruncate
			? `\n\n${renderExampleTruncated(example)}`
			: `\n\n${renderExample(example)}`;
	});

	const remainingExamples = examples.filter(
		(example) => !examplesInDescription.includes(example.id),
	);

	if (shouldTruncate) {
		return remainingExamples.reduce(
			(acc, example) => `${acc}\n\n${renderExampleTruncated(example)}`,
			result,
		);
	}

	return remainingExamples.reduce(
		(acc, example) => `${acc}\n\n${renderExample(example)}`,
		result,
	);
}
