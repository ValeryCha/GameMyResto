# Проект «Restaurant City / Мой ресторан» — handoff-state

## 0. Как пользоваться

Этот файл — **состояние проекта**. Текущая задача — `handoff/CURRENT.md`.
Читать оба: сначала этот (state), потом CURRENT (где мы сейчас).

Порядок новой сессии:
1. Приёмка (§12) — без кода
2. Шаг 0 (§13) — разведка
3. Открывай `handoff/CURRENT.md`
4. После закрытия задачи — обновить этот handoff (§2, §3, §5, §8, §13)

Правило: handoff — снимок, а не истина. `git diff` / `status` / `log` — всегда.

## 1. Контекст проекта

- **Название:** «Restaurant City / Мой ресторан»
- **Стек:** TypeScript, Three.js, Vite, inline-SVG, Vitest + Playwright
- **Архитектура:** Единый `GameState`, localStorage, симуляция тиками, Three.js поверх сетки
- **Модули:** `src/simulation/*`, `src/content/*`, `src/render3d/*`, `src/ui/*`, `src/persistence/*`, `src/main.ts`
- **Репозиторий:** https://github.com/ValeryCha/GameMyResto
- **Окружение:** Windows `cmd`, CP866 → `chcp 65001` в начале
- **Тесты:** `npm test` (vitest), `npx playwright test` (e2e), `npm run build`

**Роли:**
1. **Kimi Code** — пишет код по task-файлам, Phase 0–4, **git read-only**
   (`status/log/diff/grep/show/branch` — можно; `add/commit/push/checkout/reset/restore/merge/tag` — нельзя).
2. **DeepSeek** — архитектура, task-файлы, ревью диффов, обновление handoff.
3. **Пользователь** — VS Code, git write, запуск тестов.

**Git-правило A:** read-only git — Kimi, write — пользователь. **Не перекладывать read-команды на пользователя** (ошибка процесса, съедает лимиты DeepSeek).

**Правило эффективности:** короткие ответы. Лимиты тратятся.

## 2. Текущее состояние (на конец 2026-11-25, после fix-balance)

| Ветка | Коммит | Статус |
|---|---|---|
| main | d84dbe2 | ✅ HEAD, merge fix-balance, запушен |
| origin/main | d84dbe2 | ✅ sync |
| archive/logic-8.4.1-chef-station | 65fab54 | ✅ тег |
| archive/fix-chef-3x3-diagnostic | 0f12631 | ✅ тег |
| master | 0bf062a | реликт (backlog) |

**Тесты:** unit **381/381**, e2e **53/53**, build ✅ (exit 0).
**`git status`:** на main, clean, ahead 0.

## 3. Что сделано по сессиям

### 2026-11-25 — fix-balance (закрыт, `d84dbe2`)

- **Баг:** при 3 поварах / 3 плитах / 3 стойках в реальной игре работает только повар 1 и плита 1. Давний баг, не связан с LOGIC-8.4.1.
- **Причина:** `tick.ts` — «каждый заказ первому повару со свободной конфоркой». При `stoveBurners = 4` (3 плиты) повар 1 забирал до 4 заказов, повар 2 — до 4, повар 3 — только при 9+ заказах.
- **Фикс `0f12631`:** хелпер `pickLeastLoadedChef(chefs, state, capacity)` — min `activeOrders.length`, при равенстве tie-break по `id`. Заменено в **двух точках:**
  - `tick.ts:374` — `updateKitchenOrders` (waitingCook → назначение на плиту)
  - `tick.ts:577-580` — `updateWaiter` (takingOrder → выбор chef при handoff)
- **Merge `d84dbe2`** (`--no-ff`), push origin/main, tag `archive/fix-chef-3x3-diagnostic` = `0f12631`.
- **Новый тест:** `tests/chef-stove-binding.test.ts` — «3 повара, 6 заказов → по 2 каждому».
- **Проверено в игре:** 3 повара / 3 плиты / 3 стойки работают одновременно.

### 2026-11-25 — LOGIC-8.4.1 (закрыт, `a3b37cc`)

