# LOGIC-6.1b — 18 side quests (задача текущей сессии)

Предусловие: прочитан `handoff-state.md`, пройден Шаг 0 (§13) и приёмка (§12).

Источник истины по квестам: `docs/quest-rework-spec.md` §4, §6, §8.
Эта задача — **только данные + логика**, без UI (UI — 6.2).

## 1. Q1-Q3 для 6.1b — ПОДТВЕРДИТЬ ДО КОДА

Три вопроса, по которым нужно явное «A» от пользователя. Рекомендую A/A/A.

**Q1-6.1b. `economy-savings` («На балансе 10 000») — абсолютный или от baseline?**
- **A (рекомендую):** `state.coins >= 10000` абсолютный. `coins` — текущий
  баланс, не кумулятив.
- B: `state.coins - baseline.coins >= 10000`. Тогда старый сейв с 10 000
  не выполнит (10 000 − 500 = 9 500).

**Q2-6.1b. Декор-награда (кап ×0.8) — когда фиксируется?**
- **A (рекомендую):** в момент выполнения. Купил дешёвые окна → награда
  `min(900, Σдешёвых × 0.8)`. Докупил дорогие — не пересчитывается.
- B: пересчёт при каждом `processSideQuests` — технически невозможно без
  ломки `completedSideQuestIds`.

**Q3-6.1b. `team-full-5` («Одновременно 5 официантов + 5 стоек») — текущее или когда-либо?**
- **A (рекомендую):** текущее. `waiters >= 5 && counters >= 5`. Без baseline
  (пиковое состояние, не кумулятив).
- B: «когда-либо было» — требует нового счётчика, которого спека не предусматривает.

## 2. Файлы для запроса у пользователя (блокер)

Без цен декора `test`-функции для `decor-*` не напишешь (кап ×0.8).

```cmd
chcp 65001
type src\content\wallpapers.ts
type src\content\windows.ts
type src\content\paintings.ts
type src\content\floors.ts
type src\content\furnitureSkins.ts
type src\content\loyalty.ts
```

`peak.ts` — для 6.1c, не блокер для 6.1b, но полезно сразу:
```cmd
type src\simulation\peak.ts
```

**Если цены не пришли** — не начинать. Не выдумывать числа (урок №8).

## 3. Таблица 18 квестов (из §4 спеки)

| ID | Название | Триггер | Награда | dependsOn |
|---|---|---|---|---|
| `decor-painting` | Искусство на стене | 1 картина | **200** | после «Уютный ресторан» |
| `decor-windows` | Больше света | 3 окна | **900** | `decor-painting` |
| `decor-plant` | Живой уголок | 1 растение | **300** | после «Уютный ресторан» |
| `decor-wallpapers` | Три настроения | 3 вида обоев | **600** | после «Уютный ресторан» |
| `decor-floors` | Новое покрытие | 3 покрытия | **600** | `decor-wallpapers` |
| `decor-skins-3` | Свой стиль | 3 скина | **900** | `decor-painting` |
| `decor-skins-5` | Коллекционер | 5 скинов | **2000** | `decor-skins-3` |
| `economy-revenue` | Устойчивая выручка | revenueTotal 5000 | **1500** | после «Первый гость» |
| `economy-savings` | Запас прочности | coins 10000 | **1000** | `economy-revenue` |
| `economy-cooking` | Горячий цех | upgrades.cooking 3 | **1800** | после «Первый рецепт» |
| `economy-waiter` | Быстрая подача | upgrades.waiter 3 | **2000** | после «Сильная команда» |
| `team-waiters-3` | Слаженная смена | 3 официанта | **1500** | после «Сильная команда» |
| `team-counters-3` | Три линии выдачи | 3 стойки | **1500** | `team-waiters-3` |
| `team-full-5` | Полная выдача | 5 официантов + 5 стоек одновременно | **5000** | `team-counters-3` |
| `menu-recipes-3` | Три блюда | 3 рецепта | **800** | после «Первый рецепт» |
| `peak-eight` | Горячий час | 8 гостей за пик | **1000** | после первого пика |
| `peak-perfect` | Без жалоб | perfect, ≥5 гостей | **2500** | `peak-eight` |
| `peak-twenty` | Мастер наплыва | 20 гостей в пики (cumul) | **4000** | `peak-perfect` |

**Числа не путать:** `decor-windows` = 900, `decor-skins-3` = 900 — это
**разные квесты** с одинаковой наградой. `decor-plant` = 300, `decor-wallpapers`
= 600 — разные.

## 4. Baseline-семантика по квестам

