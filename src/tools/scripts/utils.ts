import {
	datocmsClient,
	MAX_OUTPUT_BYTES,
	SCRIPT_TIMEOUT_MS,
} from "../../lib/config.js";
import { invariant } from "../../lib/invariant.js";
import { code, h1, h2, p, pre, render } from "../../lib/markdown.js";
import { getScript } from "../../lib/scripts/storage.js";
import { getWorkspace } from "../../lib/workspace/index.js";

export async function validateExecuteAndRender(
	scriptName: string,
	execute: boolean | undefined,
	actionVerb: string,
): Promise<string> {
	const validationErrors = await validateAndRender(scriptName);

	if (validationErrors) {
		return render(
			h1(`Script ${actionVerb} with TypeScript validation errors`),
			validationErrors,
		);
	}

	// Execute the script if requested
	if (execute) {
		return executeAndRender(
			scriptName,
			`Script ${actionVerb} and executed successfully`,
			`Script ${actionVerb}, but execution`,
		);
	}

	return render(
		h1(`Script ${actionVerb} successfully`),
		p(
			"Script ",
			code(scriptName),
			` has been ${actionVerb} with no validation errors.`,
		),
		p("Use ", code("view_script"), " to view its content."),
	);
}

export async function validateAndRender(scriptName: string) {
	invariant(datocmsClient);

	const script = getScript(scriptName);
	const wm = await getWorkspace();
	const tsValidation = await wm.validateScript(script, datocmsClient);

	if (!tsValidation.passed) {
		return render(
			p("Script ", code(scriptName), " has TypeScript validation errors:"),
			pre({ language: "text" }, tsValidation.output),
			p(
				"Please fix the errors using ",
				code("update_script"),
				" and try again.",
			),
		);
	}

	return null;
}

export async function executeAndRender(
	scriptName: string,
	success: string = "Script executed successfully",
	failurePrefix: string = "Script execution",
): Promise<string> {
	invariant(datocmsClient);

	const script = getScript(scriptName);
	const wm = await getWorkspace();

	const result = await wm.executeScript(script, {
		client: datocmsClient,
		timeoutMs: SCRIPT_TIMEOUT_MS,
		maxStdoutBytes: MAX_OUTPUT_BYTES,
	});

	if (result.success) {
		return render(
			h1(success),
			p("Script ", code(script.name), " completed successfully."),
			...(result.stdout
				? [h2("Output"), pre({ language: "text" }, result.stdout)]
				: []),
			...(result.stderr
				? [h2("Errors/Warnings"), pre({ language: "text" }, result.stderr)]
				: []),
		);
	}

	// Handle execution failure
	if (result.cause === "timeout") {
		return render(
			h1(`${failurePrefix} timed out`),
			p(
				"Script ",
				code(script.name),
				" exceeded the maximum execution time and was terminated.",
			),
			...(result.stdout
				? [h2("Output"), pre({ language: "text" }, result.stdout)]
				: []),
			...(result.stderr
				? [h2("Errors/Warnings"), pre({ language: "text" }, result.stderr)]
				: []),
		);
	}

	if (result.cause === "error") {
		return render(
			h1(`${failurePrefix} error`),
			p("Script ", code(script.name), " encountered an error:"),
			pre({ language: "text" }, result.error),
		);
	}

	// result.cause === "exitCode"
	return render(
		h1(`${failurePrefix} failed`),
		p(
			"Script ",
			code(script.name),
			" exited with code ",
			code(result.exitCode.toString()),
			".",
		),
		...(result.stdout
			? [h2("Output"), pre({ language: "text" }, result.stdout)]
			: []),
		...(result.stderr
			? [h2("Errors"), pre({ language: "text" }, result.stderr)]
			: []),
	);
}
