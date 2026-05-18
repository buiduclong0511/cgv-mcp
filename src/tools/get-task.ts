import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listRecords } from "../cogover/records.js";
import { filters } from "../cogover/filters.js";
import { requireClientAndUrl, respondJson, runSafe } from "./_shared.js";

export function registerGetTask(server: McpServer): void {
  server.tool(
    "get_task",
    "Get task details from a Cogover URL. Supports /s/ (auto_task_id) and /o/ (id) URL patterns.",
    {
      url: z
        .string()
        .url()
        .describe(
          "Cogover task URL, e.g. https://stringee.cogover.com/Software/s/development_task/SPT-693",
        ),
      fields: z
        .array(z.string())
        .optional()
        .describe("Optional list of fields to return"),
    },
    async ({ url, fields }) => {
      const got = requireClientAndUrl(url);
      if (!got.ok) return got.error;
      const { client, urlInfo } = got.value;

      const filterField = urlInfo.type === "s" ? "auto_task_id" : "id";

      return runSafe(
        () =>
          listRecords(client, {
            objectSlug: urlInfo.objectSlug,
            filters: [filters.eq(filterField, urlInfo.identifier)],
            fields,
          }),
        respondJson,
      );
    },
  );
}
