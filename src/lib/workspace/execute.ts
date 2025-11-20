import { buildClient } from "@datocms/cma-client-node";
import { MAX_OUTPUT_BYTES, SCRIPT_TIMEOUT_MS } from "../config.js";
import { code, h1, h2, p, pre, render } from "../markdown.js";
import type { Script } from "../scripts/storage.js";
import { viewScript } from "../scripts/storage.js";
import type { Workspace } from "./index.js";
import { getWorkspace } from "./index.js";

export async function validateAndExecuteScript(
	scriptName: string,
	apiToken: string | undefined,
	execute: boolean | undefined,
	actionVerb: string,
): Promise<string | null> {
	// If no API token, skip TypeScript validation and execution
	if (!apiToken) {
		return null;
	}

	const script = viewScript(scriptName);
	const wm = await getWorkspace();
	const client = buildClient({ apiToken });
	const tsValidation = await wm.validateScript(script, client);

	if (!tsValidation.passed) {
		return render(
			h1(`Script ${actionVerb} with TypeScript validation errors`),
			p("Script ", code(scriptName), " has TypeScript validation errors:"),
			pre({ language: "text" }, tsValidation.output),
			p(
				"Please fix the errors using ",
				code("update_script"),
				" and try again.",
			),
		);
	}

	// Execute the script if requested
	if (execute) {
		return executeAndRender(
			script,
			apiToken,
			wm,
			`Script ${actionVerb} and executed`,
			`Script ${actionVerb} but execution`,
		);
	}

	// Return null to indicate success without execution
	return null;
}

export async function executeAndRender(
	script: Script,
	apiToken: string,
	wm: Workspace,
	successPrefix: string = "Script executed",
	failurePrefix: string = "Script execution",
): Promise<string> {
	const result = await wm.executeScript(script, {
		apiToken,
		timeoutMs: SCRIPT_TIMEOUT_MS,
		maxStdoutBytes: MAX_OUTPUT_BYTES,
	});

	if (result.success) {
		return render(
			h1(`${successPrefix} successfully`),
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
