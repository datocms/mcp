import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { datocmsClient } from "./lib/config.js";
import { register as registerResource } from "./tools/resource/index.js";
import { register as registerResourceAction } from "./tools/resource_action/index.js";
import { register as registerResourceActionMethod } from "./tools/resource_action_method/index.js";
import { register as registerResourceActionMethodExecute } from "./tools/resource_action_metod_execute/index.js";
import { register as registerResources } from "./tools/resources/index.js";
import { register as registerSchemaInfo } from "./tools/schema_info/index.js";
import { register as registerCreateScript } from "./tools/scripts/create_script.js";
import { register as registerExecuteScript } from "./tools/scripts/execute_script.js";
import { register as registerUpdateScript } from "./tools/scripts/update_script.js";
import { register as registerViewScript } from "./tools/scripts/view_script.js";

export function createServer() {
	const server = new McpServer({
		name: "datocms",
		version: "1.0.0",
	});

	registerResources(server);
	registerResource(server);
	registerResourceAction(server);
	registerResourceActionMethod(server);

	if (datocmsClient) {
		registerSchemaInfo(server);
		registerResourceActionMethodExecute(server);
		registerCreateScript(server);
		registerUpdateScript(server);
		registerViewScript(server);
		registerExecuteScript(server);
	}

	return server;
}
