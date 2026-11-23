# TECH-5 — расстановка мебели с проходами (unit + e2e)

# Зависит от: main = 4a27afe (TECH-4 + docs)
# Затрагивает: tests/furniture-layout-passability.test.ts (новый),
#              e2e/furniture-layout.spec.ts (новый)
# Не трогает: src/ (кроме тестовой инфраструктуры e2e — см. Phase 1)
# Тип: Тесты (unit + e2e)
# Git: только чтение (git branch, git status, git log, git grep, git diff).

РОЛЬ
Ты — senior TypeScript + Playwright разработчик проекта «Restaurant City / Мой ресторан». Ты пишешь тесты на плотную планировку ресторана: 4 стола + 12 стульев с проходами. Работаешь по фазам, не перескакивая.

СХЕМА РАССТАНОВКИ (инвариант)
- 2 одиночных стола (`table`) + по 2 стула (`chair`) к каждому = **4 стула**
- 2 двойных стола (`tableDouble`) + по 4 стула к каждому = **8 стульев**
- Итого: **4 стола, 12 стульев**
- **Проходы:** персонал и гости могут свободно перемещаться между столами и стульями. Минимум 1 свободная клетка между соседними столами/стульями.
- Дверь не блокируется мебелью.

КОНТЕКСТ
- `createGame`: 8×8, дверь, 1 повар / 1 плита. Официанта и стойки на старте **нет**.
- `processProgression(state)` на `state.level = 5` → `applyLevels` → `expandBounds` → **10×10** (авто, без денег).
- `placeFurniture(state, kind, position)` → `{ ok: boolean; reason?: string }`.
- `advanceSimulation(state, N)` — гоняет N тиков.
- Кнопка `+50 000` — диагностика, в тестах **не используется**.
- `throughput` без официанта/стойки = 0 → гости не обслуживаются. Для теста надо добавить официанта и стойку (программно или через `hireWaiter`/`placeFurniture`, см. Phase 1).

ШАГ 0 — БАЗА (обязательно)
1. `git branch --show-current` — на `main`. Если нет — СТОП.
2. `git status` — clean. Если нет — СТОП.
3. `npm test` — 331/331. Если нет — СТОП.

ФАЗА 1 — ИНВЕНТАРИЗАЦИЯ (СТОП, жди «продолжай»)
Кода НЕ писать. Выполни команды и выпиши таблицу.

Команды:
- `git grep -n "placeFurniture\|furniture.push" tests/ | head -20`
- `git grep -n "processProgression\|expandBounds\|state.level = 5" tests/ src/simulation/progression.ts src/simulation/expansion.ts`
- `git grep -n "hireWaiter\|role: 'waiter'\|kind: 'counter'" tests/ | head -20`
- `git grep -n "patchSave\|__gameState\|localStorage" e2e/quest-lifecycle.spec.ts e2e/gameplay-rework.spec.ts`
- `git grep -n "dense\|плотн" tests/ e2e/`
- Прочитай: `src/simulation/createGame.ts` (28 строк), `src/simulation/commands.ts` (placeFurniture), `src/simulation/expansion.ts` (expandBounds), `e2e/quest-lifecycle.spec.ts` (patchSave).

Выпиши таблицу:

| Вопрос | Ответ |
|---|---|
| Где дверь в createGame? Какая клетка? | |
| Стартовая мебель (кроме двери, повара, плиты)? | |
| `placeFurniture` — какие проверки (свободная клетка, стены)? | |
| `expandBounds` — какие клетки добавляет (снизу/справа)? Дверь переезжает? | |
| `processProgression` на L5 — какая последовательность? | |
| Как в существующих тестах добавляют официанта/стойку? | |
| `patchSave`/`__gameState` в e2e — как устроено? | |
| Есть ли уже тест на «плотную планировку» (`waiter-dense-layout.test.ts`)? Что проверяет? | |

**Затем предложи координаты** для 10×10:
- 2 single table + 4 chair (по 2 к каждому)
- 2 double table + 8 chair (по 4 к каждому)
- С проходами, не блокируя дверь.
- Формат: `kind: (x, y)` — таблица 16 строк.

Проверь мысленно: гости смогут подойти к каждому стулу, официанты — к каждому столу и стойке.

**СТОП.** Жди «продолжай». DeepSeek проверит координаты.

ФАЗА 2 — UNIT ТЕСТ `tests/furniture-layout-passability.test.ts` (новый)

Структура:
```ts
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { processProgression } from '../src/simulation/progression';
import { placeFurniture } from '../src/simulation/commands';
import { advanceSimulation } from '../src/simulation/tick';
import { countUsableSeats } from '../src/simulation/guestFlow';

describe('плотная планировка: 4 стола + 12 стульев', () => {
  function setupDenseLayout() {
    const state = createGame();
    // 1. Расширение до 10×10
    state.level = 5;
    processProgression(state);
    // 2. Официант + стойка (иначе throughput = 0)
    //    Способ — по таблице Phase 1 (программно или через hireWaiter/placeFurniture)
    // 3. Расстановка по координатам из Phase 1
    //    Каждый placeFurniture → expect(ok).toBe(true)
    return state;
  }

  it('расставляет 4 стола и 12 стульев без ошибок', () => { ... });
  it('capacity = 12 (все стулья пригодны)', () => { ... });
  it('за 600 тиков обслужено > 0 гостей, никто не застрял', () => {
    const state = setupDenseLayout();
    const before = state.servedTotal;
    advanceSimulation(state, 600);
    expect(state.servedTotal).toBeGreaterThan(before);
    // «Застрявшие»: гости в seekingSeat без target и без seatId
    const stuck = state.customers.filter((c) =>
      c.state === 'seekingSeat' && !c.seatId && !c.target);
    expect(stuck).toHaveLength(0);
  });
});