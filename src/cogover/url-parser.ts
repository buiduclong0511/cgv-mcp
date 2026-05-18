export interface RecordUrlInfo {
  type: "s" | "o";
  appSlug?: string;
  objectSlug: string;
  identifier: string;
}

const PATH_RE = /^\/(?:([^/]+)\/)?(s|o)\/([^/]+)\/([^/]+)$/;

export function parseRecordUrl(url: string): RecordUrlInfo | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const match = parsed.pathname.match(PATH_RE);
  if (!match) return null;
  return {
    type: match[2] as "s" | "o",
    appSlug: match[1],
    objectSlug: match[3],
    identifier: match[4],
  };
}
