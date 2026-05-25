import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listRecords } from "../cogover/records.js";
import { requireClient, respondJson, runSafe } from "./_shared.js";

const filterSchema = z.object({
  field: z.string().describe("Field slug to filter on"),
  op: z
    .enum([
      "=",
      "!=",
      "<",
      "<=",
      ">",
      ">=",
      "between",
      "like",
      "not like",
      "startsWith",
      "endsWith",
      "in",
      "not in",
      "is null",
      "not null",
    ])
    .describe("Filter operator supported by Cogover /records/list"),
  params: z
    .unknown()
    .optional()
    .describe(
      'Filter value. Examples: "done", "$currentUser", ["2026-05-01", "2026-05-31"], 1 for boolean true, 2 for boolean false.',
    ),
  fieldType: z
    .string()
    .optional()
    .describe(
      "Cogover field type. Strongly recommended, and required for lookup_normal, single_choice, date/date_time, between, boolean, etc.",
    ),
});

const sortSchema = z
  .record(
    z.object({
      order: z.enum(["asc", "desc"]),
    }),
  )
  .describe('Sort list item, e.g. {"created":{"order":"desc"}}');

export function registerFilterRecords(server: McpServer): void {
  server.tool(
    "filter_records",
    "List/filter Cogover records via POST /bapi/v1/records/list. Supports filters, AND/OR/custom logic, fields, sorts, cursor pagination, result size, detail mode, timezone, and order direction.",
    {
      object_slug: z
        .string()
        .describe(
          "Cogover object slug to list records from, e.g. development_task, bug_tracking, activity.",
        ),
      filters: z
        .array(filterSchema)
        .optional()
        .describe(
          'Optional Cogover filters. Always pass fieldType when possible, e.g. [{"field":"status","op":"=","params":"done","fieldType":"single_choice"}].',
        ),
      type: z
        .union([z.literal(1), z.literal(2), z.literal(3)])
        .optional()
        .describe("Filter logic: 1=AND, 2=OR, 3=custom logic_sequence."),
      logic_sequence: z
        .string()
        .optional()
        .describe(
          'Custom filter logic when type=3, e.g. "(1 AND (2 OR 3))".',
        ),
      fields: z
        .array(z.string())
        .optional()
        .describe("Optional field slugs to return."),
      sorts: z
        .array(sortSchema)
        .optional()
        .describe('Optional sort array, e.g. [{"created":{"order":"desc"}}].'),
      size: z
        .number()
        .int()
        .positive()
        .max(100)
        .optional()
        .describe("Number of records to return. Default 20, max 100."),
      search_after: z
        .array(z.unknown())
        .optional()
        .describe(
          "Cursor from the previous response meta.search_after for the next/previous page.",
        ),
      show_detail_on_record: z
        .boolean()
        .optional()
        .describe(
          "Return detailed per-field metadata (cu/cv permissions). Default false.",
        ),
      client_time_zone: z
        .string()
        .optional()
        .describe(
          "IANA timezone for date/datetime filters. Defaults to local resolved timezone.",
        ),
      order_direction: z
        .enum(["next", "previous"])
        .optional()
        .describe("Cursor direction. Default next."),
    },
    async ({
      object_slug,
      filters,
      type,
      logic_sequence,
      fields,
      sorts,
      size,
      search_after,
      show_detail_on_record,
      client_time_zone,
      order_direction,
    }) => {
      const got = requireClient();
      if (!got.ok) return got.error;

      return runSafe(
        () =>
          listRecords(got.value, {
            objectSlug: object_slug,
            filters,
            type,
            logicSequence: logic_sequence,
            fields,
            sorts,
            size: size ?? 20,
            searchAfter: search_after,
            orderDirection: order_direction,
            showDetailOnRecord: show_detail_on_record,
            clientTimeZone: client_time_zone,
          }),
        respondJson,
      );
    },
  );
}
