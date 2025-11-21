import fs from "node:fs/promises";
import path from "node:path";
import type { Client, RawApiTypes } from "@datocms/cma-client-node";
import type { Script } from "../scripts/storage.js";

export async function writeTempScriptAndSchema(
	scriptsDir: string,
	script: Script,
	client: Client,
): Promise<string> {
	await fs.mkdir(scriptsDir, { recursive: true });

	// Strip 'script://' prefix from the name to get the actual filename
	const filename = script.name.replace(/^script:\/\//, "");
	const scriptPath = path.join(scriptsDir, filename);

	await fs.writeFile(scriptPath, script.content, {
		encoding: "utf8",
		mode: 0o600,
	});

	await fs.writeFile(
		path.join(scriptsDir, "schema.ts"),
		await generateSchemaTypes(client),
		{
			encoding: "utf8",
			mode: 0o600,
		},
	);
	return scriptPath;
}

export async function deleteTempScriptPath(filePath: string): Promise<void> {
	try {
		await fs.unlink(filePath);
	} catch (_e) {
		/* ignore */
	}
}

import * as ts from "typescript";

export interface SchemaTypesGeneratorOptions {
	environment?: string;
}

/**
 * Generates complete TypeScript schema definitions with imports.
 * Used for generating standalone schema files.
 *
 * Example generated code:
 * ```typescript
 * import type { ItemTypeDefinition } from '@datocms/cma-client';
 *
 * type EnvironmentSettings = {
 *   locales: 'en' | 'it';
 * };
 *
 * export type BlogPost = ItemTypeDefinition<
 *   EnvironmentSettings,
 *   '12345',
 *   {
 *     title: { type: 'string'; localized: true; };
 *     content: { type: 'rich_text'; blocks: Hero; };
 *   }
 * >;
 *
 * export type Hero = ItemTypeDefinition<...>;
 *
 * export type AnyBlock = Hero;
 * export type AnyModel = BlogPost;
 * export type AnyBlockOrModel = AnyBlock | AnyModel;
 * ```
 */
export async function generateSchemaTypes(client: Client): Promise<string> {
	const response = await client.site.rawFind({
		include: "item_types,item_types.fields",
	});

	const { data } = response;
	const included = response.included || [];

	const locales = data.attributes.locales;
	const allItemTypes = included.filter((item) => item.type === "item_type");
	const allFields = included.filter((item) => item.type === "field");

	return generateTypeDefinitions(
		allItemTypes,
		allFields,
		locales,
		"@datocms/cma-client",
	);
}

function toPascalCase(str: string): string {
	return str
		.split(/[-_]/)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");
}

/**
 * Creates a virtual field property for sortable/tree models.
 *
 * Example generated code:
 * ```typescript
 * position: {
 *   type: 'integer';
 * }
 * ```
 */
function createVirtualFieldProperty(
	fieldName: string,
	fieldType: string,
): ts.PropertySignature {
	return ts.factory.createPropertySignature(
		undefined,
		ts.factory.createIdentifier(fieldName),
		undefined,
		ts.factory.createTypeLiteralNode([
			ts.factory.createPropertySignature(
				undefined,
				ts.factory.createIdentifier("type"),
				undefined,
				ts.factory.createLiteralTypeNode(
					ts.factory.createStringLiteral(fieldType),
				),
			),
		]),
	);
}

/**
 * Creates a union type for block references in rich text, structured text, or single block fields.
 *
 * Example generated code:
 * ```typescript
 * // For multiple blocks:
 * Hero | CallToAction | Testimonial
 *
 * // For single block:
 * Hero
 *
 * // For no blocks:
 * never
 * ```
 */
function createBlocksUnion(
	itemTypeIds: string[],
	itemTypeIdToTypeName: Map<string, string>,
): ts.TypeNode {
	if (itemTypeIds.length === 0) {
		return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword);
	}

	const validTypeNames = itemTypeIds
		.map((id) => itemTypeIdToTypeName.get(id))
		.filter(Boolean) as string[];

	if (validTypeNames.length === 0) {
		return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword);
	}

	if (validTypeNames.length === 1) {
		return ts.factory.createTypeReferenceNode(
			ts.factory.createIdentifier(validTypeNames[0]!),
		);
	}

	return ts.factory.createUnionTypeNode(
		validTypeNames.map((typeName) =>
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(typeName)),
		),
	);
}

