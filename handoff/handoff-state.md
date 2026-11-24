# Проект «Restaurant City / Мой ресторан» — handoff-state

## 0. Как пользоваться

Этот файл — **состояние проекта**. Текущая задача — `docs/tasks/CURRENT.md`.
Читать оба: сначала этот (state), потом CURRENT (где мы).

Порядок новой сессии:
1. Приёмка (§12) — без кода
2. Шаг 0 (§13) — разведка
3. Открывай `docs/tasks/CURRENT.md` — текущая задача
4. После закрытия задачи — обновить этот handoff (§2, §3, §5, §8, §12, §14)

Правило: handoff — снимок, а не истина. `git diff` / `status` / `log` — всегда.

## 1. Контекст проекта

- **Название:** «Restaurant City / Мой ресторан»
- **Стек:** TypeScript, Three.js, Vite, inline-SVG, Vitest + Playwright
- **Архитектура:** Единый `GameState`, localStorage, симуляция тиками, Three.js поверх сетки
- **Модули:** `src/simulation/*`, `src/content/*`, `src/render3d/*`, `src/ui/*`, `src/persistence/*`, `src/main.ts`
- **Репозиторий:** https://github.com/ValeryCha/GameMyResto
- **Окружение:** Windows `cmd`, CP866 → `chcp 65001` в начале
- **Тесты:** `npm test` (vitest), `npx playwright test` (e2e), `npm run build`

## 2. Текущее состояние (на конец 2026-11-24)

