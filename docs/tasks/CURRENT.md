# CURRENT — Restaurant City

**Обновлено:** 2026-11-23
**Сессия:** DeepSeek (архитектор/ревью) + Kimi Code (исполнитель) + пользователь (git)

## Где мы

TECH-4 (проходимость) закрыт: `8d2b1e0`, 331/331 unit, e2e 53/53. Cleanup закрыт.
Следующая задача: **TECH-5 — расстановка мебели с проходами** (unit + e2e).

## Текущая задача

**TECH-5: расстановка мебели с проходами**
- Схема: 2 single + 4 chair (по 2 к каждому), 2 double + 8 chair (по 4 к каждому двойному). Итого 4 стола, 12 стульев.
- Расширение: `state.level = 5; processProgression(state)` (8×8 → 10×10, авто). Кнопку +50 000 не трогать.
- Unit: `tests/furniture-layout-passability.test.ts` — расстановка + `advanceSimulation(600)` + `servedTotal > 0`, нет «застрявших».
- E2E: `e2e/furniture-layout.spec.ts` — `page.evaluate` через `patchSave`/`__gameState`, не клики по +50 000.
- Статус: не начата
- Task-файл: `docs/tasks/TECH-5-furniture-layout.md` (создать перед стартом)

## Последние коммиты

8d2b1e0 feat(movement): TECH-4 - passability matrix; leave guests don't block staff
01e9a95 docs: add TECH-4 movement task
08cf780 docs: update CURRENT after cleanup
42ec363 merge: LOGIC-6.3 quest lifecycle e2e
27663c9 test(e2e): LOGIC-6.3 — quest lifecycle integration

## Состояние

- main = origin/main = 8d2b1e0
- Ветки: main, master
- Теги: `archive/*` (10)
- Unit: 331/331, e2e: 53/53, build ✅
- git status: clean

## Что дальше

1. Создать task-файл TECH-5 (DeepSeek даст текст)
2. TECH-5 через Kimi Code (Phase 0–4)
3. TECH-1/2/3 — по решению пользователя

## Блокеры

Нет.