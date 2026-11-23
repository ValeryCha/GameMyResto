# LOGIC-6.2 — UI questPanel (3 секции квестов)

Предусловие: прочитан `handoff-state.md`, пройден Шаг 0 (§13) и приёмка (§12).

Источник истины: `docs/quest-rework-spec.md` §4–§8.

## 1. Q1-Q3 для 6.2 — ПОДТВЕРДИТЬ ДО КОДА (A/A/A рекомендую)

**Q1. Side-квесты, заблокированные `dependsOn` — как показывать?**
- **A (рекомендую):** серым, с замком, «Требуется: <название родителя>».
  Игрок видит прогресс.
- B: скрыть полностью — игрок не знает, что есть.

**Q2. Daily progress-bar — как отображать?**
- **A (рекомендую):** `X/N` числом + полоса заполнения. Наглядно и точный процент.
- B: только процентом `X%` — компактнее, но `X/N` полезнее.

**Q3. Награда — где показывать?**
- **A (рекомендую):** в каждой строке квеста: «+200 монет» справа. Всегда видно.
- B: только при hover / в tooltip — компактнее, но менее очевидно.

## 2. Файлы для запроса у пользователя (блокер)

```cmd
type src/ui/questPanel.ts
type src/simulation/types.ts
type src/ui/icons.ts
git grep -n "questPanel\|onProgress\|Прогресс" -- src/ui/ src/main.ts
type e2e/progress.spec.ts
```

## 3. Структура `src/ui/questPanel.ts` (modify)

Существующий `questPanel.ts` — механизм `knownCompleted`/`knownLevel`
(см. `e2e/progress.spec.ts`). **Не ломать** контракт, только расширять.

**3 секции в панели:**

1. **Главные** (10 из `QUESTS`, `src/content/quests.ts`)
   - Уровень квеста, заголовок, описание
   - Прогресс: выполнено / не выполнено (✓ / ○)
   - Награда: `+N монет` справа

2. **Побочные** (18 из `SIDE_QUESTS`, `src/content/sideQuests.ts`)
   - Заголовок, описание
   - Чекбокс (✓ выполнено / ○ не выполнено)
   - **Locked** (`dependsOn` не выполнен): серый, замок, «Требуется: <название родителя>»
   - Награда: `+N монет`

3. **Ежедневные** (6 из `DAILY_QUESTS`, `src/content/dailyQuests.ts`)
   - Заголовок, описание
   - Progress-bar: `X/N` + полоса заполнения
   - Бейдж «Выполнено» если `state.dailyQuestState.rewarded`
   - Награда: `+N монет`

**Механизм `knownCompleted`/`knownLevel`** (из текущего `questPanel.ts`) —
сохранить. Это тосты «квест выполнен» при переходе между уровнями. Не сломать.

## 4. Хуки

Кнопка «Прогресс» в HUD **уже** открывает `questPanel` (см. `e2e/progress.spec.ts`).

**Не менять** существующий контракт открытия/закрытия. Только расширить
содержимое тремя секциями.

Если `questPanel.ts` сейчас показывает **только** главные — добавить
секции side и daily через `SIDE_QUESTS` / `DAILY_QUESTS` из контента.

## 5. `e2e/quest-panel.spec.ts` (новый файл) — 5 кейсов

1. Открытие/закрытие панели кнопкой «Прогресс»
2. Секция «Главные» — 10 квестов, есть уровни
3. Секция «Побочные» — 18 квестов, есть чекбоксы
4. Секция «Ежедневные» — 6 квестов, есть progress-bar
5. Отображение одного daily-квеста с `X/N` и полосой

**Не ломать** существующий `e2e/progress.spec.ts` — он проверяет открытие
панели + текст «Тренд за 60 тиков:» (LOGIC-4b). Не менять структуру
открытия.

## 6. Порядок работы (TDD)

