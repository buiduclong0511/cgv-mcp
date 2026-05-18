const DEFAULT_WS_DOMAIN = "stringee";
const DEFAULT_WORKSPACE_ID = "WSFyWKI6moSXD";

export const WS_DOMAIN = process.env.COGOVER_WS_DOMAIN ?? DEFAULT_WS_DOMAIN;
export const WORKSPACE_ID =
  process.env.COGOVER_WORKSPACE_ID ?? DEFAULT_WORKSPACE_ID;

export const API_BASE = `https://${WS_DOMAIN}.cogover.com/bapi/v1`;
