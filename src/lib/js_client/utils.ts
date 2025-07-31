import dedent from "dedent";
import ky from "ky";
import { createSourceFile, ScriptTarget, type SourceFile } from "typescript";
import { cacheFor } from "../cacheFor.js";
import { isDefined } from "../isDefined.js";
import {
	extractTypeDependencies,
	generateSourceFile,
} from "./extractTypeDependencies.js";
import type {
	JsClientEndpoint,
	JsClientEntity,
	JsClientRawEndpoint,
} from "./types.js";

type RawCmaJsClientSchema = Array<{
	jsonApiType: string;
	namespace: string;
	resourceClassName: string;
	endpoints: JsClientRawEndpoint[];
}>;

export type CmaJsClientSchema = JsClientEntity[];

export const fetchCmaJsClientSchema = cacheFor(
	10000,
	async (): Promise<CmaJsClientSchema> => {
		const resources = await ky<RawCmaJsClientSchema>(
			"https://cdn.jsdelivr.net/npm/@datocms/cma-client@latest/resources.json",
		).json();

		return resources.map(({ endpoints, ...rest }) => ({
			...rest,
			endpoints: endpoints.map((rawEndpoint) => ({ ...rawEndpoint, ...rest })),
		}));
	},
);

export function findCmaJsClientEntityByJsonApiType(
	schema: CmaJsClientSchema,
	jsonApiType: string,
) {
	const entity = schema.find((r) => r.jsonApiType === jsonApiType);

	return entity;
}

export function findCmaJsClientEntityByNamespace(
	schema: CmaJsClientSchema,
	namespace: string,
) {
	const entity = schema.find((r) => r.namespace === namespace);

	return entity;
}

export function findCmaJsClientEndpointByRel(
	entity: JsClientEntity,
	rel: string,
) {
	const endpoint = entity.endpoints.find((e) => e.rel === rel);

	return endpoint;
}

export function findCmaJsClientEndpointByName(
	entity: JsClientEntity,
	name: string,
) {
	const endpoint = entity.endpoints.find((e) => e.name === name);

	return endpoint;
}

export type ExtractedJsClientEndpointMethod = {
	name: string;
	simple?: boolean;
	functionDefinition: string;
	referencedTypes: Set<string>;
};

