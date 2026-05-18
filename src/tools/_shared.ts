import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { readConfig } from "../config/store.js";
import { CogoverClient } from "../cogover/client.js";
import { parseRecordUrl, type RecordUrlInfo } from "../cogover/url-parser.js";
import { CogoverApiError } from "../cogover/errors.js";

export function respondText(text: string): CallToolResult {
  return { content: [{ type: "text", text }] };
}

export function respondJson(value: unknown): CallToolResult {
  return respondText(JSON.stringify(value, null, 2));
}

export function respondError(text: string): CallToolResult {
  return {
    content: [{ type: "text", text }],
    isError: true,
  };
}

const MSG_NO_API_KEY =
  "No API key found. Use set_api_key to store one first.";
const MSG_BAD_URL =
  "Invalid URL format. Expected: /Software/s/{object_slug}/{id} or /o/{object_slug}/{id}";

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: CallToolResult };

export function requireClient(): Result<CogoverClient> {
  const config = readConfig();
  if (!config?.apiKey) return { ok: false, error: respondError(MSG_NO_API_KEY) };
  return { ok: true, value: new CogoverClient({ apiKey: config.apiKey }) };
}

export function requireClientAndUrl(
  url: string,
): Result<{ client: CogoverClient; urlInfo: RecordUrlInfo }> {
  const clientResult = requireClient();
  if (!clientResult.ok) return clientResult;
  const urlInfo = parseRecordUrl(url);
  if (!urlInfo) return { ok: false, error: respondError(MSG_BAD_URL) };
  return { ok: true, value: { client: clientResult.value, urlInfo } };
}

export async function runSafe<T>(
  fn: () => Promise<T>,
  formatSuccess: (value: T) => CallToolResult,
): Promise<CallToolResult> {
  try {
    const result = await fn();
    return formatSuccess(result);
  } catch (err) {
    if (err instanceof CogoverApiError) {
      return respondError(`Cogover API error: ${err.message}`);
    }
    const msg = err instanceof Error ? err.message : String(err);
    return respondError(`Unexpected error: ${msg}`);
  }
}
