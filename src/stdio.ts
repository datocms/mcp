import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const main = async (): Promise<void> => {
	try {
		const server = createServer();
		const transport = new StdioServerTransport();
		server.connect(transport);
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
};

main();
