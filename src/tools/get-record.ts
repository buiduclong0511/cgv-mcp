import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listRecords } from "../cogover/records.js";
import { filters } from "../cogover/filters.js";
import {
  SERIAL_FIELD_BY_OBJECT,
  getSerialFieldSlug,
} from "../cogover/serial-fields.js";
import {
  requireClientAndUrl,
  respondError,
  respondJson,
  runSafe,
} from "./_shared.js";

export function registerGetRecord(server: McpServer): void {
  server.tool(
    "get_record",
    "Get a record by URL. Supports /s/{object_slug}/{serial} (uses hardcoded serial-field map) and /o/{object_slug}/{id}. App slug in pathname is optional. Pass identifier_field to override the serial field for /s/ URLs.",
    {
      url: z
        .string()
        .url()
        .describe(
          "Cogover record URL, e.g. https://{ws}.cogover.com/{app_slug}/s/{object_slug}/{serial} or .../o/{object_slug}/{id}",
        ),
      identifier_field: z
        .string()
        .optional()
        .describe(
          "Override the serial field slug for /s/ URLs. If omitted, falls back to the hardcoded map.",
        ),
      fields: z
        .array(z.string())
        .optional()
        .describe("Optional list of fields to return"),
    },
    async ({ url, identifier_field, fields }) => {
      const got = requireClientAndUrl(url);
      if (!got.ok) return got.error;
      const { client, urlInfo } = got.value;

      return runSafe(
        async () => {
          if (urlInfo.type === "o") {
            return listRecords(client, {
              objectSlug: urlInfo.objectSlug,
              filters: [filters.eq("id", urlInfo.identifier)],
              fields,
            });
          }

          const fieldSlug =
            identifier_field ?? getSerialFieldSlug(urlInfo.objectSlug);
          if (!fieldSlug) {
            const known = Object.keys(SERIAL_FIELD_BY_OBJECT).join(", ");
            return {
              error: `No serial field mapping for object "${urlInfo.objectSlug}". Known: [${known}]. Pass identifier_field to override.`,
            };
          }

          const result = await listRecords(client, {
            objectSlug: urlInfo.objectSlug,
            filters: [filters.eq(fieldSlug, urlInfo.identifier)],
            fields,
          });
          return { matchedField: fieldSlug, ...result };
        },
        (result) => {
          if (result && typeof result === "object" && "error" in result) {
            return respondError(
              String((result as { error: string }).error),
            );
          }
          return respondJson(result);
        },
      );
    },
  );
}
