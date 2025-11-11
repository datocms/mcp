import type { ResourcesEndpoint } from "../resources/types.js";
import { extractAllMethodNames } from "./extractAllMethodNames.js";
import {
	extractMethodSignature,
	formatMethodSignature,
} from "./extractMethodSignature.js";
import { getCmaClientProgram } from "./getCmaClientProgram.js";

/**
 * Represents a method extracted from a JS Client endpoint
 */
export type ExtractedResourcesEndpointMethod = {
	/** The method name */
	name: string;
	/** The formatted TypeScript function signature */
	functionDefinition: string;
	/** Set of type names referenced in the method signature */
	referencedTypes: Set<string>;
};

/**
 * Extracts all available method signatures for a given endpoint.
 * Uses TypeScript Compiler API to analyze the Client class and extract
 * method signatures with full type information.
 *
 * @param endpoint - The endpoint to extract methods for
 * @returns Promise resolving to array of extracted method information
 */
export async function extractResourcesEndpointMethods(
	endpoint: ResourcesEndpoint,
): Promise<ExtractedResourcesEndpointMethod[]> {
	const { checker, clientClass } = await getCmaClientProgram();
	const methods: ExtractedResourcesEndpointMethod[] = [];

	// Use the actual documentation URL from the endpoint
	const expectedDocUrl = endpoint.docUrl;

	// Get all available methods on this resource
	const allMethodNames = extractAllMethodNames(
		checker,
		clientClass,
		endpoint.namespace,
	);

	// Extract signatures for all methods
	for (const methodName of allMethodNames) {
		const signature = extractMethodSignature(
			checker,
			clientClass,
			endpoint.namespace,
			methodName,
		);

		if (!signature) continue;

		// Only include methods that match this specific action's documentation URL
		if (signature.actionUrl !== expectedDocUrl) continue;

		methods.push({
			name: methodName,
			functionDefinition: formatMethodSignature(signature),
			referencedTypes: new Set(signature.referencedTypeSymbols.keys()),
		});
	}

	return methods;
}