**С baseline (вычитать `baseline.X`, квест = `current > baseline.X`):**
- `decor-*` — все, «событие произошло» = `current > baseline`. По §6 спеки:
  «Прогресс побочных считается от baseline, старая статистика не даёт
  бесплатную серию наград».
- `economy-revenue`: `revenueTotal - baseline.revenueTotal >= 5000`

**Абсолютные (без baseline, текущее состояние):**
- `economy-savings`: `coins >= 10000` (Q1-6.1b=A)
- `economy-cooking`: `upgrades.cooking >= 3` (upgrades не кумулятив, максимум 5)
- `economy-waiter`: `upgrades.waiter >= 3` (то же)
- `team-waiters-3`: `waiters >= 3`
- `team-counters-3`: `counters >= 3`
- `team-full-5`: `waiters >= 5 && counters >= 5` (Q3-6.1b=A)
- `menu-recipes-3`: `unlockedDishIds.length >= 3`
- `peak-eight`: `state.peakState.last?.served >= 8` или `peakQuestTotals.servedTotal`
  (см. ниже)
- `peak-perfect`: `state.peakState.last?.perfect === true && served >= 5`
- `peak-twenty`: `peakQuestTotals.servedTotal >= 20` (Q3 общий=A)

**`peak-eight` уточнение:** «8 гостей за один пик» — это про `state.peakState.last.served >= 8`
(один пик), не про кумулятив. А `peak-twenty` — про кумулятив
(`peakQuestTotals.servedTotal`). Разные источники.

## 5. Кап ×0.8 (Q1 общий=A) — как считать

Для `decor-*`:
```ts
reward = Math.min(quest.reward, Math.floor(sumPrices * 0.8))
```
где `sumPrices` = сумма цен **всех** триггерных предметов в текущем сейве:
- `decor-painting`: Σ цен `appliedPaintings` (по `paintingId` из `paintings.ts`)
- `decor-windows`: Σ цен `appliedWindows` (по `windowId` из `windows.ts`)
- `decor-plant`: Σ цен `plant` furniture (из `loyalty.ts` или `furnitureCatalog`)
- `decor-wallpapers`: Σ цен `Object.keys(ownedWallpapers)` (по id из `wallpapers.ts`)
- `decor-floors`: Σ цен `ownedFloorPatterns` (по id из `floors.ts`)
- `decor-skins-3/5`: Σ цен `ownedFurnitureSkins` (по id из `furnitureSkins.ts`)

**Если у предмета нет `price`** (например, `ownedWallpapers` — Record id→count,
без цены) — суммировать по `price` каждого id. Цены — из файлов §2.

## 6. Структура `src/content/sideQuests.ts` (новый файл)

```ts
import type { GameState } from '../simulation/types';
import type { IconName } from '../ui/icons';
import type { FurnitureKind } from '../simulation/types';

export interface SideQuest {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  reward: number;                  // coins only, XP = 0 по §4
  test(state: GameState): boolean;
  dependsOn?: string;
  decorKind?: FurnitureKind;       // для капа ×0.8
}

export const SIDE_QUESTS: SideQuest[] = [ /* 18 из §3 */ ];
```

**dependsOn маппинг** (название → id):
- «Уютный ресторан» → посмотреть в `src/content/quests.ts`, это `quest-4`? —
  **проверить по факту перед кодом**. Если название не мапится — вынести
  `dependsOn: undefined` + backlog в `docs/tasks/LOGIC-6.md` (не выдумывать).
- «Первый гость» → `quest-1` (по `src/content/quests.ts`)
- «Первый рецепт» → нет в `quests.ts` (это §2 спеки, не реализовано).
  **Проблема:** §4 ссылается на «после «Первый рецепт»», а его нет.
  **Решение:** вынести в `dependsOn: undefined` + backlog.
- «Сильная команда» → `quest-10` (по `quests.ts`)

**Это надо явно проверить по факту** — не по памяти. `git grep -n "Уютный\|Первый рецепт" -- src/content/quests.ts`.

## 7. Структура `src/simulation/questProgress.ts` (новый файл)

```ts
import { SIDE_QUESTS, type SideQuest } from '../content/sideQuests';
import type { GameState } from './types';

export function processSideQuests(state: GameState): void {
  for (const quest of SIDE_QUESTS) {
    if (state.completedSideQuestIds.includes(quest.id)) continue;
    if (quest.dependsOn && !state.completedSideQuestIds.includes(quest.dependsOn)) continue;
    if (!quest.test(state)) continue;
    const reward = calculateReward(quest, state);
    state.completedSideQuestIds.push(quest.id);
    state.coins += reward;
  }
}

function calculateReward(quest: SideQuest, state: GameState): number {
  if (!quest.decorKind) return quest.reward;
  const sum = /* Σ по §5 */;
  return Math.min(quest.reward, Math.floor(sum * 0.8));
}
```

