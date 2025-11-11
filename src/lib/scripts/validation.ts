import ts from "typescript";

export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

/**
 * Default whitelist of allowed package patterns.
 * Packages matching these patterns are allowed to be imported.
 */
export const DEFAULT_ALLOWED_PACKAGES = [
	"@datocms/*", // Scoped packages under @datocms
	"datocms-*", // Packages starting with datocms-
	"./schema",
];

/**
 * Checks if an import path matches any of the allowed package patterns.
 */
function isImportAllowed(
	importPath: string,
	allowedPatterns: string[],
): boolean {
	return allowedPatterns.some((pattern) => {
		if (pattern.endsWith("/*")) {
			// Scoped package pattern like "@datocms/*"
			const prefix = pattern.slice(0, -2); // Remove "/*"
			return importPath === prefix || importPath.startsWith(`${prefix}/`);
		}
		if (pattern.endsWith("*")) {
			// Prefix pattern like "datocms-*"
			const prefix = pattern.slice(0, -1); // Remove "*"
			return importPath.startsWith(prefix);
		}
		// Exact match
		return importPath === pattern;
	});
}

/**
 * Validates that a script follows the required structural format:
 * 1. Only imports from whitelisted packages are allowed
 * 2. Must export a default async function with signature: (client: Client) => Promise<void>
 *    or (client: ReturnType<typeof buildClient>) => Promise<void>
 */
