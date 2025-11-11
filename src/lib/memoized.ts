/**
 * Creates a memoized version of a function that caches its result forever.
 * The function is called once, and subsequent calls return the cached result.
 *
 * @param fn - Function to memoize (can be sync or async)
 * @returns Memoized version of the function that returns the cached result
 *
 * @example
 * ```typescript
 * const fetchData = memoized(async () => {
 *   return await fetch('https://api.example.com/data');
 * });
 *
 * // First call executes the function
 * await fetchData();
 * // All subsequent calls return cached result
 * await fetchData();
 * ```
 */

export function memoized<T>(fn: () => Promise<T>): () => Promise<T>;
export function memoized<T>(fn: () => T): () => T;
export function memoized<T>(fn: (() => Promise<T>) | (() => T)) {
	let cached = false;
	let value: T;
	let pending: Promise<T> | null = null;
	let isAsync: boolean | null = null;

	return (() => {
		// Return cached value if available
		if (cached) {
			if (isAsync) {
				return Promise.resolve(value);
			} else {
				return value;
			}
		}

		// If an async call is already in-flight, return that promise
		if (pending) {
			return pending;
		}

		const result = (fn as any)();

		// Detect if result is a promise
		if (result && typeof (result as any).then === "function") {
			isAsync = true;
			pending = (result as Promise<T>).then((v) => {
				value = v;
				cached = true;
				pending = null;
				return v;
			});
			return pending;
		} else {
			// Synchronous result
			isAsync = false;
			value = result as T;
			cached = true;
			return result as T;
		}
	}) as any;
}
