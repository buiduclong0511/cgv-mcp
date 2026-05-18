import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { writeConfig } from "../config/store.js";
import { respondText } from "./_shared.js";

export function registerSetApiKey(server: McpServer): void {
  server.tool(
    "set_api_key",
    "Save API key for Cogover API authentication",
    {
      api_key: z.string().describe("The API key to store"),
    },
    async ({ api_key }) => {
      writeConfig({ apiKey: api_key });
      return respondText("API key saved successfully.");
    },
  );
}
