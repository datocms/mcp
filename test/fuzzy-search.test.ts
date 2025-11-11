import { describe, expect, it } from "vitest";
import { fuzzyScore } from "../src/lib/fuzzyScore.js";

describe("fuzzyScore", () => {
	describe("exact matches", () => {
		it("returns highest score for exact case-insensitive match", () => {
			expect(fuzzyScore("blog", "blog")).toBe(1000);
			expect(fuzzyScore("blog", "BLOG")).toBe(1000);
			expect(fuzzyScore("BLOG", "blog")).toBe(1000);
			expect(fuzzyScore("BlogPost", "blogpost")).toBe(1000);
		});
	});

	describe("substring matches", () => {
		it("returns high score for substring matches", () => {
			const score = fuzzyScore("blog", "blog_post");
			expect(score).toBeGreaterThan(500);
			expect(score).toBeLessThan(1000);
		});

		it("gives higher score for matches at the beginning", () => {
			const startScore = fuzzyScore("blog", "blog_post");
			const endScore = fuzzyScore("post", "blog_post");
			expect(startScore).toBeGreaterThan(endScore);
		});

		it("finds partial matches in the middle", () => {
			const score = fuzzyScore("log", "blog_post");
			expect(score).toBeGreaterThan(500);
			expect(score).toBeLessThan(1000);
		});

		it("is case-insensitive for substring matches", () => {
			expect(fuzzyScore("BLOG", "blog_post")).toBe(
				fuzzyScore("blog", "blog_post"),
			);
			expect(fuzzyScore("Post", "blog_post")).toBe(
				fuzzyScore("post", "blog_post"),
			);
		});

		it("works bidirectionally - target is substring of search", () => {
			// Searching "blog_post" should find "post"
			const score = fuzzyScore("blog_post", "post");
			expect(score).toBeGreaterThan(500);
			expect(score).toBeLessThan(1000);
		});
	});

	describe("fuzzy character sequence matches", () => {
		it("matches when all characters appear in order", () => {
			const score = fuzzyScore("blgpst", "blog_post");
			expect(score).toBeGreaterThan(0);
			expect(score).toBeLessThan(500);
		});

		it("gives higher score for consecutive character matches", () => {
			const consecutiveScore = fuzzyScore("blogp", "blog_post");
			const scatteredScore = fuzzyScore("bgpt", "blog_post");
			expect(consecutiveScore).toBeGreaterThan(scatteredScore);
		});

		it("matches abbreviated names", () => {
			expect(fuzzyScore("artcl", "article")).toBeGreaterThan(0);
			expect(fuzzyScore("usr", "user")).toBeGreaterThan(0);
			expect(fuzzyScore("bp", "blog_post")).toBeGreaterThan(0);
		});

		it("works with underscores and special characters", () => {
			expect(fuzzyScore("b_p", "blog_post")).toBeGreaterThan(0);
			expect(fuzzyScore("bp", "blog-post")).toBeGreaterThan(0);
		});
	});

	describe("Levenshtein distance matches", () => {
		it("finds partial matches with small edit distance", () => {
			// "blog_post" vs "post" - edit distance 5
			const score = fuzzyScore("blog_post", "post");
			expect(score).toBeGreaterThan(300);
		});

		it("finds similar strings with typos", () => {
			// Small edit distances should match
			expect(fuzzyScore("blogpost", "blog_post")).toBeGreaterThan(300);
			expect(fuzzyScore("blog_pst", "blog_post")).toBeGreaterThan(300);
		});

		it("handles similar length strings", () => {
			// Similar lengths with reasonable edit distance
			expect(fuzzyScore("article", "articles")).toBeGreaterThan(300);
			expect(fuzzyScore("user", "users")).toBeGreaterThan(300);
		});

		it("rejects very dissimilar strings", () => {
			// Very high edit distance relative to length
			expect(fuzzyScore("xyz", "blog_post")).toBe(0);
			expect(fuzzyScore("completely", "different")).toBe(0);
		});
	});

	describe("no matches", () => {
		it("returns 0 when characters don't all appear in order", () => {
			expect(fuzzyScore("tsp", "blog_post")).toBe(0); // 'tsp' reversed doesn't match
		});

		it("returns 0 for completely unrelated strings", () => {
			expect(fuzzyScore("xyz", "abcdef")).toBe(0);
		});
	});

	describe("real-world scenarios", () => {
		it("ranks results correctly for typical searches", () => {
			const candidates = [
				"blog_post",
				"blog_article",
				"article",
				"post",
				"about_page",
			];

			// Search for "blog"
			const blogScores = candidates.map((c) => ({
				name: c,
				score: fuzzyScore("blog", c),
			}));
			blogScores.sort((a, b) => b.score - a.score);

			// Top results should contain "blog"
			expect(blogScores[0].name).toMatch(/blog/);
			// Items with "blog" should score higher than those without
			expect(blogScores[0].score).toBeGreaterThan(
				fuzzyScore("blog", "article"),
			);
		});

		it("finds models with abbreviated searches", () => {
			const candidates = [
				"blog_post",
				"user_profile",
				"product_category",
				"page_section",
			];

			// Search for "usr" should find "user_profile"
			const scores = candidates.map((c) => ({
				name: c,
				score: fuzzyScore("usr", c),
			}));
			scores.sort((a, b) => b.score - a.score);

			expect(scores[0].name).toBe("user_profile");
		});

		it("finds models with abbreviated searches", () => {
			const candidates = ["layout", "post"];

			const scores = candidates
				.map((c) => ({
					name: c,
					score: fuzzyScore("blog_post", c),
				}))
				.filter((s) => s.score > 0);

			expect(scores.length).toBe(1);
		});

		it("handles camelCase and snake_case searches", () => {
			// Searching with mixed case works
			expect(fuzzyScore("BlogPost", "blog_post")).toBeGreaterThan(0);
			expect(fuzzyScore("BLOG_POST", "blog_post")).toBeGreaterThan(0);

			// Abbreviated searches work across both styles
			expect(fuzzyScore("bp", "BlogPost")).toBeGreaterThan(0);
			expect(fuzzyScore("bp", "blog_post")).toBeGreaterThan(0);

			// Partial matches work
			expect(fuzzyScore("blog", "BlogPost")).toBeGreaterThan(500);
			expect(fuzzyScore("post", "blog_post")).toBeGreaterThan(500);
		});

		it("prefers exact substring over fuzzy matches", () => {
			const exactSubstring = fuzzyScore("post", "blog_post");
			const fuzzyMatch = fuzzyScore("pst", "blog_post");
			expect(exactSubstring).toBeGreaterThan(fuzzyMatch);
		});
	});

	describe("edge cases", () => {
		it("handles empty strings", () => {
			// Empty search returns 0 (no match)
			expect(fuzzyScore("", "blog_post")).toBe(0);
			// Non-empty search against empty target returns 0
			expect(fuzzyScore("blog", "")).toBe(0);
			// Empty against empty is exact match
			expect(fuzzyScore("", "")).toBe(1000);
		});

		it("handles single character searches", () => {
			expect(fuzzyScore("b", "blog_post")).toBeGreaterThan(500);
			expect(fuzzyScore("z", "blog_post")).toBe(0);
		});

		it("handles identical strings", () => {
			expect(fuzzyScore("a", "a")).toBe(1000);
			expect(fuzzyScore("test", "test")).toBe(1000);
		});

		it("handles very long strings", () => {
			const longString = "a".repeat(1000);
			expect(fuzzyScore("aaa", longString)).toBeGreaterThan(500);
		});
	});
});
