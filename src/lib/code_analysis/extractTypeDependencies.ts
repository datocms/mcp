import * as ts from "typescript";
import { BUILT_IN_TYPE_NAMES, isTypeParameter } from "./typeFilters.js";

export interface TypeExtractionResult {
	expandedTypes: string;
	notExpandedTypes: string[];
}

export interface TypeExtractionOptions {
	/**
	 * Maximum depth for type expansion.
	 * @default 2
	 */
	maxDepth?: number;
	/**
	 * When provided, only these types are extracted (starting at depth 0),
	 * instead of the types in typeNames. Use ['*'] to expand all types with no depth limit.
	 */
	expandTypes?: string[];
}

export function extractTypeDependencies(
	checker: ts.TypeChecker,
	program: ts.Program,
	typeNames: string[],
	typeSymbols?: Map<string, ts.Symbol>,
	options: TypeExtractionOptions = {},
): TypeExtractionResult {
	const maxDepth = options.maxDepth ?? 2;
	const expandTypes = options.expandTypes ?? [];
	const noDepthLimit = expandTypes.includes("*");

	// When expandTypes is provided (and not '*'), use those as starting types
	const startingTypes =
		expandTypes.length > 0 && !noDepthLimit ? expandTypes : typeNames;

	const extractedTypes = new Map<string, string>();
	// Track the minimum depth at which each type was processed
	const processedAtDepth = new Map<string, number>();
	const unexpandedTypes = new Set<string>();

	// Helper to get unique identifier for a type/symbol
	const getTypeId = (symbol: ts.Symbol): string => {
		const declarations = symbol.getDeclarations();
		if (!declarations || declarations.length === 0) {
			return symbol.getName();
		}
		const decl = declarations[0];
		if (!decl) {
			return symbol.getName();
		}
		const sourceFile = decl.getSourceFile();
		return `${sourceFile.fileName}::${symbol.getName()}`;
	};

	// Recursively extract a type and its dependencies
	const extractType = (typeName: string, currentDepth: number = 0): void => {
		// Skip if already processed at same or shallower depth
		const previousDepth = processedAtDepth.get(typeName);
		if (previousDepth !== undefined && previousDepth <= currentDepth) return;
		processedAtDepth.set(typeName, currentDepth);

		// Remove from unexpandedTypes if we're now processing at a shallower depth
		unexpandedTypes.delete(typeName);

		// Check depth limit (unless '*' was specified for no limit)
		if (currentDepth >= maxDepth && !noDepthLimit) {
			// Track this as an unexpanded type (only if it's a valid type we could expand)
			if (!BUILT_IN_TYPE_NAMES.has(typeName)) {
				const typeSymbol =
					typeSymbols?.get(typeName) ??
					findTypeSymbol(checker, program, typeName);
				if (typeSymbol) {
					const declarations = typeSymbol.getDeclarations();
					if (declarations && declarations.length > 0) {
						const declaration = declarations[0];
						const sourceFile = declaration?.getSourceFile();
						if (sourceFile?.fileName.includes("@datocms")) {
							unexpandedTypes.add(typeName);

							// Still discover dependencies to mark them as unexpanded too
							if (declaration) {
								const referencedTypes = findReferencedTypes(
									declaration,
									checker,
								);
								for (const refType of referencedTypes) {
									extractType(refType, currentDepth + 1);
								}
							}
						}
					}
				}
			}
			return;
		}

		// Skip built-in types
		if (BUILT_IN_TYPE_NAMES.has(typeName)) return;

		// Try to use the provided symbol first (more accurate)
		let typeSymbol = typeSymbols?.get(typeName);

		// If no symbol provided, fall back to searching by name
		if (!typeSymbol) {
			typeSymbol = findTypeSymbol(checker, program, typeName);
		}

		if (!typeSymbol) {
			// Type not found - could be from external package or built-in
			// This is expected for types we intentionally filter out
			return;
		}

		const typeId = getTypeId(typeSymbol);
		if (extractedTypes.has(typeId)) return;

		// Get the declaration
		const declarations = typeSymbol.getDeclarations();
		if (!declarations || declarations.length === 0) return;

		const declaration = declarations[0];
		if (!declaration) return;

		// Skip declarations from lib.d.ts and external packages we don't want to include
		const sourceFile = declaration.getSourceFile();
		const fileName = sourceFile.fileName;

		// Only include types from @datocms packages and local files
		// Silently skip external types (no warning needed)
		if (!fileName.includes("@datocms")) {
			return;
		}

		// Extract the declaration text
		const declarationText = getDeclarationText(declaration, sourceFile);
		extractedTypes.set(typeId, declarationText);

		// Find all referenced types in this declaration
		const referencedTypes = findReferencedTypes(declaration, checker);
		for (const refType of referencedTypes) {
			extractType(refType, currentDepth + 1);
		}
	};

	// Extract all requested types
	for (const typeName of startingTypes) {
		extractType(typeName, 0);
	}

	const expandedTypes = Array.from(extractedTypes.values()).join("\n\n");
	const notExpandedTypes = Array.from(unexpandedTypes).sort();

	return { expandedTypes, notExpandedTypes };
}

