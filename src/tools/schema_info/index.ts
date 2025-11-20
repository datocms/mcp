import type { ApiTypes } from "@datocms/cma-client";
import { Client, SchemaRepository } from "@datocms/cma-client-node";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { encode } from "@toon-format/toon";
import z from "zod";
import { fuzzyScore } from "../../lib/fuzzyScore.js";
import { pre, render } from "../../lib/markdown.js";
import { simplifiedRegisterTool } from "../../lib/simplifiedRegisterTool.js";

type SchemaInfoResult = {
	itemType: Partial<ApiTypes.ItemType>;
	fields: Partial<ApiTypes.Field>[];
	fieldsets?: Omit<ApiTypes.Fieldset, "item_type">[];
};

type FieldDetailsOption = "validators" | "appearance" | "default_values";

export function register(server: McpServer, apiToken: string) {
	simplifiedRegisterTool(
		server,
		"schema_info",
		{
			title: "Get schema information",
			description:
				"Retrieves detailed information about DatoCMS models and modular blocks, including fields, fieldsets, nested blocks, and relationships. Returns JSON data in a flat structure.",
			inputSchema: {
				filter_by_name: z
					.string()
					.optional()
					.describe(
						'Model/block identifier: API key (e.g., "blog_post"), ID, or display name. If not passed, list all available models/blocks.',
					),
				filter_by_type: z
					.enum(["all", "models_only", "blocks_only"])
					.optional()
					.default("all")
					.describe(
						'Filter by type: "all" (default), "models_only" (exclude modular blocks), "blocks_only" (only modular blocks).',
					),
				fields_details: z
					.union([
						z.literal("basic"),
						z.literal("complete"),
						z.array(z.enum(["validators", "appearance", "default_values"])),
					])
					.default("basic")
					.describe(
						'Include field details. Use "basic" (default) to exclude validators, appearance, and default values; "complete" to include everything (⚠️ VERY VERBOSE!); or specify which to include (e.g., ["validators", "appearance"]). Applies recursively to nested blocks, referenced models, and embedding models. Avoid "complete" unless absolutely necessary—it can produce extremely large output.',
					),
				include_fieldsets: z
					.boolean()
					.optional()
					.describe("Include UI fieldset organization."),
				include_nested_blocks: z
					.boolean()
					.optional()
					.describe(
						"Include detailed information about nested blocks (fully recursive). Nested blocks follow the same fields_details directives.",
					),
				include_referenced_models: z
					.boolean()
					.optional()
					.describe(
						"Include detailed information about models referenced by link, links, or structured_text fields of the models already present. Referenced models follow the same fields_details directives.",
					),
				include_embedding_models: z
					.boolean()
					.optional()
					.describe(
						"For modular blocks only. Include all models that directly or indirectly embed the given block models. This method recursively traverses the schema to find all models that reference the provided blocks, either directly through block fields or indirectly through other block models that reference them. Embedding models follow the same fields_details directives.",
					),
			},
		},
		async (args) => {
			const client = new Client({ apiToken });
			const repo = new SchemaRepository(client);

			// Pre-fetch everything for efficiency
			await repo.prefetchAllModelsAndFields();

			// Get initial item types based on filters
			const itemTypes = await getFilteredItemTypes(repo, args);

			// Process results
			const results: SchemaInfoResult[] = [];
			const processedIds = new Set<string>();

			// Process initial item types
			for (const itemType of itemTypes) {
				await processItemType(repo, itemType, args, results, processedIds);
			}

			// Include nested blocks if requested
			if (args.include_nested_blocks && itemTypes.length > 0) {
				const nestedBlocks = await repo.getNestedBlocks(itemTypes);
				for (const block of nestedBlocks) {
					if (!processedIds.has(block.id)) {
						await processItemType(repo, block, args, results, processedIds);
					}
				}
			}

			// Include referenced models if requested
			if (args.include_referenced_models && itemTypes.length > 0) {
				const allItemTypes = [...itemTypes];
				if (args.include_nested_blocks) {
					const nestedBlocks = await repo.getNestedBlocks(itemTypes);
					allItemTypes.push(...nestedBlocks);
				}

				const referencedModels = await repo.getNestedModels(allItemTypes);
				for (const model of referencedModels) {
					if (!processedIds.has(model.id)) {
						await processItemType(repo, model, args, results, processedIds);
					}
				}
			}

			// Include embedding models if requested (for blocks only)
			if (args.include_embedding_models && itemTypes.length > 0) {
				const blocks = itemTypes.filter((it) => it.modular_block);
				if (blocks.length > 0) {
					const embeddingModels = await repo.getModelsEmbeddingBlocks(blocks);
					for (const model of embeddingModels) {
						if (!processedIds.has(model.id)) {
							await processItemType(repo, model, args, results, processedIds);
						}
					}
				}
			}

			// Return JSON in a code block
			return render(pre({ language: "toon" }, encode(results)));
		},
	);
}

