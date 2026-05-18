import { API_BASE } from "../config/env.js";
import { CogoverApiError } from "./errors.js";
import { ApiEnvelope, WrappedEnvelope, type ApiEnvelopeT } from "./schemas.js";

export interface CogoverClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30000;

export class CogoverClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(opts: CogoverClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl ?? API_BASE;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  post<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  put<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  private async request<T>(
    method: "POST" | "PUT",
    path: string,
    body: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new CogoverApiError(
          `HTTP ${response.status} on ${path}`,
          response.status,
          await response.text(),
        );
      }

      const raw = await response.json();
      return unwrap<T>(raw, path);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new CogoverApiError(
          `Request timed out after ${this.timeoutMs}ms on ${path}`,
          -1,
          null,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

function unwrap<T>(raw: unknown, path: string): T {
  const wrapped = WrappedEnvelope.safeParse(raw);
  const envelope: ApiEnvelopeT = wrapped.success
    ? wrapped.data.body
    : ApiEnvelope.parse(raw);

  if (envelope.r !== undefined && envelope.r !== 0) {
    throw new CogoverApiError(
      envelope.msg ?? `Cogover error r=${envelope.r} on ${path}`,
      envelope.r,
      raw,
    );
  }

  return envelope.data as T;
}
