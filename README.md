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

### `get_git_branches`

Lấy thông tin FE git branches từ một development task URL. Tự động tìm activity note chứa thông tin branch tương ứng.

## Tech Stack

- TypeScript
- MCP SDK (`@modelcontextprotocol/sdk`)
- Zod (validation)
