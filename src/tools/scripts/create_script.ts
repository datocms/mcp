import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import dedent from 'dedent';
import z from 'zod';
import { extractTypeDependencies } from '../../lib/code_analysis/extractTypeDependencies.js';
import { getCmaClientProgram } from '../../lib/code_analysis/getCmaClientProgram.js';
import {
  blockquote,
  code,
  h1,
  h2,
  h3,
  li,
  ol,
  p,
  pre,
  render,
  ul,
} from '../../lib/markdown.js';
import { createScript } from '../../lib/scripts/storage.js';
import { DEFAULT_ALLOWED_PACKAGES } from '../../lib/scripts/validation.js';
import { simplifiedRegisterTool } from '../../lib/simplifiedRegisterTool.js';
import { validateAndExecuteScript } from '../../lib/workspace/execute.js';

// Extract types dynamically from the installed package
const { program, checker } = getCmaClientProgram();

// Extract error types with their dependencies
const errorTypes = extractTypeDependencies(checker, program, [
  'ApiError',
  'TimeoutError',
]);

export function register(server: McpServer, apiToken?: string) {
  const allowedPackagesStr = DEFAULT_ALLOWED_PACKAGES.join(', ');

  simplifiedRegisterTool(
    server,
    'create_script',
    {
      title: 'Create script file',
      description: render(
        p(
          'The script is stored in memory and can be viewed, updated, validated or executed later. The script must follow the required format:'
        ),
        ol(
          li(
            'Only imports from these packages are allowed: ',
            allowedPackagesStr
          ),
          li(
            'Must export a default async function that takes exactly one parameter of type Client and returns a Promise<void>.'
          )
        ),
        p('To output results, use console.log() or similar.'),
        p(
          'Unless explicitly stated otherwise, these scripts ',
          '**are not intended for user-facing output** — they serve as internal helpers the LLM uses to perform specific tasks or automate its own operations.'
        ),
        p(
          'Keep scripts short, concise and focused: verbose, redundant or overly complex scripts can slow down execution, consume more memory, and reduce available context for other tasks.'
        ),
        p(
          '⚠️ Type Safety Requirement: Scripts must not contain ',
          code('any'),
          ' or ',
          code('unknown'),
          ' types, as these will result in a validation error. Use specific types to ensure type safety and prevent runtime errors.'
        ),
        h1('🚨 CRITICAL SYSTEM REQUIREMENT - VIOLATION = IMMEDIATE FAILURE 🚨'),
        p(
          'Before writing ANY code containing DatoCMS client methods:',
          ' ✅ CHECKPOINT: Have I called ',
          '□ Called ',
          code('resource'),
          ', ',
          code('resource_action'),
          ' and ',
          code('resource_action_method'),
          ' for: ',
          code(`client.<resource>.<action>.<method>`),
          " for EVERY SINGLE method I'm about to use?"
        ),
        p(
          'If the answer is NO, STOP IMMEDIATELY and call the tool.',
          ' If the answer is YES, list each method and its corresponding tool call in your response.'
        ),
        h3('MANDATORY PRE-CODE CHECKLIST (must be visible in response)'),
        ul(
          li('□ Identified ALL methods: [list them here]'),
          li(
            '□ Called ',
            code('resource_action_method'),
            ' for: [list each method]'
          ),
          li('□ Only now proceeding with code using exact schemas')
        ),
        blockquote(
          '⚠️ If any checkbox is unchecked, CODE WRITING IS FORBIDDEN'
        ),
        h3('VIOLATION CONSEQUENCE'),
        p('If you write code without verifying ALL method schemas:'),
        ul(
          li('Start your response with: "❌ RULE VIOLATION DETECTED"'),
          li("Explain which method schemas you didn't verify"),
          li('Refuse to provide code until schemas are verified'),
          li('This applies even if you "think you know" the schema')
        ),
        h3('AUTOMATIC VERIFICATION REQUIRED'),
        p(
          'Before any code block containing ',
          code('client.<resource>.<method>'),
          ':'
        ),
        ol(
          li('Scan the code for ALL client method calls'),
          li(
            'For each method, verify: "Did I call ',
            code('resource_action_method'),
            ' for X?"'
          ),
          li('If ANY method lacks verification, abort and verify first')
        ),

        h2('ERROR MANAGEMENT'),
        p(
          'The client can throw ',
          code('ApiError'),
          ' for non 2xx HTTP responses, and ',
          code('TimeoutError'),
          ', here are the types:'
        ),
        pre({ language: 'typescript' }, errorTypes),

        h1('WHEN TO USE RAW METHODS'),
        ul(
          li(
            'Use ',
            code('rawFind()'),
            ' when you need relationships, or metadata'
          ),
          li('Access related entities via: ', code('.included'))
        ),
        h3('RAW JSON:API Structure'),
        pre(
          { language: 'json' },
          dedent(`
            {
              "data": /* Main record data, or array of record data */
              "included": [ /* Related records (ie. record relationships) */ ]
              "meta": /* Additional info (ie. total # of records in case of paginated response) */
            }
          `)
        ),

        h1('RECORD METHODS'),
        p(
          'All client.items.* methods that send or receive record data should use ',
          code('ItemTypeDefinition'),
          ' generics.'
        ),

        p(
          'These types describe the minimal shape of item payloads: field names, field value types, and allowed block types.'
        ),

        p(
          'ItemTypeDefinition types are already available in',
          code('./schema'),
          ':'
        ),

        pre(
          { language: 'json' },
          dedent(`
						import { type Client } from '@datocms/cma-client-node';
						import * as Schema from './schema';

						export default async function (client: Client) {
							// Type-safe record creation
							await client.items.create<Schema.Article>({
								item_type: { id: 'dhVR2HqgRVCTGFi0bWqLqA', type: 'item_type' },
								accent_color: '#FF0000', // ❌ This will raise TypeScript error for wrong format!
							});
						}
					`)
        )
      ),
      inputSchema: {
        name: z
          .string()
          .describe(
            'The name of the script (MUST be unique, MUST start with script:// and end with .ts, e.g., script://my-script.ts)'
          ),
        content: z
          .string()
          .describe(
            `The TypeScript content of the script. Must import Client type from '@datocms/cma-client-node', only use imports from: ${allowedPackagesStr}, and export a default async function that takes exactly one parameter of type Client`
          ),
        execute: z
          .boolean()
          .optional()
          .describe(
            'If true, automatically execute the script after successful validation (requires API token)'
          ),
      },
    },
    async ({ name, content, execute }) => {
      const validation = createScript(name, content);

      // If basic validation failed, report those errors
      if (!validation.valid) {
        return render(
          h1('Script created with validation errors'),
          p(
            'Script ',
            code(name),
            ' has been created, but the following validation errors were found:'
          ),
          ...validation.errors.map((error) => p('  - ', error)),
          p(
            'You can still use ',
            code('view_script'),
            ' to view the script and ',
            code('update_script'),
            ' to fix the errors.'
          )
        );
      }

      // Run TypeScript validation and optionally execute
      const result = await validateAndExecuteScript(
        name,
        apiToken,
        execute,
        'created'
      );

      if (result) {
        return result;
      }

      return render(
        h1('Script created successfully'),
        p(
          'Script ',
          code(name),
          ' has been created with no validation errors.'
        ),
        p('Use ', code('view_script'), ' to view its content.')
      );
    }
  );
}
