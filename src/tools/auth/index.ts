import { buildClient as buildDashboardClient } from "@datocms/dashboard-client";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
	deleteOAuthCredentials,
	OAUTH_CREDENTIALS_PATH,
	readOAuthCredentials,
	writeOAuthCredentials,
} from "../../lib/credentials.js";
import { h1, p, render } from "../../lib/markdown.js";
import { performOAuthLogin } from "../../lib/oauth.js";
import { simplifiedRegisterTool } from "../../lib/simplifiedRegisterTool.js";

export function register(server: McpServer) {
	simplifiedRegisterTool(
		server,
		"datocms_login",
		{
			title: "Log in to DatoCMS",
			description:
				"Authenticates with DatoCMS via OAuth. Opens a browser window for authorization, then saves credentials locally.",
		},
		async () => {
			const accessToken = await performOAuthLogin();
			await writeOAuthCredentials({ apiToken: accessToken });

			const dashboardClient = buildDashboardClient({
				apiToken: accessToken,
			});
			const account = await dashboardClient.account.find();

			return render(
				h1("Login successful!"),
				p(`Logged in as ${account.email}.`),
				p(`Credentials saved to ${OAUTH_CREDENTIALS_PATH}`),
			);
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
