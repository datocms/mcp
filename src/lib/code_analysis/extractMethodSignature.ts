import ts from "typescript";
import {
	isPrimitiveOrBuiltInType,
	shouldIncludeTypeName,
} from "./typeFilters.js";

export interface MethodSignatureInfo {
	methodName: string;
	parameters: ParameterInfo[];
	returnType: string;
	documentation?: string;
	/** The action URL extracted from "Read more:" in JSDoc */
	actionUrl?: string;
	/** TypeScript symbols for referenced types (for accurate type extraction) */
	referencedTypeSymbols: Map<string, ts.Symbol>;
	/** All overload signatures if the method has multiple overloads */
	overloads?: SignatureOverload[];
}

export interface SignatureOverload {
	parameters: ParameterInfo[];
	returnType: string;
}

export interface ParameterInfo {
	name: string;
	type: string;
	isOptional: boolean;
	documentation?: string;
}

/**
 * Extracts the signature of a specific method from a resource class
 *
 * @param checker - TypeScript type checker (can resolve across files)
 * @param clientClass - The Client class declaration
 * @param resourceName - The resource property name (e.g., "uploads", "items")
 * @param methodName - The method name (e.g., "createFromLocalFile", "list")
 * @returns Method signature information or undefined if not found
 */
/**
 * Extracts the action URL from JSDoc "Read more:" line
 * Example: "Read more: https://www.datocms.com/docs/content-management-api/resources/item/instances"
 * Returns: "https://www.datocms.com/docs/content-management-api/resources/item/instances"
 */
function extractActionUrlFromDocs(
	documentation: string | undefined,
): string | undefined {
	if (!documentation) return undefined;

	const match = documentation.match(/Read more:\s*(https?:\/\/[^\s]+)/);
	return match?.[1];
}

export function extractMethodSignature(
	checker: ts.TypeChecker,
	clientClass: ts.ClassDeclaration,
	resourceName: string,
	methodName: string,
): MethodSignatureInfo | undefined {
	// 1. Find the resource property on the Client class (e.g., uploads: Upload)
	// This might be on the class itself or inherited from the base class
	let resourceProperty = clientClass.members.find(
		(member) =>
			ts.isPropertyDeclaration(member) &&
			ts.isIdentifier(member.name) &&
			member.name.text === resourceName,
	) as ts.PropertyDeclaration | undefined;

	// If not found on the class directly, check the base class
	if (!resourceProperty) {
		// Get the type of the class to access inherited members
		const classType = checker.getTypeAtLocation(clientClass);
		const resourceSymbol = classType.getProperty(resourceName);

		if (!resourceSymbol) {
			return undefined;
		}

		// Get the declaration of the property from the base class
		const declarations = resourceSymbol.getDeclarations();
		if (!declarations || declarations.length === 0) {
			return undefined;
		}

		const declaration = declarations[0];
		if (!declaration || !ts.isPropertyDeclaration(declaration)) {
			return undefined;
		}

		resourceProperty = declaration;
	}

	if (!resourceProperty || !resourceProperty.type) {
		return undefined;
	}

	// 2. Get the type of the resource (e.g., Upload class)
	// The TypeChecker will resolve this even if it's defined in another file!
	const resourceType = checker.getTypeAtLocation(resourceProperty.type);

	// 3. Get the method from the resource type
	const methodSymbol = resourceType.getProperty(methodName);
	if (!methodSymbol) {
		return undefined;
	}

	// 4. Get the method's type
	const methodType = checker.getTypeOfSymbol(methodSymbol);

	// 5. Get the method's call signatures
	const signatures = methodType.getCallSignatures();
	if (signatures.length === 0) {
		return undefined;
	}

	// 6. Extract JSDoc comments for the method (same for all overloads)
	const methodDocs = methodSymbol.getDocumentationComment(checker);
	const documentation =
		methodDocs.length > 0
			? methodDocs.map((doc) => doc.text).join("\n")
			: undefined;

	// 7. Collect all referenced type symbols from ALL signatures
	const referencedTypeSymbols = new Map<string, ts.Symbol>();

	// 8. Process all overload signatures
	const overloads: SignatureOverload[] = [];

	for (const signature of signatures) {
		// Extract parameters for this signature
		const parameters: ParameterInfo[] = signature
			.getParameters()
			.map((param) => {
				const paramType = checker.getTypeOfSymbol(param);
				const paramDeclaration = param.valueDeclaration;

				const isOptional = paramDeclaration
					? ts.isParameter(paramDeclaration) &&
						(paramDeclaration.questionToken !== undefined ||
							paramDeclaration.initializer !== undefined)
					: false;

				// Get JSDoc comments for the parameter
				const paramDocs = param.getDocumentationComment(checker);
				const documentation =
					paramDocs.length > 0
						? paramDocs.map((doc) => doc.text).join("\n")
						: undefined;

				return {
					name: param.getName(),
					type: checker.typeToString(paramType),
					isOptional,
					documentation,
				};
			});

		// Extract return type for this signature
		const returnType = checker.typeToString(signature.getReturnType());

		// Add this signature to overloads
		overloads.push({
			parameters,
			returnType,
		});

		// Collect referenced types from this signature
		signature.getParameters().forEach((param) => {
			const paramType = checker.getTypeOfSymbol(param);
			collectReferencedTypeNames(paramType, checker, referencedTypeSymbols);
		});

		collectReferencedTypeNames(
			signature.getReturnType(),
			checker,
			referencedTypeSymbols,
		);
	}

	// 9. Use the first signature as the default (for backward compatibility)
	const firstSignature = overloads[0];
	if (!firstSignature) {
		return undefined;
	}

	return {
		methodName,
		parameters: firstSignature.parameters,
		returnType: firstSignature.returnType,
		documentation,
		actionUrl: extractActionUrlFromDocs(documentation),
		referencedTypeSymbols,
		overloads: overloads.length > 1 ? overloads : undefined,
	};
}

