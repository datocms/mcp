import assert from "node:assert";
import { describe, expect, it } from "vitest";
import { extractAllMethodNames } from "../src/lib/code_analysis/extractAllMethodNames.js";
import { extractMethodSignature } from "../src/lib/code_analysis/extractMethodSignature.js";
import { extractTypeDependencies } from "../src/lib/code_analysis/extractTypeDependencies.js";
import { getCmaClientProgram } from "../src/lib/code_analysis/getCmaClientProgram.js";

describe("TypeScript Compiler API - Unit Tests", () => {
	describe("extractAllMethodNames", () => {
		it("should extract all method names from items resource", () => {
			const { checker, clientClass } = getCmaClientProgram();

			const methodNames = extractAllMethodNames(checker, clientClass, "items");

			expect(methodNames).toBeDefined();
			expect(methodNames.length).toBeGreaterThan(0);
			// Should include common methods
			expect(methodNames).toContain("list");
			expect(methodNames).toContain("find");
			expect(methodNames).toContain("create");
			expect(methodNames).toContain("rawList");
			expect(methodNames).toContain("rawFind");
			expect(methodNames).toContain("rawCreate");
		}, 10000);

		it("should extract all method names from uploads resource including special methods", () => {
			const { checker, clientClass } = getCmaClientProgram();

			const methodNames = extractAllMethodNames(
				checker,
				clientClass,
				"uploads",
			);

			expect(methodNames).toBeDefined();
			expect(methodNames.length).toBeGreaterThan(0);
			// Should include special upload methods
			expect(methodNames).toContain("create");
			expect(methodNames).toContain("createFromLocalFile");
			expect(methodNames).toContain("createFromUrl");
			expect(methodNames).toContain("update");
			expect(methodNames).toContain("updateFromLocalFile");
			expect(methodNames).toContain("updateFromUrl");
		}, 10000);

		it("should return empty array for invalid resource", () => {
			const { checker, clientClass } = getCmaClientProgram();

			const methodNames = extractAllMethodNames(
				checker,
				clientClass,
				"invalid_resource_xyz",
			);

			expect(methodNames).toEqual([]);
		}, 10000);
	});

	describe("extractMethodSignature", () => {
		it("should extract signature for items.list", () => {
			const { checker, clientClass } = getCmaClientProgram();

			const signature = extractMethodSignature(
				checker,
				clientClass,
				"items",
				"list",
			);

			expect(signature).toBeDefined();
			assert(signature);

			expect(signature.methodName).toBe("list");
			expect(signature.parameters).toBeDefined();
			expect(signature.returnType).toBeDefined();
			expect(signature.returnType).toContain("Promise");
			expect(signature.referencedTypeSymbols).toBeDefined();
			expect(signature.referencedTypeSymbols.size).toBeGreaterThan(0);
		}, 10000);

		it("should extract signature for items.find with parameters", () => {
			const { checker, clientClass } = getCmaClientProgram();

			const signature = extractMethodSignature(
				checker,
				clientClass,
				"items",
				"find",
			);

			expect(signature).toBeDefined();
			assert(signature);
			expect(signature.methodName).toBe("find");
			expect(signature.parameters.length).toBeGreaterThan(0);

			// Should have itemId parameter
			const hasItemIdParam = signature.parameters.some(
				(p) => p.name === "itemId" || p.name.includes("id"),
			);
			expect(hasItemIdParam).toBe(true);
		}, 10000);

		it("should extract signature for items.create with body parameter", () => {
			const { checker, clientClass } = getCmaClientProgram();

			const signature = extractMethodSignature(
				checker,
				clientClass,
				"items",
				"create",
			);

			expect(signature).toBeDefined();
			assert(signature);
			expect(signature.methodName).toBe("create");
			expect(signature.parameters.length).toBeGreaterThan(0);
		}, 10000);

		it("should extract signature for items.rawList", () => {
			const { checker, clientClass } = getCmaClientProgram();

			const signature = extractMethodSignature(
				checker,
				clientClass,
				"items",
				"rawList",
			);

			expect(signature).toBeDefined();
			assert(signature);
			expect(signature.methodName).toBe("rawList");
			expect(signature.returnType).toContain("Promise");
		}, 10000);

		it("should extract signature for items.listPagedIterator", () => {
			const { checker, clientClass } = getCmaClientProgram();

			const signature = extractMethodSignature(
				checker,
				clientClass,
				"items",
				"listPagedIterator",
			);

			expect(signature).toBeDefined();
			assert(signature);
			expect(signature.methodName).toBe("listPagedIterator");
		}, 10000);

		it("should extract signature for Node-specific uploads.createFromLocalFile", () => {
			const { checker, clientClass } = getCmaClientProgram();

			const signature = extractMethodSignature(
				checker,
				clientClass,
				"uploads",
				"createFromLocalFile",
			);

			expect(signature).toBeDefined();
			assert(signature);
			expect(signature.methodName).toBe("createFromLocalFile");
			expect(signature.parameters.length).toBeGreaterThan(0);

			// Verify it's a Node-specific method by checking it exists
			// The actual parameter structure may vary
			expect(signature.returnType).toBeDefined();
		}, 10000);

		it("should return null for invalid resource", () => {
			const { checker, clientClass } = getCmaClientProgram();

			const signature = extractMethodSignature(
				checker,
				clientClass,
				"invalid_resource_xyz",
				"list",
			);

			expect(signature).toBeFalsy();
		}, 10000);

		it("should return null for invalid method", () => {
			const { checker, clientClass } = getCmaClientProgram();

			const signature = extractMethodSignature(
				checker,
				clientClass,
				"items",
				"invalid_method_xyz",
			);

			expect(signature).toBeFalsy();
		}, 10000);
	});

	describe("extractTypeDependencies", () => {
		it("should handle empty type list", () => {
			const { program, checker } = getCmaClientProgram();
			const result = extractTypeDependencies(checker, program, []);
			expect(result.expandedTypes).toBe("");
			expect(result.notExpandedTypes).toEqual([]);
		}, 10000);

		it("itemTypes.list with maxDepth 0 (no types)", () => {
			const { program, checker, clientClass } = getCmaClientProgram();
			const signature = extractMethodSignature(
				checker,
				clientClass,
				"itemTypes",
				"list",
			);
			assert(signature);
			const result = extractTypeDependencies(
				checker,
				program,
				Array.from(signature.referencedTypeSymbols.keys()),
				signature.referencedTypeSymbols,
				{ maxDepth: 0 },
			);
			expect(result).toMatchSnapshot();
		}, 10000);

		it("itemTypes.list with maxDepth 1", () => {
			const { program, checker, clientClass } = getCmaClientProgram();
			const signature = extractMethodSignature(
				checker,
				clientClass,
				"itemTypes",
				"list",
			);
			assert(signature);
			const result = extractTypeDependencies(
				checker,
				program,
				Array.from(signature.referencedTypeSymbols.keys()),
				signature.referencedTypeSymbols,
				{ maxDepth: 1 },
			);
			expect(result).toMatchSnapshot();
		}, 10000);

		it("itemTypes.list with maxDepth 2 (default)", () => {
			const { program, checker, clientClass } = getCmaClientProgram();
			const signature = extractMethodSignature(
				checker,
				clientClass,
				"itemTypes",
				"list",
			);
			assert(signature);
			const result = extractTypeDependencies(
				checker,
				program,
				Array.from(signature.referencedTypeSymbols.keys()),
				signature.referencedTypeSymbols,
			);
			expect(result).toMatchSnapshot();
		}, 10000);

		it("itemTypes.list with expandTypes: [*]", () => {
			const { program, checker, clientClass } = getCmaClientProgram();
			const signature = extractMethodSignature(
				checker,
				clientClass,
				"itemTypes",
				"list",
			);
			assert(signature);
			const result = extractTypeDependencies(
				checker,
				program,
				Array.from(signature.referencedTypeSymbols.keys()),
				signature.referencedTypeSymbols,
				{ maxDepth: 2, expandTypes: ["*"] },
			);
			expect(result).toMatchSnapshot();
		}, 10000);

		it("itemTypes.rawList with maxDepth 2", () => {
			const { program, checker, clientClass } = getCmaClientProgram();
			const signature = extractMethodSignature(
				checker,
				clientClass,
				"itemTypes",
				"rawList",
			);
			assert(signature);
			const result = extractTypeDependencies(
				checker,
				program,
				Array.from(signature.referencedTypeSymbols.keys()),
				signature.referencedTypeSymbols,
			);
			expect(result).toMatchSnapshot();
		}, 10000);

		it("uploads.create with maxDepth 2", () => {
			const { program, checker, clientClass } = getCmaClientProgram();
			const signature = extractMethodSignature(
				checker,
				clientClass,
				"uploads",
				"create",
			);
			assert(signature);
			const result = extractTypeDependencies(
				checker,
				program,
				Array.from(signature.referencedTypeSymbols.keys()),
				signature.referencedTypeSymbols,
			);
			expect(result).toMatchSnapshot();
		}, 10000);

		it("items.list with maxDepth 2", () => {
			const { program, checker, clientClass } = getCmaClientProgram();
			const signature = extractMethodSignature(
				checker,
				clientClass,
				"items",
				"list",
			);
			assert(signature);
			const result = extractTypeDependencies(
				checker,
				program,
				Array.from(signature.referencedTypeSymbols.keys()),
				signature.referencedTypeSymbols,
			);
			expect(result).toMatchSnapshot();
		}, 10000);

		it("items.find with maxDepth 2", () => {
			const { program, checker, clientClass } = getCmaClientProgram();
			const signature = extractMethodSignature(
				checker,
				clientClass,
				"items",
				"find",
			);
			assert(signature);
			const result = extractTypeDependencies(
				checker,
				program,
				Array.from(signature.referencedTypeSymbols.keys()),
				signature.referencedTypeSymbols,
			);
			expect(result).toMatchSnapshot();
		}, 10000);
	});

	describe("Integration: Full extraction pipeline", () => {
		it("should extract complete method definition for items.create", () => {
			const { program, checker, clientClass } = getCmaClientProgram();

			// Extract method signature
			const signature = extractMethodSignature(
				checker,
				clientClass,
				"items",
				"create",
			);

			expect(signature).toBeDefined();
			assert(signature);
			if (!signature) return;

			// Extract type dependencies
			const { expandedTypes } = extractTypeDependencies(
				checker,
				program,
				Array.from(signature.referencedTypeSymbols.keys()),
				signature.referencedTypeSymbols,
			);

			// Verify we have a complete definition
			expect(signature.methodName).toBe("create");
			expect(signature.parameters.length).toBeGreaterThan(0);
			expect(signature.returnType).toBeDefined();
			expect(expandedTypes).toBeDefined();
			expect(expandedTypes.length).toBeGreaterThan(0);
		}, 10000);

		it("should handle complex types with generics", () => {
			const { program, checker, clientClass } = getCmaClientProgram();

			const signature = extractMethodSignature(
				checker,
				clientClass,
				"items",
				"rawList",
			);

			expect(signature).toBeDefined();
			assert(signature); // Raw methods typically return complex JSON:API structures
			expect(signature.returnType).toContain("Promise");

			const { expandedTypes } = extractTypeDependencies(
				checker,
				program,
				Array.from(signature.referencedTypeSymbols.keys()),
				signature.referencedTypeSymbols,
			);

			expect(expandedTypes).toBeDefined();
		}, 10000);
	});

	describe("ApiTypes vs RawApiTypes disambiguation", () => {
		it("should correctly identify itemTypes.list uses ApiTypes version", () => {
			const { checker, clientClass } = getCmaClientProgram();

			const signature = extractMethodSignature(
				checker,
				clientClass,
				"itemTypes",
				"list",
			);

			expect(signature).toBeDefined();
			assert(signature);

			// Check that we have the referencedTypeSymbols
			expect(signature.referencedTypeSymbols).toBeDefined();
			expect(signature.referencedTypeSymbols.size).toBeGreaterThan(0);

			// ItemTypeInstancesTargetSchema should be in referenced types
			expect(
				signature.referencedTypeSymbols.has("ItemTypeInstancesTargetSchema"),
			).toBe(true);

			// Get the symbol and verify it points to ApiTypes
			const symbol = signature.referencedTypeSymbols.get(
				"ItemTypeInstancesTargetSchema",
			);
			expect(symbol).toBeDefined();
			assert(symbol);

			const declarations = symbol.getDeclarations();
			expect(declarations).toBeDefined();
			assert(declarations && declarations.length > 0);

			const sourceFile = declarations[0]?.getSourceFile().fileName;
			expect(sourceFile).toContain("ApiTypes.d.ts");
			expect(sourceFile).not.toContain("RawApiTypes.d.ts");
		}, 10000);

		it("should correctly identify itemTypes.rawList uses RawApiTypes version", () => {
			const { checker, clientClass } = getCmaClientProgram();

			const signature = extractMethodSignature(
				checker,
				clientClass,
				"itemTypes",
				"rawList",
			);

			expect(signature).toBeDefined();
			assert(signature);

			// Check that we have the referencedTypeSymbols
			expect(signature.referencedTypeSymbols).toBeDefined();
			expect(signature.referencedTypeSymbols.size).toBeGreaterThan(0);

			// ItemTypeInstancesTargetSchema should be in referenced types
			expect(
				signature.referencedTypeSymbols.has("ItemTypeInstancesTargetSchema"),
			).toBe(true);

			// Get the symbol and verify it points to RawApiTypes
			const symbol = signature.referencedTypeSymbols.get(
				"ItemTypeInstancesTargetSchema",
			);
			expect(symbol).toBeDefined();
			assert(symbol);

			const declarations = symbol.getDeclarations();
			expect(declarations).toBeDefined();
			assert(declarations && declarations.length > 0);

			const sourceFile = declarations[0]?.getSourceFile().fileName;
			// Check it's RawApiTypes, not ApiTypes (note: RawApiTypes contains the substring "ApiTypes")
			expect(sourceFile).toContain("RawApiTypes.d.ts");
			expect(sourceFile).toMatch(/\/RawApiTypes\.d\.ts$/);
		}, 10000);

		it("should extract different type definitions for list vs rawList", () => {
			const { program, checker, clientClass } = getCmaClientProgram();

			const listSignature = extractMethodSignature(
				checker,
				clientClass,
				"itemTypes",
				"list",
			);
			assert(listSignature);
			const listResult = extractTypeDependencies(
				checker,
				program,
				Array.from(listSignature.referencedTypeSymbols.keys()),
				listSignature.referencedTypeSymbols,
			);

			const rawListSignature = extractMethodSignature(
				checker,
				clientClass,
				"itemTypes",
				"rawList",
			);
			assert(rawListSignature);
			const rawListResult = extractTypeDependencies(
				checker,
				program,
				Array.from(rawListSignature.referencedTypeSymbols.keys()),
				rawListSignature.referencedTypeSymbols,
			);

			expect({ listResult, rawListResult }).toMatchSnapshot();
		}, 10000);

		it("should preserve symbol information through extraction pipeline", () => {
			const { checker, clientClass } = getCmaClientProgram();

			// Extract both methods
			const listSignature = extractMethodSignature(
				checker,
				clientClass,
				"itemTypes",
				"list",
			);
			const rawListSignature = extractMethodSignature(
				checker,
				clientClass,
				"itemTypes",
				"rawList",
			);

			expect(listSignature).toBeDefined();
			expect(rawListSignature).toBeDefined();
			assert(listSignature);
			assert(rawListSignature);

			// Both should have ItemTypeInstancesTargetSchema in referenced types
			expect(
				listSignature.referencedTypeSymbols.has(
					"ItemTypeInstancesTargetSchema",
				),
			).toBe(true);
			expect(
				rawListSignature.referencedTypeSymbols.has(
					"ItemTypeInstancesTargetSchema",
				),
			).toBe(true);

			// But the symbols should be different (pointing to different files)
			const listSymbol = listSignature.referencedTypeSymbols.get(
				"ItemTypeInstancesTargetSchema",
			);
			const rawListSymbol = rawListSignature.referencedTypeSymbols.get(
				"ItemTypeInstancesTargetSchema",
			);

			expect(listSymbol).toBeDefined();
			expect(rawListSymbol).toBeDefined();
			assert(listSymbol);
			assert(rawListSymbol);

			// The symbols themselves should be different objects
			expect(listSymbol).not.toBe(rawListSymbol);

			// And they should point to different source files
			const listDecls = listSymbol.getDeclarations();
			const rawListDecls = rawListSymbol.getDeclarations();

			expect(listDecls).toBeDefined();
			expect(rawListDecls).toBeDefined();
			assert(listDecls && listDecls.length > 0);
			assert(rawListDecls && rawListDecls.length > 0);

			const listFile = listDecls[0]?.getSourceFile().fileName;
			const rawListFile = rawListDecls[0]?.getSourceFile().fileName;

			expect(listFile).not.toBe(rawListFile);
			expect(listFile).toContain("ApiTypes.d.ts");
			expect(rawListFile).toContain("RawApiTypes.d.ts");
		}, 10000);
	});
});
