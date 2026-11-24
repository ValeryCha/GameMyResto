# Проект «Restaurant City / Мой ресторан» — handoff-state

## 0. Как пользоваться

Этот файл — **состояние проекта**. Текущая задача — `handoff/CURRENT.md`.
Читать оба: сначала этот (state), потом CURRENT (где мы сейчас).

Порядок новой сессии:
1. Приёмка (§12) — без кода
2. Шаг 0 (§13) — разведка
3. Открывай `handoff/CURRENT.md`
4. После закрытия задачи — обновить этот handoff (§2, §3, §5, §8, §13, §14)

Правило: handoff — снимок, а не истина. `git diff` / `status` / `log` — всегда.

## 1. Контекст проекта

- **Название:** «Restaurant City / Мой ресторан»
- **Стек:** TypeScript, Three.js, Vite, inline-SVG, Vitest + Playwright
- **Архитектура:** Единый `GameState`, localStorage, симуляция тиками, Three.js поверх сетки
- **Модули:** `src/simulation/*`, `src/content/*`, `src/render3d/*`, `src/ui/*`, `src/persistence/*`, `src/main.ts`
- **Репозиторий:** https://github.com/ValeryCha/GameMyResto
- **Окружение:** Windows `cmd`, CP866 → `chcp 65001` в начале
- **Тесты:** `npm test` (vitest), `npx playwright test` (e2e), `npm run build`

## 2. Текущее состояние (на конец 2026-11-25)

