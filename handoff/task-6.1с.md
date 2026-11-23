# LOGIC-6.1c — 6 daily quests + selectDailyQuest + recordPeakTotals

Предусловие: прочитан `handoff-state.md`, пройден Шаг 0 (§13) и приёмка (§12).

Источник истины: `docs/quest-rework-spec.md` §5 (6 daily), §8 (сохранения).

## 1. Q1-Q3 для 6.1c — ПОДТВЕРДИТЬ ДО КОДА

Три вопроса, по которым нужно явное «A» от пользователя. Рекомендую A/A/A.

**Q1-6.1c. Как выбирается daily quest на новый день?**
- **A (рекомендую):** детерминированно по `(date, randomSeed)` — `hash(date + seed) % 6`.
  Один и тот же сейв при перезагрузке в тот же день даёт тот же квест.
- B: случайный `Math.random()` при первом заходе дня — при перезагрузке
  до сохранения может смениться.

**Q2-6.1c. Что происходит с `dailyQuestState.progress`, если квест выполнен, но день не сменился?**
- **A (рекомендую):** `rewarded: true`, `progress` замораживается. Повторная
  выдача награды невозможна (`rewarded` — гейт).
- B: обнулять `progress` — потеря исторического прогресса.

**Q3-6.1c. `recordPeakTotals` — где вызывается?**
- **A (рекомендую):** в `finishPeak` (`src/simulation/peak.ts`), после
  формирования `PeakResult` — `state.peakQuestTotals.servedTotal += result.served`.
  Один хук, автоматически при завершении любого пика.
- B: в `advanceSimulation` отдельным вызовом — дублирует логику, легче забыть.

## 2. Файлы для запроса у пользователя (блокер)

Без текущего вида `questProgress.ts` и `peak.ts` не написать точные хуки.

```cmd
chcp 65001
type src\simulation\questProgress.ts
type src\simulation\peak.ts
type src\ui\questPanel.ts
git grep -n "dailyQuestState" -- src/ tests/
```

## 3. 6 daily quests (из §5 спеки — УТОЧНИТЬ по факту)

Таблица будет дополнена после `type docs\quest-rework-spec.md` (раздел §5).
Черновой список (проверить по спеке перед кодом):

| ID | Триггер | Награда | Примечание |
|---|---|---|---|
| TBD | обслужить N гостей за день | TBD | базовый daily |
| TBD | заработать N монет за день | TBD | экономический |
| TBD | выполнить 1 side quest | TBD | связка с 6.1b |
| TBD | идеальный пик | TBD | связка с peak |
| TBD | купить 1 предмет декора | TBD | связка с decor-* |
| TBD | обслужить N гостей в пик | TBD | связка с peak-twenty |

**Важно:** ID, триггеры, награды — **из спеки**, не из этой таблицы.
Таблица — заглушка для структуры, финальные значения — после `type`.

## 4. Структура `src/content/dailyQuests.ts` (новый файл)

```ts
import type { GameState } from '../simulation/types';
import type { IconName } from '../ui/icons';

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  reward: number;                       // coins only, XP = 0 (как side)
  target: number;                       // целевое значение progress
  progress(state: GameState): number;   // текущий прогресс
}

export const DAILY_QUESTS: DailyQuest[] = [ /* 6 из §3 */ ];
```

**Отличие от `SideQuest`:** `target` + `progress(state)` вместо `test(state)`.
Это позволяет показывать прогресс в UI (6.2) и проверять `progress >= target`
в `processDailyQuest`. У `SideQuest` — булев `test`, у `DailyQuest` — числовой
прогресс. Не унифицировать (разные нужды).

## 5. Структура `src/simulation/questProgress.ts` (modify)

**Добавить** (не переписывать существующее — `processSideQuests` не трогать):

```ts
import { DAILY_QUESTS, type DailyQuest } from '../content/dailyQuests';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function selectDailyQuest(state: GameState): void {
  const today = todayKey();
  if (state.dailyQuestState.date === today) return;  // уже выбран на сегодня
  const index = hashString(`${today}:${state.randomSeed}`) % DAILY_QUESTS.length;
  const quest = DAILY_QUESTS[index];
  state.dailyQuestState = {
    date: today,
    id: quest.id,
    progress: 0,
    rewarded: false,
  };
}

export function processDailyQuest(state: GameState): void {
  selectDailyQuest(state);  // идемпотентно — если день тот же, ничего не меняет
  if (state.dailyQuestState.rewarded) return;
  const quest = DAILY_QUESTS.find((q) => q.id === state.dailyQuestState.id);
  if (!quest) return;
  const progress = quest.progress(state);
  state.dailyQuestState.progress = Math.min(progress, quest.target);
  if (progress >= quest.target) {
    state.dailyQuestState.rewarded = true;
    state.coins += quest.reward;
  }
}

export function recordPeakTotals(state: GameState, servedDelta: number): void {
  state.peakQuestTotals.servedTotal += servedDelta;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
```

