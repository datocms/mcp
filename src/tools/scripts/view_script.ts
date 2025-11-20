import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import z from 'zod';
import { code, h2, li, p, pre, render, ul } from '../../lib/markdown.js';
import { viewScript } from '../../lib/scripts/storage.js';
import { simplifiedRegisterTool } from '../../lib/simplifiedRegisterTool.js';

export function register(server: McpServer) {
  simplifiedRegisterTool(
    server,
    'view_script',
    {
      title: 'View script file',
      description: render(
        p(
          'Returns the content of a script file, optionally showing only a specific line range.'
        ),
        h2('Line Range Options'),
        ul(
          li(
            'Omit both ',
            code('start_line'),
            ' and ',
            code('limit'),
            ' to view the entire script'
          ),
          li(
            'Use ',
            code('start_line'),
            ' to start from a specific line (1-indexed)'
          ),
          li('Use ', code('limit'), ' to control how many lines to show')
        )
      ),
      inputSchema: {
        name: z
          .string()
          .describe(
            'The name of the script to view (e.g., script://my-script.ts)'
          ),
        start_line: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            'Line number to start viewing from (1-indexed). Omit to start from the beginning.'
          ),
        limit: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            'Number of lines to show. Omit to show all lines from start_line to end.'
          ),
      },
    },
    async ({ name, start_line, limit }) => {
      const script = viewScript(name);
      const lines = script.content.split('\n');

      // If no line range specified, return full script without line numbers
      if (start_line === undefined && limit === undefined) {
        return render(pre({ language: 'typescript' }, script.content));
      }

      // Apply line range filtering
      let displayLines = lines;
      let startIdx = 0;
      let endIdx = lines.length;

      if (start_line !== undefined) {
        startIdx = start_line - 1; // Convert to 0-indexed
        if (startIdx < 0) startIdx = 0;
        if (startIdx >= lines.length) {
          return render(
            p(
              `Error: start_line ${start_line} is beyond the end of the script (${lines.length} lines total)`
            )
          );
        }
      }

      if (limit !== undefined) {
        endIdx = startIdx + limit;
      }

      displayLines = lines.slice(startIdx, endIdx);

      // Format with line numbers (cat -n style)
      const numberedLines = displayLines
        .map((line, idx) => {
          const lineNum = startIdx + idx + 1;
          return `${lineNum.toString().padStart(6, ' ')}→${line}`;
        })
        .join('\n');

      // Create header showing range
      const totalLines = lines.length;
      const actualStart = startIdx + 1;
      const actualEnd = Math.min(startIdx + displayLines.length, totalLines);

      const header = `Showing lines ${actualStart}-${actualEnd} of ${totalLines}\n\n`;

      return render(p(header), pre({ language: 'typescript' }, numberedLines));
    }
  );
}