/**
 * Maps a DatoCMS field to its TypeScript type definition.
 *
 * Example generated code:
 * ```typescript
 * // For rich_text field:
 * {
 *   type: 'rich_text';
 *   blocks: Hero | CallToAction;
 * }
 *
 * // For structured_text field:
 * {
 *   type: 'structured_text';
 *   blocks: Hero;
 *   inline_blocks: CallToAction;
 * }
 *
 * // For regular field:
 * {
 *   type: 'string';
 * }
 *
 * // For localized field:
 * {
 *   type: 'string';
 *   localized: true;
 * }
 * ```
 */
function mapFieldType(
	field: RawApiTypes.Field,
	itemTypeIdToTypeName: Map<string, string>,
): ts.TypeNode {
	let baseType: ts.TypeNode;

	switch (field.attributes.field_type) {
		case "rich_text":
			baseType = ts.factory.createTypeLiteralNode([
				ts.factory.createPropertySignature(
					undefined,
					ts.factory.createIdentifier("type"),
					undefined,
					ts.factory.createLiteralTypeNode(
						ts.factory.createStringLiteral("rich_text"),
					),
				),
				ts.factory.createPropertySignature(
					undefined,
					ts.factory.createIdentifier("blocks"),
					undefined,
					createBlocksUnion(
						field.attributes.validators.rich_text_blocks.item_types,
						itemTypeIdToTypeName,
					),
				),
			]);
			break;

		case "structured_text": {
			const properties = [
				ts.factory.createPropertySignature(
					undefined,
					ts.factory.createIdentifier("type"),
					undefined,
					ts.factory.createLiteralTypeNode(
						ts.factory.createStringLiteral("structured_text"),
					),
				),
			];

			if (
				field.attributes.validators.structured_text_blocks.item_types.length > 0
			) {
				properties.push(
					ts.factory.createPropertySignature(
						undefined,
						ts.factory.createIdentifier("blocks"),
						undefined,
						createBlocksUnion(
							field.attributes.validators.structured_text_blocks.item_types,
							itemTypeIdToTypeName,
						),
					),
				);
			}

			if (
				field.attributes.validators.structured_text_links.item_types.length > 0
			) {
				properties.push(
					ts.factory.createPropertySignature(
						undefined,
						ts.factory.createIdentifier("inline_blocks"),
						undefined,
						createBlocksUnion(
							field.attributes.validators.structured_text_links.item_types,
							itemTypeIdToTypeName,
						),
					),
				);
			}

			baseType = ts.factory.createTypeLiteralNode(properties);
			break;
		}

		case "single_block":
			baseType = ts.factory.createTypeLiteralNode([
				ts.factory.createPropertySignature(
					undefined,
					ts.factory.createIdentifier("type"),
					undefined,
					ts.factory.createLiteralTypeNode(
						ts.factory.createStringLiteral("single_block"),
					),
				),
				ts.factory.createPropertySignature(
					undefined,
					ts.factory.createIdentifier("blocks"),
					undefined,
					createBlocksUnion(
						field.attributes.validators.single_block_blocks.item_types,
						itemTypeIdToTypeName,
					),
				),
			]);
			break;

		default:
			baseType = ts.factory.createTypeLiteralNode([
				ts.factory.createPropertySignature(
					undefined,
					ts.factory.createIdentifier("type"),
					undefined,
					ts.factory.createLiteralTypeNode(
						ts.factory.createStringLiteral(field.attributes.field_type),
					),
				),
			]);
	}

	if (field.attributes.localized) {
		const properties = Array.from(
			(baseType as ts.TypeLiteralNode).members,
		) as ts.PropertySignature[];

		properties.push(
			ts.factory.createPropertySignature(
				undefined,
				ts.factory.createIdentifier("localized"),
				undefined,
				ts.factory.createLiteralTypeNode(ts.factory.createTrue()),
			),
		);

		return ts.factory.createTypeLiteralNode(properties);
	}

	return baseType;
}

