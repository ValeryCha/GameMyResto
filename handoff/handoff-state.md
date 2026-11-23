# Проект «Restaurant City / Мой ресторан» — handoff-state

## 0. Как пользоваться

Этот файл — **состояние проекта**. Текущая задача — `docs/tasks/CURRENT.md`.
Читать оба: сначала этот (state), потом CURRENT (где мы сейчас).

Порядок новой сессии:
1. Приёмка (§12) — без кода
2. Шаг 0 (§13) — разведка
3. Открывай `docs/tasks/CURRENT.md` — там текущая задача
4. После закрытия задачи — обновить этот handoff (§2, §3, §5, §8, §12, §14)

Правило: handoff — снимок, а не истина. `git diff` / `status` / `log` — всегда.

## 1. Контекст проекта

- **Название:** «Restaurant City / Мой ресторан»
- **Стек:** TypeScript, Three.js, Vite, inline-SVG, Vitest + Playwright
- **Архитектура:** Единый `GameState`, localStorage, симуляция тиками,
  Three.js поверх сетки
- **Модули:** `src/simulation/*`, `src/content/*`, `src/render3d/*`,
  `src/ui/*`, `src/persistence/*`, `src/main.ts`
- **Репозиторий:** https://github.com/ValeryCha/GameMyResto
- **Окружение:** Windows `cmd`, CP866 → `chcp 65001` в начале
- **Тесты:** `npm test` (vitest), `npx playwright test` (e2e), `npm run build`

## 2. Текущее состояние (на конец 2026-11-23)

