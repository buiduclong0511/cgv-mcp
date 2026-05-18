import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Decimal } from "decimal.js";
import { z } from "zod";
import {
  countWeekdays,
  fetchWorkingHourSubtasks,
} from "../cogover/working-hours.js";
import { requireClient, respondJson, runSafe } from "./_shared.js";

const DATE_FIELDS = ["due_date", "updated", "created"] as const;

function parseDate(input: string, endOfDay: boolean): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
  return date.getTime();
}

export function registerGetWorkingHours(server: McpServer): void {
  server.tool(
    "get_working_hours",
    "Sum man_hours_actual of completed (status=done by default) development_subtask records assigned to the user within [from, to] (inclusive). Auto-paginates through all pages. Returns total hours, expected hours (weekdays × hours_per_day), and the matching subtask list.",
    {
      from: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Start date inclusive, format YYYY-MM-DD (local timezone)"),
      to: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("End date inclusive, format YYYY-MM-DD (local timezone)"),
      assignee_id: z
        .string()
        .optional()
        .describe(
          `Personnel ID or "$currentUser" (default). Override with a specific ID to query another person.`,
        ),
      status: z
        .string()
        .optional()
        .describe("subtask_status value to match (default: done)"),
      date_field: z
        .enum(DATE_FIELDS)
        .optional()
        .describe(
          "Which date field to filter by. Default: due_date. Alternatives: updated, created.",
        ),
      hours_per_day: z
        .number()
        .positive()
        .optional()
        .describe("Expected hours per working day (default 8)"),
      include_subtasks: z
        .boolean()
        .optional()
        .describe(
          "Include the full matching subtask list in the response (default true).",
        ),
    },
    async ({
      from,
      to,
      assignee_id,
      status,
      date_field,
      hours_per_day,
      include_subtasks,
    }) => {
      const got = requireClient();
      if (!got.ok) return got.error;

      const fromMs = parseDate(from, false);
      const toMs = parseDate(to, true);
      if (fromMs === null || toMs === null || fromMs > toMs) {
        return runSafe(
          async () => ({
            error:
              "Invalid date range. Expect from/to as YYYY-MM-DD and from <= to.",
          }),
          respondJson,
        );
      }

      const assignee = assignee_id ?? "$currentUser";
      const perDay = hours_per_day ?? 8;
      const includeList = include_subtasks ?? true;

      return runSafe(
        async () => {
          const result = await fetchWorkingHourSubtasks(got.value, {
            from,
            to,
            fromMs,
            toMs,
            assigneeId: assignee,
            status,
            dateField: date_field,
          });

          const workdays = countWeekdays(fromMs, toMs);
          const expectedHoursDec = new Decimal(workdays).times(perDay);
          const diffDec = result.totalHours.minus(expectedHoursDec);
          const isEnough = result.totalHours.greaterThanOrEqualTo(
            expectedHoursDec,
          );

          return {
            range: { from, to },
            filters: {
              assignee_id: assignee,
              status: status ?? "done",
              date_field: date_field ?? "due_date",
            },
            workdays_count: workdays,
            hours_per_day: perDay,
            expected_hours: expectedHoursDec.toNumber(),
            total_hours_actual: Number(result.totalHours.toFixed(2)),
            diff_hours: Number(diffDec.toFixed(2)),
            status: isEnough ? "đủ giờ" : "chưa đủ giờ",
            subtask_count: result.count,
            pages_fetched: result.pagesFetched,
            ...(includeList
              ? {
                  subtasks: result.subtasks.map((item) => ({
                    id: item.id,
                    subtask_auto_id: item.subtask_auto_id,
                    name: item.name,
                    subtask_status: item.subtask_status,
                    man_hours_actual: item.man_hours_actual,
                    original_estimate: item.original_estimate,
                    due_date: item.due_date,
                    link_subtask: item.link_subtask,
                    object_type: item.object_type,
                  })),
                }
              : {}),
          };
        },
        respondJson,
      );
    },
  );
}
