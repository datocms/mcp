import { describe, expect, it } from "vitest";
import { memoized } from "../src/lib/memoized.js";

describe("memoized", () => {
	describe("successful memoization", () => {
		it("should cache successful sync results", () => {
			let callCount = 0;
			const fn = memoized(() => {
				callCount++;
				return "result";
			});

			const result1 = fn();
			const result2 = fn();
			const result3 = fn();

			expect(result1).toBe("result");
			expect(result2).toBe("result");
			expect(result3).toBe("result");
			expect(callCount).toBe(1); // Function called only once
		});

		it("should cache successful async results", async () => {
			let callCount = 0;
			const fn = memoized(async () => {
				callCount++;
				await new Promise((resolve) => setTimeout(resolve, 10));
				return "async-result";
			});

			const result1 = await fn();
			const result2 = await fn();
			const result3 = await fn();

			expect(result1).toBe("async-result");
			expect(result2).toBe("async-result");
			expect(result3).toBe("async-result");
			expect(callCount).toBe(1); // Function called only once
		});

		it("should return the same promise while async call is in-flight", async () => {
			let callCount = 0;
			const fn = memoized(async () => {
				callCount++;
				await new Promise((resolve) => setTimeout(resolve, 100));
				return "result";
			});

			// Start multiple calls simultaneously
			const promise1 = fn();
			const promise2 = fn();
			const promise3 = fn();

			// All should be the same promise
			expect(promise1).toBe(promise2);
			expect(promise2).toBe(promise3);

			const results = await Promise.all([promise1, promise2, promise3]);
			expect(results).toEqual(["result", "result", "result"]);
			expect(callCount).toBe(1); // Function called only once
		});
	});

	describe("promise rejection handling", () => {
		it("should clear pending on promise rejection", async () => {
			let callCount = 0;
			const fn = memoized(async () => {
				callCount++;
				if (callCount === 1) {
					throw new Error("First call fails");
				}
				return "success";
			});

			// First call should fail
			await expect(fn()).rejects.toThrow("First call fails");
			expect(callCount).toBe(1);

			// Second call should retry and succeed
			const result = await fn();
			expect(result).toBe("success");
			expect(callCount).toBe(2);
		});

		it("should not cache failed values", async () => {
			let callCount = 0;
			const fn = memoized(async () => {
				callCount++;
				throw new Error(`Failure ${callCount}`);
			});

			// Multiple failed calls should each throw
			await expect(fn()).rejects.toThrow("Failure 1");
			await expect(fn()).rejects.toThrow("Failure 2");
			await expect(fn()).rejects.toThrow("Failure 3");

			expect(callCount).toBe(3); // Each call retries
		});

		it("should allow retry after rejection", async () => {
			let shouldFail = true;
			let callCount = 0;

			const fn = memoized(async () => {
				callCount++;
				if (shouldFail) {
					throw new Error("Temporary failure");
				}
				return "recovered";
			});

			// First call fails
			await expect(fn()).rejects.toThrow("Temporary failure");
			expect(callCount).toBe(1);

			// Fix the condition
			shouldFail = false;

			// Retry should succeed
			const result = await fn();
			expect(result).toBe("recovered");
			expect(callCount).toBe(2);

			// Subsequent calls should use cached success
			const result2 = await fn();
			expect(result2).toBe("recovered");
			expect(callCount).toBe(2); // No additional calls
		});

		it("should propagate the original error", async () => {
			const customError = new Error("Custom error message");
			const fn = memoized(async () => {
				throw customError;
			});

			try {
				await fn();
				expect.fail("Should have thrown");
			} catch (err) {
				expect(err).toBe(customError);
				expect((err as Error).message).toBe("Custom error message");
			}
		});
	});

	describe("mixed scenarios", () => {
		it("should handle success after multiple failures", async () => {
			let attempts = 0;
			const fn = memoized(async () => {
				attempts++;
				if (attempts < 3) {
					throw new Error(`Attempt ${attempts} failed`);
				}
				return "finally succeeded";
			});

			await expect(fn()).rejects.toThrow("Attempt 1 failed");
			await expect(fn()).rejects.toThrow("Attempt 2 failed");

			const result = await fn();
			expect(result).toBe("finally succeeded");
			expect(attempts).toBe(3);

			// Verify success is cached
			const result2 = await fn();
			expect(result2).toBe("finally succeeded");
			expect(attempts).toBe(3); // No additional attempts
		});

		it("should not interfere with sync function behavior", () => {
			let callCount = 0;
			const syncFn = memoized(() => {
				callCount++;
				return callCount;
			});

			expect(syncFn()).toBe(1);
			expect(syncFn()).toBe(1); // Cached
			expect(syncFn()).toBe(1); // Cached
			expect(callCount).toBe(1);
		});
	});
});
