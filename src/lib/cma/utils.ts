import $RefParser from '@apidevtools/json-schema-ref-parser';
import ky from 'ky';
import { invariant } from '../invariant';
import type { CmaHyperSchema, RestApiEntity } from './types';

export async function fetchHyperSchema() {
  const unreferencedSchema = await ky('https://site-api.datocms.com/docs/site-api-hyperschema.json').json();
  const schema = await $RefParser.dereference(unreferencedSchema);
  return schema as CmaHyperSchema;
}

export function findHyperSchemaEntity(schema: CmaHyperSchema, entityName: string) {
  invariant(schema.properties);

  return schema.properties[entityName] as RestApiEntity | undefined;
}

export function findHyperSchemaJobResultSelfEndpoint(schema: CmaHyperSchema) {
  const entity = findHyperSchemaEntity(schema, 'job-result');
  return entity?.links?.find((link) => link.rel === 'self')!;
}
