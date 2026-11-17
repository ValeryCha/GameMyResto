# Shop Iconography and HUD Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Заменить символы на узнаваемые SVG-пиктограммы, выровнять карточки магазина и кнопки верхней панели на десктопе и телефоне.

**Architecture:** Отдельный модуль `icons.ts` создаёт декоративные inline SVG из статической локальной карты. Магазин сохраняет существующие callbacks и доступные имена, но разделяет иконку, текст, состояние и цену. HUD переводится с инлайн-стилей на адаптивные CSS-классы и равную сетку команд.

**Tech Stack:** TypeScript, DOM API, inline SVG, CSS Grid, Vitest, Playwright.

## Global Constraints

- Не добавлять внешние изображения, icon fonts и зависимости.
- Сохранить существующие callback-и, цены, блокировки и доступные имена кнопок.
- Все декоративные SVG имеют `aria-hidden="true"`.
- На ширине 390 px не должно быть горизонтального переполнения.
- Не откатывать unrelated-изменения и не выполнять `git commit` без отдельной просьбы пользователя.

---

### Task 1: Единый набор SVG-иконок

**Files:**
- Create: `src/ui/icons.ts`
- Modify: `src/ui/shopPanel.ts`
- Test: `tests/shopPanel.test.ts`

**Interfaces:**
- Produces: `ICON_NAMES: readonly string[]`, `IconName`, `createIcon(name: IconName, className?: string): SVGSVGElement`.
- Consumes: существующие `ShopItem.icon` и `SHOP_CATEGORIES`.

- [x] **Step 1: Написать failing-тест набора иконок**

В `tests/shopPanel.test.ts` импортировать `ICON_NAMES` и заменить проверку отсутствия emoji на:

```ts
expect([...SHOP_CATEGORIES, ...SHOP_ITEMS].every((item) => ICON_NAMES.includes(item.icon))).toBe(true);
expect(new Set(SHOP_ITEMS.map((item) => item.icon)).size).toBe(SHOP_ITEMS.length);
```

- [x] **Step 2: Подтвердить красный результат**

Run: `npx vitest run tests/shopPanel.test.ts`
Expected: FAIL, модуль `icons.ts` отсутствует.

- [x] **Step 3: Реализовать статические SVG**

Создать `icons.ts` с именами `kitchen`, `hall`, `staff`, `speed`, `counter`, `waiter`, `training`, `table`, `tableDouble`, `chair`, `plant`, `door`, `guest`, `expand`, `gift`, `coins`, `shop`, `editor`, `progress`, `menu`, `lock`. Для каждого имени задать SVG-содержимое из `<path>`, `<rect>`, `<circle>` и `<line>` с `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.8"`, округлыми окончаниями линий. Экспортировать:

```ts
export function createIcon(name: IconName, className = ''): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', className);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML = ICON_MARKUP[name];
  return svg;
}
```

Типизировать `ShopItem.icon` и иконки категорий как `IconName`, назначить каждому предмету собственное имя из набора.

- [x] **Step 4: Подтвердить зелёный результат**

Run: `npx vitest run tests/shopPanel.test.ts`
Expected: PASS.

### Task 2: Карточки магазина

**Files:**
- Modify: `src/ui/shopPanel.ts`
- Modify: `src/ui/shopPanel.css`
- Test: `e2e/progress.spec.ts` и существующие сценарии магазина

**Interfaces:**
- Consumes: `createIcon`, `IconName`.
- Produces: карточка с `.shop-item__icon`, `.shop-item__content`, `.shop-item__label`, `.shop-item__meta`, `.shop-item__price`.

- [x] **Step 1: Добавить структуру вместо textContent**

Для каждой покупки создать `iconWrap`, `content`, `label`, `meta`, `price`; добавить их в кнопку и сохранить в коллекции элементов. При обновлении менять только текст и состояние. Иконку заменять на `lock` только при изменении состояния блокировки. Устанавливать прежний доступный `aria-label`:

```ts
const accessibleLabel = `${item.label}${level}${status}`;
button.setAttribute('aria-label', accessibleLabel);
label.textContent = item.label;
meta.textContent = item.upgrade ? `${state.upgrades[item.upgrade]}/2${locked ? ` · Нужен ${UPGRADE_LEVELS[item.upgrade]} уровень` : maxed ? ' · Максимум' : ''}` : '';
price.textContent = maxed ? 'Максимум' : `${priceValue} монет`;
```

Заголовки категорий, ежедневная награда и тестовые монеты получают SVG через `createIcon`; убрать emoji из текста.

- [x] **Step 2: Стилизовать ровную сетку**

Задать `.shop-item` как `display:grid; grid-template-columns:44px minmax(0,1fr) auto; align-items:center; min-height:66px; gap:10px`. Иконка — плашка 40×40 px, цена — несжимаемый ярлык. Добавить категорийные оттенки через классы секций, спокойный hover, disabled без трансформации. На узком экране сохранить трёхколоночную сетку и разрешить перенос длинного названия.

- [x] **Step 3: Проверить модульные тесты и сценарии**

Run: `npx vitest run tests/shopPanel.test.ts && npx playwright test e2e/shop.spec.ts e2e/ai.spec.ts`
Expected: модульные тесты и 3 браузерных сценария PASS.

### Task 3: Верхняя панель и визуальная проверка

**Files:**
- Modify: `src/ui/hud.ts`
- Modify: `src/ui/styles.css`
- Test: `e2e/progress.spec.ts`

**Interfaces:**
- Consumes: `createIcon`.
- Produces: `.hud-panel`, `.hud-status`, `.hud-actions`, `.hud-action`.

- [x] **Step 1: Собрать равную сетку команд**

Убрать инлайн-стили корня, текста и кнопок. Создать контейнер `div.hud-actions`; четыре кнопки получают класс `hud-action`, SVG и подпись. CSS:

```css
.hud-actions { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-top:12px; }
.hud-action { display:flex; align-items:center; justify-content:center; gap:6px; min-width:0; min-height:42px; }
@media (max-width:600px) { .hud-actions { grid-template-columns:repeat(2,minmax(0,1fr)); } }
```

Добавить остальные классы панели с текущей кремовой палитрой и равными отступами. Подсказка размещения остаётся под сеткой.

- [x] **Step 2: Проверить браузером оба размера**

Запустить временный сервер на 127.0.0.1:7100 только если порт свободен; не останавливать сервер, принадлежащий Kimi Work. Через Playwright открыть магазин на 1280×800 и 390×844, сохранить снимки в `artifacts/`, проверить `document.documentElement.scrollWidth <= window.innerWidth`, видимость SVG, количество `.hud-action`, отсутствие ошибок страницы и failed requests. Прочитать снимки и исправить визуальные дефекты через failing-проверку, если они затрагивают структуру.

- [x] **Step 3: Полная регрессия**

Run: `npm test && npm run build && npm run test:e2e`
Expected: все модульные тесты PASS, сборка exit 0, все браузерные сценарии PASS.

- [x] **Step 4: Завершение**

Удалить временные диагностические скрипты, остановить только самостоятельно запущенный сервер. В ответе указать корень проекта и стандартную ссылку предпросмотра.
