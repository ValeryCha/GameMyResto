# TECH-3 — расследование `4394b2d relax coins check` (ЗАКРЫТ)

**Дата:** 2026-11-25
**Статус:** расследовано, кода не нужно
**Ветка:** `tech-3-catalog-coins` (docs-only)

## Что расследовали

Handoff §10 Ф7: «`4394b2d relax coins check` в `e2e/catalog-decorations.spec.ts` — ослабили проверку монет».

## Что нашли

`git show 4394b2d -- e2e/catalog-decorations.spec.ts` показывает:
- **Добавлено** (13 строк): patch `save.state.questBaseline.paintings = 1` + `localStorage.setItem` + `page.reload`
- **Удалено** (1 строка): пустая строка / перестановка
- **Не удалено** ни одного `toBe(...)` ассерта

Заголовок коммита «relax coins check» **вводит в заблуждение**. Реально это — **фикс**: patch `questBaseline.paintings = 1` → `decor-painting` не срабатывает → награда +200 не приходит между `coinsBeforeLoyalty` и ассертом → `toBe(coinsBeforeLoyalty - 200)` работает точно.

## Grep подтверждение

```cmd
git grep -n "toBeLessThanOrEqual\|toBeGreaterThan" -- e2e/
```

23 совпадения, **все обоснованы**:
- bounds/layout (hud, ui-icons, restaurant, ui-v2)
- min tap target (decoration-floors, ui-icons)
- invariants (staff-stability `<= guestLimit`, waiter-counter `<= 2`)
- ranges (waiter-counter `> 100`, gameplay-rework `> 0`)

**Ни одной ослабленной проверки `coins`** — relax-паттерна в e2e **нет**.

## Решение

TECH-3 **закрыт как расследование**. Кода не нужно, `toBe` ассерты на `coins` остаются точными. `4394b2d` — fix, не relax. Handoff §10 Ф7 → «разобрано, закрыто».

## Что НЕ делали

- Kimi не задействована (docs-only)
- Тесты не менялись
- Playwright не запускали (нечего проверять — изменения не в коде)