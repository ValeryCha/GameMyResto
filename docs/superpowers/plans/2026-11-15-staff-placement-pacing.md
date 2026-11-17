# Staff, Placement and Pacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить анимацию двери, пять официантов и пять улучшений, серийную установку мебели, новые задания и ступенчатый рост, усиленный спрос и корректную камеру без потери сохранений.

**Architecture:** Чистые формулы цен, лимитов и прогрессии остаются в simulation/content. Запас мебели и исторический максимум лимита мигрируются в состоянии; Three.js отвечает только за визуальную дверь, персонал и камеру. Существующие команды не переписываются, а дополняются inventory-командами.

**Tech Stack:** TypeScript 5.9, Three.js, Vitest, Playwright, Vite, CSS/SVG без внешних ассетов.

## Global Constraints

- Корень: `C:\KimiProject\Мини игра`.
- Сохранить `schema:1`, `version:1`, primary/backup и старые id.
- Не добавлять зависимости и внешние ассеты.
- Не использовать субагентов; не выполнять commit/push/merge.
- Не откатывать существующие незакоммиченные изменения.
- Спецификация: `docs/superpowers/specs/2026-11-15-staff-placement-pacing-design.md`.

---

### Task 1: Персонал, цены и пять улучшений

**Files:** `src/simulation/staff.ts`, `src/simulation/shop.ts`, `src/simulation/tick.ts`, `src/simulation/types.ts`, `src/persistence/normalizeState.ts`, `tests/staff.test.ts`, `tests/shop.test.ts`

**Interfaces:** `waiterHirePrice(count)`, `upgradePrice(kind, level)`, `MAX_WAITERS=5`, `MAX_UPGRADE_LEVEL=5`; `Employee.movementCredit?: number`.

- [ ] Написать failing tests для цен найма 200/240/290/345/415, запрета шестого, цен улучшений 500/675/910/1230/1660 и 300/390/505/660/855.
- [ ] Запустить `npx vitest run tests/staff.test.ts tests/shop.test.ts` и подтвердить FAIL по старым ценам/максимуму 2.
- [ ] Добавить чистые функции с округлением `Math.round(value / 5) * 5`, переписать `hireWaiter` и `buyUpgrade` на лимит 5.
- [ ] Применить прогресс повара `1 / (1 - 0.08 * level)`; для официанта накапливать `movementCredit += 2 / (1 - 0.07 * level)`, выполнять целые шаги и вычитать их.
- [ ] Мигрировать старые уровни 0–2 без потери, ограничить 5 и обнулить некорректный credit.
- [ ] Запустить те же тесты: PASS.

### Task 2: Задания без цепочки уровней и ступенчатая прогрессия

**Files:** `src/content/dishes.ts`, `src/content/quests.ts`, `src/simulation/progression.ts`, `src/ui/questPanel.ts`, `tests/progression.test.ts`, `tests/questRework.test.ts`, `tests/dishes.test.ts`

**Interfaces:** `experienceThreshold(level)=60*L*(L+1)`, `QUESTS` из 10 записей, основные награды `{coins:60*L*L,experience:0}`.

- [ ] Написать failing tests: пороги 120/360/720, размер 8→10 только на 5 уровне, отсутствие расширения на 1–4 и 33, 10 заданий на рубежах 1/5/10/15/20/25/30/33 плюс два стартовых.
- [ ] Добавить тест: выполнение основного задания не меняет `experience` и не вызывает следующий уровень; recipeCost(2)=450.
- [ ] Запустить тесты и подтвердить FAIL.
- [ ] Реализовать расширение только `next % 5 === 0`, не уменьшать существующие width/height; обновить таблицу заданий и убрать опыт из основных наград.
- [ ] Обновить панель: основное задание показывает монеты, нулевой опыт не выводится; максимум остаётся 33.
- [ ] Запустить `npx vitest run tests/progression.test.ts tests/questRework.test.ts tests/dishes.test.ts`: PASS.

### Task 3: Ступенчатый лимит, спрос и ожидание

**Files:** `src/simulation/guestLimits.ts`, `src/simulation/guestFlow.ts`, `src/simulation/tick.ts`, `src/simulation/types.ts`, `src/simulation/createGame.ts`, `src/persistence/normalizeState.ts`, `src/simulation/selectors.ts`, `src/ui/hud.ts`, `tests/guestLimits.test.ts`, `tests/guestFlow.test.ts`, `tests/tick.test.ts`

**Interfaces:** `maxGuestLimit:number`, `levelGuestLimit`, `targetGuestCount`, HUD `freeGuests`.

