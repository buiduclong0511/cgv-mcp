# cgv-mcp

Cogover MCP Server - tuong tac voi Cogover API thong qua Model Context Protocol.

## Cai dat

```bash
npm install
npm run build
```

## Cau hinh

Them vao Claude Code MCP settings:

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

Luu API key de xac thuc voi Cogover API.

### `show_api_key`

Hien thi API key dang duoc luu (da mask).

### `get_task`

Lay thong tin task tu Cogover URL. Ho tro ca 2 dang URL:
- `/Software/s/{object_slug}/{auto_task_id}`
- `/Software/o/{object_slug}/{id}`

### `get_git_branches`

Lay thong tin FE git branches tu mot development task URL. Tu dong tim activity note chua thong tin branch tuong ung.

## Tech Stack

- TypeScript
- MCP SDK (`@modelcontextprotocol/sdk`)
- Zod (validation)
