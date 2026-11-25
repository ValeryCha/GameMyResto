# CURRENT — Restaurant City

**Обновлено:** 2026-11-25
**Сессия:** DeepSeek (архитектор/ревью) + Kimi Code (исполнитель) + пользователь (git)

## Где мы

- LOGIC-8.1–8.4.1 ✅, visual 3D-тарелки ✅, fix-balance ✅ (`d84dbe2`), VISUAL-8.5 ✅ (`f8266a3`).
- **LOGIC-9 A1 ✅ (`0e72565`)** — waiter queue, официант больше не bottleneck (cycle ×3 быстрее).
- main = `0e72565`, origin/main = `0e72565` (sync).
- Unit 382/382, e2e 53/53, build exit 0.
- **Следующая: TECH-3** (`catalog-decorations.spec.ts`, разобрать `4394b2d`).

## Порядок задач

| # | Задача | Статус |
|---|---|---|
| 1 | **TECH-3** — `catalog-decorations.spec.ts`, разобрать `4394b2d` | **← следующая** |
| 2 | TECH-2 — `waitForTimeout` → `waitForFunction` | после TECH-3 |
| 3 | TECH-1 — интеграционные тесты мебели | после TECH-2 |
| 4 | TECH-5.1 — e2e для плотной планировки | бэклог |
| 5 | LOGIC-10 (eating time / table turnover) — backlog | опционально |
| 6 | Ф5 (техдолг) — повар без заказов на станцию | по мере |
| 7 | Пакетная чистка веток | отдельным шагом |

## LOGIC-9 — бэклог идей (не потерять)

**Phase 0 — метрики** (до кода): `avgWaitTime`, `waiterIdleTime`, `cookingTime`, `counterFullRate`, `occupiedSeats/guestLimit`, `orders.length`, `avgWaiterTripTime`.

**Варианты после замеров:**
- **A1.** WaiterQueue — официант сразу `waitingCook`, без handoff. 1 сессия.
- **A2.** Multi-pickup — N заказов за подход. 2-3 сессии.
- **A3.** Multi-drop — N готовых (`waiterCarryCapacity`, проверить работает ли).
- **A4.** FIFO-приоритизация — к самому старому заказу.
- **A5.** Разделение ролей (не рекомендую, большая переделка).
- **B1.** Больше слотов на стойку (`COUNTER_MAX_SLOTS = 3` → 4-5).
- **B2.** Прямой handoff повар→официант без стойки.
- **B3.** Counter buffering — официант кладёт, повар берёт.
- **C1-C3.** Расширение ресторана / `arrivalRate` / `guestLimit` (игровое/риск).
- **D1.** `waiterMovementSteps` +1.
- **D2.** Умный путь.
- **E1.** `cookingProgress` быстрее.
- **E2.** VISUAL-8.5 (может решить без отдельной задачи).

Полный контекст — в `handoff-state.md` §6.1.

## Текущая задача: LOGIC-9 (waiter bottleneck)

**Статус:** Phase 0 (замеры) — до кода. Полный бэклог идей в handoff-state §6.1 и ниже.

**Метрики Phase 0 (F1–F10):**
- F1 avgWaitTime гостей, F2 waiterIdleTime, F3 cookingTime, F4 counterFullRate,
  F5 occupiedSeats/guestLimit, F6 orders.length, F7 avgWaiterTripTime,
  F8 avgBurnersUsedPerStove, F9 waiterAcceptCycleTime, F10 chefFillRate.

**Метод:** временный `__debug` под `import.meta.env.DEV` (как в fix-balance, урок 40). Удалить после.

**Решение о варианте (A1–E2) — по фактам замеров** (урок 8, не подгонять).

**Гипотеза от пользователя (наблюдение в игре):** 4-я конфорка не заполняется — официант принимает 1 заказ, отдаёт 4. Если `F8 < 2` и `F9` высокий → A1 (WaiterQueue) или A2 (Multi-pickup) дадут прирост. Проверить замером.

## Структура работы с Kimi Code

