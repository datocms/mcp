import fs from "node:fs/promises";
import path from "node:path";
import { generateSchemaTypes } from "@datocms/cli";
import type { Client } from "@datocms/cma-client-node";
import type { Script } from "../scripts/storage.js";

export async function writeTempScriptAndSchema(
	scriptsDir: string,
	script: Script,
	client: Client,
): Promise<string> {
	await fs.mkdir(scriptsDir, { recursive: true });

	// Strip 'script://' prefix from the name to get the actual filename
	const filename = script.name.replace(/^script:\/\//, "");
	const scriptPath = path.join(scriptsDir, filename);

	await fs.writeFile(scriptPath, script.content, {
		encoding: "utf8",
		mode: 0o600,
	});

	await fs.writeFile(
		path.join(scriptsDir, "schema.ts"),
		await generateSchemaTypes(client),
		{
			encoding: "utf8",
			mode: 0o600,
		},
	);
	return scriptPath;
}

export async function deleteTempScriptPath(filePath: string): Promise<void> {
	try {
		await fs.unlink(filePath);
	} catch (_e) {
		/* ignore */
	}
}
