# cgv-mcp — Modular Architecture

**Updated**: 2026-05-18 21:30
**Status**: verified
**Refs**: src/index.ts, src/cogover/, src/tools/, src/config/

## Context
Đọc khi đụng vào dự án cgv-mcp (MCP server cho Cogover API). Tóm tắt structure sau refactor 2026-05-18.

## Key findings

### Layered structure (sau refactor)
```
src/
├── index.ts                 # main() + connect StdioServerTransport (~25 dòng)
├── config/
│   ├── env.ts              # WS_DOMAIN, WORKSPACE_ID, API_BASE — env-overridable
│   └── store.ts            # readConfig/writeConfig — ~/.cgv-mcp/config.json
├── cogover/
│   ├── client.ts           # CogoverClient.post/.put — auth header + envelope unwrap + r-check + 30s AbortController
│   ├── errors.ts           # CogoverApiError(message, code, raw)
│   ├── schemas.ts          # Zod: ApiEnvelope, WrappedEnvelope, RowsPayload
│   ├── filters.ts          # Filter type + helpers eq/like/inOp + FieldType union
│   ├── url-parser.ts       # parseRecordUrl — optional app_slug
│   ├── serial-fields.ts    # SERIAL_FIELD_BY_OBJECT map (hardcoded vì /objects/list restricted)
│   ├── objects.ts          # listObjects + getObjectBySlug (NOTE: /objects/list bị restrict cho non-admin)
│   └── records.ts          # listRecords/createRecord/updateRecord/deleteRecords
└── tools/
    ├── _shared.ts          # Result<T> + requireClient/requireClientAndUrl + respond helpers + runSafe
    ├── register.ts         # registerAllTools(server) — gom 6 tool
    ├── set-api-key.ts
    ├── show-api-key.ts
    ├── get-task.ts
    ├── get-bug.ts
    ├── get-git-branches.ts
    └── get-record.ts       # Generic, dùng SERIAL_FIELD_BY_OBJECT map
```

### Layer responsibilities
- **`config/`** — chỉ env + persistent state, không network.
- **`cogover/`** — pure Cogover API logic, không biết MCP/tool.
- **`tools/`** — adapter MCP, thin layer mỗi tool 1 file ≤80 dòng.

### Key conventions
- `client.post/put` LUÔN unwrap envelope (cả flat `{r,msg,data}` và wrapped `{body:{...}}`), throw `CogoverApiError` khi `r != 0` hoặc HTTP non-2xx.
- Mọi request có 30s timeout qua AbortController (`src/cogover/client.ts`).
- `listRecords` auto inject `client_time_zone` từ `Intl.DateTimeFormat()` nếu caller không truyền.
- `Filter` field `params: unknown` + `fieldType?: FieldType` (optional vì BE chấp nhận thiếu cho `=`).
- Mỗi tool 1 file = `touch tools/foo.ts + 1 dòng vào register.ts`.

### Add tool mới — workflow
1. Tạo `src/tools/<name>.ts` export `register<Name>(server)`.
2. Inside: dùng `requireClient()` / `requireClientAndUrl(url)` từ `_shared.ts`.
3. Bọc API call bằng `runSafe(fn, formatSuccess)` để auto handle error.
4. Import + gọi trong `src/tools/register.ts`.

## Related memories
- `gotchas/cogover-objects-list-restricted.md`
- `tasks/refactor-modular/summary.md`
