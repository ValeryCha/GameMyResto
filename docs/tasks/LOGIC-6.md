# LOGIC-6 — quest-rework

Источник истины: `docs/quest-rework-spec.md` (финальная редакция).
Данный документ — обёртка: scope, решения, разбиение.

## Решения Q1–Q3 (2026-11-19)

**Q1. Декорная награда** — вариант A: `reward = min(базовая, Σ(price триггерных предметов) × 0.8)`.

**Q2. HUD гостей на узком экране** — вариант A: оставить как в `649e137`, не переделывать.
Вопрос § 9.2 спеки закрыт без изменений.

**Q3. peakQuestTotals** — вариант A: `{ servedTotal: number }`, кумулятив за всё время
игры, не сбрасывается. `peak-twenty` = cumul served >= 20.

## Разбиение

| Подсессия | Содержание |
|---|---|
| 6.1 | Данные + логика без UI: типы, миграция, baseline, side quests, daily quests |
| 6.2 | UI в questPanel: секции «Побочные», «Ежедневные», прогресс от baseline |
| 6.3 | e2e полный цикл, финализация CHECKPOINT |

## Scope 6.1

**Не трогаем:**
- `src/content/quests.ts` — QUESTS/STARTER_QUEST_IDS/mainQuest без изменений
- `src/ui/questPanel.ts` — без новых секций
- `tests/questRework.test.ts` — контракт держится (toHaveLength(10), rewards, triggers)

**Добавляем:**
- `types.ts`: 4 новых поля в GameState
- `normalizeState.ts`: миграция baseline + 3 новых полей
- `src/content/sideQuests.ts`: SIDE_QUESTS (18)
- `src/content/dailyQuests.ts`: DAILY_QUESTS (6) + selectDailyQuest(date)
- `src/simulation/questProgress.ts`: processSideQuests, processDailyQuest, recordPeakTotals
- `tests/questBaseline.test.ts`, `tests/sideQuests.test.ts`, `tests/dailyQuests.test.ts`

**Точки вызова (без изменения сигнатур):**
- `processProgression(state)` в `progression.ts` → в конце вызывает `processSideQuests` + `processDailyQuest`
- `endPeak` в `peak.ts` → перед `state.peakState.last = result` вызывает `recordPeakTotals(state, result)`

## Модель данных

```ts
questBaseline: {
  servedTotal: number;
  revenueTotal: number;
  furnitureByKind: Record<string, number>;
  unlockedSkins: number;
};
completedSideQuestIds: string[];
dailyQuestState: { date: string; id: string; progress: number; rewarded: boolean };
peakQuestTotals: { servedTotal: number };