- Feat `65fab54`: `Furniture.chefStation?: Point` + `stoveStation()` + проверки в `commands.ts` + возврат в `updateChef` + `tests/chefStation.test.ts` (6)
- Merge `a3b37cc` (`--no-ff`), tag `archive/logic-8.4.1-chef-station` = `65fab54`
- Docs `223140a` — 8.4.1 done, VISUAL-8.5 next

### До 2026-11-25

- LOGIC-8.1 counter buffer `b8a18df` + `0d4d8ea`
- LOGIC-8.2 waiter multi-carry `8836233`
- visual 3D plates `62b4591`
- LOGIC-8.3 stove burners `df08de4`
- LOGIC-8.4 chef routing `09afd32`
- LOGIC-6.2 `8a802af` + merge `e866321`
- LOGIC-6.3 `27663c9` + merge `42ec363`
- LOGIC-7 найм поваров `1820edc`
- LOGIC-6.1c daily quests `e589fcf`
- LOGIC-6.1b side quests `5689c11` + `ebf0198`
- LOGIC-6.1a questBaseline `284a821`
- LOGIC-5.1 HUD `77d8640` → merge `64f4798`

## 4. Решения Q1-Q3 (LOGIC-6, вариант A — закрыты)

- Q1: декор-награда `min(базовая, Σprice × 0.8)`, фиксируется при выполнении
- Q2: HUD гостей на узком — как в `649e137`
- Q3: `peakQuestTotals = { servedTotal, perfectPeaksTotal }` кумулятив

## 5. Roadmap

```
VISUAL-8.5 → LOGIC-9 (Phase 0 замеры) → TECH-3 → TECH-2 → TECH-1 → TECH-5.1
```

| # | Задача | Статус |
|---|---|---|
| 1–6 | 8.1–8.4.1 | ✅ |
| 7 | fix-balance | ✅ d84dbe2 |
| 8 | **VISUAL-8.5** (4 конфорки, только визуал) | **← следующая** |
| 9 | LOGIC-9 (waiter bottleneck, Phase 0 замеры) | бэклог, см. §6.1 |
| 10–13 | TECH-3 → TECH-2 → TECH-1 → TECH-5.1 | ожидает |
| 14 | Пакетная чистка веток | отложено |

## 6. LOGIC-8.4.1 — ЗАКРЫТ (a3b37cc)

Справка: `Furniture.chefStation?: Point` (опциональный, старые сейвы = undefined). `stoveStation(stove, state)` — rotation 0→юг, 90→запад, 180→север, 270→восток; fallback adjacentCells → null. `placeFurniture` / `moveFurniture` проверяют станцию (`reason: 'Нет места для повара'`). `updateChef` — возврат через `moveChef`, `order.progress +=` **не блокируется**. `industrialStove` 1×2 — через `appliedStoveSkins`.

## 6.1. LOGIC-9 — waiter bottleneck (полный бэклог)

**Статус:** бэклог. Phase 0 (замеры) — до кода. Решение о варианте — по факту, не по гипотезе (урок 8).

**Триггер:** после fix-balance поток гостей вырос (пользователь расширил ресторан + столы). Возможно, официант стал узким местом.

### Phase 0 — метрики (1 сессия, до кода)

Замеры на живой игре (3 повара / 3 плиты / 3 стойки / 5 официантов, поток гостей высокий):
- F1. `avgWaitTime` гостей (seated → delivered)
- F2. `waiterIdleTime` (% простоя)
- F3. `cookingTime` (waitingCook → cooked)
- F4. `counterFullRate` (% времени, когда стойки полные)
- F5. `occupiedSeats / guestLimit`
- F6. `orders.length` в очереди
- F7. `avgWaiterTripTime` (время одного цикла официанта)

**Метод:** временный `__debug.dump()` (как в fix-balance) или новый `__debug.metrics()`. Удалить после.

**Интерпретация:**
- `waiterIdleTime > 40%` → официант НЕ узкое место → категория A отпадает
- `cookingTime` растёт, `waiterIdleTime` низкий → повара узкое место (категория E)
- `counterFullRate > 60%` → стойки узкое место (категория B)
- `occupiedSeats = guestLimit` + `orders.length` растёт → столики (категория C)

### Категории идей (для сверки после Phase 0)

