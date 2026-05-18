import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listRecords } from "../cogover/records.js";
import { filters } from "../cogover/filters.js";
import {
  requireClientAndUrl,
  respondError,
  respondText,
  runSafe,
} from "./_shared.js";

export function registerGetGitBranches(server: McpServer): void {
  server.tool(
    "get_git_branches",
    "Get FE git branches from a Cogover development task URL. Extracts the task ID and fetches the activity note containing git branch info.",
    {
      url: z
        .string()
        .url()
        .describe(
          "Cogover task URL, e.g. https://stringee.cogover.com/Software/s/development_task/SPT-693",
        ),
    },
    async ({ url }) => {
      const got = requireClientAndUrl(url);
      if (!got.ok) return got.error;
      const { client, urlInfo } = got.value;

      return runSafe(
        async () => {
          let taskId: string;
          if (urlInfo.type === "o") {
            taskId = urlInfo.identifier;
          } else {
            const taskData = await listRecords(client, {
              objectSlug: urlInfo.objectSlug,
              filters: [filters.eq("auto_task_id", urlInfo.identifier)],
              fields: ["id"],
            });
            const id = taskData.rows?.[0]?.id;
            if (typeof id !== "string") {
              return null;
            }
            taskId = id;
          }

          const data = await listRecords(client, {
            objectSlug: "activity",
            filters: [
              filters.eq("development_task", taskId),
              filters.like("name", "FE git branches"),
              filters.like("content", "FE git branches"),
              { field: "activity_type", op: "in", params: ["note"] },
            ],
            logicSequence: "((1) AND (2 OR 3)) AND (4)",
            fields: ["content"],
            type: 3,
            sorts: [{ created: { order: "desc" } }],
          });

          const contentHtml = data.rows?.[0]?.content;
          return typeof contentHtml === "string" ? contentHtml : null;
        },
        (content) => {
          if (content === null) {
            return respondError(
              "No git branches activity found for this task.",
            );
          }
          return respondText(content);
        },
      );
    },
  );
}