| Ветка | Коммит | Статус |
|---|---|---|
| main = origin/main | `a06f277` | ✅ HEAD, LOGIC-8.4 + task 8.4.1 |
| master | 0bf062a | архив |
| archive/* (10 тегов) | `git tag` | архивы |

**Тесты:** unit **374/374**, e2e **53/53**, build ✅.
**`git status`:** clean, main = origin = `a06f277`.

## 3. Что сделано по сессиям

### 2026-11-24 — LOGIC-8.4 (закрыт, коммит 09afd32)

**Цель:** починить маршрутизацию поваров и распределение по стойкам.

**Что сделано (диффы в `commands.ts`, `tick.ts`, `counterService.ts`):**
- `moveFurniture` при перемещении плиты переносит поваров, прерывает готовку, возвращает заказы в `waitingCook`.
- `chefRouteTo` / `moveChef` разрешают повару идти к плите из любой точки (обход `withinChefRange` для `adjacentCells`).
- `counterForChef` — балансировка по загрузке, затем по расстоянию (убран `chefIndex % counters.length`).
- `assignOrderToCounter` — равномерное распределение (убран `nextRandom`).
- Новый тест `tests/chefRouting.test.ts` (6 проверок).

**Проверки:** `npm test` 374/374, `npm run build` ✅, `e2e/staff-stability.spec.ts` 3/3.

**Проблема, которая осталась:** третья плита в углу не работает (повар не может подойти, pathfinding блокирован мебелью/стеной). Визуально — 1 конфорка вместо 4 (отдельная задача VISUAL-8.5).

### 2026-11-24 — LOGIC-8.3 (закрыт, `21fb84a`)

**Коммит `df08de4` → merge `21fb84a`.**

- `stoveBurners(state) = Math.min(4, 2 + (stoveCount - 1))`
- `Employee.activeOrders?: string[]`
- `updateChef` — параллельная готовка (до 4 блюд)
- `updateKitchenOrders` — распределение по конфоркам
- `normalizeState` — миграция `activeOrders`
- `tests/stoveBurners.test.ts` (8 тестов)

### 2026-11-24 — LOGIC-8.2 (закрыт, `ce64fc4`)

- `waiterCarryCapacity` (1/2/3 при upgrade 0-2/3-4/5)
- `Employee.orderIds`
- `waiterCarry.test.ts` (8)

### 2026-11-24 — LOGIC-8.1 (закрыт, `e32bc1d`)

- `COUNTER_MAX_SLOTS = 3`, `counterLoad`, `findFreeCounterForChef`
- `kitchenBuffers.test.ts` (8)

### 2026-11-24 — feat-counter-plates-visual (закрыт, `4d089e2`)

- 3D-тарелки на стойке (эмодзи, треугольник, до 3)

### 2026-11-23 — TECH-4 + TECH-5 (закрыты, `8d2b1e0`, `23efd79`)

- Матрица проходимости, плотная планировка

### 2026-11-22 — LOGIC-6.1c + LOGIC-7 (закрыты, `e589fcf`, `1820edc`)

## 4. Решения Q1-Q3 (приняты, вариант A)

- **Q1:** декорная награда = `min(базовая, Σ(price) × 0.8)`
- **Q2:** HUD на узком экране — как в `649e137`
- **Q3:** `peakQuestTotals = { servedTotal, perfectPeaksTotal }`

## 5. Roadmap

```
Cleanup ✅ → TECH-4 ✅ → TECH-5 ✅
    → LOGIC-8.1 ✅ → LOGIC-8.2 ✅ → LOGIC-8.3 ✅
    → LOGIC-8.4 (в рабочей папке, не закоммичен)
    → LOGIC-8.4.1 (станция повара за плитой) ← следующий
    → VISUAL-8.5 (4 конфорки на плите)
    → TECH-3 → TECH-2 → TECH-1
```

| # | Задача | Статус |
|---|---|---|
| 1 | Cleanup | ✅ 2026-11-23 |
| 2 | TECH-4 | ✅ 2026-11-23 |
| 3 | TECH-5 | ✅ 2026-11-23 |
| 4 | LOGIC-8.1 | ✅ 2026-11-24 |
| 5 | LOGIC-8.2 | ✅ 2026-11-24 |
| 6 | LOGIC-8.3 | ✅ 2026-11-24 |
| 7 | LOGIC-8.4 | ✅ 2026-11-24 |
| 8 | **LOGIC-8.4.1** — станция повара за плитой | ← следующий |
| 9 | **VISUAL-8.5** — 4 конфорки на плите | после 8.4.1 |
| 10 | TECH-3 | после visual |
| 11 | TECH-2 | после TECH-3 |
| 12 | TECH-1 | после TECH-2 |

## 6. LOGIC-7 + LOGIC-8.1 + LOGIC-8.2 + LOGIC-8.3 — закрыты

**LOGIC-7 (2026-11-22):** найм 3/3, экономика 15k/35k + 20k/50k, 1:1 повар↔плита.

**LOGIC-8.1 (2026-11-24):** `COUNTER_MAX_SLOTS = 3`, `counterLoad`, `findFreeCounterForChef`.

**LOGIC-8.2 (2026-11-24):** `waiterCarryCapacity` (1/2/3), `Employee.orderIds`.

**LOGIC-8.3 (2026-11-24):** `stoveBurners`, `Employee.activeOrders`, параллельная готовка.

## 6.5. LOGIC-8.4.1 — контекст (следующий)

**Цель:** привязать повара строго к лицевой части плиты (станции). Повар автоматически возвращается на станцию после доставки заказа.

**Решения (согласованы 2026-11-24):**

| Вопрос | Ответ |
|---|---|
| Как определить станцию? | **A:** по `rotation` плиты (0 → юг, 90 → запад, 180 → север, 270 → восток). Fallback — ближайшая свободная клетка из `adjacentCells` |
| Если станция заблокирована? | **A:** `placeFurniture` / `moveFurniture` → `{ ok: false, reason: 'Нет места для повара' }` |
| Повар готовит на ходу? | **A:** нет, ходит к стойке сам, готовка прерывается. Отдельный носильщик — LOGIC-8.5 (если будет медленно) |

**Технические изменения:**
- `types.ts`: `Furniture.chefStation?: Point` (для плит).
- `commands.ts`: при `placeFurniture('stove')` / `moveFurniture` вычислять станцию; если заблокирована — `ok: false`.
- `kitchen.ts`: `stoveStation(stove, state): Point | undefined` — вычисляет станцию по rotation, fallback на ближайшую свободную.
- `tick.ts`: `updateChef` — если повар не на станции, идёт к ней (`findPath` к `chefStation`). `withinChefRange` можно оставить как fallback, но приоритет — станция.
- `synchronizeChefStoves` — если станция недостижима, не назначать повара на эту плиту.

**Риски:**
- `chef-stove-binding.test.ts` (17) — могут упасть, если станция меняет поведение.
- `stoveBurners.test.ts` (8) — не сломать.
- `chefRouting.test.ts` (6) — обновить под станцию.

**План:**
1. TDD `tests/chefStation.test.ts` (6–8 тестов: rotation 0/90/180/270, fallback, блокировка, возврат после доставки).
2. Реализация `chefStation`, `stoveStation`, обновление `placeFurniture`/`moveFurniture`.
3. Обновить `updateChef` — идти к станции.
4. Проверить `chef-stove-binding` (17), `stoveBurners` (8), `chefRouting` (6).

**Оценка:** 1–2 часа.

## 7. TECH-1 / TECH-2 / TECH-3 — контекст (бэклог)

- **TECH-3:** `catalog-decorations.spec.ts:50` — убрать `toBeLessThanOrEqual`, вернуть точное `toBe`.
- **TECH-2:** `progression.spec.ts` — `waitForTimeout(1000)` → `waitForFunction` на `state.level >= N`.
- **TECH-1:** интеграционные тесты мебели (`FurnitureKind × placement`), только непокрытые.

## 8. Уроки (28+)

1–23 (из прошлых сессий, без изменений).

24. **`hidden = true` убирает элемент из accessibility tree.** В `close()` только `classList.remove('is-open')`.
25. **`storage.save(state)` в `play()` обнажает давние баги тестов.** Проверять, что старые e2e не полагались на «фон без сохранения».
26. **Kimi копирует `...` буквально из промпта.** В промптах `...` только с комментарием.
27. **`setVisible` ≠ `open`:** show/hide ≠ open/close. На старте — `closePanels()`.
28. **`moveFurniture` должен вызывать `synchronizeChefStoves` после перемещения любого предмета, не только плиты.** Иначе повар застревает.
29. **Станция повара (LOGIC-8.4.1) — привязка к `rotation` плиты.** Если станция заблокирована, `placeFurniture` возвращает `ok: false`.

## 9. Что НЕ трогать без подтверждения

- `industrialStove`, `ratingHistory`
- `tests/chef-stove-binding.test.ts` (17)
- `src/content/quests.ts`, `sideQuests.ts`, `dailyQuests.ts`
- `src/simulation/questProgress.ts`
- `src/ui/questPanel.ts`
- `tests/questRework.test.ts`, `sideQuests.test.ts`, `dailyQuests.test.ts`
- `src/ui/shopPanel.ts` (статус-порядок после `a8bd970`)
- `src/simulation/progression.ts` (`applyLevels`)
- `seatRate = 0.0556`
- `COUNTER_MAX_SLOTS = 3`
- `tests/kitchenBuffers.test.ts` (8)
- `waiterCarryCapacity` в `staff.ts`
- `tests/waiterCarry.test.ts` (8)
- `Employee.orderIds`
- `counterPlateDishes`, `createPlateMesh`, `syncCounterPlates`
- `DISHES[].emoji`
- `tests/furniture-layout-passability.test.ts` (3)
- `e2e/furniture-layout.spec.ts`
- `tests/movement.test.ts` (11)

## 10. Памятка по окружению

- `chcp 65001` в начале
- `findstr /n "pattern1 pattern2"` — **пробелы**, не `\|`
- Перед коммитом — `git status` читать пути
- После коммита — `git show --stat <sha>`
- Push — только после полного e2e зелёного
- Ветка для новой задачи — `git checkout -b logic-X.Y-name` от актуального `main`

## 11. Аварийные сценарии

**Тесты упали после текущей задачи:** `git reset --hard <previous-merge>` (локально) или `git restore <path>`.

**«Both staged and unstaged»:** `git restore --staged <path>` → `git add` правильного пути.

**Untracked не удаляется:** `del <path>` / `git clean -f <path>` (только с путём).

**origin/main разошёлся:** `git fetch origin` → `git log --oneline --graph main origin/main -10`.

**Kimi снова сломал UI:** `git diff HEAD~1 -- src/ui/shopPanel.ts src/simulation/progression.ts`.

**Просят «просто запушить»:** сначала `npm test` + `npm run build` + `npx playwright test`.

## 12. Протокол приёмки в новой сессии

> «Прочитал handoff и CURRENT. Отвечаю без кода:
> 1. Состояние: main = origin = `a06f277` (LOGIC-8.4 + task 8.4.1), clean, unit 374/374, e2e 53/53, build ✅.
> 2. LOGIC-8.1, 8.2, 8.3 закрыты. LOGIC-8.4 в рабочей папке.
> 3. Следующая задача — **LOGIC-8.4.1** (станция повара за плитой). Решения: A (rotation), A (запрет при блокировке), A (повар ходит сам).
> 4. Нельзя трогать: `COUNTER_MAX_SLOTS`, `waiterCarryCapacity`, `chef-stove-binding.test.ts`, `stoveBurners.test.ts`, `chefRouting.test.ts`, `questPanel.ts`.
> Если совпало — идём в Шаг 0.»

## 13. Шаг 0 — разведка

```cmd
chcp 65001
git status
git branch --show-current
git log --oneline -5
npm test
```

**Ожидание:**
- `git status`: clean, `up to date with 'origin/main'`
- `git log`: `a06f277 → 09afd32 → 3cbb59d → 21fb84a → 4d089e2`
- `npm test`: **374/374**
- `git branch -v`: `main` (текущая) + `master` (архив)
- `git tag`: 10 тегов `archive/*`

**Если разошлось:** стоп, разбор по §11. Не начинай 6.3 с расхождением.

## 14. После Шага 0

**Статус: LOGIC-8.4 ✅.** Следующая — **LOGIC-8.4.1** (станция повара).
Task-файл: `docs/tasks/LOGIC-8.4.1-chef-station.md` (уже создан).
Порядок: LOGIC-8.4.1 → VISUAL-8.5 → TECH-3 → TECH-2 → TECH-1.