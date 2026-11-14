# Progress Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Вынести уровень, опыт и все задания в адаптивную выдвижную панель «Прогресс» и добавить очередь уведомлений.

**Architecture:** `questPanel.ts` становится панелью прогресса и владеет очередью уведомлений. `hud.ts` получает callback открытия; `main.ts` координирует взаимное закрытие панелей. Игровая симуляция и хранение не меняются.

**Tech Stack:** TypeScript, CSS, Vitest, Playwright.

## Global Constraints

Награды остаются `30 × level` опыта и `100 × level²` монет. Каждое уведомление видно 2000 мс. Уровень 30 максимален. Старый формат localStorage не менять. Не добавлять зависимости и внешние ассеты.

---

### Task 1: Панель прогресса и HUD

**Files:**
- Modify: `src/ui/hud.ts`, `src/ui/questPanel.ts`, `src/ui/questPanel.css`, `src/main.ts`
- Test: `tests/hud.test.ts`, `tests/progression.test.ts`, `e2e/menu.spec.ts`

**Interfaces:** `createHud(onShop,onMenu,onCancel,onEditor,onProgress)`; панель имеет `open()`, `close()`, `setVisible(boolean)`, `update(state)`.

- [ ] **Шаг 1: failing tests**

```ts
const state = createGame();
state.experience = 50;
const model = getProgressModel(state);
expect(model).toMatchObject({ level: 1, experience: 50, threshold: 100, ratio: 0.5 });
state.level = 30;
expect(getProgressModel(state).ratio).toBe(1);
```

E2E: после входа нажать `Прогресс`, ожидать `getByRole('complementary', { name: 'Прогресс ресторана' })`, шкалу `role=progressbar`, 10 заданий; закрыть кнопкой `Закрыть`. HUD не содержит `Уровень:` и `Опыт:`. Открытие магазина закрывает прогресс и наоборот.

- [ ] **Шаг 2: RED**

Run: `npx playwright test e2e/menu.spec.ts`
Expected: FAIL — кнопки «Прогресс» нет.

- [ ] **Шаг 3: реализация**

В `hud.ts` оставить ключи `coins`, `popularity`, `guests`, добавить кнопку «Прогресс» с общим стилем и callback. В `questPanel.ts` создать aside с классом `quest-panel`, заголовком, шкалой `<progress>`, списком `QUESTS.map(...)`. Для статусов использовать `completedQuestIds`, `state.level`. Применить `experienceThreshold`. В CSS перенести slide-out поведение магазина; на mobile задать нижнюю панель и `max-height:72dvh`. В `main.ts` добавить `openProgress`, закрывающий магазин/редактор, и закрывать прогресс при открытии магазина и выходе.

- [ ] **Шаг 4: GREEN**

Run: `npm test && npx playwright test e2e/menu.spec.ts`
Expected: PASS.

- [ ] **Шаг 5: commit**

```bash
git add src tests e2e
git commit -m "feat: add slide-out progress panel"
```

### Task 2: Очередь уведомлений

**Files:**
- Modify: `src/ui/questPanel.ts`, `src/ui/questPanel.css`
- Test: `e2e/ai.spec.ts`

**Interfaces:** внутренняя очередь `string[]`; один `setTimeout` на активное уведомление.

- [ ] **Шаг 1: failing test**

E2E выполняет первое задание, проверяет текст `Задание выполнено: Первый гость`, наличие `30 опыта` и `100 монет`, затем скрытие не ранее 1900 мс и не позднее 3500 мс. Повторный `update` не создаёт повторное уведомление.

- [ ] **Шаг 2: RED**

Run: `npx playwright test e2e/ai.spec.ts`
Expected: FAIL — прежний тост не содержит награду и скрывается через 3000 мс.

- [ ] **Шаг 3: реализация**

Хранить `knownCompleted` и `knownLevel`, инициализировать на первом update без уведомлений. На изменениях добавлять строки в очередь. `showNext()` берёт первую строку, показывает toast, по таймеру 2000 мс скрывает и вызывает себя для следующего. `setVisible(false)` очищает очередь и таймер. CSS задаёт `pointer-events:none`.

- [ ] **Шаг 4: полная проверка**

Run: `npm test && npm run build && npm run test:e2e`
Expected: все тесты PASS, сборка успешна.

- [ ] **Шаг 5: commit**

```bash
git add src/ui/questPanel.ts src/ui/questPanel.css e2e/ai.spec.ts
git commit -m "feat: queue progression notifications"
```