1. **DeepSeek** создаёт `docs/tasks/TASK-XXX.md` (Phase 0–4).
2. **Пользователь** отправляет в Kimi: «Прочитай `TASK-XXX.md`, начни с Phase 0».
3. **Kimi** проходит Phase 0 → STOP, Phase 1 → STOP.
4. **DeepSeek** ревьюит, «продолжай».
5. **Kimi** делает Phase 2 (код) + Phase 3 (самоаудит) + Phase 4 (тесты + отчёт).
6. **DeepSeek** ревьюит диффы.
7. **Пользователь** коммитит, push.
8. **DeepSeek** обновляет handoff + CURRENT.

**Правила:**
- **Kimi — только код.** Read-разведка (`git status/log/diff/grep/show`) — на пользователе, вывод идёт DeepSeek. Kimi получает готовые факты (цитаты файлов, списки тестов), не команды «сходи и посмотри».
- Запреты на функции, не на файлы.
- Phase 1 — `git grep`, не по памяти.
- Полный `npx playwright test` — только на финальном гейте.
- Push — последний шаг.
- **Не быть многословным.** Лимиты тратятся.

## Последние коммиты

```
0e72565 merge LOGIC-9 A1: waiter queue
a38c9b0 feat(LOGIC-9-A1): waiter puts order directly to waitingCook (no chef walk)
7fd98f8 docs: LOGIC-9 A1 task (waiter queue)
b7668cd docs: LOGIC-9 Phase 0 metrics task
0dc96a6 docs: VISUAL-8.5 done, LOGIC-9 Phase 0 next
```

## Состояние

- main = `0e72565` (sync с origin)
- Теги: archive/logic-8.4.1-chef-station=65fab54, archive/fix-chef-3x3-diagnostic=0f12631, archive/visual-8.5-stove-burners=c82b9e5, archive/logic-9-waiter-bottleneck=a38c9b0, + 10 старых
- Unit 382/382, e2e 53/53, build exit 0

## Что дальше

1. VISUAL-8.5 (4 конфорки) — Phase 0/1 → task-файл → Phase 2–4 → merge → push.
2. LOGIC-9 (waiter bottleneck) — Phase 0 замеры → решение (multi-pickup / waiterQueue / ничего) → спека.
3. TECH-3, TECH-2, TECH-1, TECH-5.1.
4. Пакетная чистка веток — отдельным шагом.

## Техдолг

- **Ф1.** `stoveStation` считает calling chef занятым (excludeActorId).
- **Ф2.** `placeFurniture` откат `pop()` → `splice(indexOf, 1)`.
- **Ф3.** `handoff/task-6.1с.md` — кириллическая «с», не `.DONE.md`.
- **Ф4.** `LOGIC-8.4.1-chef-station.md` — §ФАЗА 0/1 устарели, git-rule B.
- **Ф5.** Повар без заказов не идёт на станцию (визуал).
- **Ф6.** Пакетная чистка веток.
- **Ф7.** `4394b2d relax coins check` — разобрать.

## LOGIC-10 — backlog (официанты, eating time)

**Статус:** не начато. Активировать только по явной просьбе пользователя.

**Что уже работает после A1 (`0e72565`):**
- Официант цикл ×3 быстрее, throughput ×3
- `waitingWaiter = 18.33` — гости ждут официанта ~42 тика (patience 120+, не уходят)
- Остаточный потолок — столы (F5=91%) / eatTime ≈ 98 тиков

**Варианты по условию:**
| Условие | Вариант | Цена |
|---|---|---|
| Сократить `waitingWaiter` на 30–40% | A3 (Multi-drop) | 1 сессия |
| Сократить `waitingWaiter` на 50% | A2 (Multi-pickup) | 2-3 сессии |
| Больше throughput | LOGIC-10 (eating time / столы) | 1-2 сессии + дизайн |
| Меньше queueRejected | D (waiterMovementSteps +1) | 1 правка |

**Правило:** перед выбором — повторить метрики F1–F17 (восстановить `__debug.metrics` из `archive/logic-9-waiter-bottleneck`). Bottleneck сместился (урок 43).

**Не делать:** A4 (FIFO), A5 (разделение ролей), B1–B3 (стойки работают), C1–C3 (уже работает), E1–E2 (повара быстрые).

## Блокеры

Нет.