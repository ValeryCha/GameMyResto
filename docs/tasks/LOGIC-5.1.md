# LOGIC-5.1 — точечные правки HUD

Источник: docs/README.md@044982c («HUD потерял «свободно N · лимит M» —
теперь «X · мест Y». Вернуть в LOGIC-5»). CHECKPOINT@30d8aa1: «остаток →
LOGIC-5.1».

## Правка 1 — регрессия «свободно/лимит» (единственная подтверждённая)

Файл: src/ui/hud.ts:145 (через хелпер formatGuestsStat)
Сейчас:  `${model.guests} · мест ${model.capacity}`
Должно:  `${model.guests} занято · свободно ${Math.max(0, model.capacity - model.guests)} · лимит ${model.capacity}`
Источник формулы: 374fbcf (до регрессии). В 374fbcf поле называлось
guestLimit; сейчас в HUD-модели — capacity. guestLimit в GameState не выпилен
(grep: types.ts, createGame, normalizeState, guestLimits, tests) — HUD его
не трогает.

title — оставить WIP-вариант:
`Планируемый поток: ${model.arrivalsPer60.toFixed(1)} гостей за 60 тиков`
(осознанная смена «с → тиков» в 649e137, не регрессия).

Критерий приёмки:
- В HUD одновременно видны: занято, свободно, лимит.
- Не ломает существующий e2e/hud.spec.ts.
- Не конфликтует с hud-metrics / hud-queue-indicator (вёрстка).

Тест:
- unit: tests/hudFormat.test.ts —
  (2,5) → «2 занято · свободно 3 · лимит 5»;
  (6,5) → «6 занято · свободно 0 · лимит 5» (clamp).
- e2e: e2e/hud.spec.ts — проверка текста guest-стата.

## Правки 2, 3 — не подтверждены, в scope не входят

Источники (README@044982c, CHECKPOINT@30d8aa1, история коммитов,
git grep TODO/FIXME, полные диффы 649e137 и 374fbcf) не содержат следов
ещё двух HUD-правок. WIP-элементы ratingTrend, hud-metrics,
hud-queue-indicator проверены — готовы, покрыты, в 5.1 не входят.

Следствие: LOGIC-5.1 = 1 правка. CHECKPOINT.md исправлен:
«3 точечные правки HUD» → «1 подтверждённая; WIP-элементы проверены».
Новые HUD-правки при появлении — как LOGIC-5.2, не растягивать 5.1.

## Backlog (перенос в CHECKPOINT.md)

- LOGIC-6.x: стартовый throughput на 1 стуле (seatRate=0.0556, второй гость
  ~14 тиков) — оценить, не медленно ли для туториала (README@044982c).
- TECH-1: интеграционные тесты на покупку мебели (уже в CHECKPOINT).