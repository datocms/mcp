export const SCRIPT_TIMEOUT_MS = process.env.EXECUTION_TIMEOUT_SECONDS
	? parseInt(process.env.EXECUTION_TIMEOUT_SECONDS, 10) * 1000
	: 60_000;

export const MAX_OUTPUT_BYTES = process.env.MAX_OUTPUT_BYTES
	? parseInt(process.env.MAX_OUTPUT_BYTES, 10)
	: 2048;
