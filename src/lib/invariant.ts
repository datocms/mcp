/**
 * Runtime assertion utility that throws an error if the condition is falsy.
 * Uses TypeScript's assertion signature to narrow types after the check.
 *
 * @param condition - Condition to check
 * @param message - Error message (string or function that returns a string)
 * @throws Error if condition is falsy
 *
 * @example
 * ```typescript
 * const user: User | undefined = getUser();
 * invariant(user, 'User must be defined');
 * // TypeScript now knows user is defined (User, not undefined)
 * console.log(user.name);
 * ```
 */
export function invariant(
	condition: unknown,
	message?: string | (() => string),
): asserts condition {
	if (condition) {
		return;
	}
	const provided: string | undefined =
		typeof message === "function" ? message() : message;
	throw new Error(provided);
}
