## Состояние на 2026-11-19 (после сессии LOGIC-6.1a)

- main: HEAD `284a821` (6.1a), 2 коммита ahead of origin/main (`64f4798`).
  - `d5d2a87` — docs: LOGIC-6 spec + decisions Q1-Q3 (6.0)
  - `284a821` — feat: questBaseline + migration (6.1a)
- Тесты: unit **296/296** (+4 `tests/questBaseline.test.ts`), build ✅.
  E2E 45/45 не прогонялись в этой сессии — прогнать перед push.
- Ветки: `logic-5.1-hud @ 77d8640` (влита), `logic-1…4b` (влиты),
  `wip-overnight-2026-11-18 @ 11b3427` (влита), `master @ 0bf062a` (реликт).
  Все — кандидаты на пакетную чистку после LOGIC-7.

## LOGIC-5.1 — закрыт (64f4798)

Регрессия «свободно/лимит» в HUD исправлена через `formatGuestsStat`
(`src/ui/hudFormat.ts` + 3 unit + e2e-ассерт). «3 правки» из ранней
формулировки не подтвердились источниками — сделана 1, остальное в backlog
(5.2). `ratingTrend`, `hud-metrics`, `hud-queue-indicator` проверены: готовы,
покрыты CSS + e2e + unit.

## LOGIC-6 (quest-rework) — В РАБОТЕ

Источник истины: `docs/quest-rework-spec.md` (финальная редакция).
Обёртка + разбиение: `docs/tasks/LOGIC-6.md`.

- **6.0** ✅ `d5d2a87` — спека + решения Q1-Q3 (A/A/A)
- **6.1a** ✅ `284a821` — `questBaseline` (14 полей) + миграция + 4 теста
- **6.1b** ⏳ СЛЕДУЮЩИЙ — 18 side quests (`docs/quest-rework-spec.md` §4)
- **6.1c** ⏳ — 6 daily quests (§5) + `selectDailyQuest(date)` + `peakQuestTotals`
- **6.2** ⏳ — UI в `questPanel.ts` (секции «Побочные»/«Ежедневные»)
- **6.3** ⏳ — e2e полный цикл + финализация + push origin/main

## Следующее после LOGIC-6

- **LOGIC-7** — найм поваров 3/3 (цепочка 1/1 → 2/2 @15 → 3/3 @25, §6 спеки).
  Контракт: `tests/chef-stove-binding.test.ts` (13 тестов) не трогать.
- **TECH-1** (бэклог) — интеграционные тесты на покупку мебели.
- **seatRate = 0.0556** на 1 стуле (~14 тиков) — backlog, не «оптимизировать».