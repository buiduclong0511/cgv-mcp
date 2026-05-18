# Cogover /records/list filter — fieldType bắt buộc + format giá trị theo type

**Updated**: 2026-05-18 21:39
**Status**: verified
**Refs**: src/cogover/working-hours.ts:33-46, src/cogover/filters.ts

## Context
Khi build filter array cho `POST /bapi/v1/records/list`, BE trả **HTTP 400** nếu thiếu `fieldType` hoặc dùng sai format `params` theo type. Verified bằng curl khi build `get_working_hours`.

## Key findings

### `fieldType` BẮT BUỘC cho các operator/type sau
| Type filter | Cần fieldType? | Lý do |
|---|---|---|
| `between` (date / date_time / numeric) | ✅ | BE cần biết parse `params` thế nào |
| `lookup_normal` (vd `assignee`, `owner`) | ✅ | BE không infer được lookup từ field name |
| `single_choice` (vd `subtask_status`, `status`) | ✅ | Phân biệt với short_text |
| `date` vs `date_time` | ✅ | Quyết định format `params` (string vs ms) |
| `eq`/`=` trên short_text đơn giản (vd `subtask_auto_id`) | ❌ Optional | BE chấp nhận thiếu |

→ **Quy tắc an toàn**: LUÔN truyền `fieldType`. Thiếu = rủi ro 400.

### Format `params` theo fieldType
| fieldType | Format `params` | Ví dụ |
|---|---|---|
| `date` | String `"YYYY-MM-DD"` | `["2026-05-15", "2026-05-18"]` cho between |
| `date_time` | Timestamp **ms** (number) | `[1779062400000, 1779148799999]` |
| `lookup_normal` | Record ID string HOẶC `"$currentUser"` | `"PERQUDEQQEKM95"` hoặc `"$currentUser"` |
| `single_choice` | Slug option string | `"done"`, `"open"` |
| `boolean` | `1` (true) / `2` (false) trong filter (không phải `true`/`false`) | `1` |

### Field cụ thể trong project Cogover
| Field | fieldType đúng | Note |
|---|---|---|
| `due_date` | **`date`** (KHÔNG phải `date_time`!) | Date-only, dùng YYYY-MM-DD string |
| `updated`, `created` | `date_time` | Timestamp ms |
| `assignee` | `lookup_normal` | Personnel ID hoặc `$currentUser` |
| `subtask_status` | `single_choice` | `done`, `open`, ... |
| `subtask_auto_id` | `short_text` | Optional fieldType |

### Bug đã gặp trong session
Khi gọi `/records/list` với `due_date between [fromMs, toMs]` (ms) + thiếu `fieldType` → 400.
Fix: đổi sang `[fromStr, toStr]` (string YYYY-MM-DD) + `fieldType: "date"`.

### `$currentUser` token
Cho `lookup_normal` (assignee, owner, ...), thay vì hardcode personnel ID → dùng `"$currentUser"` để BE auto resolve theo API key user. Sạch hơn, không cần env var per-user.

## Curl smoke test (đã verify pass)
```json
{
  "object_slug": "development_subtask",
  "type": 1,
  "filters": [
    {"field": "assignee", "op": "=", "params": "$currentUser", "fieldType": "lookup_normal"},
    {"field": "subtask_status", "op": "=", "params": "done", "fieldType": "single_choice"},
    {"field": "due_date", "op": "between", "params": ["2026-05-18", "2026-05-18"], "fieldType": "date"}
  ]
}
```

## Khi nào cần revisit
- Khi Cogover docs liệt kê chính thức fieldType bắt buộc/optional theo operator.
- Khi BE thay đổi behavior (auto-infer fieldType).

## Related memories
- `mem:architecture/cogover-mcp`
- `mem:patterns/hours-arithmetic-decimal`
- Memory vault root: `wiki/concepts/cogover-api-records` (docs liệt kê operator nhưng không nhấn mạnh fieldType bắt buộc)