| Ветка | Коммит | Статус |
|---|---|---|
| main | a3b37cc | ✅ HEAD, merge LOGIC-8.4.1, запушен |
| origin/main | a3b37cc | ✅ sync |
| master | 0bf062a | архив (реликт) |
| archive/* (11 тегов) | см. `git tag` | архивы удалённых веток |

**Тесты:** unit **380/380**, e2e **53/53**, build ✅ (exit 0).
**`git status`:** на main, clean, ahead 0.

## 3. Что сделано по сессиям
### 2026-11-25 — LOGIC-8.4.1 (закрыт, `a3b37cc`)

- Feat `65fab54` — `Furniture.chefStation?: Point` + `stoveStation()` + проверки в `commands.ts` + возврат в `updateChef` + `tests/chefStation.test.ts` (6 кейсов)
- Merge `a3b37cc` (`--no-ff`), push origin/main
- Ветка удалена, тег `archive/logic-8.4.1-chef-station` (`65fab54`)
- 
### 2026-11-25 — LOGIC-8.4.1 (в работе)

**Ветка `logic-8.4.1-chef-station` от `ddc4afe`.**
- Docs `ddc4afe` — task-файл под git-rule B (см. урок 30: правило меняется на A)
- Phase 1 — инвентаризация ✅ (Kimi построила таблицу, совпала с эталоном)
- Phase 2 — код (в работе, ждём ответ Kimi)

**Уточнения для Phase 2** (от DeepSeek):
- НЕ блокировать `order.progress +=` при отсутствии на станции (урок 31)
- Fallback `chefStation === undefined` → `adjacentCells` (старые сейвы)
- `industrialStove` — скин, не kind (урок 32)

### 2026-11-24 (вечер) — LOGIC-8.1, 8.2, 8.3, 8.4, visual

| Фаза | Коммит | Результат |
|---|---|---|
| 8.1 counter buffer | b8a18df + 0d4d8ea | 3 slots, chef preferred counter |
| 8.2 waiter multi-carry | 8836233 | 1→2→3 через upgrades.waiter |
| visual 3D plates | 62b4591 | треугольная раскладка |
| 8.3 stove burners | df08de4 | 2/3/4 + chef activeOrders |
| 8.4 chef routing | 09afd32 | moveFurniture + chefRouteTo + counterForChef |

### 2026-11-23 — LOGIC-6.2 + 6.3 + TECH-4 + TECH-5

- 6.2 `8a802af` + merge `e866321` — quest panel 3 sections
- 6.3 `27663c9` + merge `42ec363` — quest lifecycle e2e
- TECH-4 `8d2b1e0` — passability matrix
- TECH-5 `23efd79` — dense layout 4 tables + 12 chairs
- Cleanup — 10 тегов `archive/*`

### 2026-11-22 — 6.1c + movement + LOGIC-7

- 6.1c `e589fcf` — 6 daily quests
- movement `b1852e2` — guests pass through each other
- LOGIC-7 `1820edc` — найм поваров 3/3, 15k/35k + 20k/50k, уровни 15/25, 1:1
- fix `a8bd970` — shopPanel status order + progression applyLevels

### 2026-11-19 — LOGIC-5.1 + 6.1a + 6.1b

- 5.1 `77d8640` → merge `64f4798` — HUD «свободно/лимит»
- 6.1a `284a821` — questBaseline (14 полей) + миграция
- 6.1b `5689c11` + `ebf0198` — 18 side quests + processSideQuests

## 4. Решения Q1-Q3 (общие, вариант A)

- Q1: декор-награда `min(базовая, Σprice × 0.8)`, фиксируется при выполнении
- Q2: HUD гостей на узком — как в `649e137`
- Q3: `peakQuestTotals = { servedTotal, perfectPeaksTotal }` кумулятив

Все Q для 6.1b / 6.1c / 6.2 закрыты.

## 5. Roadmap

```
VISUAL-8.5 → TECH-3 → TECH-2 → TECH-1 → TECH-5.1
```

| # | Задача | Статус |
|---|---|---|
| 1–5 | 8.1, 8.2, visual, 8.3, 8.4 | ✅ |
| 6 | **LOGIC-8.4.1** | ✅ a3b37cc |
| 7 | **VISUAL-8.5** (4 конфорки) | **← следующая** |
| 8–12 | TECH-3 → TECH-2 → TECH-1 → TECH-5.1 → seatRate | ожидает |

## 6. LOGIC-8.4.1 — ЗАКРЫТ (a3b37cc)

**Цель:** станция повара (фиксированная клетка за плитой по rotation), возврат после доставки.

**Файлы:**
- `types.ts` — `Furniture.chefStation?: Point`
- `kitchen.ts` — `stoveStation(stove, state): Point | null`
- `commands.ts` — проверка станции в `placeFurniture` / `moveFurniture`
- `tick.ts` — `updateChef` возврат к станции
- `tests/chefStation.test.ts` (новый, 6 кейсов)

**Решения:**
- rotation: 0→юг, 90→запад, 180→север, 270→восток. Fallback adjacentCells → null
- Заблокирована станция → `{ok: false, reason: 'Нет места для повара'}`
- **НЕ блокировать готовку** (урок 31)
- `industrialStove` — скин (урок 32)
- Fallback null → `adjacentCells` в `updateChef`

## 7. TECH-1 — контекст (бэклог)

Интеграционные тесты мебели. `FurnitureKind = 'door'|'stove'|'table'|'tableDouble'|'chair'|'plant'|'counter'`. Для каждого kind — e2e + unit. Добавлять только непокрытые.

## 8. Уроки проекта

### 1–23 — базовые (без изменений)
1. Перед удалением — `grep` + `npm test`
2. Handoff — снимок, не истина
3. Тесты с `loadGame()` обходом → `??=` в `advanceSimulation`
4. `docs/prompts/README.md` не существует
5. Both staged / tests/tests — `git status` читать ПУТИ
6. `git log` не показывает содержимое — `git show --stat`
7. WIP ≠ недоделка — `git grep` по testid
8. Не добивать спеку до круглого числа
9. Хелперы миграции — в модульный scope
10. Порядок миграций — `questBaseline ??=` последним
11. `git add <path>` сразу после правки
12. Early return блокирует хук
13. `git restore` не трогает untracked — `del` / `git clean -f <path>`
14. Push = последний шаг (E2E зелёный → commit → merge → `npm test` на main → build → push)
15. Kimi ломает длинные тернарники (`shopPanel.ts`), теряет `applyLevels` (`progression.ts`) — проверять `git diff`
16. `normalizeState` не вызывает `processProgression`
17. `<progress>` vs `<meter>` — ARIA role `progressbar` ломает strict-mode e2e
18. CSS `max-height` + `overflow-y: auto` для растущих панелей
19. Теги `archive/*` вместо `-D` при cleanup
20. TECH-4 — матрица проходимости
21. TECH-5 — тесты не зависят от кнопки `+50 000`
22. Покрытие проверять `git grep`, не по памяти
23. Угловые объекты при `expandBounds` сдвигаются
24. `hidden = true` убирает из accessibility tree
25. `storage.save` в `play()` обнажает баги тестов
26. Kimi копирует `...` буквально
27. `setVisible` ≠ `open`
28. `moveFurniture` синхронизирует поваров
29. Станция повара — привязка к `rotation` плиты

### Из сессии 2026-11-25
30. **Git-правило Kimi — A (read-only) по умолчанию.** Переключение A→B создаёт friction: пользователь выполняет git по запросу Kimi → тратит время и лимиты DeepSeek на длинные промпты. Task-файлы под A. Если пользователь явно просит B — только тогда, с планом возврата.
31. **`updateChef` — прогресс независим от позиции.** Блокировка готовки при отсутствии на станции ломает `chefRouting`/`stoveBurners`/`kitchenBuffers`/`waiterCarry`. Возврат — `moveChef`, но `order.progress +=` не блокировать.
32. **`industrialStove` — скин, не kind.** Для 1×2 смотреть `appliedStoveSkins` (`skinId === 'industrialStove'`), не только `kind`.
33. **Техдолг task-файлов.** `LOGIC-8.4.1-chef-station.md`: §ФАЗА 0 «main» (устарело), §ФАЗА 1 «adjacentCells в grid.ts» (в `tick.ts:22`), «Git запрещён» (B, если A). Поправить после 8.4.1.
34. **Git-правило A (уточнение урока 30).** Kimi — read-only git (`status/log/diff/grep/show/branch`), пользователь — write (`add/commit/push/checkout/merge`). **Не перекладывать read на пользователя** — ошибка процесса.
35. **`updateChef` — early return после order-completion** откладывает handoff на 1 тик. Приемлемо, не оптимизировать.
36. **`npm test` ≠ `npm run build`.** Unit-зелёный (vitest/esbuild) не гарантирует типы. Build = `tsc --noEmit && vite build` — отдельный гейт.
37. **«ветка = main» из handoff — снимок.** Перед merge проверить `git log --oneline main..HEAD`.
38. **Обрезанный diff в консоли** (`type` рвёт длинный вывод). Верификация — через тесты как ground truth.

## 9. Что НЕ трогать без подтверждения

- `industrialStove`, `ratingHistory` — смержены
- `chef-stove-binding.test.ts` (17), `stoveBurners.test.ts` (8), `chefRouting.test.ts` (6), `kitchenBuffers.test.ts` (8), `waiterCarry.test.ts` (8), `movement.test.ts` (14) — контракт LOGIC-8
- `questPanel.ts` — 6.2 закрыт
- `quests.ts` / `sideQuests.ts` / `dailyQuests.ts` — контракт
- `progression.ts` — `applyLevels` на месте
- `shopPanel.ts` — статус-порядок
- `seatRate = 0.0556` — backlog
- `furniture-layout-passability.test.ts` (3), `e2e/furniture-layout.spec.ts` — контракт TECH-5
- Матрица проходимости TECH-4
- Удаление веток — `diff`+`log` каждой

## 10. Памятка по окружению

- `chcp 65001` в начале
- Тесты в `tests/`, доки в `docs/tasks/`, handoff в `handoff/`
- `findstr` в CP866 показывает кракозябры, но латинские паттерны и номера строк находит
- Перед коммитом — `git status` читать ПУТИ
- После коммита — `git show --stat HEAD`
- Push — после полного E2E зелёного
- Ветка для новой задачи: `git checkout -b <name>` от main **до** первого кода

## 11. Аварийные сценарии

**Тесты упали после задачи:** `git reset --hard <last-known-good>` (только локально). Разобрать, не чинить вслепую.
**Both staged / tests/tests:** `git restore --staged <path>` → `git add` правильного пути.
**Untracked не удаляется:** `del <path>` / `git clean -f <path>` (только с путём).
**origin/main разошёлся:** `git fetch origin` → `git log --graph main origin/main -10`. Линейно → `pull --rebase`. Merge — обсудить.
**Kimi снова сломал UI:** `git diff HEAD~1 -- src/ui/shopPanel.ts` + `src/simulation/progression.ts`, проверить порядок тернарников и `applyLevels`.
**Просят «просто запушить»:** `npm test` + `npm run build` + `npx playwright test`. Зелёное → push.

## 12. Протокол приёмки в новой сессии

**Первое сообщение** после прочтения этого файла + `handoff/CURRENT.md`:

> «Прочитал handoff. Отвечаю без кода:
> 1. Состояние: main = ddc4afe, origin/main = 7331a67, ветка logic-8.4.1-chef-station (в работе), 374/374, build ✅.
> 2. LOGIC-8.4 закрыт (09afd32). LOGIC-8.4.1 — Phase 2 (код), ждём ответ Kimi.
> 3. Git-правило Kimi: A (read-only) по умолчанию — **подтверди, A или B?**
> 4. Инварианты: НЕ блокировать готовку на станции, industrialStove = скин, fallback null.
> 5. Нельзя трогать: chef-stove-binding, stoveBurners, chefRouting, kitchenBuffers, waiterCarry, movement.test, questPanel, progression (applyLevels).
> Если A/B подтверждено и факты совпали — идём в Шаг 0.»

Если расхождение — стоп, перечитать §3–§10.

## 13. Шаг 0 — разведка

```cmd
chcp 65001
git status
git branch --show-current
git log --oneline -5
npm test
```

**Ожидание на 2026-11-25 (после LOGIC-8.4.1):**
- main, clean, ahead 0
- `a3b37cc → 65fab54 → 192a5b6 → ddc4afe → 7331a67`
- 380/380 unit, 53/53 e2e, build ✅
- Ветка `logic-8.4.1-chef-station` отсутствует, тег `archive/logic-8.4.1-chef-station` = `65fab54`

**Если разошлось:** стоп, разбор по §11.

## 14. После Шага 0

**Если Phase 2 в работе (ждём ответ Kimi):**
Ждать ответ Kimi от пользователя. Ревью Phase 2 → Phase 3 (самоаудит через `git diff --stat`, Kimi read-only) → Phase 4 (тесты). Закрытие: коммит от пользователя → merge `--no-ff` → `npm test` на main → build → push. Обновить handoff §2, §3, §5, §8, §13 + `handoff/CURRENT.md`.

**Если 8.4.1 закрыт:**
Следующая задача — VISUAL-8.5 (4 конфорки на плите). Task-файл создать перед стартом.

**Порядок бэклога:** 8.4.1 → VISUAL-8.5 → TECH-3 → TECH-2 → TECH-1 → TECH-5.1.

**Техдолг (погасить после 8.4.1):**
- `handoff/task-6.1с.md` — кириллическая «с» + не `.DONE.md`
- `handoff/CURRENT.md` — устарел (main, 368→374, git-rule)
- `docs/tasks/LOGIC-8.4.1-chef-station.md` — §ФАЗА 0, §ФАЗА 1, Git-правило