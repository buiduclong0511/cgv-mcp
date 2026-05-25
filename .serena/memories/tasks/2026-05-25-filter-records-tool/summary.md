# Add filter_records MCP tool

**Updated**: 2026-05-25 07:33
**Status**: verified
**Refs**: src/tools/filter-records.ts:1, src/tools/register.ts:10, src/cogover/records.ts:16, README.md:49

## Context
Đọc khi cần hiểu tool MCP generic để list/filter Cogover records qua `/bapi/v1/records/list`.

## Key findings
- `filter_records` là MCP adapter mới trong `src/tools/filter-records.ts`, gọi lại `listRecords` thay vì tự gọi HTTP trực tiếp.
- Input chính: `object_slug`, `filters`, `type`, `logic_sequence`, `fields`, `sorts`, `size`, `search_after`, `show_detail_on_record`, `client_time_zone`, `order_direction`.
- Filter schema cho phép các operator Cogover phổ biến (`=`, `!=`, range compare, `between`, `like`, `in`, `is null`, `not null`, ...), `params` là `unknown` để giữ đúng shape theo fieldType.
- Tool description nhắc luôn truyền `fieldType` khi có thể, vì memory `gotchas/cogover-filter-shape` đã verify thiếu `fieldType` dễ gây HTTP 400 với lookup/date/single_choice/between.
- `src/cogover/records.ts` được mở rộng `orderDirection?: "next" | "previous"`, default vẫn là `next`, nên các caller cũ không đổi behavior.
- `registerAllTools` đã đăng ký `registerFilterRecords(server)`.
- README đã thêm mục `filter_records` và ví dụ filter single_choice.
- Verify: Serena diagnostics sạch cho `src/tools/filter-records.ts`, `src/cogover/records.ts`, `src/tools/register.ts`; `npm run build` (`tsc`) exit 0.

## Related memories
- `architecture/cogover-mcp.md`
- `gotchas/cogover-filter-shape.md`
