import { ChatAnthropic } from '@langchain/anthropic';
import 'dotenv/config';
import { MCPAgent, MCPClient } from 'mcp-use';

async function main() {
  const config = {
    mcpServers: {
      datocms: {
        command: './bin/stdio',
        args: [],
        env: {
          DATOCMS_API_TOKEN: '',
        },
      },
    },
  };
  const client = MCPClient.fromDict(config);
  const llm = new ChatAnthropic({ modelName: 'claude-sonnet-4-0' });
  const agent = new MCPAgent({ llm, client, maxSteps: 20 });

  const eventStream = agent.streamEvents(
    'Please explore the models related to blog in the DatoCMS project'
  );

  for await (const event of eventStream) {
    // Handle different event types
    switch (event.event) {
      case 'on_chat_model_stream':
        if (event.data?.chunk?.text) {
          const textContent = event.data.chunk.text;
          process.stdout.write(event.data.chunk.text);
        }
        break;
      case 'on_tool_start':
        console.log(
          `\n\n  <Tool started: ${event.name} ${event.data.input.input}>\n`
        );
        break;
      case 'on_tool_end':
        console.log(` <Response: ${event.data.output.length} chars>\n\n`);
        break;
    }
  }
}

main().catch(console.error);