/**
 * Finds a type symbol by name in the program
 * Handles both simple names (e.g., "Upload") and qualified names (e.g., "ApiTypes.ItemType")
 */
function findTypeSymbol(
	checker: ts.TypeChecker,
	program: ts.Program,
	typeName: string,
): ts.Symbol | undefined {
	// Check if this is a qualified name (e.g., "ApiTypes.ItemType")
	const parts = typeName.split(".");

	if (parts.length > 1 && parts[0]) {
		// Handle qualified name - need to find the namespace first, then the type within it
		const namespaceName = parts[0];
		const typeNameInNamespace = parts.slice(1).join(".");

		// Search through all source files
		for (const sourceFile of program.getSourceFiles()) {
			// Skip lib files and node_modules that aren't @datocms
			if (
				sourceFile.fileName.includes("node_modules") &&
				!sourceFile.fileName.includes("@datocms")
			) {
				continue;
			}

			// Find the namespace first
			const namespaceSymbol = findSymbolInNode(
				sourceFile,
				namespaceName,
				checker,
			);
			if (!namespaceSymbol) continue;

			// Get exports of the namespace
			const exports = namespaceSymbol.exports;
			if (!exports) continue;

			// Look for the type within the namespace exports
			const typeSymbol = exports.get(typeNameInNamespace as ts.__String);
			if (typeSymbol) return typeSymbol;
		}

		return undefined;
	}

	// Simple name - search as before
	for (const sourceFile of program.getSourceFiles()) {
		// Skip lib files and node_modules that aren't @datocms
		if (
			sourceFile.fileName.includes("node_modules") &&
			!sourceFile.fileName.includes("@datocms")
		) {
			continue;
		}

		// Visit all declarations in the file
		const symbol = findSymbolInNode(sourceFile, typeName, checker);
		if (symbol) return symbol;
	}

	return undefined;
}

/**
 * Recursively finds a symbol by name in a node tree
 */
function findSymbolInNode(
	node: ts.Node,
	name: string,
	checker: ts.TypeChecker,
): ts.Symbol | undefined {
	// Check if this is a type alias or interface with matching name
	if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
		if (node.name.text === name) {
			return checker.getSymbolAtLocation(node.name);
		}
	}

	// Check classes
	if (ts.isClassDeclaration(node) && node.name && node.name.text === name) {
		return checker.getSymbolAtLocation(node.name);
	}

	// Check enums
	if (ts.isEnumDeclaration(node) && node.name && node.name.text === name) {
		return checker.getSymbolAtLocation(node.name);
	}

	// Check namespaces/modules
	if (ts.isModuleDeclaration(node) && node.name) {
		const moduleName = ts.isIdentifier(node.name)
			? node.name.text
			: node.name.text;
		if (moduleName === name) {
			return checker.getSymbolAtLocation(node.name);
		}
	}

	// Recurse into children
	let result: ts.Symbol | undefined;
	ts.forEachChild(node, (child) => {
		if (!result) {
			result = findSymbolInNode(child, name, checker);
		}
	});

	return result;
}

/**
 * Finds all type names referenced in a declaration
 */
