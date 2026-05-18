# /objects/list bị restrict cho API token non-admin

**Updated**: 2026-05-18 21:30
**Status**: verified
**Refs**: src/cogover/objects.ts, src/cogover/serial-fields.ts

## Context
Khi cần lookup schema (vd tìm field identifier của 1 object trước khi filter records), endpoint `/bapi/v1/objects/list` có thể trả `{totalItems: 0, items: []}` ngay cả khi user list được records của chính object đó. Lỗi vai trò, không phải bug code.

## Key findings
- Verified bằng curl 5 variation body khác nhau (có/không workspace_id, snake_case, body rỗng, includeWorkflowObjects=true) → tất cả HTTP 200 + `totalItems: 0`.
- Cùng API token đó list được records `bug_tracking`, `development_task` qua `/records/list` bình thường.
- Kết luận: `/objects/list` chỉ trả object mà user có vai trò **Quản lý** (admin của object), không phải vai trò view records.
- Wiki docs (memory `cogover-api-objects`) không note rõ permission split này — cần update khi confirm với admin.

## Workaround đang dùng
Bypass `/objects/list` cho serial→field lookup. Hardcode map `SERIAL_FIELD_BY_OBJECT` trong `src/cogover/serial-fields.ts`:
```ts
{
  bug_tracking: "bug_auto_number",
  development_task: "auto_task_id",
  development_subtask: "subtask_auto_id",
}
```
Khi gặp object mới → thêm vào map. Tool `get_record` cũng expose `identifier_field` arg để override ad-hoc.

## Khi nào cần revisit
- Khi có API token admin → có thể dynamic lookup, bỏ hardcode map.
- Khi Cogover docs làm rõ scope của `/objects/list` permission.

## Related memories
- `architecture/cogover-mcp.md`
- Memory vault: `wiki/concepts/cogover-api-objects` (chưa cảnh báo về permission này)
