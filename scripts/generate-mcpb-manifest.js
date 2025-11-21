#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

const packageJson = JSON.parse(
	fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"),
);

const manifest = {
	manifest_version: "0.2",
	name: "datocms-mcp",
	display_name: "DatoCMS MCP",
	version: packageJson.version,
	description: packageJson.description,
	author: {
		name: "DatoCMS",
	},
	repository: {
		type: "git",
		url:
			packageJson.repository?.url?.replace(".git", "") || packageJson.homepage,
	},
	homepage: packageJson.homepage,
	icon: "assets/icon.png",
	server: {
		type: "node",
		entry_point: "bin/stdio",
		mcp_config: {
			command: "node",
			args: ["${__dirname}/bin/stdio"],
			env: {
				DATOCMS_API_TOKEN: "${user_config.api_token}",
				EXECUTION_TIMEOUT_SECONDS: "${user_config.execution_timeout_seconds}",
				MAX_OUTPUT_BYTES: "${user_config.max_output_bytes}",
				NODE_ENV: "production",
			},
		},
	},
	keywords: packageJson.keywords || [],
	license: packageJson.license,
	compatibility: {
		platforms: ["darwin", "win32", "linux"],
		runtimes: {
			node: packageJson.engines?.node || ">=18.0.0",
		},
	},
	user_config: {
		api_token: {
			type: "string",
			title: "DatoCMS API Token",
			description:
				"Your DatoCMS API token. Get it from your project settings at https://www.datocms.com/docs/content-management-api/authentication",
			sensitive: true,
			required: true,
		},
		execution_timeout_seconds: {
			type: "number",
			title: "Execution Timeout (seconds)",
			description: "Script execution timeout in seconds.",
			default: 60,
			required: false,
		},
		max_output_bytes: {
			type: "number",
			title: "Max Output Size (bytes)",
			description: "Maximum output size in bytes for all executions.",
			default: 2048,
			required: false,
		},
	},
};

// Ensure dxt-dist directory exists
const distDir = path.join(projectRoot, "dxt-dist");
if (!fs.existsSync(distDir)) {
	fs.mkdirSync(distDir, { recursive: true });
}

// Write manifest
const manifestPath = path.join(distDir, "manifest.json");
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`Generated DXT manifest: ${manifestPath}`);
console.log(`Version: ${packageJson.version}`);
