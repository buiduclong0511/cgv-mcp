# Get bug returns linked tester notes

**Updated**: 2026-05-25 07:28
**Status**: verified
**Refs**: src/tools/get-bug.ts:7, src/tools/get-bug.ts:28, src/tools/get-bug.ts:49

## Context
Đọc khi cần hiểu thay đổi của MCP tool `get_bug` về việc trả kèm tester note / reopen reason liên quan bug.

## Key findings
- `get_bug` description đã được mở rộng để nói rõ tool trả bug detail kèm tester note activities liên quan bug, hỗ trợ cả `/s/` và `/o/` URL patterns.
- Khi caller truyền `fields`, tool tự thêm field `id` bằng `Set` để vẫn lấy được bug id cho lookup note khi URL dạng `/s/bug_tracking/<bug_auto_number>`.
- Sau khi fetch bug, tool lookup object `activity` với filter `bug_tracking = bugId` và `activity_type in ["note"]`, sort `created desc`, limit `size: 100`.
- Return shape hiện tại là `{ bug, notes }`; nếu không resolve được `bugId` thì trả `{ bug, notes: [] }`.
- Verify: `npm run build` chạy `tsc` exit 0 ngày 2026-05-25 07:28.

## Related memories
- `architecture/cogover-mcp.md`
- `gotchas/cogover-filter-shape.md`
