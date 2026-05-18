# Refactor monolithic index.ts → modular + add get_record

**Updated**: 2026-05-18 21:30
**Status**: verified
**Refs**: src/index.ts, src/cogover/**, src/tools/**, src/config/**

## Context
Refactor toàn bộ `src/index.ts` (371 dòng, 5 tool inline, hardcoded `stringee` domain, thiếu fieldType filter, không envelope unwrap, không timeout) thành cấu trúc modular + thêm tool `get_record` generic theo URL `/s/`-`/o/`.

## Key findings

### Thay đổi chính
1. **Tách `src/cogover/client.ts`** — `CogoverClient` class gom auth header + envelope unwrap (cả flat + wrapped) + check `r != 0` + 30s AbortController. Throw `CogoverApiError`.
2. **`src/config/env.ts`** — `WS_DOMAIN`, `WORKSPACE_ID` override qua `COGOVER_WS_DOMAIN` / `COGOVER_WORKSPACE_ID` env, default vẫn `stringee` / `WSFyWKI6moSXD`.
3. **`src/cogover/filters.ts`** — `Filter.params: unknown` (cũ chỉ `string|string[]`), `fieldType: FieldType` optional, helpers `filters.eq/like/inOp`.
4. **`src/cogover/url-parser.ts`** — regex hỗ trợ app_slug optional: `^\/(?:([^/]+)\/)?(s|o)\/([^/]+)\/([^/]+)$`.
5. **`src/cogover/records.ts`** — `listRecords/createRecord/updateRecord/deleteRecords`. Auto inject `client_time_zone` từ `Intl.DateTimeFormat()`.
6. **`src/cogover/serial-fields.ts`** — hardcode map object→serial-field (bug_tracking, development_task, development_subtask). Lý do hardcode: gotcha `cogover-objects-list-restricted`.
7. **`src/tools/_shared.ts`** — `Result<T>` discriminated union (thay vì `CogoverClient | CallToolResult` không narrow được) + `requireClient`/`requireClientAndUrl` + `respondText/Json/Error` + `runSafe(fn, formatSuccess)`.
8. **Tách 1 tool = 1 file** trong `src/tools/`. Thêm tool mới giờ chỉ cần `touch tools/<name>.ts + import vào register.ts`.
9. **Tool mới `get_record`** — generic, dùng SERIAL_FIELD_BY_OBJECT map cho `/s/` URLs, có override `identifier_field` arg.

### Hành vi/bug đã fix
- Trước: không check `r != 0` → silent failure. Giờ throw `CogoverApiError`.
- Trước: không handle envelope wrapped `{body:{...}}`. Giờ unwrap cả 2.
- Trước: fetch không timeout → tool có thể hang vô hạn. Giờ 30s AbortController.
- Trước: cast `as unknown` rồi access `.data.rows[0]` không validate. Giờ Zod parse `RowsPayload`.

### Pitfall encountered
- Initial `get_record` dùng `/objects/list` để dynamic detect serial field → fail vì endpoint bị restrict (xem `gotchas/cogover-objects-list-restricted.md`). Switch sang hardcoded map.

### Test
- `npm run build` pass clean (tsc strict mode).
- Smoke test qua MCP Inspector (`npx @modelcontextprotocol/inspector node dist/index.js`) — `set_api_key`, `show_api_key`, `get_task` (/s/), `get_bug` (/s/), `get_git_branches`, `get_record` (cả /s/ và /o/) đều OK.

## Related memories
- `architecture/cogover-mcp.md`
- `gotchas/cogover-objects-list-restricted.md`
