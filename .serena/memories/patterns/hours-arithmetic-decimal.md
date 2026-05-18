# Dùng decimal.js cho sum/compare giờ (tránh floating-point artifact)

**Updated**: 2026-05-18 21:39
**Status**: verified
**Refs**: src/cogover/working-hours.ts (totalHours), src/tools/get-working-hours.ts (diff + status compare)

## Context
Khi sum hoặc compare giá trị giờ (vd `man_hours_actual` 2 chữ số thập phân) bằng JS number, dễ bị artifact kiểu `15.999999999999998` thay vì `16`. Comparison `total >= expected` ra sai, status hiển thị "chưa đủ giờ" dù đã đủ.

## Bug class
```ts
// ❌ Floating-point sum + compare
const total = subtasks.reduce((s, x) => s + (x.man_hours_actual ?? 0), 0);
//   3.28 + 3.19 + 2.14 + ... ra 15.999...998 thay vì 16
const isEnough = total >= expected;  // ← false dù logic là true
```

Bug đã encounter: tổng `man_hours_actual` của 11 subtask = `15.999999999999998` thay vì 16, dù từng giá trị đều 2dp. Status sai.

## Fix pattern (đúng)
```ts
import { Decimal } from "decimal.js";

// Sum
const totalDec = subtasks.reduce((sum, x) => {
  const raw = x.man_hours_actual;
  if (raw === undefined || raw === null) return sum;
  try {
    return sum.plus(new Decimal(raw as Decimal.Value));
  } catch {
    return sum;
  }
}, new Decimal(0));

// Compare (chính xác tuyệt đối, không epsilon)
const expectedDec = new Decimal(workdays).times(perDay);
const diffDec = totalDec.minus(expectedDec);
const isEnough = totalDec.greaterThanOrEqualTo(expectedDec);

// Output (chuyển number cho JSON, round 2dp)
return {
  total_hours_actual: Number(totalDec.toFixed(2)),
  expected_hours: expectedDec.toNumber(),
  diff_hours: Number(diffDec.toFixed(2)),
  status: isEnough ? "đủ giờ" : "chưa đủ giờ",
};
```

## Quy tắc
- **Sum/compare** giờ/tiền/decimal → Decimal.
- **Output JSON** → convert về number qua `.toNumber()` hoặc `Number(d.toFixed(2))`. JSON không có Decimal native.
- **Try-catch** quanh `new Decimal(raw)` vì raw có thể là undefined/null/string không parse được.
- **Public type** vẫn có thể là `Decimal` nội bộ (vd `WorkingHoursResult.totalHours: Decimal`), chỉ convert ở layer cuối.

## Khi nào áp dụng pattern này
- Sum 1 list giá trị có 2+ chữ số thập phân (giờ, tiền, percent).
- Compare equality / >= với expected có decimal.
- Bất kỳ chỗ nào người dùng có thể thấy `15.999...998` hoặc `0.30000000000000004`.

## Khi nào KHÔNG cần
- Count integer (subtask_count, workdays_count): JS number OK.
- Multiply int × int: JS number OK trong giới hạn safe integer.

## Related memories
- `mem:architecture/cogover-mcp`
- `mem:tasks/2026-05-18-working-hours/summary`