**A. Официанты (приём/доставка):**
- A1. **WaiterQueue** — официант переводит заказ в `waitingCook` сразу, без похода к повару. Убирается handoff. 1 сессия.
- A2. **Multi-pickup** — официант принимает N заказов за один подход (идея пользователя). 2-3 сессии.
- A3. **Multi-drop** — официант несёт N готовых за раз (`waiterCarryCapacity` = 1/2/3, проверить работает ли). Может уже работать.
- A4. **FIFO-приоритизация** — официант идёт к самому старому заказу, а не к ближайшему. 1 сессия.
- A5. **Разделение ролей** — приёмщик vs доставщик. Большая переделка, не рекомендую.

**B. Стойки:**
- B1. Больше слотов на стойку (`COUNTER_MAX_SLOTS = 3` → 4-5). Но `MAX_COUNTERS = 5`.
- B2. Прямой handoff повар→официант без стойки (при малом расстоянии). Риск: `counterService.test`, `kitchenBuffers`.
- B3. **Counter buffering** — официант кладёт заказ на стойку, повар берёт оттуда (симметрично A1). 1-2 сессии.

**C. Столики/гости:**
- C1. Расширение ресторана (игровое действие, не код).
- C2. `arrivalRate` — быстрее приход (риск: перегруз).
- C3. `guestLimit` — уже через покупку слотов.

**D. Движение:**
- D1. `waiterMovementSteps` +1 (ускорение). 1 правка, риск: `movement.test`.
- D2. Умный путь. Уже есть `movement.test`, оптимизация — 1 сессия.

**E. Повара:**
- E1. `cookingProgress` быстрее (усилить `upgrades.cooking`). Риск: `kitchen.test`, `chef-stove-binding`.
- E2. VISUAL-8.5 (4 конфорки) — уже следующая, может решить без отдельной задачи.

### Правила LOGIC-9

- **Phase 0 обязательна.** Без метрик — не выбираем вариант (урок 8).
- **Не делать всё сразу.** Выбрать 1-2 идеи по результатам замеров.
- **Один task-файл на вариант.** Не размывать.
- **Проверять контракты:** `waiterCarry.test.ts` (8), `kitchenBuffers.test.ts` (8), `chef-stove-binding.test.ts` (18), `movement.test.ts` (14).

## 7. TECH-1 — контекст (бэклог)

Интеграционные тесты мебели. `FurnitureKind = 'door'|'stove'|'table'|'tableDouble'|'chair'|'plant'|'counter'`. Для каждого kind — e2e + unit. Добавлять только непокрытые.

## 8. Уроки проекта (1–40)

### Базовые 1–29
1. Перед удалением — `grep` + `npm test`.
2. Handoff — снимок, не истина.
3. Тесты с `loadGame()` → `??=` в `advanceSimulation`.
4. `docs/prompts/README.md` не существует.
5. Both staged / tests/tests — `git status` читать ПУТИ.
6. `git log` не показывает содержимое — `git show --stat`.
7. WIP ≠ недоделка — `git grep` по testid.
8. Не добивать спеку до круглого числа.
9. Хелперы миграции — в модульный scope.
10. Порядок миграций — `questBaseline ??=` последним.
11. `git add <path>` сразу после правки.
12. Early return блокирует хук.
13. `git restore` не трогает untracked — `del` / `git clean -f <path>`.
14. Push = последний шаг (E2E зелёный → commit → merge → `npm test` на main → build → push).
15. Kimi ломает длинные тернарники / теряет `applyLevels` — проверять `git diff`.
16. `normalizeState` не вызывает `processProgression`.
17. `<progress>` vs `<meter>` — ARIA `progressbar` ломает strict-mode e2e.
18. CSS `max-height` + `overflow-y: auto` для растущих панелей.
19. Теги `archive/*` вместо `-D` при cleanup.
20. TECH-4 — матрица проходимости.
21. TECH-5 — тесты не зависят от кнопки `+50 000`.
22. Покрытие проверять `git grep`, не по памяти.
23. Угловые объекты при `expandBounds` сдвигаются.
24. `hidden = true` убирает из accessibility tree.
25. `storage.save` в `play()` обнажает баги тестов.
26. Kimi копирует `...` буквально.
27. `setVisible` ≠ `open`.
28. `moveFurniture` синхронизирует поваров.
29. Станция повара — привязка к `rotation` плиты.

