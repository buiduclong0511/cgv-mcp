import { z } from "zod";

export const ApiEnvelope = z.object({
  msg: z.string().optional(),
  r: z.number().optional(),
  data: z.unknown().optional(),
});

export const WrappedEnvelope = z.object({
  body: ApiEnvelope,
});

export type ApiEnvelopeT = z.infer<typeof ApiEnvelope>;

export const RowsPayload = z.object({
  rows: z.array(z.record(z.unknown())).optional(),
  search_after: z.array(z.unknown()).optional(),
});

export type RowsPayloadT = z.infer<typeof RowsPayload>;
