import { buildClient as buildDashboardClient } from "@datocms/dashboard-client";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import {
	deleteOAuthCredentials,
	OAUTH_CREDENTIALS_PATH,
	readOAuthCredentials,
	writeOAuthCredentials,
} from "../../lib/credentials.js";
import { h1, p, render } from "@datocms/rest-api-reference";
import {
	exchangeOAuthCallbackUrl,
	performOAuthLogin,
	revokeOAuthToken,
} from "../../lib/oauth.js";
import { simplifiedRegisterTool } from "../../lib/simplifiedRegisterTool.js";

/**
 * Pending OOB login state — stored in memory between the two tool calls.
 */
let pendingOobLogin: { state: string; codeVerifier: string } | null = null;

async function saveAndConfirm(accessToken: string): Promise<string> {
	await writeOAuthCredentials({ apiToken: accessToken });

	const dashboardClient = buildDashboardClient({ apiToken: accessToken });
	const account = await dashboardClient.account.find();

	return render(
		h1("Login successful!"),
		p(`Logged in as ${account.email}.`),
		p(`Credentials saved to ${OAUTH_CREDENTIALS_PATH}`),
	);
}

export function register(server: McpServer) {
	simplifiedRegisterTool(
		server,
		"datocms_login",
		{
			title: "Log in to DatoCMS",
			description:
				"Authenticates with DatoCMS via OAuth. Opens a browser window for authorization, then saves credentials locally. If the local callback server cannot start (port in use), it returns an authorization URL for manual login: ask the user to open it, authorize, then copy the redirect URL from the browser address bar and pass it as callback_url.",
			inputSchema: {
				callback_url: z
					.string()
					.optional()
					.describe(
						"Only for manual OAuth flow: the full redirect URL copied from the browser address bar after authorization.",
					),
			},
		},
		async ({ callback_url }) => {
			// Manual flow: exchange the callback URL for a token
			if (callback_url) {
				if (!pendingOobLogin) {
					throw new Error(
						"No pending login session. Call datocms_login without callback_url first.",
					);
				}

				const { state, codeVerifier } = pendingOobLogin;
				pendingOobLogin = null;

				const accessToken = await exchangeOAuthCallbackUrl(
					callback_url,
					state,
					codeVerifier,
				);

				return saveAndConfirm(accessToken);
			}

			// Normal flow: try local server + browser
			const result = await performOAuthLogin();

			if (result.type === "oob_required") {
				pendingOobLogin = {
					state: result.state,
					codeVerifier: result.codeVerifier,
				};

				return render(
					h1("Manual authentication required"),
					p(
						"Could not start the local OAuth callback server (port 7652 is in use).",
					),
					p(
						"Ask the user to open the following URL in their browser to authorize:",
					),
					p(result.authorizeUrl),
					p(
						"After authorizing, the browser will redirect to a page that may not load. Ask the user to copy the full URL from their browser's address bar, then call this tool again with that URL as the callback_url parameter.",
					),
				);
			}

			return saveAndConfirm(result.token);
		},
	);

	simplifiedRegisterTool(
		server,
		"datocms_logout",
		{
			title: "Log out from DatoCMS",
			description:
				"Removes saved DatoCMS OAuth credentials from the local machine.",
		},
		async () => {
			const creds = await readOAuthCredentials();

			if (creds) {
				try {
					await revokeOAuthToken(creds.apiToken);
				} catch {
					// Could not revoke remotely, proceed with local deletion
				}
			}

			await deleteOAuthCredentials();

			return render(
				h1("Logged out"),
				p("OAuth credentials have been removed."),
			);
		},
	);

	simplifiedRegisterTool(
		server,
		"datocms_whoami",
		{
			title: "Show current DatoCMS account",
			description:
				"Shows information about the currently authenticated DatoCMS account.",
		},
		async () => {
			const oauthCreds = await readOAuthCredentials();

			if (!oauthCreds) {
				return render(
					h1("Not logged in"),
					p(
						"No credentials found. Use ",
						"`datocms_login`",
						" to authenticate.",
					),
				);
			}

			const dashboardClient = buildDashboardClient({
				apiToken: oauthCreds.apiToken,
			});

			const account = await dashboardClient.account.find();

			return render(
				h1("Current DatoCMS account"),
				p(`Name: ${account.first_name} ${account.last_name}`),
				p(`Email: ${account.email}`),
				p(`Company: ${account.company}`),
			);
		},
	);
}
