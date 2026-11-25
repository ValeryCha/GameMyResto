# VISUAL-8.5 — 4 конфорки на плите (только визуал)

**Статус:** Phase 0/1 ✅ (инвентаризация и план — DeepSeek, в этом файле). Phase 2–4 — Kimi.

**Инварианты:**
- `stoveBurners = Math.min(4, 2 + (stoveCount - 1))` — НЕ трогать (kitchen.ts)
- `activeOrders` остаётся array, НЕ slot-based
- `industrialStove` scale.x = 1.85 — НЕ трогать
- Существующие 7 тестов `tests/models3d.test.ts` — НЕ трогать (только ДОБАВИТЬ один `it`)

## Phase 0/1 — контекст (сделано до Kimi)

- В `stoveModel` (models.ts:60–83) **уже 4 кружка-конфорки** (cylinder radius 0.13/0.14) в позициях `[[-0.22,-0.2], [0.22,-0.2], [-0.22,0.2], [0.22,0.2]]`
- **Но:** `flame` (огонь) и `pan` (сковородка) — по одной штуке, только на левой-верхней
- **`RestaurantWorld.syncEntities:747–751`:** `cooking` — boolean («есть хоть один заказ»), раздувает **единственный** flame на одной конфорке
- **Итог:** при 4 заказах на плите — визуально 1 огонь, 1 сковородка

**Задача:** 4 огня + 4 сковородки, включаются независимо (по количеству `cooking` заказов на этой плите).

## Phase 2 — код

### 2.1. `src/render3d/models.ts`, функция `stoveModel`

**Было (строки ~75–81):**
```ts
const pan = new THREE.Group();
cylinder(pan, 0.19, 0.065, [-0.22, 0.97, -0.2], 0x252b2d);
box(pan, [0.3, 0.045, 0.07], [-0.22, 0.98, 0.04], dark);
pan.visible = false; group.add(pan);
const flame = new THREE.Group();
for (const [x, z, height, color] of [[-0.28, -0.2, 0.12, 0xff9d32], [-0.17, -0.2, 0.15, 0xffc438], [-0.22, -0.13, 0.11, 0xff7728]] as const) cylinder(flame, 0.045, height, [x, 0.91, z], color, 0.005);
flame.visible = false; group.add(flame); group.userData.pan = pan; group.userData.flame = flame;