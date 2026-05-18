import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readConfig } from "../config/store.js";
import { respondText } from "./_shared.js";

export function registerShowApiKey(server: McpServer): void {
  server.tool(
    "show_api_key",
    "Show the currently stored API key",
    {},
    async () => {
      const config = readConfig();
      if (!config?.apiKey) {
        return respondText("No API key found. Use set_api_key to store one.");
      }
      const masked =
        config.apiKey.slice(0, 4) + "****" + config.apiKey.slice(-4);
      return respondText(
        `Stored API key: ${masked}\nFull key length: ${config.apiKey.length} characters`,
      );
    },
  );
}
