# TECH-2 — `waitForTimeout` → `waitForFunction` в e2e

**Ветка:** `tech-2-waitfor-function`
**Файлы:** `e2e/progression.spec.ts`, `e2e/quest-lifecycle.spec.ts`

## Проблема

5 мест `await page.waitForTimeout(N)` — фиксированные задержки. Медленно (суммарно 4.6s на прогон), flaky (медленная машина → false negative, быстрая → false positive).

## Принцип замены

`waitForTimeout(N)` → `waitForFunction(predicate, arg, { timeout })`, где `predicate` проверяет **целевое состояние в localStorage** (игра сохраняется туда после тиков и действий).

Хелпер (уже есть в `quest-lifecycle.spec.ts`):
```typescript
async function readSave(page): Promise<SaveFile> {
  await page.waitForFunction(() => localStorage.getItem('moy-restoran:primary') !== null);
  return page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!));
}
```

## Замены (5 мест)

### 1. `e2e/progression.spec.ts:17` — `waitForTimeout(1000)`

**Контекст:** patch `experience=1799` → reload → Играть → level up → `expandBounds` добавляет `north-8`, `north-9` в `appliedWallpapers`.

**Замена:**
```typescript
await page.waitForFunction(() => {
  const save = JSON.parse(localStorage.getItem('moy-restoran:primary') || 'null');
  if (!save) return false;
  const ids = (save.state.appliedWallpapers || []).map((w: { wallCellId: string }) => w.wallCellId);
  return ids.includes('north-8') && ids.includes('north-9');
}, undefined, { timeout: 15000 });
```

### 2. `e2e/quest-lifecycle.spec.ts:44` — `waitForTimeout(500)`

**Контекст:** patch уже сохранил `quest-1` в `completedQuestIds`. После reload + Играть — ждём, что игра прочитала state.

**Замена:**
```typescript
await page.waitForFunction(() => {
  const save = JSON.parse(localStorage.getItem('moy-restoran:primary') || 'null');
  return save && Array.isArray(save.state.completedQuestIds)
    && save.state.completedQuestIds.includes('quest-1');
}, undefined, { timeout: 15000 });
```

### 3. `e2e/quest-lifecycle.spec.ts:69` — `waitForTimeout(800)`

**Контекст:** patch ставит `dailyQuestState.rewarded = true`. Ждём 1–2 тика, чтобы `processDailyQuest` точно запустился и пропустил награду.

**Замена:**
```typescript
const initialTick69 = ((await readSave(page)).state.tick as number) ?? 0;
await page.waitForFunction((t) => {
  const save = JSON.parse(localStorage.getItem('moy-restoran:primary') || 'null');
  return save && (save.state.tick as number) >= t;
}, initialTick69 + 2, { timeout: 15000 });
```

### 4. `e2e/quest-lifecycle.spec.ts:95` — `waitForTimeout(800)`

**Контекст:** после очистки state (`completedSideQuestIds = []`, `paintings = 0`) — ждём 2 тика для стабильности перед `readSave(coinsBefore)`.

**Замена:**
```typescript
const initialTick95 = ((await readSave(page)).state.tick as number) ?? 0;
await page.waitForFunction((t) => {
  const save = JSON.parse(localStorage.getItem('moy-restoran:primary') || 'null');
  return save && (save.state.tick as number) >= t;
}, initialTick95 + 2, { timeout: 15000 });
```

### 5. `e2e/quest-lifecycle.spec.ts:129` — `waitForTimeout(1500)`

**Контекст:** второй reload — `processSideQuests` не должен повторно начислить `decor-painting`. Нужно окно наблюдения ~30 тиков, чтобы баг (если есть) проявился.

**Замена:**
```typescript
const initialTick129 = ((await readSave(page)).state.tick as number) ?? 0;
await page.waitForFunction((t) => {
  const save = JSON.parse(localStorage.getItem('moy-restoran:primary') || 'null');
  return save && (save.state.tick as number) >= t;
}, initialTick129 + 30, { timeout: 15000 });
```

## Запреты (Kimi — только код)

- ❌ Не менять ассерты (`expect(...)`) — только заменить `waitForTimeout`
- ❌ Не менять `readSave` / `patchSave` (хелперы)
- ❌ Не трогать другие `waitForTimeout` (их в e2e нет)
- ❌ Не менять `expect.poll` / `waitForFunction` в других тестах
- ❌ Не трогать `src/*` — только 2 файла e2e

## Критерии готовности

- [ ] `waitForTimeout` в 2 файлах = **0** (grep подтверждает)
- [ ] `waitForFunction` добавлен в 5 местах
- [ ] `npx playwright test e2e/progression.spec.ts e2e/quest-lifecycle.spec.ts` — **5/5 зелёных** (1 + 3 + 1? — сверить счёт по факту)
- [ ] Время прогона этих 2 файлов **меньше** предыдущего (было ~45s из-за 4.6s waitForTimeout + инициализация)
- [ ] `git diff --stat` — только 2 файла e2e

## Если `waitForFunction` таймаутит

Не увеличивать `timeout` слепо. Причины:
- **saveGame не срабатывает на tick** → заменить predicate на action-триггер (например, `page.evaluate` вызвать сохранялку явно, если есть API)
- **Неправильный predicate** → пришли `git diff`, разбор

Fallback: `expect.poll(async () => predicate, { timeout: 15000 }).toBe(true)` — лучшая диагностика.