async function getFilteredItemTypes(
	repo: SchemaRepository,
	args: {
		filter_by_name?: string;
		filter_by_type?: "all" | "models_only" | "blocks_only";
	},
): Promise<ApiTypes.ItemType[]> {
	// Get candidate items based on type filter
	let candidates: ApiTypes.ItemType[];
	if (args.filter_by_type === "models_only") {
		candidates = await repo.getAllModels();
	} else if (args.filter_by_type === "blocks_only") {
		candidates = await repo.getAllBlockModels();
	} else {
		candidates = await repo.getAllItemTypes();
	}

	// If no name filter, return all candidates
	if (!args.filter_by_name) {
		return candidates;
	}

	const searchTerm = args.filter_by_name;

	// Try exact matches first (API key, ID, or display name)
	const exactMatches = candidates.filter((it) => {
		return (
			it.api_key === searchTerm ||
			it.id === searchTerm ||
			it.name === searchTerm
		);
	});

	if (exactMatches.length > 0) {
		return exactMatches;
	}

	// No exact matches, try fuzzy search
	const fuzzyMatches = candidates
		.map((it) => ({
			item: it,
			score: Math.max(
				fuzzyScore(searchTerm, it.api_key),
				fuzzyScore(searchTerm, it.name),
			),
		}))
		.filter((result) => result.score > 0)
		.sort((a, b) => b.score - a.score)
		.map((result) => result.item);

	return fuzzyMatches;
}

async function processItemType(
	repo: SchemaRepository,
	itemType: ApiTypes.ItemType,
	args: {
		fields_details:
			| "basic"
			| "complete"
			| Array<"validators" | "appearance" | "default_values">;
		include_fieldsets?: boolean;
	},
	results: SchemaInfoResult[],
	processedIds: Set<string>,
): Promise<void> {
	if (processedIds.has(itemType.id)) {
		return;
	}

	processedIds.add(itemType.id);

	let fields = await repo.getItemTypeFields(itemType);

	// Apply field details filtering
	if (args.fields_details === "basic") {
		// Basic: remove all detailed properties
		fields = filterFieldDetails(fields, []);
	} else if (args.fields_details !== "complete") {
		// Array: apply selective filtering
		fields = filterFieldDetails(fields, args.fields_details);
	}
	// If "complete", keep all fields as-is

	// Strip item_type from fields and optionally position/fieldset
	const strippedFields = fields.map<Partial<ApiTypes.Field>>((field) => {
		const filtered: Partial<ApiTypes.Field> = { ...field };

		delete filtered.item_type;
		delete filtered.deep_filtering_enabled;

		if (args.include_fieldsets) {
			return filtered;
		}

		delete filtered.position;
		delete filtered.fieldset;

		return filtered;
	});

	// Strip fields and fieldsets from itemType
	const {
		fields: _fields,
		fieldsets: _fieldsets,
		...strippedItemType
	} = itemType;

	const result: SchemaInfoResult = {
		itemType: strippedItemType,
		fields: strippedFields,
	};

	// Include fieldsets if requested
	if (args.include_fieldsets) {
		const fieldsets = await repo.getItemTypeFieldsets(itemType);
		result.fieldsets = fieldsets.map(({ item_type, ...rest }) => rest);
	}

	results.push(result);
}

function filterFieldDetails(
	fields: ApiTypes.Field[],
	detailsToInclude: FieldDetailsOption[],
): ApiTypes.Field[] {
	return fields.map((field) => {
		const filtered: Partial<ApiTypes.Field> = { ...field };

		// Remove validators unless requested
		if (!detailsToInclude.includes("validators")) {
			delete filtered.validators;
		}

		// Remove appearance unless requested
		if (!detailsToInclude.includes("appearance")) {
			delete filtered.appearance;
		}

		// Remove default values unless requested
		if (!detailsToInclude.includes("default_values")) {
			delete filtered.default_value;
		}

		return filtered as ApiTypes.Field;
	});
}
