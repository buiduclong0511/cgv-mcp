import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listRecords } from "../cogover/records.js";
import { filters } from "../cogover/filters.js";
import { requireClientAndUrl, respondJson, runSafe } from "./_shared.js";

export function registerGetBug(server: McpServer): void {
  server.tool(
    "get_bug",
    "Get bug details from a Cogover bug_tracking URL together with any tester note activities (e.g. reopen reasons) linked to that bug. Supports /s/ (bug_auto_number) and /o/ (id) URL patterns.",
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
      const bugFields = fields
        ? Array.from(new Set([...fields, "id"]))
        : fields;

      return runSafe(
        async () => {
          const bug = await listRecords(client, {
            objectSlug: urlInfo.objectSlug,
            filters: [filters.eq(filterField, urlInfo.identifier)],
            fields: bugFields,
          });

          const bugId =
            urlInfo.type === "o"
              ? urlInfo.identifier
              : (bug.rows?.[0]?.id as string | undefined);
          if (typeof bugId !== "string") {
            return { bug, notes: [] };
          }

          const noteResult = await listRecords(client, {
            objectSlug: "activity",
            filters: [
              filters.eq("bug_tracking", bugId),
              { field: "activity_type", op: "in", params: ["note"] },
            ],
            fields: ["content", "created_by", "name"],
            sorts: [{ created: { order: "desc" } }],
            size: 100,
          });

          return { bug, notes: noteResult.rows ?? [] };
        },
        respondJson,
      );
    },
  );
}
