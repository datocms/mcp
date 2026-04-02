import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/**
 * OAuth/dashboard credentials.
 * The apiToken here is a dashboard token, NOT a CMA API token.
 */
export type OAuthCredentials = {
	apiToken: string;
};

const OAUTH_CREDENTIALS_PATH = join(
	homedir(),
	".config",
	"datocms-mcp",
	"credentials.json",
);

export { OAUTH_CREDENTIALS_PATH };

export async function readOAuthCredentials(): Promise<OAuthCredentials | null> {
	try {
		const raw = await readFile(OAUTH_CREDENTIALS_PATH, "utf-8");
		const parsed = JSON.parse(raw);

		if (typeof parsed?.apiToken !== "string") {
			return null;
		}

		return parsed as OAuthCredentials;
	} catch {
		return null;
	}
}

export async function writeOAuthCredentials(
	creds: OAuthCredentials,
): Promise<void> {
	await mkdir(dirname(OAUTH_CREDENTIALS_PATH), { recursive: true });

	await writeFile(
		OAUTH_CREDENTIALS_PATH,
		JSON.stringify({ apiToken: creds.apiToken }, null, 2),
		"utf-8",
	);
	await chmod(OAUTH_CREDENTIALS_PATH, 0o600);
}

export async function deleteOAuthCredentials(): Promise<void> {
	try {
		await unlink(OAUTH_CREDENTIALS_PATH);
	} catch {
		// File doesn't exist, that's fine
	}
}