/**
 * Creates the field definitions object for an item type.
 *
 * Example generated code:
 * ```typescript
 * {
 *   title: {
 *     type: 'string';
 *     localized: true;
 *   };
 *   content: {
 *     type: 'rich_text';
 *     blocks: Hero | CallToAction;
 *   };
 *   position: {
 *     type: 'integer';
 *   }; // Virtual field for sortable models
 * }
 * ```
 */
function createFieldDefinitions(
	fields: RawApiTypes.Field[],
	itemTypeIdToTypeName: Map<string, string>,
	itemType: RawApiTypes.ItemType,
): ts.TypeLiteralNode {
	const properties: ts.PropertySignature[] = [];

	for (const field of fields) {
		const fieldType = mapFieldType(field, itemTypeIdToTypeName);
		const property = ts.factory.createPropertySignature(
			undefined,
			ts.factory.createIdentifier(field.attributes.api_key),
			undefined,
			fieldType,
		);
		properties.push(property);
	}

	if (itemType.attributes.sortable || itemType.attributes.tree) {
		properties.push(createVirtualFieldProperty("position", "integer"));
	}

	if (itemType.attributes.tree) {
		properties.push(createVirtualFieldProperty("parent_id", "string"));
	}

	return ts.factory.createTypeLiteralNode(properties);
}

/**
 * Creates lookup maps from raw API data for efficient field and type name resolution.
 *
 * Returns:
 * - fieldsByItemType: Maps item type ID → array of its fields
 * - itemTypeIdToTypeName: Maps item type ID → PascalCase type name
 */
function createMapsFromData(
	itemTypes: RawApiTypes.ItemType[],
	fields: RawApiTypes.Field[],
): {
	fieldsByItemType: Map<string, RawApiTypes.Field[]>;
	itemTypeIdToTypeName: Map<string, string>;
} {
	const fieldsByItemType = new Map<string, RawApiTypes.Field[]>();
	const itemTypeIdToTypeName = new Map<string, string>();

	for (const itemType of itemTypes) {
		itemTypeIdToTypeName.set(
			itemType.id,
			toPascalCase(itemType.attributes.api_key),
		);
	}

	for (const field of fields) {
		const itemTypeId = field.relationships.item_type.data.id;
		if (!fieldsByItemType.has(itemTypeId)) {
			fieldsByItemType.set(itemTypeId, []);
		}
		fieldsByItemType.get(itemTypeId)?.push(field);
	}

	return { fieldsByItemType, itemTypeIdToTypeName };
}

/**
 * Creates the EnvironmentSettings type definition.
 *
 * Example generated code:
 * ```typescript
 * type EnvironmentSettings = {
 *   locales: 'en' | 'it' | 'fr';
 * };
 * ```
 */
function createEnvironmentSettingsType(
	locales: string[],
): ts.TypeAliasDeclaration {
	const localeUnion = ts.factory.createUnionTypeNode(
		locales.map((locale) =>
			ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(locale)),
		),
	);

	return ts.factory.createTypeAliasDeclaration(
		undefined,
		ts.factory.createIdentifier("EnvironmentSettings"),
		undefined,
		ts.factory.createTypeLiteralNode([
			ts.factory.createPropertySignature(
				undefined,
				ts.factory.createIdentifier("locales"),
				undefined,
				localeUnion,
			),
		]),
	);
}

/**
 * Creates individual item type declarations.
 *
 * Example generated code:
 * ```typescript
 * export type BlogPost = ItemTypeDefinition<
 *   EnvironmentSettings,
 *   '12345',
 *   {
 *     title: {
 *       type: 'string';
 *       localized: true;
 *     };
 *     content: {
 *       type: 'rich_text';
 *       blocks: Hero | CallToAction;
 *     };
 *   }
 * >;
 * ```
 */
