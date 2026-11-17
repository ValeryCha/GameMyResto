# Starter Purchase Quests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Добавить два последовательных стартовых задания на покупку официанта и стойки выдачи с наградами 100 монет/20 опыта и 200 монет/30 опыта.

**Architecture:** Все задания получают стабильные идентификаторы и явные награды. На одном уровне может быть несколько заданий; прогресс проверяет только первое невыполненное задание текущего уровня. Нормализация отмечает новые учебные задания выполненными только в сохранениях выше первого уровня.

**Tech Stack:** TypeScript, Vitest, Playwright, существующие DOM-панели без новых зависимостей.

## Global Constraints

- Существующие идентификаторы `quest-1`…`quest-10`, условия и награды не меняются.
- Одновременно активно только первое невыполненное задание текущего уровня.
- Награды новых заданий выдаются не более одного раза.
- Сохранения выше первого уровня не получают учебные награды повторно.
- Не откатывать unrelated-изменения и не выполнять `git commit` без отдельной просьбы пользователя.

---

### Task 1: Стабильные задания и последовательные награды

**Files:**
- Modify: `src/content/quests.ts`
- Modify: `src/simulation/progression.ts`
- Test: `tests/progression.test.ts`

**Interfaces:**
- Produces: `Quest.id: string`, `Quest.reward: { coins: number; experience: number }`, `STARTER_QUEST_IDS: readonly string[]`.
- Consumes: существующие `processProgression(state: GameState): void`, `hireWaiter(state)`, `placeFurniture(state, kind, position)`.

- [x] **Step 1: Написать failing-тесты порядка и наград**

Добавить в `tests/progression.test.ts` импорты `hireWaiter` и `placeFurniture`, затем тест:

```ts
it('сначала засчитывает официанта, затем стойку и выдаёт точные награды один раз', () => {
  const state = createGame();
  expect(QUESTS[0].id).toBe('quest-hire-waiter');
  expect(QUESTS[1].id).toBe('quest-buy-counter');
  expect(QUESTS[2].id).toBe('quest-1');

  expect(placeFurniture(state, 'counter', { x: 3, y: 1 }).ok).toBe(true);
  processProgression(state);
  expect(state.completedQuestIds).toEqual([]);

  expect(hireWaiter(state).ok).toBe(true);
  processProgression(state);
  expect(state.completedQuestIds).toEqual(['quest-hire-waiter']);
  expect(state.coins).toBe(600);
  expect(state.experience).toBe(20);

  processProgression(state);
  expect(state.completedQuestIds).toEqual(['quest-hire-waiter', 'quest-buy-counter']);
  expect(state.coins).toBe(800);
  expect(state.experience).toBe(50);

  const coins = state.coins;
  processProgression(state);
  expect(state.coins).toBe(coins);
  expect(state.completedQuestIds).toHaveLength(2);
});
```

Обновить проверку списка до 12 идентификаторов: двумя первыми ожидаются `quest-hire-waiter`, `quest-buy-counter`, затем `quest-1`…`quest-10`. В тесте мебели использовать `QUESTS.find((quest) => quest.id === 'quest-3')!` и `QUESTS.find((quest) => quest.id === 'quest-6')!` вместо числовых индексов.

- [x] **Step 2: Запустить тест и подтвердить красный результат**

Run: `npx vitest run tests/progression.test.ts`
Expected: FAIL, потому что `Quest.id`, новые задания и явные награды ещё не реализованы.

- [x] **Step 3: Реализовать модель заданий**

В `src/content/quests.ts` добавить:

```ts
export interface Quest {
  id: string;
  level: number;
  title: string;
  description: string;
  reward: { coins: number; experience: number };
  test(state: GameState): boolean;
  unlockDishId?: string;
}

export const STARTER_QUEST_IDS = ['quest-hire-waiter', 'quest-buy-counter'] as const;
```

Поставить перед существующей цепочкой:

```ts
{
  id: 'quest-hire-waiter', level: 1,
  title: 'Купить официанта', description: 'Наймите первого официанта',
  reward: { coins: 100, experience: 20 },
  test: (s) => s.employees.some((item) => item.role === 'waiter'),
},
{
  id: 'quest-buy-counter', level: 1,
  title: 'Купить стойку выдачи заказов', description: 'Установите стойку выдачи заказов',
  reward: { coins: 200, experience: 30 },
  test: (s) => s.furniture.some((item) => item.kind === 'counter'),
},
```

