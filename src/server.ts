import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { register as registerCmaJsClientResource } from "./tools/cma_js_client/resource/index.js";
import { register as registerCmaJsClientResourceAction } from "./tools/cma_js_client/resource_action/index.js";
import { register as registerCmaJsClientResourceActionMethod } from "./tools/cma_js_client/resource_action_method/index.js";
import { register as registerCmaJsClientResourceActionMethodExecute } from "./tools/cma_js_client/resource_action_method_execute/index.js";
import { register as registerCmaJsClientResources } from "./tools/cma_js_client/resources/index.js";
import { register as registerCmaJsClientUsageRules } from "./tools/cma_js_client/usage_rules/index.js";

export function createServer(apiToken: string | undefined) {
	const server = new McpServer({
		name: "datocms",
		version: "1.0.0",
	});

	registerCmaJsClientUsageRules(server);
	registerCmaJsClientResources(server);
	registerCmaJsClientResource(server);
	registerCmaJsClientResourceAction(server);
	registerCmaJsClientResourceActionMethod(server);

	if (apiToken) {
		registerCmaJsClientResourceActionMethodExecute(server, apiToken);
	}

	return server;
}
