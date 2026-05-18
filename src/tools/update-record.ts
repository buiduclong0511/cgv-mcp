import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { updateRecord } from "../cogover/records.js";
import { CogoverApiError } from "../cogover/errors.js";
import { requireClient, respondJson, runSafe } from "./_shared.js";

interface UpdateResult {
  record_id: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

export function registerUpdateRecord(server: McpServer): void {
  server.tool(
    "update_record",
    "Update records via PUT /bapi/v1/records/{id}. Loops through `updates` sequentially because Cogover API has NO native batch update. Partial update — only send fields that need to change (send null to clear). Returns per-item ok/error so partial failures are visible.",
    {
      updates: z
        .array(
          z.object({
            record_id: z.string().describe("Record ID (path param)"),
            object_type: z
              .string()
              .describe("Object type ID — required in body even though id is in URL"),
            data: z
              .record(z.unknown())
              .describe(
                "Field slug → value. Only fields to change. Send null to clear an optional field. Value shape depends on fieldType (date ISO string, datetime ms, lookup = record ID string, cascading = array, ...).",
              ),
          }),
        )
        .min(1)
        .max(200)
        .describe(
          "Batch list of record updates (max 200 per call to avoid rate limits)",
        ),
    },
    async ({ updates }) => {
      const got = requireClient();
      if (!got.ok) return got.error;
      const client = got.value;

      return runSafe(async () => {
        const results: UpdateResult[] = [];
        for (const item of updates) {
          try {
            const data = await updateRecord(client, {
              recordId: item.record_id,
              objectType: item.object_type,
              data: item.data,
            });
            results.push({ record_id: item.record_id, ok: true, data });
          } catch (err) {
            const error =
              err instanceof CogoverApiError
                ? `${err.message} (code=${err.code})`
                : err instanceof Error
                  ? err.message
                  : String(err);
            results.push({ record_id: item.record_id, ok: false, error });
          }
        }

        const succeeded = results.filter((r) => r.ok).length;
        const failed = results.length - succeeded;
        return {
          total: updates.length,
          succeeded,
          failed,
          results,
        };
      }, respondJson);
    },
  );
}
