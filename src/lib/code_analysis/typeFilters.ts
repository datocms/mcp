import * as ts from "typescript";

/**
 * Built-in TypeScript utility types and primitives that should not be resolved
 * or included in type extraction results.
 */
export const BUILT_IN_TYPE_NAMES = new Set([
	// TypeScript utility types
	"Partial",
	"Required",
	"Readonly",
	"Record",
	"Pick",
	"Omit",
	"Exclude",
	"Extract",
	"NonNullable",
	"ReturnType",
	"InstanceType",
	"Parameters",
	"ConstructorParameters",
	"Awaited",
	"ThisType",
	// JavaScript built-in types
	"Promise",
	"Array",
	"Map",
	"Set",
	"WeakMap",
	"WeakSet",
	"Date",
	"RegExp",
	"Error",
	"Function",
	"Object",
	"String",
	"Number",
	"Boolean",
	"Symbol",
	// Primitive types
	"string",
	"number",
	"boolean",
	"void",
	"null",
	"undefined",
	"any",
	"unknown",
	"never",
]);

/**
 * Checks if a symbol is a type parameter using TypeScript's type system.
 * This is the proper way to detect generics (T, K, V, etc.) instead of string matching.
 *
 * @example
 * // For a type like: type Foo<T> = Bar<T>
 * // When checking the 'T' in Bar<T>, this returns true
 */
export function isTypeParameter(
	symbol: ts.Symbol | undefined,
	checker: ts.TypeChecker,
): boolean {
	if (!symbol) return false;

	// Check if the symbol has the TypeParameter flag
	const type = checker.getDeclaredTypeOfSymbol(symbol);
	return (type.flags & ts.TypeFlags.TypeParameter) !== 0;
}

/**
 * Check if a type name should be included in extraction results.
 * Filters out internal TypeScript names, built-in types, type parameters, and non-@datocms types.
 */
export function shouldIncludeTypeName(
	name: string,
	symbol: ts.Symbol | undefined,
	checker: ts.TypeChecker,
): boolean {
	if (!name || !symbol) return false;

	// Filter out internal TypeScript names
	if (name.startsWith("__")) return false;
	if (name === "__type") return false;

	// Filter out built-in types
	if (BUILT_IN_TYPE_NAMES.has(name)) return false;

	// Use proper type parameter detection instead of hardcoded list
	if (isTypeParameter(symbol, checker)) return false;

	// Check if this is declared in lib.d.ts or other built-in files
	const declarations = symbol.getDeclarations();
	if (declarations && declarations.length > 0) {
		const sourceFile = declarations[0]?.getSourceFile();
		if (sourceFile) {
			const fileName = sourceFile.fileName;
			// Skip lib.d.ts and other TypeScript lib files
			if (
				fileName.includes("/typescript/lib/") ||
				fileName.includes("\\typescript\\lib\\")
			) {
				return false;
			}
			// Only include types from @datocms packages
			if (!fileName.includes("@datocms")) {
				return false;
			}
		}
	}

	return true;
}

/**
 * Check if a type is a primitive or built-in type that we should skip.
 * Used when working with resolved ts.Type objects (not AST nodes).
 */
export function isPrimitiveOrBuiltInType(
	type: ts.Type,
	checker: ts.TypeChecker,
): boolean {
	const typeString = checker.typeToString(type);

	// Check primitives by string
	const primitives = [
		"string",
		"number",
		"boolean",
		"null",
		"undefined",
		"void",
		"any",
		"unknown",
		"never",
	];
	if (primitives.includes(typeString)) {
		return true;
	}

	// Check if it's a literal type (e.g., "hello", 42, true)
	if (type.flags & ts.TypeFlags.StringLiteral) return true;
	if (type.flags & ts.TypeFlags.NumberLiteral) return true;
	if (type.flags & ts.TypeFlags.BooleanLiteral) return true;

	return false;
}