/**
 * Collects all type names and symbols referenced by a given type
 * This includes types from other files that the TypeChecker has resolved
 *
 * IMPORTANT: Only collects named type references, not methods or properties
 */
function collectReferencedTypeNames(
	type: ts.Type,
	checker: ts.TypeChecker,
	symbolMap: Map<string, ts.Symbol>,
	visited: Set<ts.Type> = new Set(),
): void {
	// Avoid infinite recursion with circular types
	if (visited.has(type)) return;
	visited.add(type);

	// Skip primitive types and built-in types
	if (isPrimitiveOrBuiltInType(type, checker)) {
		return;
	}

	// Get the symbol for this type
	// For type aliases, aliasSymbol has the actual type name (e.g., "UploadData")
	// while getSymbol() returns "__type" for the underlying type
	const symbol = type.aliasSymbol || type.getSymbol();

	if (symbol) {
		const name = symbol.getName();
		// Only add if it's a real type name (not internal or primitive)
		if (shouldIncludeTypeName(name, symbol, checker)) {
			// Store the symbol so we can find the correct source file later
			symbolMap.set(name, symbol);
		}
	}

	// Handle union types (e.g., string | number)
	if (type.isUnion()) {
		for (const subType of type.types) {
			collectReferencedTypeNames(subType, checker, symbolMap, visited);
		}
	}

	// Handle intersection types (e.g., A & B)
	if (type.isIntersection()) {
		for (const subType of type.types) {
			collectReferencedTypeNames(subType, checker, symbolMap, visited);
		}
	}

	// Handle type references with type arguments (e.g., Promise<Upload>)
	if (checker.isArrayType(type)) {
		const typeArgs = checker.getTypeArguments(type as ts.TypeReference);
		if (typeArgs) {
			for (const typeArg of typeArgs) {
				collectReferencedTypeNames(typeArg, checker, symbolMap, visited);
			}
		}
	}

	// Handle generic type references
	const typeRef = type as ts.TypeReference;
	if (typeRef.target && checker.getTypeArguments) {
		const typeArgs = checker.getTypeArguments(typeRef);
		if (typeArgs) {
			for (const typeArg of typeArgs) {
				collectReferencedTypeNames(typeArg, checker, symbolMap, visited);
			}
		}
	}

	// REMOVED: Don't iterate through object properties as this incorrectly
	// collects method names from String.prototype, Array.prototype, etc.
	// We only want named type references, not all properties/methods.
}

/**
 * Formats a method signature into readable TypeScript code
 */
export function formatMethodSignature(sig: MethodSignatureInfo): string {
	const formattedParams = sig.parameters
		.map((param) => {
			const optional = param.isOptional ? "?" : "";
			return `${param.name}${optional}: ${param.type}`;
		})
		.join(", ");

	return `${sig.methodName}(${formattedParams}): ${sig.returnType}`;
}
