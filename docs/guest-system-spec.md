# Система гостей, очередь, рейтинг и миграция — финальная редакция

Документ является проектной спецификацией без реализации кода.

## 1. Метрики гостей

- `capacity` — одновременно доступные сидячие места.
- `arrivalRate` — желаемый приход гостей за тик после капа.
- `throughput` — расчётное число обслуживаемых гостей за тик.
- Для HUD потоки переводятся за 60 тиков: `60 × rate`.

### 1.1. Вместимость

```text
capacity = usableSeats
```

Учитываются стулья рядом с обычным или двойным столом. Уровень и купленные слоты не создают сидячих мест.

### 1.2. Спрос и кап

```text
levelDemand  = 0.12 + 0.012 × (level - 1)
slotDemand   = 0.03 × purchasedGuestSlots
ratingFactor = 0.75 + 0.50 × popularity / 1000
peakFactor   = 1.50 во время пика, иначе 1.00

rawArrivalRate = (levelDemand + slotDemand) × ratingFactor × peakFactor
arrivalRate = min(rawArrivalRate, throughput × 1.3)
```

Кап сохраняет перегрузку до 30%, но не позволяет спросу необратимо уничтожить рейтинг за один пик. Слоты, уровень, рейтинг и пик продолжают увеличивать спрос до этого предела.

Каждый слот до капа при рейтинге 500 даёт `0.03 гостя/тик`, то есть 1.8 гостя за 60 тиков.

```text
arrivalProgress += arrivalRate на каждом игровом тике
```

При `arrivalProgress >= 1` выполняется одна попытка прихода и вычитается 1. Дробный остаток сохраняется. Старый `customerSpawnInterval` удаляется из целевой модели.

Если `throughput = 0`, кап даёт нулевой приход: ресторан без рабочего звена не получает бесконечный поток недовольных. Очередь образуется при положительной, но недостаточной пропускной способности.

### 1.3. Пропускная способность

```text
C = clamp(0, 3, chefs)
S = clamp(0, 3, stoves)
W = clamp(0, 5, waiters)
K = clamp(0, 5, counters)
U = cooking upgrade, 0..5
V = waiter upgrade, 0..5
B = суммарный бонус скинов кухни, 0..0.05
D = 0.92
T_service = 10
T_eat = 8
```

`T_cook` — взвешенное среднее `DISHES[i].cookSeconds` по доступным `unlockedDishIds`. Веса соответствуют текущему выбору блюд, включая вероятность желаемых блюд; для текущего каталога ориентир ≈ **10.18**, а не 8. При изменении доступного меню значение пересчитывается.

```text
cookTimeFactor = (1 - 0.08 × U) × (1 - B)
kitchenRate = min(C, S) / (T_cook × cookTimeFactor)

waiterSpeed = 1 / (1 - 0.07 × V)
serviceRate = D × min(W, K) × waiterSpeed / T_service

seatRate = capacity / (T_service / max(1, min(W, K)) + T_eat)
throughput = min(kitchenRate, serviceRate, seatRate)
```

- Кухня масштабируется до 3 пар `min(C, S)`; до LOGIC-7 обычная конфигурация 1/1.
- Выдача масштабируется до 5 линий `min(W, K)`.
- Отсутствие повара, плиты, официанта или стойки делает соответствующее звено нулевым.
- `D = 0.92` учитывает детерминированное `waiterIndex % counters.length` и не меняется.
- `B` ограничен 0.05 суммарно для всех скинов.
- Расчёт не заменяет фактические маршруты и заказы, а даёт ориентир спроса и HUD.

Лимитирующее звено — минимум из `kitchenRate`, `serviceRate`, `seatRate`. При равенстве приоритет подсказок: места → кухня → доставка.

## 2. Очередь у входа

### 2.1. Жизненный цикл

```text
приход → есть место → посадка
       → нет места и очередь < 5 → queueWaiting
       → очередь полна → queueRejected → уход
```

Освободившееся место получает первый гость FIFO. Во время движения к зарезервированному месту таймер очереди не уменьшается.

### 2.2. Терпение

- Лимит очереди: **5**.
- `queuePatience = 90 × patienceMultiplier(state)`.
- `patienceBonus` и лояльность к этому параметру не применяются.
- Существующее терпение гостя за столиком `240 × (1 + patienceBonus) × patienceMultiplier` не меняется.

### 2.3. Полная очередь

```text
popularity -= 10
satisfiedStreak = 0
unhappyTotal += 1
queueRejectedTotal += 1
```

### 2.4. Таймаут

```text
timeoutSteps = floor(queueWaitedTicks / max(1, queuePatience))
popularity -= min(50, 10 + 10 × timeoutSteps)
satisfiedStreak = 0
unhappyTotal += 1
queueTimeoutTotal += 1
```

При обычном срабатывании таймера штраф базово -20, максимум -50. Рейтинг ограничивается 0–1000.

Успешная посадка не даёт штрафа. Обновляются `queueSeatedTotal` и `queueWaitTicksTotal`.

### 2.5. Визуал

- До 5 силуэтов у двери по FIFO.
- Шкала терпения над первым.
- При полной очереди — одно заменяемое уведомление, без стекирования.
- Силуэты привязаны к реальным ID, их экранные координаты не сохраняются.

## 3. Шкала рейтинга 0–1000

Цель — гранулярность без изменения относительной сложности. Абсолютные изменения умножаются на 10, относительные формулы используют `/1000`, пределы становятся 0–1000.