**Ключевые решения:**
- `selectDailyQuest` **идемпотентно** — если `date === today`, не трогает state.
  Значит можно вызывать в `processProgression` каждый тик без последствий.
- `processDailyQuest` — отдельно от `processSideQuests`. Не смешивать.
- `recordPeakTotals` — отдельная функция с явным `servedDelta`, не читает
  `state.peakState.last` (который может быть `null`).

## 6. Хуки

**`src/simulation/progression.ts`** — в конце `processProgression`, рядом с
`processSideQuests(state)`:

```ts
export function processProgression(state: GameState): void {
  ensureProgression(state);
  applyLevels(state);
  const quest = QUESTS.find(...);
  if (quest && quest.test(state)) { ... }
  processSideQuests(state);
  processDailyQuest(state);      // ← добавить
}
```

**`src/simulation/peak.ts`** — в `finishPeak`, после формирования `result`:

```ts
const result: PeakResult = { ... };
state.peakState.last = result;
// ... остальное ...
recordPeakTotals(state, result.served);   // ← добавить
return result;
```

**Импорт** в `peak.ts`:
```ts
import { recordPeakTotals } from './questProgress';
```

**Риск:** циклический импорт (`peak.ts` → `questProgress.ts` → `content/dailyQuests.ts`).
`dailyQuests.ts` импортирует только `types.ts` — цикла нет. Проверить после
первого `npm run build`.

## 7. `tests/dailyQuests.test.ts` — минимум тестов

1. `DAILY_QUESTS` содержит ровно 6 квестов
2. `progress(state)` для каждого — неотрицательное число
3. `selectDailyQuest` детерминирован: один `date` + `randomSeed` → тот же id
4. `selectDailyQuest` идемпотентен: второй вызов при том же дне не меняет state
5. `selectDailyQuest` в новый день (`date` изменился) → новый id, `rewarded: false`
6. `processDailyQuest`: `progress >= target` → `rewarded: true`, `coins += reward`
7. `processDailyQuest` идемпотентен: дважды → награда один раз
8. `recordPeakTotals`: `servedTotal += served`
9. `recordPeakTotals` не трогает другие поля state
10. `questBaseline` и `completedSideQuestIds` — не тронуты после `processDailyQuest`

## 8. Порядок работы (TDD)

1. Failing-тесты в `tests/dailyQuests.test.ts` (все кейсы §7)
2. Красный: `npx vitest run tests/dailyQuests.test.ts` → все failed
3. Реализация `dailyQuests.ts` (6 квестов из спеки)
4. Дополнение `questProgress.ts` (`selectDailyQuest`, `processDailyQuest`,
   `recordPeakTotals`, `hashString`, `todayKey`)
5. Хуки в `progression.ts` (1 строка) и `peak.ts` (1 строка + импорт)
6. Зелёный: `npx vitest run tests/dailyQuests.test.ts` → все passed
7. Полный прогон: `npm test` → 309 + 10 = **319**
8. Build: `npm run build` → ✅ (проверить цикл импортов)
9. `git status` (пути!) → `git show --stat` после коммита
10. Коммит: `feat(quests): LOGIC-6.1c - 6 daily quests + selectDailyQuest + recordPeakTotals`

## 9. Критерии готовности 6.1c

- [ ] `DAILY_QUESTS` содержит ровно **6** квестов с id из §3
- [ ] `selectDailyQuest` идемпотентен, детерминирован по `(date, seed)`
- [ ] `processDailyQuest` вызывается из `processProgression`
- [ ] `recordPeakTotals` вызывается из `finishPeak`
- [ ] `dailyQuestState` не ломает старые сейвы (миграция — нет, поле уже
      в `types.ts` с 6.1a)
- [ ] `npm test` зелёный (309 + 10)
- [ ] `npm run build` ✅ (циклический импорт не появился)
- [ ] `git show --stat <sha>` — только ожидаемые файлы
- [ ] Ничего не сломано в `sideQuests.test.ts` (13/13),
      `questBaseline.test.ts` (4/4), `questRework.test.ts` (4/4),
      `peak.test.ts` (14/14)

## 10. Не трогать в 6.1c

- `src/content/sideQuests.ts`, `tests/sideQuests.test.ts` — 6.1b закрыт
- `src/content/quests.ts`, `tests/questRework.test.ts` — контракт
- `src/ui/questPanel.ts` — 6.2 target
- `tests/chef-stove-binding.test.ts` — LOGIC-7
- `tests/questBaseline.test.ts` — работает, не переделывать
- `finishPeak` — менять **только** для `recordPeakTotals`, не трогать
  награды/логику пика

## 11. После зелёного 6.1c

Не переходить в 6.2 (UI) в той же сессии, если контекст длинный (>2/3).
Сначала — коммит, обновление `handoff-state.md` «6.1c done → 6.2 следующий».

## 12. Если возникли противоречия со спекой

`docs/quest-rework-spec.md` §5 — источник истины. Если структура 6 daily
в спеке отличается от §3 этого файла — **спека побеждает**, обновить §3
и зафиксировать в `docs/tasks/LOGIC-6.md`. Не подгонять (урок №8).