import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listRecords } from "../cogover/records.js";
import { filters } from "../cogover/filters.js";
import { requireClientAndUrl, respondJson, runSafe } from "./_shared.js";

export function registerGetBug(server: McpServer): void {
  server.tool(
    "get_bug",
    "Get bug details from a Cogover bug_tracking URL. Supports /s/ (bug_auto_number) and /o/ (id) URL patterns.",
    {
      url: z
        .string()
        .url()
        .describe(
          "Cogover bug URL, e.g. https://stringee.cogover.com/Software/s/bug_tracking/SBT-4089",
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

      const filterField = urlInfo.type === "s" ? "bug_auto_number" : "id";

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