| Ветка | Коммит | Статус |
|---|---|---|
| main = origin/main | 23efd79 | ✅ HEAD, TECH-5 (dense layout) |
| master | 0bf062a | архив (реликт) |
| archive/* (10 тегов) | см. `git tag` | архивы удалённых веток |

**Тесты:** unit **334/334**, e2e **53/53**, build ✅.
**`git status`:** clean, main = origin = `23efd79`.

## 3. Что сделано по сессиям

### 2026-11-23 — TECH-5 dense layout (закрыт)

**Коммит `23efd79` test: TECH-5 - dense layout 4 tables + 12 chairs with passability.**

Схема: 2 single table + 4 chair, 2 double table + 8 chair = **4 стола, 12 стульев** на 10×10, с проходами.

**Реализация:**
- `tests/furniture-layout-passability.test.ts` (новый, 3 it):
  1. L4 → L5 через `experienceThreshold(4) + 1` → `processProgression` → 10×10, 4 стола + 12 стульев
  2. `countUsableSeats === 12`
  3. `advanceSimulation(600)` → `servedTotal > before`, нет застрявших (`seekingSeat && !seatId && !target`)
- Удаление стартовых `table-1` и `chair-1` через `removeFurniture` (штатная, `commands.ts:98`)
- Официант + стойка добавляются программно (не через UI-клики)

**Урок про дверь:** `expandBounds` сдвигает дверь с (0,7) на (0,9), потому что (0,7) — угол 8×8 (левая + нижняя граница). Тест фиксирует фактическое поведение.

**Отложено:** e2e через `patchSave` не работает (reload → real-time, нельзя управлять тиками). TECH-5.1 в бэклог — e2e-вариант, если появится `__gameState`.

**Тесты:** +3 unit, всего **334/334**.

### 2026-11-23 — TECH-4 passability (закрыт)

**Коммит `8d2b1e0` feat(movement): TECH-4 - passability matrix; leave guests don't block staff.**

Матрица проходимости:
| Кто ↓ проходит сквозь → | Гость | Официант | Повар | Мебель |
|---|---|---|---|---|
| Гость | ✅ | ❌ | ❌ | ❌ |
| Официант | ❌ | ✅ | ✅ | ❌ |
| Повар | ❌ | ✅ | ✅ | ❌ |

**Асимметрия для leaving:** персонал проходит сквозь уходящего гостя, уходящий — блокируется персоналом.

**Реализация:**
- `movement.ts`: `blocksMovement(actor, other)` — единый селектор
- `tick.ts → occupiedCells`: использует селектор (не дублирует логику)
- `grid.ts`: не тронут (`isWalkable` = границы + мебель, актёров не учитывает)

**Тесты:** `tests/movement.test.ts` расширен (+6: официант↔официант, повар↔официант, гость↔повар обе стороны, мебель обе роли, leaving асимметрия, дедлок). Unit **331/331**.

### 2026-11-23 — LOGIC-6.3 (закрыт)

**Коммит `27663c9` test(e2e): LOGIC-6.3 — quest lifecycle integration.**
Merge `--no-ff` → `42ec363`.

3 кейса в `e2e/quest-lifecycle.spec.ts`:
1. Главный `quest-1` → side `economy-revenue` разблокируется (patchSave + wait)
2. Daily идемпотентен: `rewarded: true` → повторно не начисляется
3. Side награда один раз: `decor-painting` → +200, повторный reload не дублирует

**Ключевые решения:**
- Фильтр по уникальному описанию («Заработайте 5000 монет с блюд»), не title (strict mode)
- `waitForFunction` на целевое состояние `completedSideQuestIds.includes('decor-painting')` вместо `waitForTimeout(N)`

**Тесты:** +3 e2e, всего **53/53**. Unit 325/325 не менялся.

### 2026-11-23 — LOGIC-6.2 (закрыт)

**Коммит `8a802af` feat(ui): LOGIC-6.2 — quest panel with 3 sections.**
Merge `--no-ff` → `e866321`.

3 секции в `src/ui/questPanel.ts`:
- **Главные** (10, `.quest-item` — контракт `progress.spec.ts`)
- **Побочные** (18, `.side-quest-item`, `is-locked`/`is-complete`/`is-available`,
  «Требуется: <родитель>»)
- **Ежедневные** (6, `.daily-quest-item`, `<meter max=target value=progress>`,
  `X / N`, бейдж «Выполнено»)

**Ключевые решения (почему не сломали `progress.spec.ts`):**
- `<progress>` для daily → `<meter>` (у `meter` ARIA role `meter`, не `progressbar`)
- `quest.reward` для daily → `quest.rewardCoins` (поле `DailyQuest`)
- `.quest-item` остался 10, `.is-active` только на главных

**CSS-фикс** в `questPanel.css` — `max-height: calc(100vh - …)` + `overflow-y: auto`
(панель выросла с 10 до 34 элементов, кнопка «Магазин» перекрывалась).

**Тесты:** `e2e/quest-panel.spec.ts` (new, 5 кейсов) — 5/5.
`e2e/progress.spec.ts` — 1/1 (контракт сохранён).
Полный e2e: 50/50.

### 2026-11-22 — LOGIC-6.1c + movement + LOGIC-7 (закрыты)

| Фаза | Коммит | Результат |
|---|---|---|
| LOGIC-6.1c | e589fcf | 6 daily quests, `perfectPeaksTotal`, фикс `normalizeState` |
| Movement fix | b1852e2 | гости проходят сквозь друг друга (дедлоки) |
| LOGIC-7 | 1820edc | найм поваров 3/3, экономика 15k/35k + 20k/50k, уровни 15/25, связка 1:1 |
| Fix | a8bd970 | `shopPanel.ts` статус-порядок, `progression.ts` `applyLevels`, стабильность e2e |
| Merge | 0d7e009 | `--no-ff` в main, push в origin |

**Инварианты LOGIC-7 (не ломать):**
- 3 повара / 3 плиты, 5 официантов / 5 стоек
- Повара 15k / 35k; плиты 20k / 50k; уровни 15 и 25
- 1:1 повар ↔ плита (плит может быть больше)
- `chef-stove-binding.test.ts` — **17 тестов**

### 2026-11-19 — LOGIC-5.1 + LOGIC-6.1a + 6.1b

- **LOGIC-5.1** (`77d8640` → merge `64f4798`): HUD «свободно/лимит» восстановлен
- **LOGIC-6.1a** (`284a821`): `questBaseline` (14 полей) + миграция
- **LOGIC-6.1b** (`5689c11` + `ebf0198`): 18 side quests + `processSideQuests`

## 4. Решения Q1-Q3 (общие, уже приняты, вариант A)

Зафиксированы в `docs/tasks/LOGIC-6.md`. **Пересматривать не надо.**

- **Q1 (общий).** Декорная награда: `reward = min(базовая, Σ(price триггерных)
  × 0.8)`. Награда фиксируется в момент выполнения side quest.
- **Q2 (общий).** HUD гостей на узком экране: оставить как в `649e137`.
- **Q3 (общий).** `peakQuestTotals = { servedTotal, perfectPeaksTotal }`,
  кумулятив за всё время игры.

Q1-Q3 для 6.1b / 6.1c / 6.2 — **закрыты**. Новые Q — в `task-6.3.md` (если появятся).

## 5. Roadmap

```
Cleanup ✅ → TECH-4 ✅ → TECH-5 ✅
  → TECH-3 (catalog coins) ← следующий
  → TECH-2 (waitForTimeout → waitForFunction)
  → TECH-1 (интеграционные тесты мебели)
  → TECH-5.1 (e2e layout, если появится __gameState)
```

| # | Задача | Статус |
|---|---|---|
| 1 | **Cleanup** — 10 влитых веток удалены, теги `archive/*` созданы | ✅ 2026-11-23 |
| 2 | **TECH-4** — матрица проходимости + селектор `blocksMovement` | ✅ 2026-11-23 |
| 3 | **TECH-5** — расстановка мебели с проходами (unit) | ✅ 2026-11-23 |
| 4 | **TECH-3** — `catalog-decorations.spec.ts:50` (убрать ослабленный `toBeLessThanOrEqual`) | ← следующий |
| 5 | **TECH-2** — `progression.spec.ts` (`waitForTimeout` → `waitForFunction`) | после TECH-3 |
| 6 | **TECH-1** — интеграционные тесты мебели (FurnitureKind × placement) | после TECH-2 |
| 7 | seatRate 0.0556 | не трогать |
| 8 | TECH-5.1 — e2e для плотной планировки (если `__gameState`) | бэклог |

## 6. LOGIC-7 — закрыт (2026-11-22, коммит 1820edc, merge 0d7e009)

**Реализовано:**
- Найм поваров 3/3, экономика 15k/35k + 20k/50k
- Уровни 15 и 25
- Связка 1:1 повар ↔ плита (плит может быть больше)
- `tests/chef-stove-binding.test.ts` — 17 тестов (было 13, +4)
- `tests/hiring-layout.test.ts` — расширен

**Не путать:**
- `state.upgrades.cooking` (0–5) — прокачка кухни, **не** количество поваров
- Side quest `economy-cooking` — про прокачку, не про найм

## 7. TECH-1 — контекст (бэклог)

**Цель:** интеграционные тесты мебели.

`FurnitureKind = 'door'|'stove'|'table'|'tableDouble'|'chair'|'plant'|'counter'`.
Для каждого kind: e2e-ассерт на размещение, unit на `placed`, покрытие в
`tests/decorations.test.ts` / `shop.test.ts` / `editorMode.test.ts`.
Добавить только непокрытые — не «добивать» до круглого числа (урок 8).

## 8. Полный список уроков проекта

### Из прошлых сессий
1. **Перед удалением кода** — `grep` по идентификатору + `npm test`.
2. **Handoff — снимок, а не истина.** Всегда `git diff`, `git status`,
   `git log` в начале. Сверять с фактами.
3. **Тесты, обходящие `loadGame()`**, требуют defensive `??=` в `advanceSimulation`.
4. **`docs/prompts/README.md` не существует** — трекер в `docs/README.md`.
5. **Рассинхрон индекса/working tree.** Форма 1: «both staged and unstaged»
   после `add→edit`. Форма 2: файл в неверной папке → `add` → `move` → старая
   копия в индексе, новая untracked. Правило: перед коммитом `git status`
   читать **пути**, не только статусы.
6. **`git log` не показывает содержимое коммита.** Проверять
   `git show --stat <sha>` перед push.
7. **WIP ≠ недоделка.** Перед «доработкой» — `git grep` по testid/классу +
   проверка покрытия (CSS/e2e/unit). WIP `649e137` = законченный § 7 HUD.
8. **Не добивать спеку до круглого числа.** Спека = факты, не подгонка.
9. **Хелперы миграции — в модульный scope**, не внутри `normalizeState`.
10. **Порядок миграций критичен.** `questBaseline ??=` — последним, после
    `unlockedDishIds ??=`, `normalizePeakState`, `normalizeQueueState`.

### Из сессии 2026-11-19 (6.1b)
11. **Both staged and unstaged** — повторился дважды (LOGIC-5.1: `tests/LOGIC-5.1.md`,
    6.1b: `sideQuests.ts`/`questProgress.ts`/`test`). Правило: **сразу после
    правки файла — `git add <path>`**, не откладывать.
12. **Early return блокирует хук.** `processProgression` возвращался при
    отсутствии главного квеста → `processSideQuests` не вызывался.
13. **`git restore` не трогает untracked.** `git restore --staged <new file>`
    возвращает файл в untracked. Дальше `git restore <path>` даст
    `pathspec did not match`. Лечение: `del <path>` / `git clean -f <path>`
    (**только с путём**).

### Из сессии 2026-11-22 (LOGIC-7)
14. **Push = последний шаг.** Не пушить до: (1) полный E2E зелёный
    (текущее 50/50; значение растёт с новыми тестами), (2) commit фиксов,
    (3) merge `--no-ff`, (4) `npm test` на main, (5) `npm run build`.
15. **Kimi ломает длинные тернарники** (`const status = a ? b : c ? d : e`)
    в `shopPanel.ts` — меняет порядок веток. И теряет `applyLevels` в
    `progression.ts` при переписывании. Правило: после любого изменения
    этих двух файлов — `git diff` + визуальная проверка порядка/наличия.
16. **`normalizeState` не вызывает `processProgression`** — только дефолтные
    значения. Иначе тесты ломаются при загрузке.

### Из сессии 2026-11-23 (LOGIC-6.2)
17. **Новые DOM-элементы с implicit ARIA role ломают strict-mode e2e.**
    `<progress>` в daily → `getByRole('progressbar')` начал матчить 7 элементов,
    `progress.spec.ts` упал. Лечение: `<meter>` (роль `meter`), не `<progress>`,
    если есть существующий `getByRole('progressbar')` без `name`.
18. **CSS `max-height` + `overflow-y: auto`** — обязательны для растущих
    панелей. Без них панель «вылезает» и перекрывает HUD-кнопки (клик
    перехватывается SVG из панели).
### Из сессии 2026-11-23 (cleanup + планы TECH-4/5)
19. **Теги `archive/*` вместо `-D`.** При cleanup: `git tag archive/<name> <branch>` → `git branch -d <branch>`. Тег — неизменяемая закладка, ветка удалена, архив в `git tag`. Восстановить: `git branch <name> archive/<name>`.
20. **TECH-4 — матрица проходимости.** Гость↔гость ✅, персонал↔персонал ✅, гость↔персонал ❌ (блок в обе стороны), мебель ❌ для всех. Файлы: `movement.ts`, `grid.ts`, `tick.ts`, `tests/movement.test.ts`. Перед реализацией — `git grep` по `moveActor`, чтобы понять текущее поведение.
21. **TECH-5 — тесты не зависят от кнопки `+50 000`.** Кнопка — диагностика, в финале её не будет. Unit: `state.level = 5; processProgression(state)` (авто-расширение 8×8 → 10×10). E2E: `page.evaluate` через `patchSave`/`__gameState`, не клики по кнопке.
22. **Покрытие тестов проверять `git grep`, не по памяти Kimi Code.** В TECH-4 Phase 1 Kimi Code написала «повар↔официант уже покрыто», но `git grep` показал — старое покрытие было только «гость↔гость». Урок: в Phase 1 всегда `git grep` по конкретному паттерну.
23. **Угловые объекты при `expandBounds` сдвигаются.** Дверь на (0,7) в 8×8 — угол (левая + нижняя граница). При расширении +2 снизу нижняя граница становится y=9, дверь переезжает на (0,9). Это корректное поведение (дверь остаётся на границе). Тест `furniture-layout-passability.test.ts` фиксирует факт.

## 9. Что НЕ трогать без явного подтверждения

- `industrialStove`, `ratingHistory` — смержены, покрыты
- `tests/chef-stove-binding.test.ts` — 17 тестов, контракт LOGIC-7
- `src/content/quests.ts` — 10 главных квестов, контракт
- `src/content/sideQuests.ts` — 18 side quests, контракт (6.1b)
- `src/content/dailyQuests.ts` — 6 daily quests, контракт (6.1c)
- `src/simulation/questProgress.ts` — работает (6.1b + 6.1c)
- `src/ui/questPanel.ts` — 6.2 закрыт, 5/5 e2e. **Не переоткрывать.**
- `tests/questRework.test.ts` (4) / `sideQuests.test.ts` (13) /
  `dailyQuests.test.ts` (10) — контракт
- `src/ui/shopPanel.ts` — статус-порядок после фикса `a8bd970`
- `src/simulation/progression.ts` — `applyLevels` на месте (после `a8bd970`)
- `seatRate = 0.0556` — backlog, не «оптимизировать»
- Удаление веток пакетно — только после `diff`+`log` каждой (урок 1)
- **Push origin/main до финала 6.3** — не делать
- `tests/furniture-layout-passability.test.ts` — контракт TECH-5 (unit)
- `e2e/furniture-layout.spec.ts` — контракт TECH-5 (e2e)
- Матрица проходимости TECH-4 (гость↔гость ✅, персонал↔персонал ✅, гость↔персонал ❌) — не менять без подтверждения
- Тесты не трогают кнопку `+50 000` — в финале её не будет
- `tests/movement.test.ts` — контракт TECH-4 (11 тестов: матрица + leaving + дедлок)
- `tests/furniture-layout-passability.test.ts` — контракт TECH-5 (3 теста: расширение, capacity, passability)

## 10. Памятка по окружению

- `chcp 65001` в начале — иначе `type` покажет кракозябры (файлы UTF-8,
  консоль CP866). `findstr` в CP866 показывает кракозябры, но **номера строк**
  и **латинские паттерны** (`TECH-4`, `42ec363`) находит корректно.
- Тесты в `tests/`, доки в `docs/tasks/`, handoff в `C:\KimiProject\handoff\`
- **Перед коммитом:** `git status` читать **пути** (урок 5, 11)
- **После коммита:** `git show --stat <sha>` (урок 6)
- **Push:** только после полного E2E зелёного (урок 14)
- **Ветка для новой задачи:** `git checkout -b logic-6.3-lifecycle` от main

## 11. Аварийные сценарии

**Тесты упали после текущей задачи:** `git reset --hard 42ec363` (только локально,
не пушили) или `git restore <path>`. Разобрать, не чинить вслепую.

**«Both staged and unstaged» / `tests/tests/`:** `git restore --staged <path>`
→ `git add` правильного пути. Пустую папку `tests\tests` — `rmdir` (не `/s /q`).

**Untracked не удаляется:** `del <path>` / `git clean -f <path>`
(**только с путём**, не рекурсивно). Урок 13.

**origin/main разошёлся с local:** `git fetch origin` →
`git log --oneline --graph main origin/main -10`. Линейно → `pull --rebase`.
Merge — обсудить.

**Kimi снова сломал UI:** `git diff HEAD~1 -- src/ui/shopPanel.ts` и
`src/simulation/progression.ts`, проверить порядок тернарников и `applyLevels`.

**Просят «просто запушить»:** сначала `npm test` + `npm run build` +
`npx playwright test`. Зелёное → push. Нет → сказать, спросить (урок 14).

## 12. Протокол приёмки в новой сессии

**Первое сообщение** (после прочтения этого файла и `docs/tasks/CURRENT.md`):

> «Прочитал handoff и CURRENT. Отвечаю без кода:
> 1. Состояние: main = origin = 42ec363 (merge LOGIC-6.3), ветки main + master (архив), теги archive/* (10), unit 325/325, e2e 53/53, build ✅.
> 2. Cleanup закрыт 2026-11-23: 10 влитых веток удалены, теги archive/* созданы.
> 3. Следующая задача — по `docs/tasks/CURRENT.md`.
> 4. Нельзя трогать: `questPanel.ts`, `quests.ts`/`sideQuests.ts`/`dailyQuests.ts`, `chef-stove-binding.test.ts`, `quest-lifecycle.spec.ts`, `progress.spec.ts`.
> Если совпало — идём в Шаг 0.»

**Если ответ совпал с фактами** — контекст загрузился, идём в §13.
**Если перепутал** — сигнал, что handoff не удержан. Перечитать §3–§9 и повторить приёмку.

## 13. Шаг 0 — разведка в начале новой сессии

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

**Статус: TECH-5 DONE 2026-11-23.** Cleanup, TECH-4, TECH-5 закрыты.
Следующая задача — **TECH-3** (`catalog-decorations.spec.ts:50`).
Task-файл: `docs/tasks/TECH-3-catalog-coins.md` (создать перед стартом).
Порядок: TECH-3 → TECH-2 → TECH-1 → TECH-5.1 (опционально) → новая фича.