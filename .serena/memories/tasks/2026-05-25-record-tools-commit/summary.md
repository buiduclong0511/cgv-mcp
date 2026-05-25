# Commit generic record MCP tools

**Updated**: 2026-05-25 07:39
**Status**: verified
**Refs**: src/tools/filter-records.ts:49, src/tools/create-record.ts:14, src/tools/update-record.ts:13, src/tools/register.ts:10, src/cogover/records.ts:16, README.md:49

## Context
Đọc khi cần hiểu commit bổ sung generic Cogover record MCP tools trước khi push nhánh `main`.

## Key findings
- `filter_records` được thêm để list/filter records qua `/bapi/v1/records/list`, hỗ trợ filter logic, fields, sorts, cursor pagination, timezone và `order_direction`.
- `create_record` được thêm để tạo records qua `/bapi/v1/records`, loop tuần tự từng item và trả kết quả per-item để thấy partial failure.
- `update_record` đã có sẵn và được document trong README cùng `filter_records` và `create_record`.
- `listRecords` trong `src/cogover/records.ts` hỗ trợ `orderDirection?: "next" | "previous"`, default `next` để giữ tương thích caller cũ.
- `registerAllTools` đăng ký `filter_records` và `create_record` cùng các tool record hiện có.
- Memory chi tiết hơn đã được ghi ở `tasks/2026-05-25-filter-records-tool/summary.md` và `tasks/2026-05-25-record-crud-tools/summary.md`.

## Related memories
- `tasks/2026-05-25-filter-records-tool/summary.md`
- `tasks/2026-05-25-record-crud-tools/summary.md`
- `architecture/cogover-mcp.md`
- `gotchas/cogover-filter-shape.md`