### Из сессии 2026-11-25
30. **Git-правило Kimi — A (read-only) по умолчанию.** Переключение A→B создаёт friction: пользователь выполняет git по запросу Kimi → тратит время и лимиты DeepSeek. Task-файлы под A.
31. **`updateChef` — прогресс независим от позиции.** Блокировка готовки при отсутствии на станции ломает `chefRouting`/`stoveBurners`/`kitchenBuffers`/`waiterCarry`. Возврат — `moveChef`, но `order.progress +=` не блокировать.
32. **`industrialStove` — скин, не kind.** Для 1×2 смотреть `appliedStoveSkins` (`skinId === 'industrialStove'`), не только `kind`.
33. **Техдолг task-файлов.** `LOGIC-8.4.1-chef-station.md`: §ФАЗА 0 «main» (устарело), §ФАЗА 1 «adjacentCells в grid.ts» (в `tick.ts:22`), «Git запрещён» (B, если A). Поправить после 8.4.1.
34. **Git-правило A (уточнение урока 30).** Kimi — read-only git, пользователь — write. **Не перекладывать read на пользователя** — ошибка процесса.
35. **`updateChef` — early return после order-completion** откладывает handoff на 1 тик. Приемлемо, не оптимизировать.
36. **`npm test` ≠ `npm run build`.** Unit-зелёный (vitest/esbuild) не гарантирует типы. Build = `tsc --noEmit && vite build` — отдельный гейт.
37. **«ветка = main» из handoff — снимок.** Перед merge проверить `git log --oneline main..HEAD`.
38. **Обрезанный diff в консоли** (`type` рвёт длинный вывод). Верификация — через тесты как ground truth.
39. **«Первый до лимита» — антипаттерн распределения.** При 3+ поварах первый забирает всё до `stoveBurners`, остальные стоят. Фикс — `pickLeastLoadedChef` (min activeOrders + tie-break по id) в **обеих** точках: `updateKitchenOrders` (waitingCook) + `updateWaiter` (takingOrder). Не только одна — иначе перекос вернётся через handoff.
40. **Debug-сетап для чистой игры.** Если баг не воспроизводится в unit-тестах и нет старого сейва — временный `__debug` в `main.ts` под `import.meta.env.DEV`: методы `setup3x3`, `setLevel`, `setCoins`, `dump`. **Обязательно удалить после диагностики** (`git checkout -- src/main.ts`). Плюс: `state.orders = []` после сброса `state.furniture/employees` — иначе зомби-заказы на несуществующих плитах.

## 9. Что НЕ трогать без подтверждения

- `industrialStove`, `ratingHistory` — смержены.
- `chef-stove-binding.test.ts` (18), `stoveBurners.test.ts` (8), `chefRouting.test.ts` (6), `kitchenBuffers.test.ts` (8), `waiterCarry.test.ts` (8), `movement.test.ts` (14) — контракт LOGIC-8.
- `questPanel.ts`, `quests.ts` / `sideQuests.ts` / `dailyQuests.ts` — контракт LOGIC-6.
- `progression.ts` — `applyLevels` на месте.
- `shopPanel.ts` — статус-порядок.
- `seatRate = 0.0556` — backlog, не «оптимизировать».
- `furniture-layout-passability.test.ts` (3), `e2e/furniture-layout.spec.ts` — контракт TECH-5.
- Матрица проходимости TECH-4.
- Удаление веток — `diff`+`log` каждой.

## 10. Техдолг (погасить по мере)

- **Ф1.** `stoveStation` считает calling chef занятым (работает только из-за lock-in в `updateChef`). Нужен параметр `excludeActorId`.
- **Ф2.** `placeFurniture` откат через `state.furniture.pop()` — fragile. Лучше `splice(indexOf(furniture), 1)`.
- **Ф3.** `handoff/task-6.1с.md` — кириллическая «с» + не `.DONE.md`.
- **Ф4.** `docs/tasks/LOGIC-8.4.1-chef-station.md` — §ФАЗА 0 «main», §ФАЗА 1 «adjacentCells в grid.ts», «Git запрещён» (B).
- **Ф5.** Повар без заказов не идёт на станцию (`updateChef` вызывает `returnToStation` только при `activeOrders.length > 0`). Визуально стоит не на своей клетке. Backlog, не блокер.
- **Ф6.** Пакетная чистка локальных `logic-8.1/8.2/8.3`, `feat-counter-plates-visual` + remote `origin/logic-1-v3-specs`, `origin/wip-overnight` — теги `archive/*`.
- **Ф7.** `4394b2d relax coins check` — разобрать для TECH-3.
- **LOGIC-9 backlog:** waiter bottleneck (multi-pickup / waiterQueue). Phase 0 — замеры до кода.

