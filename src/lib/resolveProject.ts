import { buildClient, type Client } from "@datocms/cma-client-node";
import { buildClient as buildDashboardClient } from "@datocms/dashboard-client";
import z from "zod";
import { readOAuthCredentials } from "./credentials.js";

type ResolvedSite = {
	accessToken: string;
	siteName: string;
	siteId: string;
};

type ResolvedProject = {
	client: Client;
	siteName: string;
	siteId: string;
};

/**
 * In-memory cache: normalized project identifier → resolved site info.
 */
const siteCache = new Map<string, ResolvedSite>();

/**
 * Shared Zod descriptions for tool arguments.
 */
export const projectArgument = z
	.string()
	.describe(
		'The DatoCMS project to operate on. Can be a site ID (e.g. "12345"), internal subdomain (e.g. "my-project" or "my-project.admin.datocms.com"), or custom domain (e.g. "admin.foobar.com"). URLs with https:// are also accepted. If you don\'t know which project to use, ask the user — do not guess.',
	);

export const environmentArgument = z
	.string()
	.optional()
	.describe(
		'The DatoCMS sandbox environment to operate on (e.g. "my-sandbox"). If omitted, the primary environment is used.',
	);

/**
 * Normalizes a project identifier:
 * - "https://foo.admin.datocms.com" → "foo" (with or without protocol)
 * - "foo.admin.datocms.com" → "foo" (without protocol)
 * - "https://admin.foobar.com" → "admin.foobar.com" (custom domain)
 * - "https://foobar.com" → "foobar.com" (custom domain)
 * - "admin.foobar.com" → "admin.foobar.com" (custom domain, no protocol)
 * - "foo" → "foo" (subdomain or ID)
 */
function normalizeProjectIdentifier(project: string): string {
	// Standard DatoCMS admin URL: extract subdomain (with or without protocol)
	const datocmsMatch = project.match(
		/^(?:https?:\/\/)?([^.]+)\.admin\.datocms\.com/,
	);
	if (datocmsMatch) return datocmsMatch[1]!;

	// Any other URL with protocol: extract hostname (custom domain)
	const urlMatch = project.match(/^https?:\/\/([^/]+)/);
	if (urlMatch) return urlMatch[1]!;

	// Already a plain identifier (subdomain, ID, or custom domain)
	return project;
}

/**
 * Given a project identifier (site ID or subdomain) and an optional
 * environment, resolves the CMA API client by searching across the user's
 * personal account and all organizations via the dashboard API.
 *
 * Site-level results (access token) are cached in memory for the lifetime
 * of the process. The client is built fresh when a different environment
 * is requested.
 */
export async function resolveProject(
	project: string,
	environment?: string,
): Promise<ResolvedProject> {
	const site = await resolveSite(project);

	return {
		client: buildClient({
			apiToken: site.accessToken,
			...(environment ? { environment } : {}),
		}),
		siteName: site.siteName,
		siteId: site.siteId,
	};
}

async function resolveSite(project: string): Promise<ResolvedSite> {
	const identifier = normalizeProjectIdentifier(project);

	const cached = siteCache.get(identifier);
	if (cached) {
		return cached;
	}

	const oauthCreds = await readOAuthCredentials();

	if (!oauthCreds) {
		throw new Error(
			'Not logged in. Use the "datocms_login" tool to authenticate first.',
		);
	}

	const baseDashboardOpts = {
		apiToken: oauthCreds.apiToken,
	};

	// Try finding by ID first (fast path)
	if (/^\d+$/.test(identifier)) {
		const result = await tryFindSiteById(baseDashboardOpts, identifier);
		if (result) {
			siteCache.set(identifier, result);
			return result;
		}
	}

	// Search across personal account and all organizations
	const result = await searchSiteAcrossScopes(baseDashboardOpts, identifier);

	if (result) {
		siteCache.set(identifier, result);
		return result;
	}

	throw new Error(
		`Could not find a DatoCMS project matching "${project}". Check that the ID or subdomain is correct and that you have access to it. If you're unsure, ask the user which project to use.`,
	);
}

type DashboardOpts = {
	apiToken: string;
};

async function tryFindSiteById(
	opts: DashboardOpts,
	siteId: string,
): Promise<ResolvedSite | null> {
	const dashboardClient = buildDashboardClient(opts);

	const site = await findSiteByIdInScope(dashboardClient, siteId);
	if (site) return site;

	const organizations = await dashboardClient.organizations.list();

	const results = await Promise.all(
		organizations.map(async (org) => {
			const orgClient = buildDashboardClient({
				...opts,
				organization: org.id,
			});

			return findSiteByIdInScope(orgClient, siteId);
		}),
	);

	return results.find((r) => r !== null) ?? null;
}

async function findSiteByIdInScope(
	dashboardClient: ReturnType<typeof buildDashboardClient>,
	siteId: string,
): Promise<ResolvedSite | null> {
	try {
		const site = await dashboardClient.sites.find(siteId);

		if (!site.access_token) {
			throw new Error(
				`Found project "${site.name}" (ID: ${site.id}), but your account does not have CMA API access to it.`,
			);
		}

		return {
			accessToken: site.access_token,
			siteName: site.name,
			siteId: site.id,
		};
	} catch (e) {
		// Re-throw access errors, swallow 404s
		if (e instanceof Error && e.message.includes("CMA API access")) throw e;
		return null;
	}
}

async function searchSiteAcrossScopes(
	opts: DashboardOpts,
	identifier: string,
): Promise<ResolvedSite | null> {
	const lowerIdentifier = identifier.toLowerCase();

	// Search personal account
	const personalClient = buildDashboardClient(opts);
	const personalResult = await searchSitesInScope(
		personalClient,
		lowerIdentifier,
	);
	if (personalResult) return personalResult;

	// Search organizations in parallel
	const organizations = await personalClient.organizations.list();

	const results = await Promise.all(
		organizations.map(async (org) => {
			const orgClient = buildDashboardClient({
				...opts,
				organization: org.id,
			});

			return searchSitesInScope(orgClient, lowerIdentifier);
		}),
	);

	return results.find((r) => r !== null) ?? null;
}

async function searchSitesInScope(
	dashboardClient: ReturnType<typeof buildDashboardClient>,
	lowerIdentifier: string,
): Promise<ResolvedSite | null> {
	for await (const site of dashboardClient.sites.listPagedIterator()) {
		if (
			site.internal_subdomain?.toLowerCase() === lowerIdentifier ||
			site.domain?.toLowerCase() === lowerIdentifier ||
			site.id === lowerIdentifier
		) {
			if (!site.access_token) {
				throw new Error(
					`Found project "${site.name}" (ID: ${site.id}), but your account does not have CMA API access to it.`,
				);
			}

			return {
				accessToken: site.access_token,
				siteName: site.name,
				siteId: site.id,
			};
		}
	}

	return null;
}
