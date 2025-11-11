import fs from "node:fs/promises";
import path from "node:path";
import envPaths from "env-paths";

export async function withLock<T>(
	name: string,
	fn: () => Promise<T>,
	opts?: { timeoutMs?: number },
): Promise<T> {
	const lockDir = path.join(envPaths("datocms-mcp").data, `${name}.lock`);
	const timeoutMs = opts?.timeoutMs ?? 2 * 60 * 1000;
	const start = Date.now();

	while (true) {
		try {
			await fs.mkdir(lockDir);
			// acquired
			try {
				const res = await fn();
				return res;
			} finally {
				await fs.rmdir(lockDir).catch(() => {});
			}
		} catch (_e) {
			// already exists
			if (Date.now() - start > timeoutMs) throw new Error("lock timeout");
			await new Promise((r) => setTimeout(r, 200));
		}
	}
}
