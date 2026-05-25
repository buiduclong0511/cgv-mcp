# cgv-mcp

Cogover MCP Server - tương tác với Cogover API thông qua Model Context Protocol.

## Cài đặt

```bash
npm install
npm run build
```

## Cấu hình

Thêm vào Claude Code MCP settings:

```json
{
  "mcpServers": {
    "cgv-mcp": {
      "command": "node",
      "args": ["/path/to/cgv-mcp/dist/index.js"]
    }
  }
}
```

## Tools

### `set_api_key`

Lưu API key để xác thực với Cogover API.

### `show_api_key`

Hiển thị API key đang được lưu (đã ẩn bớt).

### `get_task`

Lấy thông tin task từ Cogover URL. Hỗ trợ cả 2 dạng URL:
- `/Software/s/{object_slug}/{auto_task_id}`
- `/Software/o/{object_slug}/{id}`

### `get_bug`

Lấy thông tin bug từ Cogover URL của object `bug_tracking`. Hỗ trợ cả 2 dạng URL:
- `/Software/s/bug_tracking/{bug_auto_number}` (ví dụ `SBT-4089`)
- `/Software/o/bug_tracking/{id}`

### `get_record`

Lấy thông tin record từ Cogover URL. Hỗ trợ cả 2 dạng URL:
- `/Software/s/{object_slug}/{serial}`
- `/Software/o/{object_slug}/{id}`

### `filter_records`

Lọc/lấy danh sách record qua `/bapi/v1/records/list`. Hỗ trợ truyền:
- `object_slug`
- `filters`
- `type` (`1` = AND, `2` = OR, `3` = custom)
- `logic_sequence`
- `fields`
- `sorts`
- `size`
- `search_after`
- `show_detail_on_record`
- `client_time_zone`
- `order_direction`

Ví dụ filter:

```json
{
  "object_slug": "development_task",
  "filters": [
    {
      "field": "status",
      "op": "=",
      "params": "done",
      "fieldType": "single_choice"
    }
  ],
  "sorts": [{ "created": { "order": "desc" } }],
  "size": 20
}
```

### `create_record`

Tạo record qua `/bapi/v1/records`. Tool nhận `records` dạng danh sách và gọi tuần tự từng item vì Cogover API không có batch create native.

Ví dụ:

```json
{
  "records": [
    {
      "object_type": "OT390PQECKYOM",
      "data": {
        "name": "Khách hàng mới",
        "status": "new"
      }
    }
  ]
}
```

### `update_record`

Sửa record qua `/bapi/v1/records/{id}`. Tool nhận `updates` dạng danh sách, chỉ gửi các field cần sửa; gửi `null` để clear field optional.

Ví dụ:

```json
{
  "updates": [
    {
      "record_id": "LEA67HXQGEKMPQ",
      "object_type": "OT390PQECKYOM",
      "data": {
        "status": "done"
      }
    }
  ]
}
```

### `get_git_branches`

Lấy thông tin FE git branches từ một development task URL. Tự động tìm activity note chứa thông tin branch tương ứng.

## Tech Stack

- TypeScript
- MCP SDK (`@modelcontextprotocol/sdk`)
- Zod (validation)
