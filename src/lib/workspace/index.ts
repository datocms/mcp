import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Client } from "@datocms/cma-client-node";
import dedent from "dedent";
import envPaths from "env-paths";
import { MAX_OUTPUT_BYTES, SCRIPT_TIMEOUT_MS } from "../config.js";
import { memoized } from "../memoized.js";
import type { Script } from "../scripts/storage.js";
import { withLock } from "./locks.js";
import { deleteTempScriptPath, writeTempScriptAndSchema } from "./temp.js";
export interface WorkspaceOptions {
	rootPath: string;
	packageManager?: "npm" | "pnpm";
}

export interface InitResult {
	success: boolean;
	message?: string;
	elapsedMs?: number;
}
export interface InstallResult {
	success: boolean;
	stdout?: string;
	stderr?: string;
}
export interface ValidationResult {
	passed: boolean;
	output: string;
}

export type ExecutionResult =
	| {
			success: true;
			stdout: string;
			stderr: string;
	  }
	| {
			success: false;
			cause: "timeout";
			stdout: string;
			stderr: string;
	  }
	| {
			success: false;
			cause: "exitCode";
			exitCode: number;
			stdout: string;
			stderr: string;
	  }
	| {
			success: false;
			cause: "error";
			error: string;
	  };

const DEFAULT_TS_FILENAME = "scripts";
const DEFAULT_LOCK_NAME = "workspace-init.lock";

export class Workspace {
	rootPath: string;
	scriptsPath: string;
	packageManager: "npm" | "pnpm";

	constructor(opts: WorkspaceOptions) {
		this.rootPath = opts.rootPath;
		this.packageManager = opts.packageManager ?? "npm";
		this.scriptsPath = path.join(this.rootPath, DEFAULT_TS_FILENAME);
	}

	// Ensure workspace dir, templates, and node_modules (idempotent)
	async ensure(): Promise<InitResult> {
		return withLock(
			DEFAULT_LOCK_NAME,
			async () => {
				const start = Date.now();
				await fs.mkdir(this.rootPath, { recursive: true });
				await fs.mkdir(this.scriptsPath, { recursive: true });

				await this._writePackageJson();
				await this._writeTsConfig();
				await this._writeRunner();
				await this._installDeps();

				return { success: true, elapsedMs: Date.now() - start };
			},
			{ timeoutMs: 5 * 60 * 1000 },
		);
	}

	// Run npm install (simple, blocking)
	async _installDeps(): Promise<InstallResult> {
		const cmd = this.packageManager === "pnpm" ? "pnpm" : "npm";
		const args =
			this.packageManager === "pnpm"
				? ["install"]
				: ["install", "--no-audit", "--no-fund"];
		return new Promise<InstallResult>((resolve) => {
			const child = spawn(cmd, args, {
				cwd: this.rootPath,
				env: process.env,
				stdio: ["ignore", "pipe", "pipe"],
			});
			let out = "";
			let err = "";
			child.stdout.on("data", (b) => (out += b.toString()));
			child.stderr.on("data", (b) => (err += b.toString()));
			child.on("close", (code) =>
				resolve({ success: code === 0, stdout: out, stderr: err }),
			);
		});
	}

	// Validate a script text (writes temp file and runs tsc --noEmit)
	async validateScript(
		script: Script,
		client: Client,
	): Promise<ValidationResult> {
		const filePath = await writeTempScriptAndSchema(
			this.scriptsPath,
			script,
			client,
		);

		try {
			const tsc = spawn(
				"npx",
				["tsc", "--noEmit", filePath, "--pretty", "false"],
				{ cwd: this.rootPath, env: process.env },
			);

			let stdout = "";
			let stderr = "";

			const exitCode: number = await new Promise((resolve, reject) => {
				tsc.stdout?.on("data", (b) => (stdout += b.toString()));
				tsc.stderr?.on("data", (b) => (stderr += b.toString()));
				tsc.on("error", (err) => reject(err));
				tsc.on("close", (code) => resolve(code ?? 1)); // fallback to 1 if null
			});

			return { passed: exitCode === 0, output: stderr + stdout };
		} finally {
			await deleteTempScriptPath(filePath).catch(() => {});
		}
	}

