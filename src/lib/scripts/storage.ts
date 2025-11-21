import {
	type ValidationResult,
	validateScriptStructure,
} from "./validation.js";

/**
 * In-memory storage for script files
 */

export interface Script {
	name: string;
	content: string;
}

const scripts = new Map<string, Script>();

export function createScript(name: string, content: string): ValidationResult {
	if (!name.startsWith("script://")) {
		throw new Error(`Script name must start with script://`);
	}

	if (!name.endsWith(".ts")) {
		throw new Error(`Script name must end with .ts`);
	}

	if (scripts.has(name)) {
		throw new Error(`Script '${name}' already exists`);
	}

	// Validate the script format (but don't block saving)
	const validation = validateScriptStructure(content);

	// Save the script regardless of validation result
	scripts.set(name, { name, content });

	// Return validation results for informational purposes
	return validation;
}

export interface Replacement {
	oldStr: string;
	newStr: string;
}

export function updateScript(
	name: string,
	replacements: Replacement[],
): ValidationResult {
	const script = scripts.get(name);

	if (!script) {
		throw new Error(`Script '${name}' not found`);
	}

	if (replacements.length === 0) {
		throw new Error("At least one replacement must be provided");
	}

	let updatedContent = script.content;

	// Apply each replacement sequentially
	for (const [index, replacement] of replacements.entries()) {
		const { oldStr, newStr } = replacement;

		// Count occurrences of oldStr
		const occurrences = updatedContent.split(oldStr).length - 1;

		if (occurrences === 0) {
			throw new Error(
				`Replacement ${index + 1}: String not found in script '${name}'`,
			);
		}

		if (occurrences > 1) {
			throw new Error(
				`Replacement ${
					index + 1
				}: String appears ${occurrences} times in script '${name}'. It must be unique.`,
			);
		}

		// Replace the string
		updatedContent = updatedContent.replace(oldStr, newStr);
	}

	// Validate the updated script format (but don't block saving)
	const validation = validateScriptStructure(updatedContent);

	// Update the script regardless of validation result
	script.content = updatedContent;

	// Return validation results for informational purposes
	return validation;
}

export function getScript(name: string): Script {
	const script = scripts.get(name);

	if (!script) {
		throw new Error(`Script '${name}' not found`);
	}

	return script;
}

export function listScripts(): Script[] {
	return Array.from(scripts.values());
}

export function deleteScript(name: string): void {
	if (!scripts.has(name)) {
		throw new Error(`Script '${name}' not found`);
	}

	scripts.delete(name);
}