export function extractJsClientEndpointMethods(
	endpoint: JsClientEndpoint,
): ExtractedJsClientEndpointMethod[] {
	const methods: ExtractedJsClientEndpointMethod[] = [];

	if (endpoint.namespace === "uploads") {
		if (endpoint.name === "create") {
			methods.push(
				{
					name: `createFromLocalFile`,
					simple: true,
					functionDefinition: dedent(
						`
							// Create a new upload from a local file path (only available in @datocms/cma-client-node)
							createFromLocalFile(body: CreateUploadFromLocalFileSchema): CancelablePromise<SimpleSchemaTypes.Upload>;
						`,
					),
					referencedTypes: new Set([
						"CreateUploadFromLocalFileSchema",
						"UploadCreateSchema",
						"Upload",
						"CancelablePromise",
					]),
				},
				{
					name: `createFromUrl`,
					simple: true,
					functionDefinition: dedent(
						`
							// Create a new upload from a remote URL (only available on @datocms/cma-client-node)
							createFromUrl(body: CreateUploadFromUrlSchema): CancelablePromise<SimpleSchemaTypes.Upload>;
						`,
					),
					referencedTypes: new Set([
						"CreateUploadFromUrlSchema",
						"UploadCreateSchema",
						"Upload",
						"CancelablePromise",
					]),
				},
				{
					name: `createFromFileOrBlob`,
					simple: true,
					functionDefinition: dedent(
						`
							// Create a new upload using a browser File/Blob object (only available on @datocms/cma-client-browser)
							createFromFileOrBlob(body: CreateUploadFromFileOrBlobSchema): CancelablePromise<SimpleSchemaTypes.Upload>;
						`,
					),
					referencedTypes: new Set([
						"CreateUploadFromFileOrBlobSchema",
						"UploadCreateSchema",
						"Upload",
						"CancelablePromise",
					]),
				},
			);
		} else if (endpoint.name === "update") {
			methods.push(
				{
					name: `updateFromLocalFile`,
					simple: true,
					functionDefinition: dedent(
						`
							// Replaces an upload using from a local file path (only available in @datocms/cma-client-node)
							updateFromLocalFile(uploadId: string | SimpleSchemaTypes.UploadData, body: UpdateUploadFromLocalFileSchema): CancelablePromise<SimpleSchemaTypes.Upload>;
						`,
					),
					referencedTypes: new Set([
						"UpdateUploadFromLocalFileSchema",
						"UploadData",
						"Upload",
						"CancelablePromise",
					]),
				},
				{
					name: `updateFromUrl`,
					simple: true,
					functionDefinition: dedent(
						`
							// Replaces an upload using a remote URL (only available on @datocms/cma-client-node)
							updateFromUrl(uploadId: string | SimpleSchemaTypes.UploadData, body: UpdateUploadFromUrlSchema): CancelablePromise<SimpleSchemaTypes.Upload>;
						`,
					),
					referencedTypes: new Set([
						"UpdateUploadFromUrlSchema",
						"UploadData",
						"Upload",
						"CancelablePromise",
					]),
				},
				{
					name: `updateFromFileOrBlob`,
					simple: true,
					functionDefinition: dedent(
						`
							// Replaces an upload using a browser File/Blob object (only available on @datocms/cma-client-browser)
							updateFromFileOrBlob(uploadId: string | SimpleSchemaTypes.UploadData, body: UpdateUploadFromFileOrBlobSchema): CancelablePromise<SimpleSchemaTypes.Upload>;
						`,
					),
					referencedTypes: new Set([
						"UpdateUploadFromFileOrBlobSchema",
						"UploadData",
						"Upload",
						"CancelablePromise",
					]),
				},
			);
		}
	} else if (
		endpoint.namespace === "uploadTracks" &&
		endpoint.name === "create"
	) {
		methods.push(
			{
				name: `createFromLocalFile`,
				simple: true,
				functionDefinition: dedent(
					`
						// Create a new upload track from a local file path (only available in @datocms/cma-client-node)
						createFromLocalFile(uploadId: string | SimpleSchemaTypes.UploadData, body: CreateUploadTrackFromLocalFileSchema): CancelablePromise<SimpleSchemaTypes.UploadTrack>;
					`,
				),
				referencedTypes: new Set([
					"UploadData",
					"CreateUploadTrackFromLocalFileSchema",
					"UploadTrackCreateSchema",
					"UploadTrack",
					"CancelablePromise",
				]),
			},
			{
				name: `createFromFileOrBlob`,
				simple: true,
				functionDefinition: dedent(
					`
						// Create a new upload track using a browser File/Blob object (only available on @datocms/cma-client-browser)
						createFromFileOrBlob(uploadId: string | SimpleSchemaTypes.UploadData, body: CreateUploadTrackFromFileOrBlobSchema): CancelablePromise<SimpleSchemaTypes.UploadTrack>;
					`,
				),
				referencedTypes: new Set([
					"UploadData",
					"CreateUploadTrackFromFileOrBlobSchema",
					"UploadTrackCreateSchema",
					"UploadTrack",
					"CancelablePromise",
				]),
			},
		);
	}

	// Helper function to generate JSDoc comment
	const generateJSDoc = (comment: string) => {
		return `// ${comment}`;
	};

	// Helper function to generate parameter list
	const generateParameters = (
		referencedTypes: Set<string>,
		urlPlaceholders: JsClientEndpoint["urlPlaceholders"],
		requestBodyType?: string,
		optionalRequestBody?: boolean,
		queryParamsType?: string,
		queryParamsRequired?: boolean,
		isSimpleMethod: boolean = false,
	) => {
		const params: string[] = [];

		// URL placeholders
		urlPlaceholders.forEach((placeholder) => {
			if (isSimpleMethod) {
				params.push(
					`${placeholder.variableName}: string | SimpleSchemaTypes.${placeholder.relType}`,
				);
				referencedTypes.add(placeholder.relType);
			} else {
				params.push(`${placeholder.variableName}: string`);
			}
		});

		// Request body
		if (requestBodyType) {
			const namespace = isSimpleMethod ? "SimpleSchemaTypes" : "SchemaTypes";
			const optional = optionalRequestBody ? "?" : "";
			params.push(`body${optional}: ${namespace}.${requestBodyType}`);
			referencedTypes.add(requestBodyType);
		}

		// Query parameters
		if (queryParamsType) {
			const namespace = isSimpleMethod ? "SimpleSchemaTypes" : "SchemaTypes";
			const optional = queryParamsRequired ? "" : "?";
			params.push(`queryParams${optional}: ${namespace}.${queryParamsType}`);
			referencedTypes.add(queryParamsType);
		}

		return params;
	};

	// Generate simple paginated iterator methods if applicable
	if (endpoint.paginatedResponse && endpoint.name) {
		const referencedTypes = new Set<string>();

		const jsdoc = generateJSDoc(
			`Async iterator to auto-paginate over elements returned by \`.${endpoint.name}()\`. Prefer this method unless you need to fetch just a single page!`,
		);
		const paginatedParams: string[] = [];

		// URL placeholders
		endpoint.urlPlaceholders.forEach((placeholder) => {
			paginatedParams.push(
				`${placeholder.variableName}: string | SimpleSchemaTypes.${placeholder.relType}`,
			);
			referencedTypes.add(placeholder.relType);
		});

		// Query params (excluding page)
		if (endpoint.queryParamsType) {
			const optional = endpoint.queryParamsRequired ? "" : "?";
			paginatedParams.push(
				`queryParams${optional}: Omit<SimpleSchemaTypes.${endpoint.queryParamsType}, 'page'>`,
			);
			referencedTypes.add(endpoint.queryParamsType);
		}

		paginatedParams.push("iteratorOptions?: IteratorOptions");
		referencedTypes.add("IteratorOptions");

		const paginatedFunctionDef = `${jsdoc}\nasync *${endpoint.name}PagedIterator(\n  ${paginatedParams.join(",\n  ")}\n): AsyncGenerator<SimpleSchemaTypes.${endpoint.responseType}[0], void, unknown>`;

		if (endpoint.responseType) {
			referencedTypes.add(endpoint.responseType);
		}

		methods.push({
			name: `${endpoint.name}PagedIterator`,
			simple: true,
			functionDefinition: paginatedFunctionDef,
			referencedTypes,
		});
	}

	if (endpoint.name) {
		const referencedTypes = new Set<string>();

		const jsdoc = generateJSDoc(
			`${endpoint.paginatedResponse ? "Fetch a single page of results. " : ""}Prefer this method instead of \`.${endpoint.rawName}()\` unless you specifically need access to the \`included\` or \`meta\` properties of the raw JSON:API response, as this method results in less verbose code!`,
		);

		const params = generateParameters(
			referencedTypes,
			endpoint.urlPlaceholders,
			endpoint.requestBodyType,
			endpoint.optionalRequestBody,
			endpoint.queryParamsType,
			endpoint.queryParamsRequired,
			true,
		);

		let returnType = "Promise<void>";
		if (endpoint.responseType) {
			returnType = `Promise<SimpleSchemaTypes.${endpoint.responseType}>`;
			referencedTypes.add(endpoint.responseType);
		}

		const functionDef = `${jsdoc}\n${endpoint.name}(\n  ${params.join(",\n  ")}\n): ${returnType}`;

		methods.push({
			name: endpoint.name,
			simple: true,
			functionDefinition: functionDef,
			referencedTypes,
		});
	}

	// Generate raw method

	const referencedTypes = new Set<string>();

	const rawJsdoc =
		endpoint.paginatedResponse || endpoint.name
			? generateJSDoc(
					`${endpoint.paginatedResponse ? "Fetch a single page of results. " : ""}${endpoint.name ? `This is the tiniest wrapper around the JSON:API API. More verbose then \`.${endpoint.name}()\`, but you can access every property contained in the original JSON:API response` : ""}`,
				)
			: "";
	const rawParams = generateParameters(
		referencedTypes,
		endpoint.urlPlaceholders,
		endpoint.requestBodyType,
		endpoint.optionalRequestBody,
		endpoint.queryParamsType,
		endpoint.queryParamsRequired,
		false,
	);

	let rawReturnType = "Promise<void>";
	if (endpoint.responseType) {
		rawReturnType = `Promise<SchemaTypes.${endpoint.responseType}>`;
		referencedTypes.add(endpoint.responseType);
	}

	const rawFunctionDef = `${rawJsdoc}\n${endpoint.rawName}(\n  ${rawParams.join(",\n  ")}\n): ${rawReturnType}`;

	methods.push({
		name: endpoint.rawName,
		simple: true,
		functionDefinition: rawFunctionDef,
		referencedTypes,
	});

	return methods;
}

export const fetchSchemaTypes = cacheFor(100000, () =>
	generateSourceFile(
		"https://cdn.jsdelivr.net/npm/@datocms/cma-client/src/generated/SchemaTypes.ts",
	),
);

export const fetchSimpleSchemaTypes = cacheFor(100000, () =>
	generateSourceFile(
		"https://cdn.jsdelivr.net/npm/@datocms/cma-client/src/generated/SimpleSchemaTypes.ts",
	),
);

const hardcodedSourceFile = createSourceFile(
	"hardcoded.ts",
	dedent(
		`
			export type OnProgressCreatingUploadTrackObjectInfo = {
				type: 'CREATING_UPLOAD_TRACK_OBJECT';
			};

			export type OnUploadTrackProgressInfo =
				| OnProgressInfo
				| OnProgressCreatingUploadTrackObjectInfo;

			export type CreateUploadTrackFromFileOrBlobSchema = Omit<
				UploadTrackCreateSchema,
				'url_or_upload_request_id'
			> & {
				fileOrBlob: File | Blob;
				onProgress?: (info: OnUploadTrackProgressInfo) => void;
			};

			export type CreateUploadTrackFromLocalFileSchema = Omit<
				UploadTrackCreateSchema,
				'url_or_upload_request_id'
			> & {
				localPath: string;
				onProgress?: (info: OnUploadTrackProgressInfo) => void;
			};

			export type OnProgressDownloadingFileInfo = {
				type: 'DOWNLOADING_FILE';
				payload: {
					url: string;
					progress: number;
				};
			};

			export type OnProgressUploadingFileInfo = {
				type: 'UPLOADING_FILE';
				payload: {
					progress: number;
				};
			};

			export type OnProgressRequestingUploadUrlInfo = {
				type: 'REQUESTING_UPLOAD_URL';
				payload: {
					filename: string;
				};
			};

			export type OnProgressInfo =
				| OnProgressRequestingUploadUrlInfo
				| OnProgressDownloadingFileInfo
				| OnProgressUploadingFileInfo;

			export interface CancelablePromise<T> extends Promise<T> {
				cancel(): void;
			}

			export type OnProgressCreatingUploadObjectInfo = {
				type: 'CREATING_UPLOAD_OBJECT';
			};

			export type OnUploadProgressInfo =
				| OnProgressInfo
				| OnProgressCreatingUploadObjectInfo;

			export type CreateUploadFromLocalFileSchema = Omit<
				UploadCreateSchema,
				'path'
			> & {
				localPath: string;
				filename?: string;
				skipCreationIfAlreadyExists?: boolean;
				onProgress?: (info: OnUploadProgressInfo) => void;
			};

			export type UpdateUploadFromLocalFileSchema = Omit<
				UploadUpdateSchema,
				'path'
			> & {
				localPath: string;
				filename?: string;
				onProgress?: (info: OnUploadProgressInfo) => void;
			};

			export type CreateUploadFromUrlSchema = Omit<
				UploadCreateSchema,
				'path'
			> & {
				url: string;
				filename?: string;
				skipCreationIfAlreadyExists?: boolean;
				onProgress?: (info: OnUploadProgressInfo) => void;
			};

			export type UpdateUploadFromUrlSchema = Omit<
				UploadUpdateSchema,
				'path'
			> & {
				url: string;
				filename?: string;
				onProgress?: (info: OnUploadProgressInfo) => void;
			};

			export type CreateUploadFromFileOrBlobSchema = Omit<
				UploadCreateSchema,
				'path'
			> & {
				fileOrBlob: File | Blob;
				filename?: string;
				onProgress?: (info: OnUploadProgressInfo) => void;
			};

			export type UpdateUploadFromFileOrBlobSchema = Omit<
				UploadUpdateSchema,
				'path'
			> & {
				fileOrBlob: File | Blob;
				filename?: string;
				onProgress?: (info: OnUploadProgressInfo) => void;
			};
		`,
	),
	ScriptTarget.Latest,
	true,
);

export async function retrieveJsClientEndpointMethodTypes(
	sourceFile: SourceFile,
	typesToRetrieve: string[],
) {
	const dependencies = await extractTypeDependencies(
		sourceFile,
		typesToRetrieve,
	);

	const hardcodedDependencies = await extractTypeDependencies(
		hardcodedSourceFile,
		typesToRetrieve,
	);

	return [dependencies, hardcodedDependencies].filter(isDefined).join("\n\n");
}
