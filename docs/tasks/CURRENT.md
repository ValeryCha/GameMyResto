# CURRENT — Restaurant City

**Обновлено:** 2026-11-23
**Сессия:** DeepSeek (архитектор/ревью) + Kimi Code (исполнитель) + пользователь (git)

## Где мы

Cleanup ✅, TECH-4 ✅, TECH-5 ✅ — все в main (`887e594`). Unit 334/334, e2e 53/53, build ✅.
Следующий блок: **TECH-3 → TECH-2 → TECH-1** (порядок зафиксирован пользователем).

## Порядок задач (C → B → A)

| # | Задача | Оценка | Статус |
|---|---|---|---|
| 1 | **TECH-3** — `catalog-decorations.spec.ts:50` — убрать ослабленный `toBeLessThanOrEqual` | 30 мин | ← следующий |
| 2 | **TECH-2** — `progression.spec.ts` — `waitForTimeout` → `waitForFunction` | 30 мин | после TECH-3 |
| 3 | **TECH-1** — интеграционные тесты мебели (FurnitureKind × placement) | 1–2 часа | после TECH-2 |

## Текущая задача

**TECH-3: catalog-decorations.spec.ts:50**
- Проблема: `toBeLessThanOrEqual` ослаблен из-за фоновых квестов, которые начисляют монеты во время теста.
- Правильное решение: либо выключить фоновые квесты в этом тесте через `state.completedSideQuestIds`, либо явно `page.evaluate` заморозить `coins`.
- Файлы: `e2e/catalog-decorations.spec.ts` (только тест).
- Статус: не начата.
- Task-файл: `docs/tasks/TECH-3-catalog-coins.md` (создать перед стартом).

## Структура работы с Kimi Code

На каждую задачу:
1. **DeepSeek** создаёт `docs/tasks/TASK-XXX.md` — промпт с Phase 0–4, контекстом, критериями.
2. **Пользователь** отправляет в Kimi Code: «Прочитай `docs/tasks/TASK-XXX.md`, начни с Phase 0. После Phase 1 — СТОП, жди "продолжай"».
3. **Kimi Code** проходит Phase 0 (git status + npm test) → СТОП, присылает вывод.
4. **DeepSeek** проверяет базу. Если ок — «продолжай».
5. **Kimi Code** делает Phase 1 (инвентаризация через `git grep`, таблица) → СТОП, присылает таблицу.
6. **DeepSeek** проверяет таблицу. Если ок — «продолжай».
7. **Kimi Code** делает Phase 2 (код) + Phase 3 (самоаудит через `git diff --stat`) + Phase 4 (тесты + отчёт по чек-листу).
8. **DeepSeek** ревьюит диффы, вывод тестов, чек-лист. Если ок — «принято».
9. **Пользователь** делает `git add` / `commit` / `push`.
10. **DeepSeek** обновляет handoff (§2, §3, §5, §8, §13, §14) + CURRENT.

**Правила:**
- Kimi Code не трогает git (только чтение).
- Запреты формулировать на функции, не на файлы.
- Phase 1 всегда с `git grep` — покрытие проверять, не по памяти.
- Полный `npx playwright test` не запускать (13+ минут), только релевантные спеки.
- Push = последний шаг, после полного e2e зелёного.

## Последние коммиты

887e594 docs: TECH-5 done, backlog next
23efd79 test: TECH-5 - dense layout 4 tables + 12 chairs with passability
ef9fd61 docs: add TECH-5 furniture layout task
4a27afe docs: TECH-4 done, TECH-5 next
8d2b1e0 feat(movement): TECH-4 - passability matrix; leave guests don't block staff

## Состояние

- main = origin/main = 887e594
- Ветки: main, master (архив)
- Теги: `archive/*` (10)
- Unit: 334/334, e2e: 53/53, build ✅
- git status: clean

## Что дальше

1. DeepSeek создаёт `docs/tasks/TECH-3-catalog-coins.md`
2. Kimi Code выполняет по фазам
3. Пользователь коммитит, DeepSeek обновляет handoff
4. После TECH-3 — TECH-2, потом TECH-1

## Блокеры

Нет.