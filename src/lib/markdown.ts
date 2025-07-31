// Types for Markdown nodes
type MarkdownNode = undefined | null | string | MarkdownElement;

export interface MarkdownElement {
	type: string;
	props?: Record<string, any>;
	children: MarkdownNode[];
}

// Metadata interfaces for different elements
interface LinkProps {
	href: string;
	title?: string;
}

interface ImageProps {
	src: string;
	alt: string;
	title?: string;
}

interface CodeProps {
	language?: string;
}

// Helper function to create markdown elements
function createElement(
	type: string,
	props?: Record<string, any>,
	...children: MarkdownNode[]
): MarkdownElement {
	return {
		type,
		props: props || {},
		children: children.flat(),
	};
}

// Heading elements
export const h1 = (...children: MarkdownNode[]) =>
	createElement("h1", undefined, ...children);

export const h2 = (...children: MarkdownNode[]) =>
	createElement("h2", undefined, ...children);

export const h3 = (...children: MarkdownNode[]) =>
	createElement("h3", undefined, ...children);

export const h4 = (...children: MarkdownNode[]) =>
	createElement("h4", undefined, ...children);

export const h5 = (...children: MarkdownNode[]) =>
	createElement("h5", undefined, ...children);

export const h6 = (...children: MarkdownNode[]) =>
	createElement("h6", undefined, ...children);

// Text elements
export const p = (...children: MarkdownNode[]) =>
	createElement("p", undefined, ...children);

export const strong = (...children: MarkdownNode[]) =>
	createElement("strong", undefined, ...children);

export const em = (...children: MarkdownNode[]) =>
	createElement("em", undefined, ...children);

export const code = (...children: MarkdownNode[]) =>
	createElement("code", undefined, ...children);

export const pre = (props?: CodeProps, ...children: MarkdownNode[]) =>
	createElement("pre", props, ...children);

// Link and image elements
export const a = (props: LinkProps, ...children: MarkdownNode[]) =>
	createElement("a", props, ...children);

export const img = (props: ImageProps) => createElement("img", props);

// List elements
export const ul = (...children: MarkdownNode[]) =>
	createElement("ul", undefined, ...children);

export const ol = (...children: MarkdownNode[]) =>
	createElement("ol", undefined, ...children);

export const li = (...children: MarkdownNode[]) =>
	createElement("li", undefined, ...children);

// Block elements
export const blockquote = (...children: MarkdownNode[]) =>
	createElement("blockquote", undefined, ...children);

export const hr = () => createElement("hr");

export const br = () => createElement("br");

// Rendering functions
function renderNode(node: MarkdownNode, depth: number = 0): string {
	if (!node) {
		return "";
	}

	if (typeof node === "string") {
		return node;
	}

	const { type, props = {}, children } = node;
	const childrenText = children
		.map((child) => renderNode(child, depth + 1))
		.join("");

	switch (type) {
		case "h1":
			return `# ${childrenText}\n\n`;
		case "h2":
			return `## ${childrenText}\n\n`;
		case "h3":
			return `### ${childrenText}\n\n`;
		case "h4":
			return `#### ${childrenText}\n\n`;
		case "h5":
			return `##### ${childrenText}\n\n`;
		case "h6":
			return `###### ${childrenText}\n\n`;

		case "p":
			return `${childrenText}\n\n`;

		case "strong":
			return `**${childrenText}**`;

		case "em":
			return `*${childrenText}*`;

		case "code":
			return `\`${childrenText}\``;

		case "pre":
			if (props.language) {
				return `\`\`\`${props.language}\n${childrenText}\n\`\`\`\n\n`;
			}
			return `\`\`\`\n${childrenText}\n\`\`\`\n\n`;

		case "a": {
			const title = props.title ? ` "${props.title}"` : "";
			return `[${childrenText}](${props.href}${title})`;
		}

		case "img": {
			const imgTitle = props.title ? ` "${props.title}"` : "";
			return `![${props.alt}](${props.src}${imgTitle})`;
		}

		case "ul":
			return `${children.map((child) => renderNode(child, depth)).join("")}\n`;

		case "ol":
			return `${children
				.map((child, index) => {
					if (child && typeof child === "object" && child.type === "li") {
						return renderListItem(child, depth, index);
					}
					return renderNode(child, depth);
				})
				.join("")}\n`;

		case "li":
			return renderListItem(node, depth);

		case "blockquote":
			return `> ${childrenText}\n\n`;

		case "hr":
			return `---\n\n`;

		case "br":
			return "  \n";

		default:
			return childrenText;
	}
}

function renderListItem(
	node: MarkdownElement,
	depth: number,
	number?: number,
): string {
	const indent = "  ".repeat(depth);
	const bullet = number ? `${number}.` : "-";
	const childrenText = node.children
		.map((child) => renderNode(child, depth + 1))
		.join("");
	return `${indent}${bullet} ${childrenText}\n`;
}

// Main render function
export function render(...nodes: MarkdownNode[]): string {
	return nodes
		.map((node) => renderNode(node))
		.join("")
		.trim();
}

// Convenience function for creating fragments
export function fragment(...children: MarkdownNode[]): MarkdownNode[] {
	return children;
}

// Example usage:
/*
const markdown = render([
	h1('Hello World'),
	p('This is a paragraph with ', strong('bold text'), ' and ', em('italic text'), '.'),
	h2('Lists'),
	ul([
		li('First item'),
		li('Second item with ', code('inline code')),
		li('Third item')
	]),
	ol({ start: 5 }, [
		li('Numbered item 5'),
		li('Numbered item 6')
	]),
	h2('Links and Images'),
	p('Check out ', a({ href: 'https://example.com', title: 'Example' }, 'this link'), '!'),
	img({ src: 'image.jpg', alt: 'Description', title: 'Image title' }),
	h2('Code'),
	pre({ language: 'javascript' }, 'const x = 42;'),
	blockquote('This is a quote'),
	hr()
]);
*/