- [ ] Написать failing tests ступеней 7/12/17/22/27/32/37/40, максимума 50 и монотонности при понижении уровня.
- [ ] Добавить тест спроса: при 33 уровне и одном столе target заметно больше вместимости; спавн не превышает limit.
- [ ] Добавить тест: гость без стула меняет позицию или осматривает объект, затем садится на освободившийся стул; patience исходит из 240.
- [ ] Запустить тесты и подтвердить FAIL.
- [ ] Реализовать `7 + 5*floor(level/5) + (level===33?3:0)`, исторический max и спрос `min(limit,max(3+level,seats+min(2,waiters)))`.
- [ ] В ожидании проверять место до задержки `actionUntil`; wandering/inspecting использует существующий pathfinding.
- [ ] HUD: `занято · свободно N · лимит L`, target в title.
- [ ] Запустить focused tests: PASS.

### Task 4: Дверь, модель официанта и желание без множителя

**Files:** `src/render3d/models.ts`, `src/render3d/actors.ts`, `src/render3d/RestaurantWorld.ts`, `tests/models3d.test.ts`, `tests/actors3d.test.ts`, `tests/appearance.test.ts`, `tests/desires.test.ts`

**Interfaces:** `doorLeaf`, `updateDoorVisual(model, open, delta)`, `desiredDishId` остаётся в actor visual.

- [ ] Написать failing tests: створка меняет rotation, официант имеет `waiter-apron` и `waiter-bowtie`, подпись желания не содержит «×5», шанс статистически около 5%.
- [ ] Запустить focused tests: FAIL.
- [ ] Сделать створку с петлёй и плавный damp в world; open определяется близким entering/leaving гостем.
- [ ] Добавить форму официанта без изменения joints/carrying/collision.
- [ ] Заменить подпись на `★ Название`; динамическое обновление canvas сохранить.
- [ ] Изменить RNG-порог на 0.05.
- [ ] Запустить focused tests: PASS.

### Task 5: Сохраняемый запас и серийная установка

**Files:** `src/simulation/inventory.ts`, `src/simulation/commands.ts`, `src/simulation/types.ts`, `src/simulation/createGame.ts`, `src/persistence/normalizeState.ts`, `src/render3d/RestaurantWorld.ts`, `src/ui/hud.ts`, `src/main.ts`, `tests/inventory.test.ts`

**Interfaces:** `purchaseFurnitureBatch(state,kind,quantity)`, `placePurchasedFurniture(state,kind,position,rotation=0)`, `furnitureInventory`.

- [ ] Написать failing tests: покупка 3 столов списывает 300, три установки не списывают снова, занятая клетка не тратит запас, две клетки tableDouble проверяются, reload сохраняет остаток.
- [ ] Запустить `npx vitest run tests/inventory.test.ts tests/storage.test.ts`: FAIL.
- [ ] Реализовать команды и миграцию только для размещаемых furniture kinds, количество ограничить 0…99.
- [ ] World получает placement source inventory; успех уменьшает запас и не закрывает режим при остатке.
- [ ] Escape и кнопка «Готово» вызывают cancel без очистки inventory; HUD показывает остаток.
- [ ] Запустить focused tests и TypeScript build: PASS.

### Task 6: UI магазина и камера

**Files:** `src/ui/shopPanel.ts`, `src/ui/shopPanel.css`, `src/ui/icons.ts`, `src/render3d/cameraMath.ts`, `src/render3d/RestaurantWorld.ts`, `tests/shopPanel.test.ts`, `tests/cameraMath.test.ts`

**Interfaces:** `onPlace(kind,quantity)`, цены из staff.ts, max 5.

- [ ] Написать failing tests цен/меты 5 уровней и найма, выбора 1/3/5, fit для 8×8 и 20×20 на двух aspect.
- [ ] Запустить focused tests: FAIL.
- [ ] Добавить quantity selector только для размещаемой мебели, полную цену, складской остаток, статусы 5/5 и найм 5/5.
- [ ] При изменении размеров shell вызвать fit один раз; учитывать `max(width,height)` и запас фасада, сохранить ручной zoom.
- [ ] Запустить focused tests и build: PASS.

### Task 7: Сквозные проверки и исправление регрессий

**Files:** `e2e/staff-placement-pacing.spec.ts`, существующие E2E только при устаревших требованиях.

- [ ] Добавить сценарии: закрытие трёх панелей; найм и улучшения; серийная установка 3 предметов/Escape/save-reload; высокий спрос и max 50; отсутствие цепочки уровней; дверь; camera fit на 1280×800 и 390×844.
- [ ] Проверять `pageerror=[]`, `scrollWidth<=innerWidth`, видимость всего shell и отсутствие перекрытий панелей.
- [ ] Запустить новый spec, исправить фактические ошибки.
- [ ] Запустить `npm test && npm run build && npm run test:e2e`: все PASS.
- [ ] Осмотреть screenshots обычного/расширенного ресторана, официанта, магазина и мобильного HUD.
- [ ] Остановить самостоятельно запущенные серверы; preview остаётся под управлением Kimi Work.
