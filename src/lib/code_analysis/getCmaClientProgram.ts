import { fileURLToPath } from "node:url";
import * as ts from "typescript";
import { memoized } from "../memoized.js";

/**
 * Gets a cached TypeScript program with type checker and Client class.
 * The program is cached permanently to avoid expensive recompilation.
 *
 * This is the recommended way to access the CMA client program in production code.
 * Use `createCmaClientProgram()` directly only in tests where you need a fresh instance.
 *
 * @returns Promise resolving to program, type checker, and Client class declaration
 * @throws Error if the Client class cannot be found in the program
 */
export const getCmaClientProgram = memoized(() => {
	const { program, checker } = createCmaClientProgram();
	const clientClass = findClientClass(program);

	if (!clientClass) {
		throw new Error(`Could not find Client class — CWD: ${process.cwd()}`);
	}

	return { program, checker, clientClass };
});

/**
 * Creates a TypeScript program that includes all type definitions from @datocms/cma-client-node
 * This allows the TypeChecker to resolve types across all files, including cross-file imports
 */
function createCmaClientProgram(): {
	program: ts.Program;
	checker: ts.TypeChecker;
} {
	// Entry point for the Node.js client - TypeScript will automatically resolve all imports
	const entryPoint = fileURLToPath(
		import.meta.resolve("@datocms/cma-client-node/dist/types/index.d.ts"),
	);

	// Compiler options for type checking
	const compilerOptions: ts.CompilerOptions = {
		target: ts.ScriptTarget.Latest,
		module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.Node10,
		strict: false,
		esModuleInterop: true,
		skipLibCheck: true,
		noEmit: true,
		// Allow TypeScript to resolve node_modules packages
		baseUrl: ".",
		paths: {},
	};

	// Create the program - TypeScript will:
	// 1. Load the entry point
	// 2. Follow all import statements
	// 3. Resolve node_modules packages
	// 4. Build a complete symbol table across all files
	const program = ts.createProgram([entryPoint], compilerOptions);

	// Get the type checker - this can resolve types across ALL files in the program
	const checker = program.getTypeChecker();

	return { program, checker };
}

/**
 * Finds the Client class from @datocms/cma-client-node
 */

function findClientClass(program: ts.Program): ts.ClassDeclaration | undefined {
	// Get the entry point source file
	const sourceFiles = program.getSourceFiles();

	// Look for the Client class in cma-client-node
	for (const sourceFile of sourceFiles) {
		if (sourceFile.fileName.includes("cma-client-node/dist/types/Client.d")) {
			// Find the Client class declaration
			const visit = (node: ts.Node): ts.ClassDeclaration | undefined => {
				if (ts.isClassDeclaration(node) && node.name?.text === "Client") {
					return node;
				}
				return ts.forEachChild(node, visit);
			};

			const clientClass = visit(sourceFile);
			if (clientClass) return clientClass;
		}
	}

	return undefined;
}
