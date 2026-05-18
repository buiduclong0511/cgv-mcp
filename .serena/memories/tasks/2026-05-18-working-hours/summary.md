# Session 2026-05-18 — Add working_hours + update_record tools

**Updated**: 2026-05-18 21:39
**Status**: verified
**Refs**: src/cogover/working-hours.ts, src/tools/get-working-hours.ts, src/tools/update-record.ts, src/cogover/filters.ts, src/config/env.ts, package.json

## Context
Session thêm 2 tool MCP mới + decimal.js + fix bug + update skill `/cgv-task`. Mục tiêu: tính giờ làm + fill giờ thiếu vào subtask lệch estimate.

## Thay đổi chính

### 1. Tool mới `get_working_hours`
- File: `src/tools/get-working-hours.ts`
- Cogover module: `src/cogover/working-hours.ts`
  - `fetchWorkingHourSubtasks` — auto paginate `/records/list` qua `search_after` (size 100)
  - `countWeekdays(fromMs, toMs)` — đếm ngày T2-T6 trong khoảng (local TZ)
- Filter: `assignee=$currentUser`, `subtask_status=done`, `due_date between [from, to]`
- Output: workdays_count, expected_hours, total_hours_actual, diff_hours, status, subtasks[]
- Params: from/to (YYYY-MM-DD), assignee_id?, status?, date_field?, hours_per_day?, include_subtasks?

### 2. Tool mới `update_record`
- File: `src/tools/update-record.ts`
- Cogover-side đã có `updateRecord` trong `records.ts`
- Batch update qua **loop sequential PUT /records/{id}** vì Cogover KHÔNG có batch update native
- Return per-item `{record_id, ok, data?|error?}` + `{total, succeeded, failed}` — partial failure visible
- Max 200 updates/call

### 3. `src/cogover/filters.ts` — thêm helpers
- `between(field, from, to, fieldType?)`, `gte`, `lte`

### 4. `src/config/env.ts` — thêm
- `PERSONNEL_ID` (default `PERQUDEQQEKM95` cho longbd, override qua `COGOVER_PERSONNEL_ID`) — sau đó tool default sang `"$currentUser"` luôn nên ít dùng

### 5. `decimal.js` (npm install)
- Sum `man_hours_actual` qua `Decimal.plus` → tránh `15.999...998`
- Compare `totalHours >= expectedHours` qua `Decimal.greaterThanOrEqualTo` → status chính xác
- Xem `mem:patterns/hours-arithmetic-decimal`

### 6. `_shared.ts runSafe` — show raw body khi CogoverApiError
- Thêm `\nRaw: ${rawText.slice(0, 1500)}` cho error message → debug API 400 dễ hơn

### 7. `package.json` — thêm script
- `npm run dev` = `tsc && DANGEROUSLY_OMIT_AUTH=true npx @modelcontextprotocol/inspector node dist/index.js`

### 8. Skill `/cgv-task` (`~/.claude/skills/cgv-task/`)
- v1.2 → v1.4
- `reference/working-hours.md` — rewrite để gắn tool `mcp__cgv-mcp__get_working_hours`
- `reference/fill-working-hours.md` (NEW) — algorithm water-filling distribute giờ thiếu vào subtask gap
- `SKILL.md` — thêm trigger + bảng row

## Bugs đã fix trong session

### Bug 1: `/records/list` HTTP 400 do thiếu `fieldType`
- Symptom: tool call → "Cogover API error: HTTP 400 on /records/list"
- Cause: thiếu `fieldType` cho `between`, `lookup_normal`, `single_choice`
- Cause 2: dùng `due_date` với ms (`date_time`) thay vì string YYYY-MM-DD (`date`)
- Fix: add `fieldType` cho 3 filter; đổi `due_date` sang string + `fieldType: "date"`
- Side fix: default `assignee` từ hardcoded `PERQUDEQQEKM95` → `"$currentUser"` token
- Memory: `mem:gotchas/cogover-filter-shape`

### Bug 2: `countWeekdays` đếm sai workday do UTC drift
- Symptom: range 2026-05-15 → 2026-05-18 (Fri-Sat-Sun-Mon, local TZ +7) ra `workdays_count = 3` thay vì 2
- Cause: `Math.floor(localMs/DAY_MS)` ra UTC day index → start ở UTC 14/05 (Thu) thay vì local 15/05 (Fri)
- Fix: chuyển sang `Date(y,m,d)` iteration + `getDay()` local
- Memory: `mem:gotchas/local-day-iteration-utc-drift`

### Bug 3: FP artifact `total_hours_actual = 15.999...998`
- Symptom: sau khi fill giờ exact 16h, vẫn báo "chưa đủ giờ"
- Cause: JS number sum
- Fix: Decimal.js
- Memory: `mem:patterns/hours-arithmetic-decimal`

## Smoke test cuối session
- `get_working_hours` from=2026-05-15 to=2026-05-18 → `workdays_count=2, expected=16, total=16, status="đủ giờ"` ✅
- `update_record` 6 subtask fill water-filling 0.57h → `succeeded: 6/6` ✅

## End state
- 8 tool MCP (`set/show_api_key`, `get_task`, `get_bug`, `get_record`, `get_git_branches`, `get_working_hours`, `update_record`)
- `npm run build` pass clean
- Skill `/cgv-task` v1.4 với 4 reference file

## Related memories
- `mem:architecture/cogover-mcp`
- `mem:gotchas/cogover-filter-shape`
- `mem:gotchas/local-day-iteration-utc-drift`
- `mem:patterns/hours-arithmetic-decimal`
- `mem:tasks/refactor-modular/summary` (session trước, refactor base)
