import { h2, pre, render } from "../markdown.js";
import type {
	CmaHyperschemaLink,
	CmaHyperschemaLinkJsExample,
} from "./types.js";

const pattern = /::example\[([^\]]+)\]/g;

function renderExample(example: CmaHyperschemaLinkJsExample) {
	if (!example.request?.code) {
		return "";
	}

	return render(
		h2("Example: ", example.title),
		example.description,
		pre({ language: "javascript" }, example.request?.code),
	);
}

export function buildHyperschemaLinkDescription(link: CmaHyperschemaLink) {
	const examples = link?.documentation?.javascript?.examples || [];
	const description = link.description || "";
	const examplesInDescription: string[] = [];

	const result = description.replace(pattern, (_match, name) => {
		examplesInDescription.push(name);
		const example = examples.find((example) => example.id === name);
		if (!example) {
			return "";
		}

		return `\n\n${renderExample(example)}`;
	});

	return examples
		.filter((example) => !examplesInDescription.includes(example.id))
		.reduce((acc, example) => `${acc}\n\n${renderExample(example)}`, result);
}
