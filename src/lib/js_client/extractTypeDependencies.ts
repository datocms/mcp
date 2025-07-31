import ky from "ky";
import * as ts from "typescript";

function extractFilenameFromUrl(url: string): string {
	const urlObj = new URL(url);
	const pathname = urlObj.pathname;
	const segments = pathname.split("/");
	return segments[segments.length - 1]!;
}

export async function generateSourceFile(url: string) {
	const content = await ky(url).text();

	return ts.createSourceFile(
		extractFilenameFromUrl(url),
		content,
		ts.ScriptTarget.Latest,
		true,
	);
}

function stripLeadingComments(
	node: ts.Node,
	sourceFile: ts.SourceFile,
): string {
	const fullText = sourceFile.getFullText();
	// get all leading comment ranges *before* this node
	const commentRanges = ts.getLeadingCommentRanges(
		fullText,
		node.getFullStart(),
	);
	let start = node.getFullStart();

	if (commentRanges?.length) {
		const range = commentRanges[commentRanges.length - 1];
		if (range) {
			// take the *last* comment's end as our new start
			start = range.end;
		}
	}

	// slice from there up until the node’s end
	return fullText.slice(start, node.getEnd());
}

export async function extractTypeDependencies(
	sourceFile: ts.SourceFile,
	startingTypeNames: string[],
): Promise<string> {
	const dependencies = new Set<string>();
	const visited = new Set<string>();
	const typeDeclarations = new Map<string, ts.Node>();

	function collectTypeDeclarations(node: ts.Node) {
		if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
			const name = node.name.text; // Use .text instead of getText() for identifiers
			typeDeclarations.set(name, node);
		}
		ts.forEachChild(node, collectTypeDeclarations);
	}

	collectTypeDeclarations(sourceFile);

	// Second pass: find dependencies
	function findDependencies(typeName: string) {
		if (visited.has(typeName)) return;
		visited.add(typeName);

		const declaration = typeDeclarations.get(typeName);
		if (!declaration) return;

		dependencies.add(typeName);

		function visitTypeReferences(node: ts.Node) {
			if (ts.isTypeReferenceNode(node)) {
				let referencedTypeName: string;

				if (ts.isIdentifier(node.typeName)) {
					referencedTypeName = node.typeName.text;
				} else if (ts.isQualifiedName(node.typeName)) {
					// Handle qualified names like Namespace.Type
					referencedTypeName = node.typeName.right.text;
				} else {
					return;
				}

				if (typeDeclarations.has(referencedTypeName)) {
					findDependencies(referencedTypeName);
				}
			}

			ts.forEachChild(node, visitTypeReferences);
		}

		visitTypeReferences(declaration);
	}

	// Start the dependency search for all starting types
	startingTypeNames.forEach((typeName) => {
		findDependencies(typeName);
	});

	// Generate output
	const result: string[] = [];
	dependencies.forEach((typeName) => {
		const declaration = typeDeclarations.get(typeName);
		if (declaration) {
			result.push(stripLeadingComments(declaration, sourceFile));
		}
	});

	return result.join("\n");
}
