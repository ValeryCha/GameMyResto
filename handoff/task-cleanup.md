# Cleanup — пакетная чистка веток после LOGIC-6 + LOGIC-7

Предусловие: `handoff-state.md`, Шаг 0 (§13), приёмка (§12).

## 1. Цель

Удалить влитые ветки, освободить место в `git branch`, уменьшить путаницу.

## 2. Кандидаты на удаление (проверить каждую — урок 1)

| Ветка | Коммит | Ожидание |
|---|---|---|
| logic-1-v3-specs | a43e5a6 | влит |
| logic-2-peak | 2581776 | влит |
| logic-3-queue | 0d464b7 | влит |
| logic-4a-arrival-rate | 374fbcf | влит |
| logic-4b-popularity-scale | b6776d6 | влит |
| logic-5.1-hud | 77d8640 | влит |
| logic-6.2-quest-panel | 8a802af | влит |
| logic-6.3-lifecycle | 27663c9 | влит |
| logic-7-chefs | a8bd970 | влит |
| wip-overnight-2026-11-18 | 11b3427 | влит |
| **master** | 0bf062a | **реликт — решить судьбу отдельно** |

## 3. Проверка перед удалением (для каждой ветки)

```cmd
git diff main...<branch> --stat
git log main..<branch> --oneline
```

**Оба вывода пустые** = ветка полностью влита. Удалять безопасно.

**Если что-то не пусто** — стоп, разбираться. Не удалять.

## 4. Удаление (после проверки)

```cmd
git branch -d logic-1-v3-specs
git branch -d logic-2-peak
git branch -d logic-3-queue
git branch -d logic-4a-arrival-rate
git branch -d logic-4b-popularity-scale
git branch -d logic-5.1-hud
git branch -d logic-6.2-quest-panel
git branch -d logic-6.3-lifecycle
git branch -d logic-7-chefs
git branch -d wip-overnight-2026-11-18
```

`-d` (не `-D`) — безопасно, откажет если не влито.

## 5. `master` — отдельное решение

`master @ 0bf062a` — старая база, расходится с main. Варианты:
- **A:** удалить (`git branch -D master`) — если точно не нужен
- **B:** оставить как архив
- **C:** слить с main (`git merge master` — вероятно, конфликты)

Решить с пользователем **до** удаления.

## 6. Критерии готовности

- [ ] Каждая ветка проверена `diff`+`log` (пусто)
- [ ] Удалено 10 веток (или сколько подтверждено)
- [ ] `master` — судьба решена
- [ ] `git branch -v` — осталось `main` (+ возможно `master`)
- [ ] `git status` — clean
- [ ] Handoff §2 обновлён (ветки удалены)