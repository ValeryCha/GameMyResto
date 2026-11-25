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
1. **Kimi Code** — пишет код по task-файлам, Phase 2–4,
   (`status/log/diff/grep/show/branch` — можно; `add/commit/push/checkout/reset/restore/merge/tag` — нельзя).
2. **DeepSeek** — архитектура, логика, механика, task-файлы, ревью диффов, обновление handoff.
3. **Пользователь** — VS Code, git status/log/diff/grep/show, запуск тестов.

**Правило эффективности:** короткие ответы. Лимиты тратятся.

## 2. Текущее состояние (на конец 2026-11-25, после LOGIC-9 A1)

| Ветка | Коммит | Статус |
|---|---|---|
| main | 0e72565 | ✅ HEAD, merge LOGIC-9 A1, запушен |
| origin/main | 0e72565 | ✅ sync |
| archive/logic-8.4.1-chef-station | 65fab54 | ✅ тег |
| archive/fix-chef-3x3-diagnostic | 0f12631 | ✅ тег |
| archive/visual-8.5-stove-burners | c82b9e5 | ✅ тег |
| archive/logic-9-waiter-bottleneck | a38c9b0 | ✅ тег |
| master | 0bf062a | реликт (backlog) |

**Тесты:** unit **382/382**, e2e **53/53**, build ✅ (exit 0).
**`git status`:** на main, clean, ahead 0.

## 3. Что сделано по сессиям

### 2026-11-25 — LOGIC-9 A1 (закрыт, `0e72565`)

- **Проблема:** метрики D показали waiter bottleneck — waitingWaiter=20.6, F8_burnersUsageRate=13%, официант занят 94%, пропускная 0.28 trips/тик.
- **Фикс `a38c9b0`:** в `updateWaiter` блок `takingOrder` заменён на 4 строки — `transitionOrder → waitingCook`, `assignedTo = undefined`, `taskId = undefined`, `return`. Повар подхватывает через `pickLeastLoadedChef` (уже работает после fix-balance). Handoff-блок в `updateChef` не тронут (fallback).
- **Метрики после A1:** F7 cycle **13.7 → 4.6** (×3 быстрее), F9 throughput **0.28 → 0.86/тик** (×3), takingOrder 2.05 → 0.49 (×4 меньше), F2 idle 6% → 17.6%.
- **Ограничение:** throughput **0.43 гостей/тик** (F5_seatsFillRate=91%), waitingWaiter=18.33. Кухня не bottleneck (`cookSeconds`=6-15, cooking=1.51). **Столы / eatTime ≈ 98 тиков = потолок** (урок 43).
- Тест `waiterCarry.test.ts:114` обновлён (1×1 → 3×3×3, чтобы кухня не была bottleneck)
- Merge `0e72565` (`--no-ff`), tag `archive/logic-9-waiter-bottleneck` = `a38c9b0`

### 2026-11-25 — VISUAL-8.5 (закрыт, `f8266a3`)

