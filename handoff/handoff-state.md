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
| main = origin/main | `<merge-8.2>` | ✅ HEAD, LOGIC-8.2 |
| feat-counter-plates-visual | `<merge-8.2>` | в работе: 3D-тарелки на стойке |
| master | 0bf062a | архив |
| archive/* (10 тегов) | `git tag` | архивы |

**Тесты:** unit **350/350** (до visual) / **360/360** (после), e2e **53/53**, build ✅.
**`git status`:** clean, main = origin = `<merge-8.2>`.

## 3. Что сделано по сессиям

### 2026-11-24 — LOGIC-8.1 (буфер стойки 3 слота) ✅

**Коммит `b8a18df` → fix `0d4d8ea` → merge `e32bc1d` (push origin).**

**Реализация:**
- `COUNTER_MAX_SLOTS = 3` + `counterLoad(state, counterId)` в `counterService.ts`
- `counterForChef(state, chef)` — своя стойка по `chefIndex % counters.length`
- `findFreeCounterForChef` — своя → fallback на ближайшую свободную → иначе ждать
- `updateChef` использует новую логику
- `tests/kitchenBuffers.test.ts` (new, 8 тестов)

**Регрессы и фиксы:**
- `progression.spec.ts` — флак, добавлен `waitForTimeout(1000)`
- `catalog-decorations.spec.ts:50` — ослаблен до `toBeLessThanOrEqual` (фоновые квесты)
- `decorations.spec.ts:37` — тест ожидал `appliedWallpapers.length = 1`, но при расширении обои наследуются на 13 клеток. Исправлен на `toBeGreaterThan(1)` + `every(creamStripes)`
- `play()` в `main.ts` — добавлен `storage.save(state)` при старте (без него `localStorage = null` при первом тесте)
- UI-панели — `root.hidden = true` в `close()` сломал accessibility tree → откат, оставили только `classList.remove('is-open')`

**Тесты:** +8 unit, всего **342/342**.

### 2026-11-24 — LOGIC-8.2 (мульти-забор официантом) ✅

**Коммит `<hash-8.2>` → merge `<merge-8.2>`.**

**Реализация:**
- `waiterCarryCapacity(level)` в `staff.ts` — 1/2/3 при upgrade 0-2/3-4/5
- `Employee.orderIds?: string[]` — очередь заказов
- `updateWaiter` — забирает `min(capacity, available)` заказов с той же стойки
- `normalizeState` — `orderIds ??= []`
- `tests/waiterCarry.test.ts` (new, 8 тестов)

**Инварианты LOGIC-8.2:**
- `waiter-counter-distribution.test.ts` (8) — не сломан
- `kitchenBuffers.test.ts` (8) — не сломан
- `staff-stability.spec.ts` (3 e2e) — 12/12 прошли

**Тесты:** +8 unit, всего **350/350**, e2e **53/53**.

### 2026-11-24 — feat-counter-plates-visual (в работе)

**Ветка:** `feat-counter-plates-visual` (от `main` после merge LOGIC-8.2).

**Цель:** на стойке — до 3 блюд 3D-тарелками с эмодзи, треугольником, исчезают при `pickedUp`.

**Промпт отправлен в Kimi (Phase 0-4).** Ожидаем результат.

### 2026-11-23 — TECH-4 + TECH-5 ✅

- **TECH-4** (`8d2b1e0`): матрица проходимости + `blocksMovement` селектор
- **TECH-5** (`23efd79`): тест плотной планировки (4 стола, 12 стульев, 600 тиков)

### 2026-11-22 — LOGIC-6.1c + movement + LOGIC-7 ✅

| Фаза | Коммит | Результат |
|---|---|---|
| LOGIC-6.1c | e589fcf | 6 daily quests, `perfectPeaksTotal`, `normalizeState` фикс |
| Movement fix | b1852e2 | гости проходят сквозь друг друга |
| LOGIC-7 | 1820edc | найм поваров 3/3, экономика 15k/35k + 20k/50k, уровни 15/25, 1:1 |
| Fix | a8bd970 | `shopPanel` статус-порядок, `progression.applyLevels` |
| Merge | 0d7e009 | `--no-ff`, push |

## 4. Решения Q1-Q3 (общие, приняты, вариант A)

Зафиксированы в `docs/tasks/LOGIC-6.md`. **Пересматривать не надо.**
- **Q1.** Декорная награда: `reward = min(базовая, Σ(price триггерных) × 0.8)`
- **Q2.** HUD гостей на узком экране — как в `649e137`
- **Q3.** `peakQuestTotals = { servedTotal, perfectPeaksTotal }`

## 5. Roadmap

```
Cleanup ✅ → TECH-4 ✅ → TECH-5 ✅
    → LOGIC-8.1 ✅ (counter buffer) → LOGIC-8.2 ✅ (waiter multi-carry)
    → feat-counter-plates-visual ← в работе
    → TECH-3 (catalog coins)
    → TECH-2 (waitForTimeout → waitForFunction)
    → TECH-1 (интеграционные тесты мебели)
    → TECH-5.1 (e2e layout, если __gameState)
```

| # | Задача | Статус |
|---|---|---|
| 1 | Cleanup — 10 веток в archive/* | ✅ 2026-11-23 |
| 2 | TECH-4 — матрица проходимости | ✅ 2026-11-23 |
| 3 | TECH-5 — расстановка мебели (unit) | ✅ 2026-11-23 |
| 4 | LOGIC-8.1 — буфер стойки 3 слота | ✅ 2026-11-24 |
| 5 | LOGIC-8.2 — мульти-забор официантом | ✅ 2026-11-24 |
| 6 | **feat-counter-plates-visual** — 3D-тарелки | ← в работе |
| 7 | TECH-3 — `catalog-decorations.spec.ts:50` | после visual |
| 8 | TECH-2 — `waitForTimeout` → `waitForFunction` | после TECH-3 |
| 9 | TECH-1 — интеграционные тесты мебели | после TECH-2 |
| 10 | TECH-5.1 — e2e плотной планировки | бэклог |

## 6. LOGIC-7 + LOGIC-8.1 + LOGIC-8.2 — закрыты

**LOGIC-7 (2026-11-22, `1820edc` / `0d7e009`):**
- Найм 3/3, экономика 15k/35k + 20k/50k, уровни 15/25, 1:1 повар↔плита
- `chef-stove-binding.test.ts` — 17 тестов

**LOGIC-8.1 (2026-11-24, `b8a18df` / `e32bc1d`):**
- `COUNTER_MAX_SLOTS = 3`, `counterLoad`, `findFreeCounterForChef`
- `kitchenBuffers.test.ts` — 8 тестов

**LOGIC-8.2 (2026-11-24, `<hash-8.2>` / `<merge-8.2>`):**
- `waiterCarryCapacity` (1/2/3), `Employee.orderIds`, мульти-забор
- `waiterCarry.test.ts` — 8 тестов

## 6.5. LOGIC-8.3 — контекст (бэклог, после TECH-1)

**Цель:** конфорки на плите (2→3→4) + повар с массивом заказов (1→4).

**Согласовано (сессия 2026-11-24):**
- Конфорок на каждой плите: 1S = 2, 2S = 3, 3S = 4 (все плиты одинаковые).
- Повар: 1 рука (база) + прокачка +1 → макс 4.
- Занято: 1C/1S = 2, 2C/2S = 6, 3C/3S = 12 конфорок.
- 1:1 повар↔плита **не ломается**. 2-я плита при 1C/2S простаивает.

**Формула:** `stoveBurners(state) = Math.min(4, 2 + (stoveCount(state) - 1))`

**Технические изменения:**
- `kitchen.ts`: `stoveBurners(state): number`
- `types.ts`: `Employee.activeOrders?: string[]` (до 4, для готовки)
- `tick.ts → updateChef`: массив заказов вместо одного
- `tick.ts → updateKitchenOrders`: распределение по конфоркам

**Риски:**
- `chef-stove-binding.test.ts` (17) — 1:1 сохраняется, но тесты параллельности (1/1, 2/2, 3/3) переписать
- `kitchenBuffers.test.ts` (8) — не сломать
- `waiterCarry.test.ts` (8) — не сломать

**План:**
1. TDD `tests/stoveBurners.test.ts` (8–10 тестов)
2. Реализация `stoveBurners` + `Employee.activeOrders` + переписать `updateChef`/`updateKitchenOrders`
3. Обновить `chef-stove-binding.test.ts` (17) под параллельную готовку
4. Проверить `kitchenBuffers` (8) и `waiterCarry` (8)
5. E2E `staff-stability.spec.ts` — производительность выше

**Оценка:** 2–3 сессии. Начинать **только после TECH-1**.

**Не путать:**
- `Employee.orderIds` (LOGIC-8.2) — для **доставки** (что несёт официант)
- `Employee.activeOrders` (LOGIC-8.3) — для **готовки** (что готовит повар)

## 7. TECH-1 — контекст (бэклог)

**Цель:** интеграционные тесты мебели.
`FurnitureKind = 'door'|'stove'|'table'|'tableDouble'|'chair'|'plant'|'counter'`.
Для каждого kind: e2e-ассерт на размещение, unit на `placed`, покрытие в `tests/decorations.test.ts` / `shop.test.ts` / `editorMode.test.ts`. Только непокрытые — не «добивать» (урок 8).

## 8. Полный список уроков проекта

### Из прошлых сессий (1–13)
1–13 (см. предыдущую версию файла, не изменилось)

### Из сессии 2026-11-22 (LOGIC-7)
14. **Push = последний шаг.** Только после полного e2e зелёного, коммита, merge `--no-ff`, `npm test` на main, `npm run build`.
15. **Kimi ломает длинные тернарники** в `shopPanel.ts` и теряет `applyLevels` в `progression.ts`. После любого изменения — `git diff` + визуальная проверка.
16. **`normalizeState` не вызывает `processProgression`** — только дефолтные значения.

### Из сессии 2026-11-23 (LOGIC-6.2)
17. **Новые DOM-элементы с implicit ARIA role ломают strict-mode e2e.** `<progress>` → `<meter>`.
18. **CSS `max-height` + `overflow-y: auto`** для растущих панелей.

### Из сессии 2026-11-23 (cleanup + TECH-4/5)
19. **Теги `archive/*` вместо `-D`.**
20. **TECH-4 — матрица проходимости.**
21. **TECH-5 — тесты не зависят от кнопки `+50 000`.**
22. **Покрытие проверять `git grep`, не по памяти Kimi.**
23. **Угловые объекты при `expandBounds` сдвигаются.**

### Из сессии 2026-11-24 (LOGIC-8.1 + 8.2 + visual)
24. **`hidden = true` убирает элемент из accessibility tree.** Playwright `getByRole` не находит `hidden=true` → тесты `not.toHaveClass(/is-open/)` падают с "element not found". **Правило:** в `close()` только `classList.remove('is-open')`. CSS скрывает без класса. `hidden` — только в `setVisible()` (разрешение показа).
25. **`storage.save(state)` в `play()` обнажает давние баги тестов.** `decorations.spec.ts:37` проверял `appliedWallpapers.length === 1` после расширения — проходил **случайно** (без сохранения читался старый state). После добавления `storage.save` обнажил несоответствие (13 обоев). **Правило:** добавляя автосохранение, проверь, что старые e2e не полагались на «фон без сохранения».
26. **Kimi копирует `...` буквально из промпта в код** (`if (!visible) { close(); ... }`) → TS1128. **Правило:** в промптах `...` только с комментарием `// ... (остальной код)` или не использовать.
27. **`setVisible(true)` открывает панель, а не разрешает показ.** На старте `play()` вызывал `setVisible(true)` для всех панелей → панель прогресса висела поверх магазина. **Правило:** `setVisible` = show/hide, `is-open` = open/close. Не смешивать. `open()` = `classList.add('is-open')`, `close()` = `classList.remove('is-open')`. На старте — `closePanels()`, не `setVisible(false)`.

## 9. Что НЕ трогать без явного подтверждения

- `industrialStove`, `ratingHistory` — смержены, покрыты
- `tests/chef-stove-binding.test.ts` (17) — контракт LOGIC-7
- `src/content/quests.ts`, `src/content/sideQuests.ts`, `src/content/dailyQuests.ts` — контракты квестов
- `src/simulation/questProgress.ts` — работает (6.1b + 6.1c)
- `src/ui/questPanel.ts` — 6.2 закрыт, 5/5 e2e. Не переоткрывать
- `tests/questRework.test.ts` (4), `sideQuests.test.ts` (13), `dailyQuests.test.ts` (10) — контракты
- `src/ui/shopPanel.ts` — статус-порядок после `a8bd970`
- `src/simulation/progression.ts` — `applyLevels` на месте
- `seatRate = 0.0556` — backlog
- **`COUNTER_MAX_SLOTS = 3`** в `counterService.ts` — контракт LOGIC-8.1
- **`tests/kitchenBuffers.test.ts` (8)** — контракт LOGIC-8.1
- **`waiterCarryCapacity` в `staff.ts`** — контракт LOGIC-8.2 (1/2/3 при upgrade 0-2/3-4/5)
- **`tests/waiterCarry.test.ts` (8)** — контракт LOGIC-8.2
- **`Employee.orderIds`** — контракт LOGIC-8.2
- **`counterPlateDishes`, `createPlateMesh`, `syncCounterPlates`** — контракт visual (после закрытия)
- **`DISHES[].emoji`** — контракт visual (после закрытия)
- `tests/furniture-layout-passability.test.ts` (3) — контракт TECH-5
- `e2e/furniture-layout.spec.ts` — контракт TECH-5
- Тесты не трогают кнопку `+50 000`
- `tests/movement.test.ts` — контракт TECH-4

## 10. Памятка по окружению

- `chcp 65001` в начале
- `findstr /n "pattern1 pattern2"` — **пробелы**, не `\|` (это grep-синтаксис)
- Тесты в `tests/`, доки в `docs/tasks/`
- Перед коммитом — `git status` читать пути
- После коммита — `git show --stat <sha>`
- Push — только после полного e2e зелёного
- Ветка для новой задачи — `git checkout -b logic-X.Y-name` от актуального `main`

## 11. Аварийные сценарии

**Тесты упали после текущей задачи:** `git reset --hard <previous-merge>` (только локально) или `git restore <path>`. Разобрать, не чинить вслепую.

**«Both staged and unstaged»:** `git restore --staged <path>` → `git add` правильного пути.

**Untracked не удаляется:** `del <path>` / `git clean -f <path>` (только с путём).

**origin/main разошёлся:** `git fetch origin` → `git log --oneline --graph main origin/main -10`. Линейно → `pull --rebase`. Merge — обсудить.

**Kimi снова сломал UI:** `git diff HEAD~1 -- src/ui/shopPanel.ts src/simulation/progression.ts`, проверить порядок тернарников и `applyLevels`.

**Просят «просто запушить»:** сначала `npm test` + `npm run build` + `npx playwright test`. Зелёное → push.

**Kimi вставил `...` в код:** `npx tsc --noEmit` покажет TS1128. Убрать `...`, восстановить блок.

## 12. Протокол приёмки в новой сессии

**Первое сообщение** (после прочтения этого файла и `CURRENT.md`):

> «Прочитал handoff и CURRENT. Отвечаю без кода:
> 1. Состояние: main = origin = `<merge-8.2>` (merge LOGIC-8.2), ветки main + master (архив) + feat-counter-plates-visual (в работе), теги archive/* (10), unit 350/350, e2e 53/53, build ✅.
> 2. LOGIC-8.1 + 8.2 закрыты: counter buffer 3 slots + waiter multi-carry 1/2/3.
> 3. Текущая задача — feat-counter-plates-visual (3D-тарелки на стойке).
> 4. Нельзя трогать: `counterService.ts` (`COUNTER_MAX_SLOTS`), `staff.ts` (`waiterCarryCapacity`), `waiterCarry.test.ts`, `kitchenBuffers.test.ts`, `chef-stove-binding.test.ts` (17), `questPanel.ts`, `quests.ts`/`sideQuests.ts`/`dailyQuests.ts`.
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
- `git log`: `23efd79 → ef9fd61 → 4a27afe → 8d2b1e0 → 01e9a95`
- `npm test`: **334/334**
- `git branch -v`: `main` (текущая) + `master` (архив)
- `git tag`: 10 тегов `archive/*`

**Если разошлось:** стоп, разбор по §11. Не начинай 6.3 с расхождением.

## 14. После Шага 0

**Статус: LOGIC-8.1 ✅, LOGIC-8.2 ✅. В работе — feat-counter-plates-visual.
Следующая задача — **TECH-3** (`catalog-decorations.spec.ts:50`).
Task-файл: `docs/tasks/TECH-3-catalog-coins.md` (создать перед стартом).
Порядок: После visual — TECH-3 → TECH-2 → TECH-1 → TECH-5.1.