function createItemTypeDeclarations(
	itemTypes: RawApiTypes.ItemType[],
	fieldsByItemType: Map<string, RawApiTypes.Field[]>,
	itemTypeIdToTypeName: Map<string, string>,
): ts.TypeAliasDeclaration[] {
	const declarations: ts.TypeAliasDeclaration[] = [];

	for (const itemType of itemTypes) {
		const itemTypeFields = fieldsByItemType.get(itemType.id) || [];
		const fieldDefinitions = createFieldDefinitions(
			itemTypeFields,
			itemTypeIdToTypeName,
			itemType,
		);

		const typeDeclaration = ts.factory.createTypeAliasDeclaration(
			[ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
			ts.factory.createIdentifier(toPascalCase(itemType.attributes.api_key)),
			undefined,
			ts.factory.createTypeReferenceNode(
				ts.factory.createIdentifier("ItemTypeDefinition"),
				[
					ts.factory.createTypeReferenceNode(
						ts.factory.createIdentifier("EnvironmentSettings"),
					),
					ts.factory.createLiteralTypeNode(
						ts.factory.createStringLiteral(itemType.id),
					),
					fieldDefinitions,
				],
			),
		);

		declarations.push(typeDeclaration);
	}

	return declarations;
}

/**
 * Prints TypeScript AST nodes to formatted string output.
 *
 * Example generated code:
 * ```typescript
 * import type { ItemTypeDefinition } from '@datocms/cma-client';
 *
 * type EnvironmentSettings = {
 *   locales: 'en' | 'it';
 * };
 *
 * export type BlogPost = ItemTypeDefinition<...>;
 * export type Hero = ItemTypeDefinition<...>;
 *
 * export type AnyBlock = Hero;
 * export type AnyModel = BlogPost;
 * export type AnyBlockOrModel = AnyBlock | AnyModel;
 * ```
 */
function printTypeDeclarations(
	typeDeclarations: ts.TypeAliasDeclaration[],
	importDeclaration?: ts.ImportDeclaration,
): string {
	const sourceFile = ts.createSourceFile(
		"schema.ts",
		"",
		ts.ScriptTarget.Latest,
		false,
		ts.ScriptKind.TS,
	);

	const statements = importDeclaration
		? [importDeclaration, ...typeDeclarations]
		: typeDeclarations;

	const printer = ts.createPrinter({
		newLine: ts.NewLineKind.LineFeed,
	});

	return printer.printList(
		ts.ListFormat.MultiLine,
		ts.factory.createNodeArray(statements),
		sourceFile,
	);
}

/**
 * Internal function that generates TypeScript definitions with imports.
 *
 * Example generated code:
 * ```typescript
 * import type { ItemTypeDefinition } from '@datocms/cma-client';
 *
 * type EnvironmentSettings = { locales: 'en' | 'it'; };
 * export type BlogPost = ItemTypeDefinition<...>;
 * ```
 */
function generateTypeDefinitions(
	itemTypes: RawApiTypes.ItemType[],
	fields: RawApiTypes.Field[],
	locales: string[],
	importPath: string,
): string {
	const { fieldsByItemType, itemTypeIdToTypeName } = createMapsFromData(
		itemTypes,
		fields,
	);

	const importDeclaration = ts.factory.createImportDeclaration(
		undefined,
		ts.factory.createImportClause(
			true,
			undefined,
			ts.factory.createNamedImports([
				ts.factory.createImportSpecifier(
					false,
					undefined,
					ts.factory.createIdentifier("ItemTypeDefinition"),
				),
			]),
		),
		ts.factory.createStringLiteral(importPath),
	);

	const environmentSettingsType = createEnvironmentSettingsType(locales);
	const itemTypeDeclarations = createItemTypeDeclarations(
		itemTypes,
		fieldsByItemType,
		itemTypeIdToTypeName,
	);

	const typeDeclarations = [environmentSettingsType, ...itemTypeDeclarations];

	return printTypeDeclarations(typeDeclarations, importDeclaration);
}
