import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import cors from "cors";
import express from "express";
import { logging } from "./express/logging.js";
import { createServer } from "./server.js";

const app = express();

app.use(
	cors({
		origin: "*",
		exposedHeaders: ["Mcp-Session-Id"],
		allowedHeaders: ["Content-Type", "mcp-session-id"],
	}),
);

app.use(express.json());
app.use(logging);

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

app.post("/", async (req, res) => {
	const sessionId = req.headers["mcp-session-id"] as string | undefined;
	const authHeader = req.headers.authorization;

	let transport: StreamableHTTPServerTransport;

	if (sessionId && transports[sessionId]) {
		transport = transports[sessionId];
	} else if (!sessionId && isInitializeRequest(req.body)) {
		const oauthToken = authHeader?.startsWith("Bearer ")
			? authHeader.substring(7).trim()
			: undefined;

		transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: () => randomUUID(),
			onsessioninitialized: (sessionId) => {
				transports[sessionId] = transport;
			},
		});

		transport.onclose = () => {
			if (transport.sessionId) {
				delete transports[transport.sessionId];
			}
		};

		const server = createServer(oauthToken);
		await server.connect(transport);
	} else {
		res.status(400).json({
			jsonrpc: "2.0",
			error: {
				code: -32000,
				message: "Bad Request: No valid session ID provided",
			},
			id: null,
		});
		return;
	}

	await transport?.handleRequest(req, res, req.body);
});

const handleSessionRequest = async (
	req: express.Request,
	res: express.Response,
) => {
	const sessionId = req.headers["mcp-session-id"] as string | undefined;
	if (!sessionId || !transports[sessionId]) {
		res.status(400).send("Invalid or missing session ID");
		return;
	}

	const transport = transports[sessionId];
	await transport.handleRequest(req, res);
};

// Handle GET requests for server-to-client notifications via SSE
app.get("/", handleSessionRequest);

// Handle DELETE requests for session termination
app.delete("/", handleSessionRequest);

const port = process.env.PORT || 8080;
app.listen(port, () => {
	console.log(
		`MCP Server started on port ${port} at ${new Date().toISOString()}`,
	);
});
