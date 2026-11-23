# CURRENT — Restaurant City

**Обновлено:** 2026-11-23
**Сессия:** DeepSeek (архитектор/ревью) + Kimi Code (исполнитель) + пользователь (git)

## Где мы

Cleanup ✅, TECH-4 ✅, TECH-5 ✅ — все в main. 334/334 unit, 53/53 e2e, build ✅.
Следующий блок: **TECH-1 / TECH-2 / TECH-3** или **новая фича** (по решению пользователя).

## Текущая задача

Не выбрана. Варианты из бэклога:
- **TECH-1** — интеграционные тесты мебели (FurnitureKind × placement), только непокрытое
- **TECH-2** — `progression.spec.ts` `waitForTimeout` → `waitForFunction` (паттерн из `quest-lifecycle.spec.ts` test 3)
- **TECH-3** — `catalog-decorations.spec.ts:50` — `toBeLessThanOrEqual` ослаблен из-за фоновых квестов
- **TECH-5.1** — e2e для плотной планировки, если появится `__gameState`
- **Новая фича** — по решению пользователя

## Последние коммиты

23efd79 test: TECH-5 - dense layout 4 tables + 12 chairs with passability
ef9fd61 docs: add TECH-5 furniture layout task
4a27afe docs: TECH-4 done, TECH-5 next
8d2b1e0 feat(movement): TECH-4 - passability matrix; leave guests don't block staff
01e9a95 docs: add TECH-4 movement task

## Состояние

- main = origin/main = 23efd79
- Ветки: main, master
- Теги: `archive/*` (10)
- Unit: 334/334, e2e: 53/53, build ✅
- git status: clean

## Что дальше

1. Пользователь выбирает: TECH-1 / TECH-2 / TECH-3 / новая фича
2. DeepSeek создаёт task-файл
3. Kimi Code выполняет по фазам 0–4
4. DeepSeek ревьюит, пользователь коммитит

## Блокеры

Нет.