export function validateScriptStructure(
	content: string,
	allowedPackages: string[] = DEFAULT_ALLOWED_PACKAGES,
): ValidationResult {
	const errors: string[] = [];

	// Parse the TypeScript code
	const sourceFile = ts.createSourceFile(
		"script.ts",
		content,
		ts.ScriptTarget.Latest,
		true,
	);

	let hasDefaultExport = false;
	let defaultExportIsValidFunction = false;

	// Visit each node in the AST
	function visit(node: ts.Node) {
		// Check for explicit 'any' or 'unknown' types
		if (node.kind === ts.SyntaxKind.AnyKeyword) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(),
			);
			errors.push(
				`Explicit 'any' type found at line ${line + 1}, column ${character + 1}. Please use a specific type instead. If you're trying to use client.items.* methods, remember to import "./schema" and use its ItemTypeDefinitions!`,
			);
		}

		if (node.kind === ts.SyntaxKind.UnknownKeyword) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(),
			);
			errors.push(
				`Explicit 'unknown' type found at line ${line + 1}, column ${character + 1}. Please use a specific type instead. If you're trying to use client.items.* methods, remember to import "./schema" and use its ItemTypeDefinitions!`,
			);
		}

		// Check for import declarations
		if (ts.isImportDeclaration(node)) {
			const moduleSpecifier = node.moduleSpecifier;
			if (ts.isStringLiteral(moduleSpecifier)) {
				const importPath = moduleSpecifier.text;
				// Check if import matches any allowed pattern
				if (!isImportAllowed(importPath, allowedPackages)) {
					const allowedPatternsStr = allowedPackages.join(", ");
					errors.push(
						`Invalid import: "${importPath}". Only imports from these packages are allowed: ${allowedPatternsStr}`,
					);
				}
			}
		}

		// Check for default export
		if (ts.isExportAssignment(node)) {
			hasDefaultExport = true;

			// Check if it's a function
			const expression = node.expression;

			// Could be a direct function declaration, arrow function, or identifier
			if (
				ts.isFunctionExpression(expression) ||
				ts.isArrowFunction(expression)
			) {
				defaultExportIsValidFunction = validateFunctionSignature(
					expression,
					errors,
				);
			} else if (ts.isIdentifier(expression)) {
				// If it's an identifier, we need to find the function declaration
				const functionDecl = findFunctionDeclaration(
					sourceFile,
					expression.text,
				);
				if (functionDecl) {
					if (ts.isFunctionDeclaration(functionDecl)) {
						defaultExportIsValidFunction = validateFunctionSignature(
							functionDecl,
							errors,
						);
					} else if (ts.isVariableDeclaration(functionDecl)) {
						// Handle const/let/var declarations like: const run = async (client: Client) => {}
						const init = functionDecl.initializer;
						if (
							init &&
							(ts.isFunctionExpression(init) || ts.isArrowFunction(init))
						) {
							defaultExportIsValidFunction = validateFunctionSignature(
								init,
								errors,
							);
						} else {
							errors.push(
								"Default export must reference a function with signature: async (client: Client) => Promise<any>",
							);
						}
					}
				} else {
					errors.push(
						"Default export must reference a function with signature: async (client: Client) => Promise<any>",
					);
				}
			} else {
				errors.push(
					"Default export must be a function with signature: async (client: Client) => Promise<any>",
				);
			}
		}

		// Check for "export default function" or "export default async function"
		if (
			ts.isFunctionDeclaration(node) &&
			node.modifiers?.some(
				(m) =>
					m.kind === ts.SyntaxKind.ExportKeyword ||
					m.kind === ts.SyntaxKind.DefaultKeyword,
			)
		) {
			const hasExport = node.modifiers?.some(
				(m) => m.kind === ts.SyntaxKind.ExportKeyword,
			);
			const hasDefault = node.modifiers?.some(
				(m) => m.kind === ts.SyntaxKind.DefaultKeyword,
			);

			if (hasExport && hasDefault) {
				hasDefaultExport = true;
				defaultExportIsValidFunction = validateFunctionSignature(node, errors);
			}
		}

		ts.forEachChild(node, visit);
	}

	visit(sourceFile);

	if (!hasDefaultExport) {
		errors.push(
			"Script must export a default function with signature: async (client: Client) => Promise<void>",
		);
	} else if (!defaultExportIsValidFunction) {
		// Error already added by validateFunctionSignature
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Checks if a type node represents a valid parameter type:
 * - Client
 * - ReturnType<typeof buildClient>
 */
function isValidParameterType(typeNode: ts.TypeNode): boolean {
	if (ts.isTypeReferenceNode(typeNode)) {
		const typeName = typeNode.typeName;

		// Check for "Client"
		if (ts.isIdentifier(typeName) && typeName.text === "Client") {
			return true;
		}

		// Check for "ReturnType<typeof buildClient>"
		if (ts.isIdentifier(typeName) && typeName.text === "ReturnType") {
			const typeArgs = typeNode.typeArguments;
			if (typeArgs && typeArgs.length === 1) {
				const typeArg = typeArgs[0];
				// Check if it's "typeof buildClient"
				if (typeArg && ts.isTypeQueryNode(typeArg)) {
					const exprName = typeArg.exprName;
					if (ts.isIdentifier(exprName) && exprName.text === "buildClient") {
						return true;
					}
				}
			}
		}
	}

	return false;
}

function validateFunctionSignature(
	func:
		| ts.FunctionDeclaration
		| ts.FunctionExpression
		| ts.ArrowFunction
		| ts.MethodDeclaration,
	errors: string[],
): boolean {
	// Check if function is async or returns a Promise
	const hasAsyncModifier = func.modifiers?.some(
		(m) => m.kind === ts.SyntaxKind.AsyncKeyword,
	);

	const returnType = func.type;
	let returnsPromise = false;

	if (returnType && ts.isTypeReferenceNode(returnType)) {
		const typeName = returnType.typeName;
		if (ts.isIdentifier(typeName) && typeName.text === "Promise") {
			returnsPromise = true;
		}
	}

	if (!hasAsyncModifier && !returnsPromise) {
		errors.push(
			"Default export function must be async or return a Promise<void>",
		);
		return false;
	}

	// Check parameters - must have exactly one parameter of type Client or ReturnType<typeof buildClient>
	if (!func.parameters || func.parameters.length !== 1) {
		errors.push(
			"Default export function must have exactly one parameter of type Client or ReturnType<typeof buildClient>",
		);
		return false;
	}

	const param = func.parameters[0];
	if (!param) {
		errors.push(
			"Default export function must have exactly one parameter of type Client or ReturnType<typeof buildClient>",
		);
		return false;
	}

	// Check parameter type - should be Client or ReturnType<typeof buildClient>
	if (param.type) {
		if (!isValidParameterType(param.type)) {
			errors.push(
				'Default export function parameter must be of type "Client" or "ReturnType<typeof buildClient>"',
			);
			return false;
		}
	} else {
		errors.push(
			"Default export function parameter must have type annotation: Client or ReturnType<typeof buildClient>",
		);
		return false;
	}

	return true;
}

function findFunctionDeclaration(
	sourceFile: ts.SourceFile,
	name: string,
): ts.FunctionDeclaration | ts.VariableDeclaration | undefined {
	let result: ts.FunctionDeclaration | ts.VariableDeclaration | undefined;

	function visit(node: ts.Node) {
		if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
			result = node;
		} else if (ts.isVariableStatement(node)) {
			for (const decl of node.declarationList.declarations) {
				if (ts.isIdentifier(decl.name) && decl.name.text === name) {
					result = decl;
				}
			}
		}
		if (!result) {
			ts.forEachChild(node, visit);
		}
	}

	visit(sourceFile);
	return result;
}
