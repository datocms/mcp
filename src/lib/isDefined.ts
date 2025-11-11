/**
 * Type guard that filters out null, undefined, and false values.
 * Useful for array filtering operations with proper type narrowing.
 *
 * @param value - Value to check
 * @returns true if the value is defined (not null, undefined, or false)
 *
 * @example
 * ```typescript
 * const values = [1, null, 2, undefined, 3, false];
 * const defined = values.filter(isDefined);
 * // defined is [1, 2, 3] with type number[]
 * ```
 */
export function isDefined<T>(
	value: T | null | undefined | false,
): value is NonNullable<Exclude<T, false>> {
	return value !== null && value !== undefined && value !== false;
}
