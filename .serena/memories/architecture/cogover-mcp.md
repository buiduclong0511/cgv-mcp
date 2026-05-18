# cgv-mcp — Modular Architecture

**Updated**: 2026-05-18 21:39
**Status**: verified
**Refs**: src/index.ts, src/cogover/, src/tools/, src/config/, package.json

## Context
Đọc khi đụng vào dự án cgv-mcp (MCP server cho Cogover API). Phản ánh state sau session 2026-05-18 (refactor + add working_hours + update_record + decimal.js).

## Key findings

### Layered structure
```
src/
├── index.ts                    # main() + StdioServerTransport (~25 dòng)
├── config/
│   ├── env.ts                  # WS_DOMAIN, WORKSPACE_ID, PERSONNEL_ID, API_BASE — env-overridable
│   └── store.ts                # readConfig/writeConfig — ~/.cgv-mcp/config.json
├── cogover/
│   ├── client.ts               # CogoverClient.post/.put — auth header + envelope unwrap + r-check + 30s AbortController
│   ├── errors.ts               # CogoverApiError(message, code, raw)
│   ├── schemas.ts              # Zod: ApiEnvelope, WrappedEnvelope, RowsPayload
│   ├── filters.ts              # Filter type + helpers eq/like/inOp/between/gte/lte + FieldType union
│   ├── url-parser.ts           # parseRecordUrl — optional app_slug
│   ├── serial-fields.ts        # SERIAL_FIELD_BY_OBJECT map (hardcoded vì /objects/list restricted)
│   ├── objects.ts              # listObjects + getObjectBySlug (`mem:gotchas/cogover-objects-list-restricted`)
│   ├── records.ts              # listRecords/createRecord/updateRecord/deleteRecords
│   └── working-hours.ts        # fetchWorkingHourSubtasks (auto-paginate) + countWeekdays (local TZ — `mem:gotchas/local-day-iteration-utc-drift`). Decimal.js cho sum.
└── tools/
    ├── _shared.ts              # Result<T> + requireClient/requireClientAndUrl + respond helpers + runSafe (kèm raw body từ CogoverApiError)
    ├── register.ts             # registerAllTools(server) — gom 8 tool
    ├── set-api-key.ts
    ├── show-api-key.ts
    ├── get-task.ts
    ├── get-bug.ts
    ├── get-git-branches.ts
    ├── get-record.ts           # Generic, dùng SERIAL_FIELD_BY_OBJECT map
    ├── get-working-hours.ts    # Sum man_hours_actual subtask done, expected = workdays × hours_per_day, Decimal compare
    └── update-record.ts        # Batch update (loop từng PUT vì Cogover không có batch native)
```

### Layer responsibilities
- **`config/`** — chỉ env + persistent state, không network.
- **`cogover/`** — pure Cogover API logic, không biết MCP/tool.
- **`tools/`** — adapter MCP, thin layer mỗi tool 1 file ≤120 dòng.

### Key conventions
- `client.post/put` LUÔN unwrap envelope (cả flat `{r,msg,data}` và wrapped `{body:{...}}`), throw `CogoverApiError` khi `r != 0` hoặc HTTP non-2xx.
- Mọi request có 30s timeout qua AbortController (`src/cogover/client.ts`).
- `listRecords` auto inject `client_time_zone` từ `Intl.DateTimeFormat()` nếu caller không truyền.
- `Filter` field `params: unknown` + `fieldType?: FieldType`. **BẮT BUỘC** truyền `fieldType` cho `between`, `lookup_normal`, `single_choice`, `date` — xem `mem:gotchas/cogover-filter-shape`.
- Mọi sum/compare giờ → dùng `Decimal` (decimal.js) — xem `mem:patterns/hours-arithmetic-decimal`.
- Tính ngày local-TZ → dùng `Date(yyyy, mm, dd)` + `getDay()` + `setDate()`, KHÔNG dùng `Math.floor(ms/DAY_MS)` + `getUTCDay()`.
- Mỗi tool 1 file = `touch tools/foo.ts + 1 dòng vào register.ts`.

### Tool inventory (8 tool)
| Tool | Purpose |
|---|---|
| `set_api_key` / `show_api_key` | Quản lý API key local (`~/.cgv-mcp/config.json`) |
| `get_task` | Lookup task qua URL `/s/development_task/SPT-...` |
| `get_bug` | Lookup bug qua URL `/s/bug_tracking/SBT-...` |
| `get_record` | Generic theo URL `/s/{slug}/{serial}` hoặc `/o/{slug}/{id}` |
| `get_git_branches` | List branch git local hiện tại |
| `get_working_hours` | Sum `man_hours_actual` subtask done trong [from, to], compute expected/diff/status |
| `update_record` | Batch update record qua loop PUT (Cogover không có batch update) |

### Add tool mới — workflow
1. Tạo `src/tools/<name>.ts` export `register<Name>(server)`.
2. Inside: dùng `requireClient()` / `requireClientAndUrl(url)` từ `_shared.ts`.
3. Bọc API call bằng `runSafe(fn, formatSuccess)` để auto handle error.
4. Import + gọi trong `src/tools/register.ts`.
5. Add Cogover-side logic vào `src/cogover/<module>.ts` thay vì viết inline trong tool.

### Dev commands
- `npm run build` — `tsc` only.
- `npm run dev` — `tsc && DANGEROUSLY_OMIT_AUTH=true npx @modelcontextprotocol/inspector node dist/index.js`. Mở Inspector tại `http://localhost:6274`, không cần token (chỉ local).
- `npm start` — `node dist/index.js`. Chạy MCP qua stdio (cho production / MCP client spawn).

### Dependencies
- `@modelcontextprotocol/sdk` — MCP server framework
- `zod` — schema validation
- `decimal.js` — arithmetic chính xác cho hours/money/decimal nói chung

## Related memories
- `mem:gotchas/cogover-objects-list-restricted`
- `mem:gotchas/cogover-filter-shape`
- `mem:gotchas/local-day-iteration-utc-drift`
- `mem:patterns/hours-arithmetic-decimal`
- `mem:tasks/refactor-modular/summary`
- `mem:tasks/2026-05-18-working-hours/summary`