function findReferencedTypes(node: ts.Node, checker: ts.TypeChecker): string[] {
	const referencedTypes: string[] = [];
	const seen = new Set<string>();

	// Collect all generic type parameter names from the root declaration
	const genericParams = new Set<string>();
	function collectGenericParams(n: ts.Node): void {
		if (
			(ts.isTypeAliasDeclaration(n) ||
				ts.isInterfaceDeclaration(n) ||
				ts.isFunctionDeclaration(n) ||
				ts.isMethodDeclaration(n) ||
				ts.isMethodSignature(n)) &&
			n.typeParameters
		) {
			for (const param of n.typeParameters) {
				genericParams.add(param.name.text);
			}
		}
		ts.forEachChild(n, collectGenericParams);
	}
	collectGenericParams(node);

	function visit(n: ts.Node): void {
		// Handle type references
		if (ts.isTypeReferenceNode(n)) {
			const typeName = getTypeReferenceName(n);

			// Only add the type name if we haven't seen it AND it passes all filters
			if (typeName && !seen.has(typeName)) {
				// Skip built-in types
				if (BUILT_IN_TYPE_NAMES.has(typeName)) {
					// Still visit children to collect type arguments
					ts.forEachChild(n, visit);
					return;
				}

				// Skip if this is a generic type parameter we collected from the declaration
				if (genericParams.has(typeName)) {
					// Still visit children to collect type arguments
					ts.forEachChild(n, visit);
					return;
				}

				// Check if the symbol is a type parameter using TypeScript's type system
				const symbol = checker.getSymbolAtLocation(n.typeName);
				if (isTypeParameter(symbol, checker)) {
					// Still visit children to collect type arguments
					ts.forEachChild(n, visit);
					return;
				}

				seen.add(typeName);
				referencedTypes.push(typeName);
			}

			// IMPORTANT: Always visit children even if we've seen this type name before,
			// because the type arguments might be different (e.g., Foo<A> vs Foo<B>)
			ts.forEachChild(n, visit);
			return;
		}

		// Handle type queries (typeof X)
		if (ts.isTypeQueryNode(n)) {
			const symbol = checker.getSymbolAtLocation(n.exprName);
			if (symbol) {
				const name = symbol.getName();
				if (!seen.has(name)) {
					seen.add(name);
					referencedTypes.push(name);
				}
			}
		}

		// Handle import type nodes
		if (ts.isImportTypeNode(n)) {
			// Extract type from import("module").Type
			if (n.qualifier && ts.isIdentifier(n.qualifier)) {
				const name = n.qualifier.text;
				if (!seen.has(name)) {
					seen.add(name);
					referencedTypes.push(name);
				}
			}
		}

		ts.forEachChild(n, visit);
	}

	visit(node);
	return referencedTypes;
}

/**
 * Gets the name from a type reference node
 */
function getTypeReferenceName(node: ts.TypeReferenceNode): string | undefined {
	if (ts.isIdentifier(node.typeName)) {
		return node.typeName.text;
	}
	if (ts.isQualifiedName(node.typeName)) {
		// Handle Namespace.Type - return the full qualified name to preserve namespace info
		return getQualifiedNameText(node.typeName);
	}
	return undefined;
}

/**
 * Gets the full text of a qualified name (e.g., "ApiTypes.ItemTypeInstancesTargetSchema")
 */
function getQualifiedNameText(qualifiedName: ts.QualifiedName): string {
	const parts: string[] = [];
	let current: ts.EntityName = qualifiedName;

	// Walk up the qualified name chain to collect all parts
	while (ts.isQualifiedName(current)) {
		parts.unshift(current.right.text);
		current = current.left;
	}

	// Add the leftmost identifier
	if (ts.isIdentifier(current)) {
		parts.unshift(current.text);
	}

	return parts.join(".");
}

/**
 * Gets the declaration text, stripping leading comments
 */
function getDeclarationText(
	declaration: ts.Node,
	sourceFile: ts.SourceFile,
): string {
	const fullText = sourceFile.getFullText();

	// Get leading comment ranges
	const commentRanges = ts.getLeadingCommentRanges(
		fullText,
		declaration.getFullStart(),
	);

	let start = declaration.getFullStart();

	// Skip past comments to get to the actual declaration
	if (commentRanges && commentRanges.length > 0) {
		const lastComment = commentRanges[commentRanges.length - 1];
		if (lastComment) {
			start = lastComment.end;
		}
	}

	// Get the declaration text
	const declarationText = fullText.slice(start, declaration.getEnd()).trim();

	return declarationText;
}