- Feat `c82b9e5`: 4 независимых конфорки на плите — `BURNER_POSITIONS` (module-const), 4 `flames[]`, 4 `pans[]` в `stoveModel`. `RestaurantWorld.syncEntities` переключает по `cookingCount` (не boolean). Обратная совместимость: `userData.flame = flames[0]`, `userData.pan = pans[0]`.
- Merge `f8266a3` (`--no-ff`), tag `archive/visual-8.5-stove-burners` = `c82b9e5`
- Новый тест в `tests/models3d.test.ts` (4 flames, 4 pans, обратная совместимость)
- Проверено в игре: 3 огня одновременно на 3 конфорках. 4-я конфорка не заполняется — waiter bottleneck (LOGIC-9, не баг визуала).

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
TECH-3 → TECH-2 → TECH-1 → TECH-5.1
```


| # | Задача | Статус |
|---|---|---|
| 1–7 | 8.1–8.4.1 + fix-balance | ✅ |
| 8 | VISUAL-8.5 (4 конфорки) | ✅ f8266a3 |
| 9 | **LOGIC-9 A1** (waiter queue) | ✅ 0e72565 |
| 10 | **TECH-3** (`catalog-decorations.spec.ts`, разобрать `4394b2d`) | **← следующая** |
| 11–13 | TECH-2 → TECH-1 → TECH-5.1 | ожидает |
| 14 | LOGIC-10 (eating time / table turnover) | backlog, опционально |
| 15 | Пакетная чистка веток | отложено |

## 6. LOGIC-8.4.1 — ЗАКРЫТ (a3b37cc)

Справка: `Furniture.chefStation?: Point` (опциональный, старые сейвы = undefined). `stoveStation(stove, state)` — rotation 0→юг, 90→запад, 180→север, 270→восток; fallback adjacentCells → null. `placeFurniture` / `moveFurniture` проверяют станцию (`reason: 'Нет места для повара'`). `updateChef` — возврат через `moveChef`, `order.progress +=` **не блокируется**. `industrialStove` 1×2 — через `appliedStoveSkins`.

## 6.1. LOGIC-9 — ЗАКРЫТ (A1, `0e72565`)

**Итог:** A1 (WaiterQueue) реализован в `0e72565`. Официант больше не bottleneck: cycle **13.7 → 4.6** (×3), throughput **0.28 → 0.86 trips/тик** (×3), `takingOrder` 2.05 → 0.49. Остаточный потолок — **столы / eatTime ≈ 98 тиков** (F5=91%, F13.cooking=1.51 при `cookSeconds`=6–15). Метрики D и A1 подтвердили и диагноз, и результат.

**Код метрик** `__debug.metrics` (F1–F17) был временным (урок 40), удалён из `main.ts`. Если нужен для LOGIC-10 или проверки A2/A3 — восстановить из тега `archive/logic-9-waiter-bottleneck` = `a38c9b0` (файл `src/main.ts` на том коммите).

### Что сделано (A1)

В `updateWaiter` блок `takingOrder` (~34 строки) заменён на 4:
```ts
if (order.state === 'takingOrder') {
  transitionOrder(order, 'waitingCook', state.tick);
  order.assignedTo = undefined;
  waiter.taskId = undefined;
  return;
}
```
### Открытые варианты — backlog LOGIC-10

**A1 ✅ реализован.** Остальные — в backlog, активировать по условию:

| Условие | Вариант | Эффект | Цена |
|---|---|---|---|
| Хочется **сократить waitingWaiter** (18 → 10) | **A3 (Multi-drop)** — официант несёт 3 готовых за раз | waitingWaiter −30–40% | 1 сессия |
| Хочется **сократить waitingWaiter** сильнее | **A2 (Multi-pickup)** — официант принимает 2-3 заказа за подход | waitingWaiter −50% | 2-3 сессии |
| Хочется **больше throughput** | **LOGIC-10 (eating time / table turnover)** — сократить `eatTime` или увеличить столы | Throughput +20–40% | 1-2 сессии + дизайн |
| Хочется **меньше queueRejected** (жалобы) | **D (waiterMovementSteps +1)** — официант быстрее ходит | queueRejected −20% | 1 правка |
| **Не нужно** | A4 (FIFO), A5 (разделение ролей), B1–B3 (стойки), C1–C3 (уже работает), E1–E2 (повара уже быстрые) | — | — |

**Правило:** перед выбором — **повторить метрики** (F1–F17 из `__debug.metrics`, восстановить из `archive/logic-9-waiter-bottleneck` = `a38c9b0`). После A1 bottleneck сместился (урок 43) — следующий фикс может быть не про официантов.

**Не начинать LOGIC-10 без явной просьбы пользователя.** Это играбельный/дизайнерский вопрос, не технический.

## 7. TECH-1 — контекст (бэклог)

Интеграционные тесты мебели. `FurnitureKind = 'door'|'stove'|'table'|'tableDouble'|'chair'|'plant'|'counter'`. Для каждого kind — e2e + unit. Добавлять только непокрытые.

## 8. Уроки проекта (1–44)

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
30. ~~**Git-правило Kimi — A (read-only) по умолчанию.**~~ **УСТАРЕЛО, см. урок 41.** Схема «Kimi read-only git, пользователь write» заменена на «Kimi — только код (Phase 2–4), вся read-разведка на пользователе».
31. **`updateChef` — прогресс независим от позиции.** Блокировка готовки при отсутствии на станции ломает `chefRouting`/`stoveBurners`/`kitchenBuffers`/`waiterCarry`. Возврат — `moveChef`, но `order.progress +=` не блокировать.
32. **`industrialStove` — скин, не kind.** Для 1×2 смотреть `appliedStoveSkins` (`skinId === 'industrialStove'`), не только `kind`.
33. **Техдолг task-файлов.** `LOGIC-8.4.1-chef-station.md`: §ФАЗА 0 «main» (устарело), §ФАЗА 1 «adjacentCells в grid.ts» (в `tick.ts:22`), «Git запрещён» (B, если A). Поправить после 8.4.1.
34. ~~**Git-правило A (уточнение урока 30).** Kimi — read-only git, пользователь — write. Не перекладывать read на пользователя.~~ **УСТАРЕЛО, см. урок 41.** Новая схема: read-разведка на пользователе, Kimi получает готовые факты.
35. **`updateChef` — early return после order-completion** откладывает handoff на 1 тик. Приемлемо, не оптимизировать.
36. **`npm test` ≠ `npm run build`.** Unit-зелёный (vitest/esbuild) не гарантирует типы. Build = `tsc --noEmit && vite build` — отдельный гейт.
37. **«ветка = main» из handoff — снимок.** Перед merge проверить `git log --oneline main..HEAD`.
38. **Обрезанный diff в консоли** (`type` рвёт длинный вывод). Верификация — через тесты как ground truth.
39. **«Первый до лимита» — антипаттерн распределения.** При 3+ поварах первый забирает всё до `stoveBurners`, остальные стоят. Фикс — `pickLeastLoadedChef` (min activeOrders + tie-break по id) в **обеих** точках: `updateKitchenOrders` (waitingCook) + `updateWaiter` (takingOrder). Не только одна — иначе перекос вернётся через handoff.
40. **Debug-сетап для чистой игры.** Если баг не воспроизводится в unit-тестах и нет старого сейва — временный `__debug` в `main.ts` под `import.meta.env.DEV`: методы `setup3x3`, `setLevel`, `setCoins`, `dump`. **Обязательно удалить после диагностики** (`git checkout -- src/main.ts`). Плюс: `state.orders = []` после сброса `state.furniture/employees` — иначе зомби-заказы на несуществующих плитах.
41. **Read-разведка — на пользователе, не на Kimi.** Kimi тратит лимиты подписки на `git grep/show/log`, которые пользователь делает за 5 секунд и бесплатно. Kimi получает **готовые факты** (цитаты файлов, списки тестов), а не команды «сходи и посмотри». Экономия — 1–2 сессии на задачу. Заменяет прежнее «Git-правило A» (уроки 30, 34 — устарели).
42. **`stoveBurners` ≠ фактическая загрузка конфорок.** При 3 плитах лимит 4 конфорки на повара, но фактически горит 1–3, потому что официант принимает 1 заказ за цикл, а отдаёт 4 (handoff). VISUAL-8.5 визуал корректен (огонь там, где готовится), но 4-я конфорка редко достижима — это waiter bottleneck (LOGIC-9), не баг визуала.
43. **Bottleneck смещается после фикса.** После устранения waiter bottleneck (cycle 13.7→4.6, throughput ×3) throughput упёрся в столы (F5=91%, eatTime≈98 тиков). Перед следующим фиксом — повторить метрики: следующий bottleneck может быть другим. Подтверждено на LOGIC-9 A1.
44. **LOGIC-9 A1 — «мгновенный waitingCook».** Официант принял заказ → сразу `waitingCook` без похода к повару. Повар подхватывает через `pickLeastLoadedChef` в `updateKitchenOrders`. Handoff-блок в `updateChef` — fallback для старых сейвов (dead-code после A1, безопасен). Не удалять без проверки старых сейвов.

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
- **LOGIC-10 backlog:** после A1 waiter больше не bottleneck (cycle ×3), но waitingWaiter=18.33, throughput упёрся в столы (F5=91%, eatTime≈98). Варианты: A3 (Multi-drop, 1 сессия), A2 (Multi-pickup, 2-3 сессии), eating time / столы, D (waiterMovementSteps +1). Полная таблица в §6.1 и CURRENT «LOGIC-10 бэклог». **Не начинать без явной просьбы.**

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
> 1. Состояние: main = 0e72565, origin/main = 0e72565, 382/382, build 0, e2e 53/53.
> 2. Закрыты: LOGIC-8.4.1 (a3b37cc), fix-balance (d84dbe2), VISUAL-8.5 (f8266a3), **LOGIC-9 A1 (0e72565)** — waiter queue, cycle ×3, но столы = потолок.
> 3. Схема: Kimi — только код (Phase 2–4). Read-разведка (git status/log/grep/show) на пользователе, вывод идёт DeepSeek. **Подтверди, что схема принята.**
> 4. Инварианты: не блокировать готовку на станции (31), industrialStove = скин (32), pickLeastLoadedChef в 2 точках (39), BURNER_POSITIONS + flames[]/pans[] (42), takingOrder → waitingCook мгновенно (43 — не возвращать поход к повару).
> 5. Нельзя трогать: chef-stove-binding (18), stoveBurners, chefRouting, kitchenBuffers, waiterCarry (8), movement.test, models3d.test.ts (8), order-lifecycle.test.ts, editorMode.test.ts, order-diagnostics.test.ts, questPanel, quests/sideQuests/dailyQuests, progression (applyLevels), seatRate, BURNER_POSITIONS.
> Если факты Шага 0 совпали — идём в TECH-3 Phase 0 (read-разведка `4394b2d`).»

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

**Ожидание на 2026-11-25 (после LOGIC-9 A1):**
- main, clean, ahead 0
- `0e72565 → a38c9b0 → 7fd98f8 → b7668cd → 0dc96a6 → f8266a3`
- 382/382 unit, 53/53 e2e, build ✅
- Теги: archive/logic-8.4.1-chef-station=65fab54, archive/fix-chef-3x3-diagnostic=0f12631, archive/visual-8.5-stove-burners=c82b9e5, archive/logic-9-waiter-bottleneck=a38c9b0, + 10 старых

**Если разошлось:** стоп, разбор по §12.

## 15. После Шага 0

**Порядок задач:**
1. **TECH-3** (`catalog-decorations.spec.ts`, разобрать `4394b2d` — ослабили проверку монет). Read-разведка → task-файл → Kimi Phase 2 → merge → push.
2. **TECH-2** (`waitForTimeout` → `waitForFunction` в e2e).
3. **TECH-1** (интеграционные тесты мебели, по kind).
4. **TECH-5.1** (e2e плотной планировки, бэклог).
5. Ф5 (повар без заказов не на станции) — из техдолга.
6. Пакетная чистка веток — отдельным шагом.
7. LOGIC-10 (eating time / table turnover, A2/A3/D) — только по явной просьбе пользователя (см. §6.1).

**Техдолг погасить:** Ф1, Ф2, Ф3, Ф4, Ф7 — по мере, отдельными коммитами `chore: ...`.

**Текущая задача — TECH-3.** Read-разведка (`git show 4394b2d -- e2e/catalog-decorations.spec.ts` + `type e2e\catalog-decorations.spec.ts`) → DeepSeek пишет `docs/tasks/TECH-3.md` → Kimi → merge → push.