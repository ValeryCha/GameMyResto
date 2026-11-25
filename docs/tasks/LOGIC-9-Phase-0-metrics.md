# LOGIC-9 Phase 0 — метрики waiter bottleneck

**Статус:** Phase 0 (замеры). Не код фикса. Решение о варианте A1–E2 — по фактам.

**Ветка:** logic-9-waiter-bottleneck

**Цель:** замерить, где узкое место (повар / официант / стойка / столы), на живой игре 2-3 минуты. Гипотеза пользователя: 4-я конфорка не заполняется, официант — bottleneck.

## Что измеряем

Из F1–F10 (handoff §6.1) реализуемо без изменения sim-кода через сэмплирование:

| # | Метрика | Как считаем | Что значит |
|---|---|---|---|
| F2 | `waiterIdleRate` (%) | доля сэмплов, где waiter в `idle` | Высокая → официант НЕ узкое место |
| F4 | `counterFullRate` (%) | доля сэмплов, где counter.orders >= 3 | Высокая → стойка — узкое место |
| F5 | `seatsFillRate` (%) | avg `customers.length / guestLimit` | ≈100% → столы — узкое место |
| F6 | `avgOrdersInQueue` | avg `orders.filter(state='waitingCook').length` | Высокая → очередь на кухню |
| F7 | `avgWaiterTripTime` (тиков) | avg trip duration (idle → idle) | Высокая → официант долго ходит |
| F8 | `burnersUsageRate` (%) | avg(sum(activeOrders per chef) / (stoveBurners × chefCount)) | <50% → конфорки недогружены |
| F9 | `waiterTripsPerMin` | среднее trips/официант/минуту | Низкое → официант редко принимает |
| F10 | `chefFillRate` (%) | доля сэмплов, где chef.activeOrders.length === stoveBurners | Высокая → повара загружены |

**F1 (customer wait) и F3 (cooking time)** — не измеряем в Phase 0: нет timestamp на customer.seatedAt / order.cookingStartedAt. Если понадобится — отдельная инструментация в Phase 1.

## Реализация

**Файл:** `src/main.ts`, dev-only блок (как `__debug` из fix-balance, урок 40).

**Структура:**
```ts
if (import.meta.env.DEV) {
  const accum = {
    samples: 0,
    idleWaiterTicks: 0,
    fullChefTicks: 0,
    fullCounterTicks: 0,
    ordersInQueue: 0,
    seatsUsed: 0,
    burnersUsed: 0,
    waiterTrips: new Map<string, { lastState: string; lastTripStart: number; trips: number[] }>(),
  };
  let intervalId: number | undefined;
  let startTick = 0;

  (window as any).__debug = {
    ...((window as any).__debug || {}),
    metrics: {
      start() {
        accum.samples = 0;
        accum.idleWaiterTicks = 0;
        accum.fullChefTicks = 0;
        accum.fullCounterTicks = 0;
        accum.ordersInQueue = 0;
        accum.seatsUsed = 0;
        accum.burnersUsed = 0;
        accum.waiterTrips.clear();
        startTick = state.tick;
        intervalId = window.setInterval(() => {
          accum.samples++;
          const waiters = state.employees.filter(e => e.role === 'waiter');
          const chefs = state.employees.filter(e => e.role === 'chef');
          const counters = state.furniture.filter(f => f.kind === 'counter');
          const burners = stoveBurners(state);
          // F2: idle waiter
          accum.idleWaiterTicks += waiters.filter(w => w.taskId === undefined).length;
          // F10: full chef
          accum.fullChefTicks += chefs.filter(c => (c.activeOrders?.length ?? 0) >= burners).length;
          // F8: burners used
          accum.burnersUsed += chefs.reduce((s, c) => s + (c.activeOrders?.length ?? 0), 0);
          // F4: full counters
          accum.fullCounterTicks += counters.filter(f => state.orders.filter(o => o.state === 'waitingDelivery' && o.counterId === f.id).length >= 3).length;
          // F5, F6: snapshot
          accum.seatsUsed += state.customers.length;
          accum.ordersInQueue += state.orders.filter(o => o.state === 'waitingCook').length;
          // F7/F9: waiter trip tracking
          for (const w of waiters) {
            const rec = accum.waiterTrips.get(w.id) ?? { lastState: '', lastTripStart: 0, trips: [] };
            const currentState = w.taskId === undefined ? 'idle' : 'busy';
            if (rec.lastState === 'idle' && currentState === 'busy') rec.lastTripStart = state.tick;
            if (rec.lastState === 'busy' && currentState === 'idle' && rec.lastTripStart > 0) {
              rec.trips.push(state.tick - rec.lastTripStart);
              rec.lastTripStart = 0;
            }
            rec.lastState = currentState;
            accum.waiterTrips.set(w.id, rec);
          }
        }, 500);
        return 'metrics started at tick ' + startTick;
      },
      stop() {
        if (intervalId) window.clearInterval(intervalId);
        intervalId = undefined;
        const elapsed = state.tick - startTick;
        const waiters = state.employees.filter(e => e.role === 'waiter').length || 1;
        const chefs = state.employees.filter(e => e.role === 'chef').length || 1;
        const counters = state.furniture.filter(f => f.kind === 'counter').length || 1;
        const burners = stoveBurners(state);
        const allTrips = [...accum.waiterTrips.values()].flatMap(r => r.trips);
        return {
          tickStart: startTick,
          tickEnd: state.tick,
          elapsedTicks: elapsed,
          samples: accum.samples,
          F2_waiterIdleRate: +(accum.idleWaiterTicks / (waiters * accum.samples) * 100).toFixed(1),
          F4_counterFullRate: +(accum.fullCounterTicks / (counters * accum.samples) * 100).toFixed(1),
          F5_seatsFillRate: +((accum.seatsUsed / accum.samples) / state.guestLimit * 100).toFixed(1),
          F6_avgOrdersInQueue: +(accum.ordersInQueue / accum.samples).toFixed(1),
          F7_avgWaiterTripTime: allTrips.length ? +(allTrips.reduce((a, b) => a + b, 0) / allTrips.length).toFixed(1) : 0,
          F8_burnersUsageRate: +(accum.burnersUsed / (chefs * burners * accum.samples) * 100).toFixed(1),
          F9_waiterTripsTotal: allTrips.length,
          F10_chefFillRate: +(accum.fullChefTicks / (chefs * accum.samples) * 100).toFixed(1),
          raw: { chefCount: chefs, waiterCount: waiters, counterCount: counters, burnersPerChef: burners },
        };
      },
    },
  };
}