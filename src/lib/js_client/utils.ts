import ky from "ky";
import { JsClientEndpointInfo, JsClientResourceInfo, JsClientRestApiEndpoint } from "./types";

type Response = Array<JsClientResourceInfo>;

export async function fetchJsClientResources() {
  const resources = await ky<Response>(
    'https://cdn.jsdelivr.net/npm/@datocms/cma-client@latest/resources.json',
  ).json();

  return resources;
}

export async function fetchRestApiEndpointJsClient(entityName: string, endpointRel: string) {
  const resources = await fetchJsClientResources();

  const foundResource = resources.find((r) => r.jsonApiType === entityName);

  if (!foundResource) {
    return null;
  }

  const foundEndpoint = foundResource.endpoints.find((e) => e.rel === endpointRel);

  if (!foundEndpoint) {
    return null;
  }

  const { endpoints, ...resourceRest } = foundResource;

  return {
    ...resourceRest,
    ...foundEndpoint,
  } as JsClientRestApiEndpoint;
}

type MethodArgument = {
  argumentName: string;
  optional: boolean;
  typescriptType: string;
  typeToRetrieve: string | undefined;
};

export function getMethodArguments(
  endpoint: JsClientEndpointInfo,
  rawVariant: boolean,
  pagedIterator: boolean
): MethodArgument[] {
  const args: MethodArgument[] = [];

  // URL placeholders are always first
  for (const placeholder of endpoint.urlPlaceholders) {
    args.push({
      argumentName: placeholder.variableName,
      optional: false,
      typescriptType: rawVariant
        ? 'string'
        : `string | ${placeholder.relType}`,
      typeToRetrieve: rawVariant ? undefined : placeholder.relType,
    });
  }

  // Request body (only for non-paged iterator methods)
  if (!pagedIterator && endpoint.requestBodyType) {
    args.push({
      argumentName: 'body',
      optional: endpoint.optionalRequestBody,
      typescriptType: endpoint.requestBodyType,
      typeToRetrieve: endpoint.requestBodyType,
    });
  }

  // Query params
  if (endpoint.queryParamsType) {
    let queryParamsType = endpoint.queryParamsType;

    // For paged iterators, we omit the 'page' parameter
    if (pagedIterator) {
      queryParamsType = `Omit<${queryParamsType}, 'page'>`;
    }

    args.push({
      argumentName: 'queryParams',
      optional: !endpoint.queryParamsRequired,
      typescriptType: queryParamsType,
      typeToRetrieve: endpoint.queryParamsType,
    });
  }

  // Iterator options (only for paged iterators)
  if (pagedIterator) {
    args.push({
      argumentName: 'iteratorOptions',
      optional: true,
      typescriptType: 'IteratorOptions',
      typeToRetrieve: undefined,
    });
  }

  return args;
}

export function getMethodReturnType(
  endpoint: JsClientEndpointInfo,
  rawVariant: boolean,
  pagedIterator: boolean
): [string, string | undefined] {
  if (pagedIterator) {
    // Paged iterators return async generators
    if (endpoint.responseType) {
      if (rawVariant) {
        // Raw paged iterator yields the raw data elements
        return [`AsyncGenerator<${endpoint.responseType}['data'][0], void, unknown>`, endpoint.responseType];
      } else {
        // Simple paged iterator yields deserialized elements
        return [`AsyncGenerator<${endpoint.responseType}[0], void, unknown>`, endpoint.responseType];
      }
    } else {
      throw new Error('Should not happen');
    }
  }
  // Regular methods return promises
  if (endpoint.responseType) {
    return [`Promise<${endpoint.responseType}>`, endpoint.responseType];
  } else {
    return ['Promise<void>', undefined];
  }

}