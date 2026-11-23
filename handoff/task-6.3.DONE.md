# LOGIC-6.3 — финал LOGIC-6 (e2e-lifecycle + handoff + чистка)

Предусловие: `handoff-state.md`, Шаг 0 (§13), приёмка (§12).

## 1. Scope

6.1b / 6.1c / 6.2 закрыты. 6.3 — финальная проверка цепочки квестов.

### 1.1 — `e2e/quest-lifecycle.spec.ts` (new) — 3 кейса

**Кейс 1: Главный → Side разблокируется.**
- На старте `economy-revenue` (dependsOn `quest-1`) в `.is-locked`
- Выполнить `quest-1` (1 гость обслужен) — через `page.evaluate` обновить `state.servedTotal = 1` и вызвать `processProgression`
- Открыть панель → `economy-revenue` больше не `.is-locked`

**Кейс 2: Daily идемпотентен.**
- `state.dailyQuestState.id` уже выбран на сегодня (через `selectDailyQuest`)
- Выполнить daily (например, `servedTotal >= target`)
- Панель → `.daily-quest-item.is-complete`, `rewarded: true`
- Повторный `processDailyQuest` → награда один раз

**Кейс 3: Side награда один раз.**
- `completedSideQuestIds` пуст
- Выполнить `decor-painting` (1 картина)
- `processSideQuests` → `+200` (или cap ×0.8, если дешёвая)
- Повторный `processSideQuests` → награда не растёт

### 1.2 — Handoff финал

- §2 / §5 обновлены (после 6.3)
- `task-6.3.md` → `task-6.3.DONE.md`

### 1.3 — Чистка веток (опционально)

```cmd
:: Проверка перед удалением (урок 1)
git diff main...logic-6.2-quest-panel --stat
git log main..logic-6.2-quest-panel --oneline

:: Если пусто (влито):
git branch -d logic-6.2-quest-panel
git branch -d logic-7-chefs
git branch -d logic-5.1-hud
git branch -d logic-1-v3-specs logic-2-peak logic-3-queue logic-4a-arrival-rate logic-4b-popularity-scale
git branch -d wip-overnight-2026-11-18

:: master — отдельное решение (реликт, 0bf062a)
```

## 2. Не трогать

- `src/content/quests.ts` / `sideQuests.ts` / `dailyQuests.ts` — контракт
- `src/simulation/questProgress.ts` — работает
- `src/ui/questPanel.ts` — 6.2 закрыт, 5/5 e2e
- `tests/chef-stove-binding.test.ts` — 17 тестов, LOGIC-7
- `progression.ts` / `shopPanel.ts` — фиксы `a8bd970` (урок Kimi)

## 3. TDD-порядок

1. Красные тесты `e2e/quest-lifecycle.spec.ts` (3 кейса)
2. `npx playwright test e2e/quest-lifecycle.spec.ts` → красный
3. Реализация — если что-то не работает, чинить `questProgress.ts` **только** если баг реальный, не подгонять (урок 8)
4. Зелёный: 3/3
5. Полный: `npm test` 325/325, `npx playwright test` 53/53, build ✅
6. Коммит: `test(e2e): LOGIC-6.3 - quest lifecycle integration`
7. Merge `--no-ff` → `npm test` на main → build → push (урок 14)

## 4. Критерии готовности

- [ ] `e2e/quest-lifecycle.spec.ts` — 3+ кейса
- [ ] `npm test` 325/325
- [ ] `npx playwright test` **53/53** (50 + 3)
- [ ] `npm run build` ✅
- [ ] Handoff синхронизирован
- [ ] origin/main = local main
- [ ] (опционально) ветки почищены, `diff`+`log` подтвердил «влито»

## 5. После 6.3 — LOGIC-6 закрыт полностью

Дальше:
- TECH-1 (интеграционные тесты мебели) — бэклог
- TECH-2 / TECH-3 (техдолг e2e, `waitForFunction` вместо `waitForTimeout`) — бэклог
- Чистка веток — если не в 6.3, то сразу после
- seatRate 0.0556 — backlog, не трогать