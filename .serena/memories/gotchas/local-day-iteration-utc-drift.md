# Đừng iterate ngày bằng `Math.floor(localMs/DAY_MS)` + `getUTCDay()`

**Updated**: 2026-05-18 21:39
**Status**: verified
**Refs**: src/cogover/working-hours.ts:124-137 (countWeekdays — fixed version)

## Context
Khi đếm số ngày làm việc (weekday) trong khoảng `[fromMs, toMs]` mà `fromMs/toMs` là **local-TZ ms** (vd từ `new Date(2026, 4, 15, 0, 0, 0).getTime()` ở Asia/Saigon +7), KHÔNG được dùng pattern `Math.floor(ms/DAY_MS)` + `getUTCDay()`. Sẽ drift 1 ngày với mọi timezone không phải UTC.

## Bug class
```ts
// ❌ WRONG — drift với TZ != UTC
const DAY_MS = 86400000;
const startDay = Math.floor(fromMs / DAY_MS);
const endDay = Math.floor(toMs / DAY_MS);
for (let day = startDay; day <= endDay; day++) {
  const date = new Date(day * DAY_MS);
  const weekday = date.getUTCDay();   // ← UTC weekday từ ms đã shift
  if (weekday !== 0 && weekday !== 6) count++;
}
```

### Tại sao sai (TZ +7 Asia/Saigon)
- `new Date(2026, 4, 15, 0, 0, 0).getTime()` = 15/05 **00:00 local** = 14/05 **17:00 UTC**
- `Math.floor(ms / 86400000)` ra UTC day index của **2026-05-14** (vì 17:00 vẫn cùng ngày UTC)
- Loop từ 14 → 18 = **5 ngày** thay vì 4
- Đếm `getUTCDay()`: Thu 14, Fri 15, Sat 16, Sun 17, Mon 18 → **3 weekday** (sai, đúng là 2: Fri 15 + Mon 18)

### Verify thực tế
```bash
node -e '
const DAY_MS = 86400000;
const fromMs = new Date(2026, 4, 15, 0, 0, 0).getTime();
const toMs = new Date(2026, 4, 18, 23, 59, 59, 999).getTime();
const days = [];
for (let d = Math.floor(fromMs/DAY_MS); d <= Math.floor(toMs/DAY_MS); d++) {
  days.push(new Date(d*DAY_MS).toISOString().slice(0,10));
}
console.log(days);  // [ "2026-05-14", "2026-05-15", "2026-05-16", "2026-05-17", "2026-05-18" ]
'
```
→ Loop sai bắt đầu từ 14/05 (UTC) dù input local là 15/05.

## Fix pattern (đúng)
```ts
// ✅ CORRECT — iterate local Date
const start = new Date(fromMs);
const end = new Date(toMs);
const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
let count = 0;
while (cur.getTime() <= last.getTime()) {
  const weekday = cur.getDay();           // ← local weekday
  if (weekday !== 0 && weekday !== 6) count += 1;
  cur.setDate(cur.getDate() + 1);          // ← local +1 day, auto handles DST/month/year
}
```

Key changes:
- Normalize về local-midnight: `new Date(y, m, d)` (KHÔNG có giờ).
- Iterate bằng `cur.setDate(cur.getDate() + 1)` — `Date` auto handle month rollover, DST, leap day.
- Weekday từ `getDay()` (local) — KHÔNG `getUTCDay()`.

## Bug class chung
Mọi logic "đếm/iterate theo ngày local" mà chuyển qua ms math + UTC accessor đều có bug này.

Examples:
- Đếm weekday/holiday trong range
- Group records theo ngày tạo (local)
- Trả về "ngày trong tháng" từ timestamp local

→ Quy tắc: nếu input là **local date** thì xử lý bằng `Date(y,m,d)` + `getDay/getMonth/getDate/setDate`, KHÔNG đụng vào ms division.

## Reproduce + fix verification
Đã verify cả OLD (count=3) và FIXED (count=2) bằng node CLI trên macOS TZ=Asia/Saigon. Output khớp lý thuyết.

## Related memories
- `mem:architecture/cogover-mcp`
- `mem:tasks/2026-05-18-working-hours/summary`
