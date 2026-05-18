import { WORKSPACE_ID } from "../config/env.js";
import type { CogoverClient } from "./client.js";
import type { Filter, FilterLogic } from "./filters.js";
import { RowsPayload, type RowsPayloadT } from "./schemas.js";

export interface RecordSort {
  [field: string]: { order: "asc" | "desc" };
}

export interface ListRecordsParams {
  objectSlug: string;
  filters?: Filter[];
  type?: FilterLogic;
  logicSequence?: string;
  fields?: string[];
  sorts?: RecordSort[];
  size?: number;
  searchAfter?: unknown[];
  showDetailOnRecord?: boolean;
  clientTimeZone?: string;
}

const DEFAULT_TZ =
  Intl.DateTimeFormat().resolvedOptions().timeZone ?? "Asia/Saigon";

export async function listRecords(
  client: CogoverClient,
  params: ListRecordsParams,
): Promise<RowsPayloadT> {
  const body = {
    order_direction: "next",
    workspace_id: WORKSPACE_ID,
    size: params.size ?? 1,
    search_after: params.searchAfter ?? [],
    logic_sequence: params.logicSequence ?? "",
    show_detail_on_record: params.showDetailOnRecord ?? false,
    filters: params.filters ?? [],
    type: params.type ?? 1,
    object_slug: params.objectSlug,
    client_time_zone: params.clientTimeZone ?? DEFAULT_TZ,
    ...(params.fields ? { fields: params.fields } : {}),
    ...(params.sorts ? { sorts: params.sorts } : {}),
  };

  const data = await client.post<unknown>("/records/list", body);
  return RowsPayload.parse(data ?? {});
}

export interface CreateRecordParams {
  objectType: string;
  data: Record<string, unknown>;
  clientTimeZone?: string;
}

export async function createRecord(
  client: CogoverClient,
  params: CreateRecordParams,
): Promise<{ id?: string } & Record<string, unknown>> {
  const body = {
    object_type: params.objectType,
    data: params.data,
    client_time_zone: params.clientTimeZone ?? DEFAULT_TZ,
  };
  const data = await client.post<{ id?: string }>("/records", body);
  return data ?? {};
}

export interface UpdateRecordParams {
  recordId: string;
  objectType: string;
  data: Record<string, unknown>;
}

export async function updateRecord(
  client: CogoverClient,
  params: UpdateRecordParams,
): Promise<unknown> {
  const body = {
    object_type: params.objectType,
    data: params.data,
  };
  return client.put(`/records/${params.recordId}`, body);
}

export interface DeleteRecordsParams {
  objectType: string;
  ids: string[];
}

export interface DeleteRecordsResult {
  deleted?: string[];
  not_deleted?: string[];
}

export async function deleteRecords(
  client: CogoverClient,
  params: DeleteRecordsParams,
): Promise<DeleteRecordsResult> {
  const data = await client.post<DeleteRecordsResult>("/records/delete", {
    object_type: params.objectType,
    ids: params.ids,
  });
  return data ?? {};
}
