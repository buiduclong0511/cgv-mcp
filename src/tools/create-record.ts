import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CogoverApiError } from "../cogover/errors.js";
import { createRecord } from "../cogover/records.js";
import { requireClient, respondJson, runSafe } from "./_shared.js";

interface CreateResult {
  index: number;
  object_type: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

export function registerCreateRecord(server: McpServer): void {
  server.tool(
    "create_record",
    "Create records via POST /bapi/v1/records. Loops through `records` sequentially because Cogover API has NO native batch create. Returns per-item ok/error so partial failures are visible.",
    {
      records: z
        .array(
          z.object({
            object_type: z
              .string()
              .describe("Object type ID required by Cogover records API"),
            data: z
              .record(z.unknown())
              .describe(
                "Field slug → value. Value shape depends on fieldType (date ISO string, datetime ms, lookup = record ID string, cascading = array, ...).",
              ),
            client_time_zone: z
              .string()
              .optional()
              .describe(
                "IANA timezone for date/datetime values. Defaults to local resolved timezone.",
              ),
          }),
        )
        .min(1)
        .max(200)
        .describe(
          "Batch list of records to create (max 200 per call to avoid rate limits)",
        ),
    },
    async ({ records }) => {
      const got = requireClient();
      if (!got.ok) return got.error;
      const client = got.value;

      return runSafe(async () => {
        const results: CreateResult[] = [];
        for (const [index, item] of records.entries()) {
          try {
            const data = await createRecord(client, {
              objectType: item.object_type,
              data: item.data,
              clientTimeZone: item.client_time_zone,
            });
            results.push({
              index,
              object_type: item.object_type,
              ok: true,
              data,
            });
          } catch (err) {
            const error =
              err instanceof CogoverApiError
                ? `${err.message} (code=${err.code})`
                : err instanceof Error
                  ? err.message
                  : String(err);
            results.push({
              index,
              object_type: item.object_type,
              ok: false,
              error,
            });
          }
        }

        const succeeded = results.filter((r) => r.ok).length;
        const failed = results.length - succeeded;
        return {
          total: records.length,
          succeeded,
          failed,
          results,
        };
      }, respondJson);
    },
  );
}