1. **Failing-тесты** `e2e/quest-panel.spec.ts` (5 кейсов из §5)
2. **Красный:** `npx playwright test e2e/quest-panel.spec.ts` → все failed
3. **Реализация** `questPanel.ts` — 3 секции, `knownCompleted`/`knownLevel` не трогать
4. **Зелёный:** `npx playwright test e2e/quest-panel.spec.ts` → 5/5
5. **Полный прогон:** `npm test` → 325/325
6. **Полный E2E:** `npx playwright test` → **50/50** (45 старых + 5 новых)
7. **Build:** `npm run build` → ✅
8. **`git status`** (пути!) + **`git show --stat HEAD`** (урок 6)
9. **Коммит:** `feat(ui): LOGIC-6.2 - quest panel with 3 sections`
10. **Merge `--no-ff` в main** → `npm test` на main → `npm run build` → **push** (урок 14)

## 7. Критерии готовности 6.2

- [ ] 3 секции: Главные (10) / Побочные (18) / Ежедневные (6)
- [ ] Side — чекбоксы ✓/○, locked серые с замком и «Требуется: ...»
- [ ] Daily — progress-bar `X/N` + бейдж «Выполнено» если `rewarded`
- [ ] Награда в каждой строке (Q3=A): `+N монет`
- [ ] Locked side (Q1=A) — серые, с замком
- [ ] `e2e/progress.spec.ts` (существующий) **не сломан**
- [ ] `npm test` зелёный (325/325)
- [ ] `npx playwright test` зелёный (**50/50**: 45 + 5 новых)
- [ ] `npm run build` ✅
- [ ] `git show --stat <sha>` — только ожидаемые файлы (никаких `tests/tests/`)
- [ ] `knownCompleted`/`knownLevel` механизм работает (тосты о выполнении)

## 8. Не трогать в 6.2

- `src/content/quests.ts` — 10 главных квестов, контракт
- `src/content/sideQuests.ts` — 18 side, контракт (6.1b)
- `src/content/dailyQuests.ts` — 6 daily, контракт (6.1c)
- `src/simulation/questProgress.ts` — `processSideQuests` + `processDailyQuest`, работает
- `src/ui/questPanel.ts` — механизм `knownCompleted`/`knownLevel` (только расширять)
- `tests/chef-stove-binding.test.ts` — 17 тестов, контракт LOGIC-7
- `tests/sideQuests.test.ts` (13) / `dailyQuests.test.ts` (10) — работают
- `src/ui/shopPanel.ts` — статус-порядок после фикса `a8bd970` (если не трогать — не сломать)
- `src/simulation/progression.ts` — `applyLevels` на месте (после фикса `a8bd970`)
- `industrialStove`, `ratingHistory` — смержены, покрыты
- `seatRate = 0.0556` — backlog
- Удаление веток пакетно — только после diff+log каждой (урок 1)

## 9. Урок Kimi (критично для 6.2)

**Проблема (из сессии 2026-11-22):** Kimi ломает длинные тернарные цепочки
(`const status = a ? b : c ? d : e ? ...`) в `shopPanel.ts` — меняет порядок
веток. И теряет `applyLevels` в `progression.ts`.

**Правила для 6.2:**

1. **Не генерировать длинные тернарники.** Использовать `if/else` или
   lookup-объект:
   ```ts
   const STATUS_LABEL: Record<Status, string> = {
     complete: '✓',
     locked: '🔒',
     pending: '○',
   };
   ```
2. **После любого изменения** `shopPanel.ts` — `git diff` и визуально
   проверить порядок веток (`chefNeedsStove`, `status`). В 6.2 `shopPanel.ts`
   **не трогать** — только если правда нужен.
3. **После любого изменения** `progression.ts` — убедиться, что
   `applyLevels(state)` на месте (в `processProgression` и `processDailyQuest`).
   В 6.2 `progression.ts` **не трогать**.
4. **TDD обязателен:** красные тесты → код → зелёные.
5. **После каждого коммита** — `git show --stat HEAD` (урок 6).

## 10. Если возникли противоречия со спекой

`docs/quest-rework-spec.md` §4–§8 — источник истины. Если спека говорит
одно, а код требует другого — **вынести в `docs/tasks/LOGIC-6.md` как
backlog**, не подгонять (урок 8). Не блокировать 6.2, если противоречие
касается 1–2 пунктов UI.