## 8. Хук в `processProgression`

**Вариант 1 (рекомендую):** в конце `processProgression` в
`src/simulation/progression.ts` добавить `processSideQuests(state);`.
Работает автоматически и в `normalizeState`, и в `advanceSimulation`.

**Вариант 2:** отдельные вызовы. Вариант 1 чище — меньше мест забыть.

## 9. `tests/sideQuests.test.ts` — минимум тестов

1. Все 18 квестов имеют валидные поля (`id`, `title`, `reward > 0`, `test`)
2. Цепочки: `dependsOn` ссылается на существующий id (self-test)
3. `decor-painting`: baseline.paintings=0 → 1 картина → выполнено
4. `decor-windows`: baseline.windows=0 → 3 окна → выполнено, награда ≤ 900
5. `decor-skins-5`: baseline.skins=0 → 5 скинов → 2000
6. `economy-revenue`: baseline.revenueTotal=1000 → revenueTotal=6000 → выполнено (5000 разница)
7. `economy-savings`: coins=10000 абсолютно (без baseline)
8. `team-waiters-3`: 3 официанта → 1500
9. `team-full-5`: 5 официантов + 5 стоек одновременно → 5000
10. `menu-recipes-3`: 3 рецепта → 800
11. `peak-twenty`: `peakQuestTotals.servedTotal=20` → 4000
12. Идемпотентность: `processSideQuests` дважды → награда один раз
13. Baseline: старый сейв с 3 картинами (`baseline.paintings=3`),
    `decor-painting` не выполн до нового размещения
14. Кап ×0.8: `decor-windows` с дешёвыми окнами (`Σ*0.8 < 900`) → награда меньше 900

## 10. Порядок работы (TDD)

1. Failing-тесты в `tests/sideQuests.test.ts` (все кейсы §9)
2. Красный: `npx vitest run tests/sideQuests.test.ts` → все failed
3. Реализация `sideQuests.ts` (18 квестов)
4. Реализация `questProgress.ts` (`processSideQuests`, `calculateReward`)
5. Хук в `progression.ts` (вызов в конце `processProgression`)
6. Зелёный: `npx vitest run tests/sideQuests.test.ts` → все passed
7. Полный прогон: `npm test` → 296 + N зелёных
8. Build: `npm run build` → ✅
9. `git status` (пути!) → `git show --stat` после коммита
10. Коммит: `feat(quests): LOGIC-6.1b - 18 side quests + processSideQuests`

## 11. Критерии готовности 6.1b

- [ ] `SIDE_QUESTS` содержит ровно **18** квестов с id из §3
- [ ] `processSideQuests` вызывается из `processProgression`
- [ ] `decor-*` награда фиксируется в момент выполнения (Q2=A)
- [ ] `economy-savings` абсолютный, `team-full-5` текущее (Q1/Q3=A)
- [ ] `dependsOn` ссылается на существующие id (self-test)
- [ ] Старый сейв не получает ретроактивных наград (baseline работает)
- [ ] `npm test` зелёный (296 + N)
- [ ] `npm run build` ✅
- [ ] `git show --stat <sha>` — только ожидаемые файлы (никаких `tests/tests/`)
- [ ] Ничего не сломано в `questRework.test.ts` (4/4), `questBaseline.test.ts` (4/4)

## 12. Не трогать в 6.1b

- `src/content/quests.ts` — контракт
- `tests/questRework.test.ts` — контракт (4 теста)
- `src/ui/questPanel.ts` — 6.2 target
- `tests/questBaseline.test.ts` — работает, не переделывать
- `tests/chef-stove-binding.test.ts` — LOGIC-7 контракт

## 13. После зелёного 6.1b

Не переходить в 6.1c в той же сессии, если контекст длинный (>2/3 сессии).
Сначала — коммит и push в handoff-файл «6.1b done». Если сессия свежая —
можно сразу 6.1c.

## 14. Если возникли противоречия со спекой

`docs/quest-rework-spec.md` — источник истины. Если спека говорит одно, а код
требует другого (например, `dependsOn` на несуществующий квест) — **вынести в
`docs/tasks/LOGIC-6.md` как backlog**, не подгонять (урок №8). Не блокировать
6.1b, если противоречие касается 1-2 квестов из 18.