	// Execute a previously created temp script
	async executeScript(
		script: Script,
		opts: {
			client: Client;
			timeoutMs?: number;
			maxStdoutBytes?: number;
		},
	): Promise<ExecutionResult> {
		const filePath = await writeTempScriptAndSchema(
			this.scriptsPath,
			script,
			opts.client,
		);

		try {
			const timeoutMs = opts?.timeoutMs ?? SCRIPT_TIMEOUT_MS;
			const maxStdout = opts?.maxStdoutBytes ?? MAX_OUTPUT_BYTES;

			return await new Promise<ExecutionResult>((resolve) => {
				const runnerPath = path.join(this.rootPath, "runner.ts");

				const child = spawn("npx", ["tsx", runnerPath, filePath], {
					cwd: this.rootPath,
					env: {
						...process.env,
						DATOCMS_API_TOKEN: opts.client.config.apiToken || undefined,
						DATOCMS_ENVIRONMENT: opts.client.config.environment,
						DATOCMS_BASE_URL: opts.client.config.baseUrl,
					},
				});

				let stdout = "";
				let stderr = "";
				let timedOut = false;

				const killTimer = setTimeout(() => {
					timedOut = true;
					child.kill("SIGKILL");
				}, timeoutMs);

				child.stdout.on("data", (b) => {
					if (stdout.length >= maxStdout) {
						return; // Already at limit, ignore new data
					}

					stdout += b.toString();
					if (stdout.length > maxStdout) {
						stdout = `${stdout.slice(0, maxStdout)}\n...[truncated]`;
					}
				});

				child.stderr.on("data", (b) => {
					if (stderr.length >= maxStdout) {
						return; // Already at limit, ignore new data
					}

					stderr += b.toString();
					if (stderr.length > maxStdout) {
						stderr = `${stderr.slice(0, maxStdout)}\n...[truncated]`;
					}
				});

				child.on("close", (code) => {
					clearTimeout(killTimer);

					if (timedOut) {
						resolve({ success: false, cause: "timeout", stderr, stdout });
						return;
					}

					if (code && code !== 0) {
						resolve({
							success: false,
							cause: "exitCode",
							exitCode: code,
							stderr,
							stdout,
						});

						return;
					}

					resolve({
						success: true,
						stdout,
						stderr,
					});
				});

				child.on("error", (error) => {
					clearTimeout(killTimer);
					resolve({ success: false, cause: "error", error: error.message });
				});
			});
		} finally {
			await deleteTempScriptPath(filePath).catch(() => {});
		}
	}

	// --- helpers ---
	async _writePackageJson() {
		const cmaClientNodePkgPath = fileURLToPath(
			import.meta.resolve("@datocms/cma-client-node/package.json"),
		);

		const cmaClientNodeVersion = JSON.parse(
			readFileSync(cmaClientNodePkgPath, "utf-8"),
		).version;

		const packageJson = JSON.stringify(
			{
				name: "script-workspace",
				private: true,
				type: "module",
				dependencies: {
					"@datocms/cma-client-node": cmaClientNodeVersion,
				},
				devDependencies: {
					"@types/node": "^24.10.1",
					tsx: "^4.20.6",
					typescript: "^5.9.3",
				},
			},
			null,
			2,
		);

		const pkgPath = path.join(this.rootPath, "package.json");

		await fs.writeFile(pkgPath, packageJson, {
			encoding: "utf8",
		});
	}

	async _writeTsConfig() {
		const tsConfig = JSON.stringify(
			{
				compilerOptions: {
					target: "ES2020",
					module: "nodenext",
					moduleResolution: "nodenext",
					strict: true,
					esModuleInterop: true,
					skipLibCheck: false,
					forceConsistentCasingInFileNames: true,
					resolveJsonModule: true,
					outDir: "./dist",
				},
				include: ["scripts/**/*.ts"],
			},
			null,
			2,
		);

		const tsconfigPath = path.join(this.rootPath, "tsconfig.json");
		await fs.writeFile(tsconfigPath, tsConfig, {
			encoding: "utf8",
		});
	}

	async _writeRunner() {
		const runner = dedent(`
      import { buildClient } from '@datocms/cma-client-node';

      async function main() {
        const scriptPath = process.argv[2];
        const apiToken = process.env['DATOCMS_API_TOKEN'];
        const environment = process.env['DATOCMS_ENVIRONMENT'];
        const baseUrl = process.env['DATOCMS_BASE_URL'];

        if (!scriptPath) {
          console.error(
            JSON.stringify({ success: false, error: 'missing script path arg' })
          );
          process.exit(2);
        }

        if (!apiToken) {
          console.error(
            JSON.stringify({
              success: false,
              error: 'missing DATOCMS_API_TOKEN env var',
            })
          );
          process.exit(2);
        }

        const client = buildClient({ apiToken, environment, baseUrl });

        // normalize to file:// to allow dynamic import in node ESM
        const scriptUrl = scriptPath.startsWith('file://')
          ? scriptPath
          : 'file://' + scriptPath;

        const mod = await import(scriptUrl);

        if (!mod?.default || typeof mod.default !== 'function') {
          throw new Error('Script must export a default async function');
        }

        await mod.default(client);
      }

      main();
    `);

		const tsconfigPath = path.join(this.rootPath, "runner.ts");
		await fs.writeFile(tsconfigPath, runner, {
			encoding: "utf8",
		});
	}
}

export const getWorkspace = memoized(async () => {
	const wm = new Workspace({
		rootPath: envPaths("datocms-mcp").data,
	});

	await wm.ensure();

	return wm;
});
