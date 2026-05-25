# Add generic record CRUD MCP tools

**Updated**: 2026-05-25 07:34
**Status**: verified
**Refs**: src/tools/filter-records.ts:49, src/tools/create-record.ts:14, src/tools/update-record.ts:13, src/tools/register.ts:12, src/cogover/records.ts:16, README.md:55

## Context
Đọc khi cần hiểu các MCP tool generic cho Cogover record list/filter/create/update trong `cgv-mcp`.

## Key findings
- `filter_records` mới gọi `listRecords` qua `/bapi/v1/records/list`, nhận `object_slug`, `filters`, `type`, `logic_sequence`, `fields`, `sorts`, `size`, `search_after`, `show_detail_on_record`, `client_time_zone`, `order_direction`.
- `filter_records` giữ `params` là `unknown` để caller truyền đúng shape theo `fieldType`; description nhắc truyền `fieldType` để tránh 400 với lookup/date/single_choice/between/boolean.
- `create_record` mới gọi `createRecord` qua `POST /bapi/v1/records`, nhận `records[]` gồm `object_type`, `data`, optional `client_time_zone`.
- `create_record` loop tuần tự từng item vì Cogover API không có batch create native; response trả `total`, `succeeded`, `failed`, `results[]` theo từng index để nhìn partial failure.
- `update_record` đã tồn tại trước đó, gọi `PUT /bapi/v1/records/{id}`, nhận `updates[]` gồm `record_id`, `object_type`, `data`; chỉ gửi field cần sửa, có thể gửi `null` để clear optional field.
- `src/cogover/records.ts` được mở rộng `orderDirection?: "next" | "previous"`, default vẫn `next` để không đổi behavior caller cũ.
- `registerAllTools` đã đăng ký `filter_records`, `create_record`, và giữ `update_record`.
- README đã document `filter_records`, `create_record`, `update_record` với ví dụ payload.
- Verify: Serena diagnostics sạch cho `src/tools/create-record.ts` và `src/tools/register.ts`; `npm run build` (`tsc`) exit 0. Repo không có prettier/eslint dependency/script.

## Related memories
- `architecture/cogover-mcp.md`
- `gotchas/cogover-filter-shape.md`
- `tasks/2026-05-25-filter-records-tool/summary.md`
