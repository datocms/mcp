export type JsClientEndpointInfo = {
  rel: string;
  name?: string;
  rawName: string;
  returnsCollection: boolean;
  urlTemplate: string;
  method: string;
  comment: string;
  docUrl?: string;
  urlPlaceholders: Array<{
    variableName: string;
    isEntityId: boolean;
    relType: string;
  }>;
  entityIdPlaceholder?: {
    variableName: string;
    isEntityId: boolean;
    relType: string;
  };
  simpleMethodAvailable: boolean;
  requestBodyType?: string;
  optionalRequestBody: boolean;
  requestStructure?: {
    type: string;
    idRequired?: boolean;
    attributes: string[] | '*';
    relationships: string[] | '*';
  };
  queryParamsType?: string;
  queryParamsRequired?: boolean;
  responseType?: string;
  deprecated?: string;
  paginatedResponse?: {
    defaultLimit: number;
    maxLimit: number;
  };
};

export type JsClientRestApiEndpoint = {
  jsonApiType: string;
  namespace: string;
  resourceClassName: string;
} & JsClientEndpointInfo;

export type JsClientResourceInfo = {
  jsonApiType: string;
  namespace: string;
  resourceClassName: string;
  endpoints: JsClientEndpointInfo[];
}