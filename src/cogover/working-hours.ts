import { Decimal } from "decimal.js";
import type { CogoverClient } from "./client.js";
import { filters } from "./filters.js";
import { listRecords } from "./records.js";

const SUBTASK_OBJECT_SLUG = "development_subtask";
const PAGE_SIZE = 100;

export type WorkingHoursDateField = "due_date" | "updated" | "created";

export interface FetchWorkingHoursParams {
  from: string;
  to: string;
  fromMs: number;
  toMs: number;
  assigneeId: string;
  status?: string;
  dateField?: WorkingHoursDateField;
}

export interface WorkingHoursSubtask {
  id?: string;
  name?: string;
  subtask_auto_id?: string;
  subtask_status?: string;
  man_hours_actual?: number;
  original_estimate?: number;
  due_date?: number;
  updated?: number;
  created?: number;
  link_subtask?: string;
  object_type?: string;
  [key: string]: unknown;
}

export interface WorkingHoursResult {
  totalHours: Decimal;
  count: number;
  subtasks: WorkingHoursSubtask[];
  pagesFetched: number;
}

export async function fetchWorkingHourSubtasks(
  client: CogoverClient,
  params: FetchWorkingHoursParams,
): Promise<WorkingHoursResult> {
  const status = params.status ?? "done";
  const dateField = params.dateField ?? "due_date";
  const isDateOnly = dateField === "due_date";

  const baseFilters = [
    filters.eq("assignee", params.assigneeId, "lookup_normal"),
    filters.eq("subtask_status", status, "single_choice"),
    isDateOnly
      ? filters.between(dateField, params.from, params.to, "date")
      : filters.between(dateField, params.fromMs, params.toMs, "date_time"),
  ];

  const fields = [
    "id",
    "name",
    "subtask_auto_id",
    "subtask_status",
    "man_hours_actual",
    "original_estimate",
    "due_date",
    "updated",
    "created",
    "link_subtask",
    "assignee",
    "object_type",
  ];

  let searchAfter: unknown[] | undefined = undefined;
  let pagesFetched = 0;
  const collected: WorkingHoursSubtask[] = [];

  while (true) {
    const page = await listRecords(client, {
      objectSlug: SUBTASK_OBJECT_SLUG,
      filters: baseFilters,
      type: 1,
      fields,
      size: PAGE_SIZE,
      searchAfter,
      sorts: [{ [dateField]: { order: "asc" } }],
    });
    pagesFetched += 1;

    const rows = (page.rows ?? []) as WorkingHoursSubtask[];
    collected.push(...rows);

    const nextCursor = page.search_after;
    if (
      !rows.length ||
      rows.length < PAGE_SIZE ||
      !Array.isArray(nextCursor) ||
      nextCursor.length === 0
    ) {
      break;
    }
    searchAfter = nextCursor;
  }

  const totalHours = collected.reduce((sum, item) => {
    const raw = item.man_hours_actual;
    if (raw === undefined || raw === null) return sum;
    try {
      return sum.plus(new Decimal(raw as Decimal.Value));
    } catch {
      return sum;
    }
  }, new Decimal(0));

  return {
    totalHours,
    count: collected.length,
    subtasks: collected,
    pagesFetched,
  };
}

export function countWeekdays(fromMs: number, toMs: number): number {
  if (toMs < fromMs) return 0;
  const start = new Date(fromMs);
  const end = new Date(toMs);
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  let count = 0;
  while (cur.getTime() <= last.getTime()) {
    const weekday = cur.getDay();
    if (weekday !== 0 && weekday !== 6) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
