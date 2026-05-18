import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSetApiKey } from "./set-api-key.js";
import { registerShowApiKey } from "./show-api-key.js";
import { registerGetTask } from "./get-task.js";
import { registerGetBug } from "./get-bug.js";
import { registerGetGitBranches } from "./get-git-branches.js";
import { registerGetRecord } from "./get-record.js";

export function registerAllTools(server: McpServer): void {
  registerSetApiKey(server);
  registerShowApiKey(server);
  registerGetTask(server);
  registerGetBug(server);
  registerGetGitBranches(server);
  registerGetRecord(server);
}
