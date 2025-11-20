/**
 * Configuration values from environment variables
 */

/**
 * Script execution timeout in milliseconds
 * Set via EXECUTION_TIMEOUT_SECONDS (default: 60 seconds)
 */
export const SCRIPT_TIMEOUT_MS = process.env.EXECUTION_TIMEOUT_SECONDS
	? parseInt(process.env.EXECUTION_TIMEOUT_SECONDS, 10) * 1000
	: 60_000;

/**
 * Maximum output size in bytes for all executions
 * Set via MAX_OUTPUT_BYTES (default: 2048 bytes / 2 KB)
 */
export const MAX_OUTPUT_BYTES = process.env.MAX_OUTPUT_BYTES
	? parseInt(process.env.MAX_OUTPUT_BYTES, 10)
	: 2048;
