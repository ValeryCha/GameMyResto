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


## Backlog 6.1b → 6.2

- **«Уютный ресторан»** — не найден в `src/content/quests.ts`. Спека §4
  ссылается на него в dependsOn для `decor-painting` (и через него —
  `decor-windows`, `decor-plant`, `decor-wallpapers`, `decor-skins-3`).
  Сейчас `dependsOn` у этих квестов — `undefined`. Если появится главный
  квест «Уютный ресторан» — вернуть dependsOn в 5 местах.
- **«Первый рецепт»** — не найден в `src/content/quests.ts`. Спека §4
  ссылается на него для `economy-cooking` и `menu-recipes-3`. Сейчас
  `dependsOn: undefined`. Аналогично — вернуть при появлении.
- **Косметика test 12** — изначальная версия падала бы даже при верной
  реализации (обнуляла `completedSideQuestIds` вместо обхода dependsOn).
  Заменена на `s.completedQuestIds = ['quest-1']`. Зафиксировано, чтобы
  не повторять ошибку в 6.1c.
- **`progression.ts` — line endings** — при `git add` был warning
  `LF will be replaced by CRLF`. Не блокер (Windows), но при следующем
  редактировании файла стоит проверить `.gitattributes` — может, стоит
  зафиксировать `text=auto eol=crlf` для `.ts`.