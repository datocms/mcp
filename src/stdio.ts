import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const main = async (): Promise<void> => {
	try {
		const server = createServer(process.env.DATOCMS_API_TOKEN);
		const transport = new StdioServerTransport();
		server.connect(transport);
	} catch (_error) {
		process.exit(1);
	}
};

main();
