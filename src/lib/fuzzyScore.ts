import { distance } from "fastest-levenshtein";

// Fuzzy scoring with Levenshtein distance: higher score = better match
export function fuzzyScore(search: string, target: string): number {
	const searchLower = search.toLowerCase();
	const targetLower = target.toLowerCase();

	// Exact match
	if (targetLower === searchLower) {
		return 1000;
	}

	// Bidirectional substring match (but not empty strings)
	if (searchLower && targetLower.includes(searchLower)) {
		return 500 + (100 - targetLower.indexOf(searchLower)); // Bonus for earlier position
	}
	if (targetLower && searchLower.includes(targetLower)) {
		return 500 + (100 - searchLower.indexOf(targetLower)); // Bonus for earlier position
	}

	// Levenshtein distance for partial matching
	// Skip if either string is empty (already handled above or should return 0)
	if (searchLower.length > 0 && targetLower.length > 0) {
		const editDistance = distance(searchLower, targetLower);
		const maxLength = Math.max(searchLower.length, targetLower.length);

		// If edit distance is reasonable (less than 70% of max length), score it
		if (editDistance < maxLength * 0.5) {
			// Score inversely proportional to edit distance
			// Closer strings get higher scores (300-450 range)
			const normalizedDistance = editDistance / maxLength;
			const levenshteinScore = Math.round(450 - normalizedDistance * 150);
			if (levenshteinScore > 0) {
				return levenshteinScore;
			}
		}
	}

	// Fuzzy match: all characters of search appear in order in target
	let searchIdx = 0;
	let lastMatchIdx = -1;
	let consecutiveMatches = 0;
	let totalMatches = 0;

	for (
		let i = 0;
		i < targetLower.length && searchIdx < searchLower.length;
		i++
	) {
		if (targetLower[i] === searchLower[searchIdx]) {
			totalMatches++;
			if (i === lastMatchIdx + 1) {
				consecutiveMatches++;
			} else {
				consecutiveMatches = 1;
			}
			lastMatchIdx = i;
			searchIdx++;
		}
	}

	// All characters matched in order
	if (searchIdx === searchLower.length) {
		return totalMatches * 10 + consecutiveMatches * 5;
	}

	// Not all characters matched
	return 0;
}
