# TECH-3 — catalog-decorations.spec.ts:50 — убрать ослабленный `toBeLessThanOrEqual`

## Контекст

`e2e/catalog-decorations.spec.ts:50` использует ослабленный ассерт
`toBeLessThanOrEqual` вместо точного `toBe(...)`. Причина: во время e2e-теста
фоновые квесты (`processProgression` → `processSideQuests` / `processDailyQuest`)
начисляют монеты, что делает точное значение `state.coins` нестабильным.

Цель: изолировать тест от фоновых квестов и зафиксировать **точное** значение
(или delta), убрав ослабление.

## Фаза 0 — разведка (СТОП, пришли вывод)

```cmd
chcp 65001
git status
git log --oneline -3
npm test
```

**Ожидание:**
- clean, `up to date with 'origin/main'`
- `887e594 → 23efd79 → ef9fd61`
- **334/334**

Пришли вывод. Жди «продолжай».

## Фаза 1 — инвентаризация (СТОП, пришли таблицу)

```cmd
type e2e\catalog-decorations.spec.ts
git grep -n "toBeLessThanOrEqual\|toBeGreaterThan\|state.coins" -- e2e/catalog-decorations.spec.ts
git grep -n "processProgression\|processSideQuests\|processDailyQuest" -- src/simulation/progression.ts src/simulation/tick.ts src/simulation/questProgress.ts
```

**Таблица для отчёта:**

| Строка | Контекст | Что проверяет | Почему ослаблен | Как зафиксировать точно |
|---|---|---|---|---|
| `catalog-decorations.spec.ts:50` | (test name) | (`state.coins` / что-то ещё) | (фоновые квесты / автосейв / race) | (completed ids / delta / freeze) |

Также ответить:
- Какой тест на строке 50 (полное имя)?
- Сколько `toBeLessThanOrEqual` в файле? Все ослаблены или только :50?
- Какие квесты могут начислять монеты в этом тесте (main / side / daily)?
- Есть ли в `e2e/catalog-decorations.spec.ts` уже паттерн `patchSave` из `quest-lifecycle.spec.ts` (или нужно добавить)?

Пришли таблицу + ответы. Жди «продолжай».

## Фаза 2 — реализация (после «продолжай»)

**Рекомендуемый подход — изоляция от фоновых квестов.**

Перед ассертом (или в `test.beforeEach`):
```typescript
await page.evaluate(() => {
  const raw = localStorage.getItem('moy-restoran:primary');
  if (!raw) return;
  const save = JSON.parse(raw);
  const state = save.state;
  // Заполнить все id — ни один квест не начислит награду
  state.completedQuestIds = state.completedQuestIds ?? [];
  state.completedSideQuestIds = state.completedSideQuestIds ?? [];
  state.dailyQuestState = {
    date: new Date().toISOString().slice(0, 10),
    id: '__tech3_disabled__',
    progress: 0,
    rewarded: true,
  };
  localStorage.setItem('moy-restoran:primary', JSON.stringify(save));
});
```

**Проверка:** все id из `QUESTS` / `SIDE_QUESTS` / `DAILY_QUESTS` должны быть в
`completed*`, чтобы `processProgression` / `processSideQuests` /
`processDailyQuest` ничего не начислили. Для daily достаточно `rewarded: true` +
`id`, которого нет в `DAILY_QUESTS` (или совпадающего, но rewarded гейт).

Затем в ассерте заменить `toBeLessThanOrEqual(X)` на `toBe(Y)` (или
`toBeGreaterThanOrEqual` + `toBeLessThanOrEqual` с узким окном **если**
несколько источников; но цель — **точное** значение).

**Альтернатива (если А не сработает):**
```typescript
const coinsBefore = await page.evaluate(() => /* read coins */);
// ... действие ...
const coinsAfter = await page.evaluate(() => /* read coins */);
expect(coinsAfter - coinsBefore).toBe(EXPECTED_DELTA);
```

**Запреты (на функции, не на файлы):**
- ❌ Не менять `processProgression`
- ❌ Не менять `processSideQuests`
- ❌ Не менять `processDailyQuest`
- ❌ Не менять `calculateReward`
- ❌ Не менять `selectDailyQuest`
- ❌ Не менять `advanceSimulation`
- ❌ Не менять `blocksMovement` (TECH-4)
- ❌ Не менять `countUsableSeats`
- ❌ Не менять `recordPeakTotals`
- ❌ Не трогать `src/content/quests.ts` / `sideQuests.ts` / `dailyQuests.ts`
  (даже если меняется количество квестов)
- ❌ Не трогать `questPanel.ts` / `quest-lifecycle.spec.ts` / `progress.spec.ts`
  / `movement.test.ts` / `furniture-layout-passability.test.ts`

## Фаза 3 — самоаудит (СТОП, пришли вывод)

```cmd
git diff --stat
git diff e2e/catalog-decorations.spec.ts
```

**Ожидание:** только `e2e/catalog-decorations.spec.ts`. Никаких `src/`,
никаких `tests/`. Если другое — стоп, разбираться.

Пришли вывод. Жди «продолжай».

## Фаза 4 — тесты + отчёт

```cmd
npx playwright test e2e/catalog-decorations.spec.ts --reporter=list
```

**Ожидание:** все green (`N/N`), `toBeLessThanOrEqual` больше нет.

Пришли:
1. Полный вывод Playwright
2. Чек-лист (ниже)
3. `git diff --stat` (подтвердить — только 1 файл)

## Чек-лист готовности

- [ ] `toBeLessThanOrEqual` на `catalog-decorations.spec.ts:50` заменён на
  точный `toBe(...)` (или delta-проверку)
- [ ] Фоновые квесты изолированы (completed ids заполнены перед ассертом)
- [ ] `npx playwright test e2e/catalog-decorations.spec.ts` — зелёный
- [ ] `git diff --stat` — **только** `e2e/catalog-decorations.spec.ts`
- [ ] Ни одна функция из списка запретов не тронута
- [ ] `npm test` не сломан (unit 334/334 — но не запускать в этой фазе, только
  если локальные изменения в `src/` есть; в этой задаче их не должно быть)

## После Фазы 4

DeepSeek ревьюит → пользователь `git add` / `commit` / `push` →
DeepSeek обновляет `handoff-state.md` (§2, §3, §5, §8, §13, §14) + `CURRENT.md`
+ handoff §2/§13 (заодно закрывается расхождение 887e594 vs 23efd79).

Дальше: **TECH-2** (`progression.spec.ts` — `waitForTimeout` → `waitForFunction`).