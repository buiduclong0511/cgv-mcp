import { WORKSPACE_ID } from "../config/env.js";
import type { CogoverClient } from "./client.js";

export interface CogoverObjectField {
  id?: string;
  name?: string;
  slug: string;
  fieldType?: string;
  [key: string]: unknown;
}

export interface CogoverObject {
  id?: string;
  name?: string;
  slug: string;
  fields?: CogoverObjectField[];
  [key: string]: unknown;
}

export interface ListObjectsParams {
  pageSize?: number;
  keywords?: string[];
  includeFields?: boolean;
  includeRelatedLists?: boolean;
  includeOptions?: boolean;
  includeMetaData?: boolean;
  includeNonStandard?: boolean;
  includeWorkflowObjects?: boolean;
}

export async function listObjects(
  client: CogoverClient,
  params: ListObjectsParams = {},
): Promise<unknown> {
  const body = {
    workspace_id: WORKSPACE_ID,
    pageSize: params.pageSize ?? 2000,
    keywords: params.keywords ?? [],
    includeFields: params.includeFields ?? false,
    includeRelatedLists: params.includeRelatedLists ?? false,
    includeOptions: params.includeOptions ?? true,
    includeMetaData: params.includeMetaData ?? true,
    includeNonStandard: params.includeNonStandard ?? true,
    includeWorkflowObjects: params.includeWorkflowObjects ?? false,
  };
  return client.post("/objects/list", body);
}

function toObjectsArray(raw: unknown): CogoverObject[] {
  if (Array.isArray(raw)) return raw as CogoverObject[];
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r.rows)) return r.rows as CogoverObject[];
    if (Array.isArray(r.data)) return r.data as CogoverObject[];
  }
  return [];
}

export async function getObjectBySlug(
  client: CogoverClient,
  slug: string,
): Promise<CogoverObject | null> {
  const raw = await listObjects(client, {
    keywords: [slug],
    includeFields: true,
    pageSize: 5,
  });
  const objects = toObjectsArray(raw);
  return objects.find((o) => o.slug === slug) ?? objects[0] ?? null;
}

export function findSerialField(
  obj: CogoverObject,
): CogoverObjectField | null {
  return (
    obj.fields?.find((f) => f.fieldType === "auto_number") ??
    obj.fields?.find((f) => f.slug === "auto_task_id") ??
    obj.fields?.find((f) => f.slug === "bug_auto_number") ??
    null
  );
}