## 11. Памятка по окружению

- `chcp 65001` в начале
- Тесты в `tests/`, доки в `docs/tasks/`, handoff в `handoff/`
- `findstr` в CP866 показывает кракозябры, но латинские паттерны и номера строк находит
- Перед коммитом — `git status` читать ПУТИ
- После коммита — `git show --stat HEAD`
- Push — после полного E2E зелёного
- Ветка для новой задачи: `git checkout -b <name>` от main **до** первого кода

## 12. Аварийные сценарии

**Тесты упали после задачи:** `git reset --hard <last-known-good>` (только локально). Разобрать, не чинить вслепую.
**Both staged / tests/tests:** `git restore --staged <path>` → `git add` правильного пути.
**Untracked не удаляется:** `del <path>` / `git clean -f <path>` (только с путём).
**origin/main разошёлся:** `git fetch origin` → `git log --graph main origin/main -10`. Линейно → `pull --rebase`. Merge — обсудить.
**Kimi снова сломал UI:** `git diff HEAD~1 -- src/ui/shopPanel.ts` + `src/simulation/progression.ts`, проверить порядок тернарников и `applyLevels`.
**Просят «просто запушить»:** `npm test` + `npm run build` + `npx playwright test`. Зелёное → push.

## 13. Протокол приёмки в новой сессии

**Первое сообщение** после прочтения этого файла + `handoff/CURRENT.md`:

> «Прочитал handoff. Отвечаю без кода:
> 1. Состояние: main = d84dbe2, origin/main = d84dbe2, 381/381, build 0, e2e 53/53.
> 2. LOGIC-8.4.1 закрыт (a3b37cc). fix-balance закрыт (d84dbe2) — pickLeastLoadedChef в 2 точках, 3 повара работают.
> 3. Git-правило Kimi: A (read-only) — **подтверди, A или B?**
> 4. Инварианты: не блокировать готовку на станции, industrialStove = скин, fallback null, pickLeastLoadedChef в 2 точках.
> 5. Нельзя трогать: chef-stove-binding (18), stoveBurners, chefRouting, kitchenBuffers, waiterCarry, movement.test, questPanel, progression (applyLevels).
> Если A/B подтверждено и факты совпали — идём в Шаг 0.»

Если расхождение — стоп, перечитать §3–§12.

## 14. Шаг 0 — разведка

```cmd
chcp 65001
git status
git branch --show-current
git log --oneline -5
git tag -l "archive/*"
npm test
```

**Ожидание на 2026-11-25 (после fix-balance):**
- main, clean, ahead 0
- `d84dbe2 → 0f12631 → 223140a → a3b37cc → 65fab54`
- 381/381 unit, 53/53 e2e, build ✅
- теги: archive/logic-8.4.1-chef-station = 65fab54, archive/fix-chef-3x3-diagnostic = 0f12631, + 10 старых

**Если разошлось:** стоп, разбор по §12.

## 15. После Шага 0

**Порядок задач:**
1. **VISUAL-8.5** (4 конфорки, только визуал — логика `stoveBurners = 4` уже работает). Phase 0/1 → task-файл → Phase 2–4 → merge → push.
2. **LOGIC-9** (waiter bottleneck) — Phase 0 замеры (метрики F1–F7, см. §6.1) → решение о варианте (A1/A2/A3/A4/B1/B2/B3/D1/E1) → task-файл → Phase 2–4.
3. TECH-3, TECH-2, TECH-1, TECH-5.1.
4. Ф5 (повар без заказов не на станции) — из техдолга.
5. Пакетная чистка веток — отдельным шагом.

**Техдолг погасить:** Ф1, Ф2, Ф3, Ф4, Ф7 — по мере, отдельными коммитами `chore: ...`.