Каждому существующему заданию добавить его прежний идентификатор `quest-N` и прежнюю награду `{ coins: 100 * N * N, experience: 30 * N }`.

В `processProgression` выбирать и награждать так:

```ts
const quest = QUESTS.find((item) => item.level === state.level && !state.completedQuestIds.includes(item.id));
if (!quest || !quest.test(state)) return;
state.completedQuestIds.push(quest.id);
state.coins += quest.reward.coins;
state.experience += quest.reward.experience;
```

- [x] **Step 4: Запустить тест и подтвердить зелёный результат**

Run: `npx vitest run tests/progression.test.ts`
Expected: все тесты файла PASS.

### Task 2: Миграция и панель прогресса

**Files:**
- Modify: `src/persistence/normalizeState.ts`
- Modify: `src/ui/questPanel.ts`
- Test: `tests/storage.test.ts`
- Test: `e2e/progress.spec.ts`

**Interfaces:**
- Consumes: `Quest.id`, `Quest.reward`, `STARTER_QUEST_IDS` из Task 1.
- Produces: старые сохранения уровня 2+ содержат оба новых идентификатора без изменения монет и опыта.

- [x] **Step 1: Написать failing-тест миграции**

Добавить в `tests/storage.test.ts`:

```ts
it('не выдаёт стартовые награды повторно в сохранении выше первого уровня', () => {
  const legacy = createGame();
  legacy.level = 3;
  legacy.experience = 300;
  legacy.coins = 777;
  normalizeState(legacy);
  expect(legacy.completedQuestIds).toEqual(
    expect.arrayContaining(['quest-hire-waiter', 'quest-buy-counter']),
  );
  expect(legacy.coins).toBe(777);
  expect(legacy.experience).toBe(300);
});
```

В `e2e/progress.spec.ts` ожидать 12 строк и активное задание «Купить официанта».

- [x] **Step 2: Запустить тесты и подтвердить красный результат**

Run: `npx vitest run tests/storage.test.ts`
Expected: FAIL, новых идентификаторов в `completedQuestIds` нет.

- [x] **Step 3: Реализовать миграцию и отображение**

В `normalizeState.ts` импортировать `STARTER_QUEST_IDS` и после инициализации `completedQuestIds` выполнить:

```ts
if (state.level > 1) {
  for (const id of STARTER_QUEST_IDS) {
    if (!state.completedQuestIds.includes(id)) state.completedQuestIds.push(id);
  }
}
```

В `questPanel.ts` использовать `QUESTS.map((quest, index) => ...)`, номер `${index + 1}.`, идентификатор `quest.id`, награду `quest.reward.experience` и `quest.reward.coins`. В уведомлениях искать задание по `item.id === id` и использовать ту же явную награду.

- [x] **Step 4: Запустить модульные тесты**

Run: `npx vitest run tests/storage.test.ts tests/progression.test.ts`
Expected: все тесты PASS.

### Task 3: Реальный стартовый сценарий и полная проверка

**Files:**
- Modify: `e2e/ai.spec.ts`

**Interfaces:**
- Consumes: реальные покупки через магазин и начисления из Tasks 1–2.

- [x] **Step 1: Обновить браузерные ожидания**

После найма официанта ожидать `Монеты: 900` (1000 − 200 + 100). После установки стойки ожидать `Монеты: 800` (900 − 300 + 200). После первого гостя ожидать `Монеты: 905`, `90 / 100 опыта` и баланс меню 905. Добавить проверки, что новые задания завершены, а «Первый гость» стал активным только после них.

- [x] **Step 2: Запустить стартовый сценарий**

Run: `npx playwright test e2e/ai.spec.ts e2e/progress.spec.ts`
Expected: 2/2 PASS.

- [x] **Step 3: Выполнить полный цикл**

Run: `npm test && npm run build && npm run test:e2e`
Expected: все модульные тесты PASS, сборка exit 0, все браузерные сценарии PASS.

- [x] **Step 4: Проверить отсутствие временных процессов**

Убедиться, что созданные для проверки серверы остановлены, а порт 7100 свободен. В ответе указать корень проекта и стандартную ссылку предпросмотра.