| Файл | Что делает | Было | Стало |
|---|---|---|---|
| `types.ts` | Версия и диапазон `popularity` | `version: 1`, шкала 0–100 | `version: 2`, шкала 0–1000 |
| `guestFlow.ts` | `rating` | `popularity / 100` | `popularity / 1000` |
| `guestFlow.ts` | `patienceMultiplier` | `0.85 + 0.3 × pop/100` | `0.85 + 0.3 × pop/1000` |
| `guestFlow.ts` | `tipMultiplier` | `1 + 0.2 × pop/100` | `1 + 0.2 × pop/1000` |
| `guestFlow.ts` | Появление гостей | `customerSpawnInterval`, 1.8–9 | Удалить; использовать `arrivalRate` |
| `orders.ts` | Награда рейтинга в `settleOrder` | `+0.1` | `+1` |
| `orders.ts` | `weightedDesiredDish` | `rating = pop/100` | `rating = pop/1000` |
| `tick.ts` | `unhappyExit` | `-1` | `-10` |
| `rating.ts` | `decorationRating(price)` | `max(1, round(price/500))` | `max(10, round(price/50))` |
| `rating.ts` | `applyDecorationRating` | Clamp 0–100 | Clamp 0–1000 |
| `shop.ts` | `spend` | Clamp 0–100 | Clamp 0–1000 |
| `shop.ts` | `hireWaiter` | `+10` | `+100` |
| `shop.ts` | `increaseGuestLimit` | `+3` | `+30` |
| `shop.ts` | `expandRestaurant` | `+15` | `+150` |
| `normalizeState.ts` | Миграция рейтинга | Нет нормализации | Однократно ×10, clamp 0–1000 |
| `normalizeState.ts` | `decorationRatingBonus` | Пересчёт каталога | Не мигрировать вручную; пересчитывается |
| `selectors.ts` | Формат рейтинга | `popularity.toFixed(1)` | `String(Math.round(popularity))` |
| `hud.ts` | Тренд | `ratingChange.toFixed(1)`, порог 0.001 | `Math.round(delta)`, порог `> 1` |
| `hud.ts` | Значение | `values.popularity` | Целое значение из `getHudModel` |
| `tests/**` | Ожидания рейтинга | Шкала 0–100 | Соответствующие значения ×10 |

Пороги вех не добавляются: `progression.ts` вызывает `quest.test`. Тиры S/A/B/C/D не входят в этап.

## 4. Миграция и сохранения

### 4.1. Версия

Вводится `CURRENT_STATE_VERSION = 2`. До `processProgression(state)`:

```text
if ((state.version ?? 1) < 2:
  popularity = (popularity ?? 50) × 10
  version = 2
clamp popularity 0..1000
```

Повторная загрузка версии 2 не умножает рейтинг снова. Пример: 47 → 470 → 470.

### 4.2. Новые поля

| Поле | Дефолт |
|---|---|
| `guestQueue: string[]` | `[]` |
| `queueRejectedTotal`, `queueTimeoutTotal` | `0` |
| `queueSeatedTotal`, `queueWaitTicksTotal` | `0` |
| `arrivalProgress` | `0` |
| `peakState` | Нейтральная структура |
| `dailyQuestState` | `{ date, id, progress, rewarded }` по локальной дате |
| `completedSideQuestIds` | `[]` |
| `questBaseline: Record<string, number>` | Текущие значения счётчиков |
| `peakQuestTotals` | Нулевые значения |
| `hiredCooks`, `boughtStoves` | Число существующих объектов, обычно 1/1 |

У гостя добавляются `queueEnteredAt`, `queueWaitedTicks`, `queuePatience` с конечными неотрицательными дефолтами.

### 4.3. Правила `normalizeState`

- `arrivalProgress = 0` при миграции: старый `spawnProgress` имеет другую семантику и безопасно сбрасывается без ретроактивных приходов.
- Неизвестные ID из `guestQueue` удаляются; гость не дублируется в очереди и другом состоянии.
- Таймеры конечные и неотрицательные.
- `purchasedGuestSlots` 0–10 сохраняются и участвуют в `slotDemand`; `legacy` не нужен.
- `guestLimit` и `maxGuestLimit` остаются только для чтения старых данных, но не ограничивают новую симуляцию.
- Отсутствие повара или плиты означает 0 без бесплатной покупки.
- Деньги, команда, мебель и выполненные задания не пересчитываются задним числом.
- `decorationRatingBonus` пересчитывается, а не мигрирует.
- `calendar.cycle` не участвует в daily: используется локальная `YYYY-MM-DD`.
- `questBaseline` заполняется один раз текущими `servedTotal`, `revenueTotal` и другими счётчиками; для вех не применяется.

### 4.4. Не сохранять

Открытые панели, поиск и страницу магазина, силуэты очереди, подсветку пика, кэши путей и производные `capacity/arrivalRate/throughput`.

### 4.5. Будущие проверки миграции

- Сейв без новых полей: пустая очередь и существующая кухня 1/1.
- Десять слотов дают все десять бонусов.
- `popularity: 47` → `470`, повторная загрузка не удваивает.
- Существующие гости не дублируются в очереди.
- Деньги, сотрудники, мебель и задания не меняются от самой миграции.

## 5. Открытые вопросы

1. **Веса `T_cook`:** вероятности текущего выбора блюд или равные веса доступных рецептов. Блокирует точную калибровку `throughput`: да; рекомендуется текущий выбор.
2. **Поток в HUD:** за 60 тиков или за тик. Блокирует реализацию: нет; рекомендуется за 60.
