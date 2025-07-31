interface CacheEntry<T> {
	value: T;
	timestamp: number;
}

export function cacheFor<T>(
	durationMs: number,
	fn: () => Promise<T>,
): () => Promise<T> {
	let cache: CacheEntry<T> | null = null;

	return async (): Promise<T> => {
		const now = Date.now();

		// Check if we have a valid cached entry
		if (cache && now - cache.timestamp < durationMs) {
			return cache.value;
		}

		// Cache is either empty or expired, execute the function
		const result = await fn();

		// Store the result with current timestamp
		cache = {
			value: result,
			timestamp: now,
		};

		return result;
	};
}
