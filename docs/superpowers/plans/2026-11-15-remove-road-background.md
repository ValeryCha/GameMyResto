# Remove Road Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Полностью удалить дорогу, разметку, зебру, тротуар, бордюры и придорожные фонари, сохранив нейтральный газон, растения, скамейку и всю игровую логику.

**Architecture:** Сохранить чистый интерфейс `createRestaurantEnvironment(width: number, height: number): THREE.Group` и существующий жизненный цикл `RestaurantWorld`. Из генератора окружения удаляются только дорожные объекты, их размеры и придорожные фонари; однотонный газон `0x70a84f` и группа `landscaping` остаются.

**Tech Stack:** TypeScript, Three.js, Vitest, Playwright, Vite.

## Global Constraints

- Не переписывать игровую логику и не менять формат или содержимое `localStorage`.
- Не менять сетку, коллизии, маршруты, появление гостей, дверь, мебель, меню, редактор и координатные функции.
- Не добавлять внешние ассеты, сетевые запросы, зависимости, новые сложные фоны, градиенты или текстуры.
- Сохранить газон `0x70a84f`, деревья, кусты, скамейку, цвет сцены и туман `0xb9d9c2`.
- Поддерживать начальное поле 8×8, расширения +2×2, десктоп и вертикальный мобильный экран 390×844.
- Код и имена переменных — на английском; пользовательские пояснения — на русском.
- Не включать существующие unrelated untracked-файлы в коммиты.
- После проверок не оставлять временный dev server запущенным.

---

### Task 1: Регрессионный тест и удаление дорожного генератора

**Files:**
- Modify: `tests/environment3d.test.ts:5-19`
- Modify: `src/render3d/environment.ts:14-20,35-81`
- Inspect without changes: `src/render3d/RestaurantWorld.ts:67-69,264-276`
- Reference: `docs/superpowers/specs/2026-11-15-remove-road-background-design.md`

**Interfaces:**
- Consumes: `box`, `cylinder`, `sphere` из `src/render3d/materials.ts`.
- Produces: неизменная сигнатура `createRestaurantEnvironment(width: number, height: number): THREE.Group`; `userData` содержит только `width`, `height`, `groundWidth`, `groundDepth`; дочерняя группа `landscaping` сохраняется, группы `roads` и `sidewalks` отсутствуют.

- [ ] **Step 1: Write the failing regression test**

Полностью заменить `tests/environment3d.test.ts` на:

```ts
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createRestaurantEnvironment } from '../src/render3d/environment';

describe('restaurant environment', () => {
  it('удаляет дорожный фон и масштабирует нейтральное окружение вместе с залом', () => {
    const initial = createRestaurantEnvironment(8, 8);
    const expanded = createRestaurantEnvironment(12, 12);
    expect(initial).toBeInstanceOf(THREE.Group);
    expect(initial.getObjectByName('roads')).toBeUndefined();
    expect(initial.getObjectByName('sidewalks')).toBeUndefined();
    expect(initial.getObjectByName('landscaping')).toBeInstanceOf(THREE.Group);
    expect(initial.userData).not.toHaveProperty('roadLengthX');
    expect(initial.userData).not.toHaveProperty('roadLengthZ');
    expect(initial.userData.groundWidth).toBe(24);
    expect(initial.userData.groundDepth).toBe(24);
    expect(expanded.userData.groundWidth).toBe(28);
    expect(expanded.userData.groundDepth).toBe(28);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/environment3d.test.ts`

Expected: FAIL на `expect(initial.getObjectByName('roads')).toBeUndefined()`, потому что текущая реализация возвращает группу `roads`. Не переходить дальше, если тест не воспроизводит наличие дороги.

- [ ] **Step 3: Remove the road and its related objects**

Полностью заменить `src/render3d/environment.ts` на следующий код. Он сохраняет существующие модели и координаты, удаляя только `addLamp`, дорожные размеры, `roads`, `sidewalks` и создание фонарей:

```ts
import * as THREE from 'three';
import { box, cylinder, sphere } from './materials';

function addTree(parent: THREE.Group, x: number, z: number, scale = 1): void {
  const tree = new THREE.Group();
  cylinder(tree, 0.15 * scale, 1.25 * scale, [0, 0.63 * scale, 0], 0x725039);
  sphere(tree, 0.72 * scale, [0, 1.55 * scale, 0], 0x3d7d42, [0.9, 1.05, 0.9]);
  sphere(tree, 0.5 * scale, [0.42 * scale, 1.45 * scale, 0], 0x4d914c);
  sphere(tree, 0.48 * scale, [-0.35 * scale, 1.5 * scale, 0.12 * scale], 0x478947);
  tree.position.set(x, -0.4, z);
  parent.add(tree);
}

function addBench(parent: THREE.Group, x: number, z: number): void {
  const bench = new THREE.Group();
  for (const localZ of [-0.2, 0, 0.2]) box(bench, [1.45, 0.09, 0.15], [0, 0.48, localZ], 0x9a673d);
  for (const localY of [0.78, 1.0]) box(bench, [1.45, 0.15, 0.08], [0, localY, 0.28], 0x9a673d);
  for (const localX of [-0.55, 0.55]) {
    box(bench, [0.09, 0.48, 0.09], [localX, 0.24, 0], 0x4b5553);
    box(bench, [0.09, 0.72, 0.09], [localX, 0.58, 0.28], 0x4b5553);
  }
  bench.position.set(x, -0.4, z);
  parent.add(bench);
}

export function createRestaurantEnvironment(width: number, height: number): THREE.Group {
  const group = new THREE.Group();
  const offsetX = (width - 8) / 2;
  const offsetZ = (height - 8) / 2;
  const groundWidth = width + 16;
  const groundDepth = height + 16;
  group.userData = { width, height, groundWidth, groundDepth };

  box(group, [groundWidth, 0.16, groundDepth], [offsetX, -0.5, offsetZ], 0x70a84f);

  const landscaping = new THREE.Group();
  landscaping.name = 'landscaping';
  addTree(landscaping, width - 2.7, -1.8, 0.9);
  addTree(landscaping, width - 2.5, height - 5.2, 1.05);
  addTree(landscaping, -1.5, height - 2.6, 0.85);
  for (const [x, z] of [[width - 3.2, 0.8], [1.2, height - 3.1], [width - 4.1, height - 2.7]] as const) {
    sphere(landscaping, 0.48, [x, 0.05, z], 0x398141, [1.15, 0.85, 1]);
  }
  addBench(landscaping, offsetX + 1.2, height - 2.5);
  group.add(landscaping);
  return group;
}
```

Не менять `RestaurantWorld.ts`: прежний вызов и пересоздание группы при расширении продолжают работать.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npx vitest run tests/environment3d.test.ts`

Expected: 1 test file PASS, 1 test PASS.

- [ ] **Step 5: Check for remaining executable road references**

Run: поиск по `src` регулярного выражения `roadLength|roads|sidewalks|addLamp`; отдельно проверить тот же шаблон в `tests`.

Expected: в `src` совпадений нет. В `tests/environment3d.test.ts` допустимы только строковые литералы `roads` и `sidewalks` внутри отрицательных проверок `toBeUndefined()`; `roadLength` и `addLamp` отсутствуют. Исторические упоминания в `docs` не удалять: они описывают прежние решения и не создают объекты в игре.

- [ ] **Step 6: Run all unit tests and the production build**

Run: `npm test && npm run build`

Expected: 21 test file PASS, 82 tests PASS; TypeScript и Vite build завершаются с exit code 0. Предупреждение Vite о размере существующего бандла не относится к этой задаче и не требует рефакторинга.

- [ ] **Step 7: Commit the focused fix**

```bash
git add -- src/render3d/environment.ts tests/environment3d.test.ts
git commit -m "fix: remove restaurant road background"
```

Expected: коммит содержит только два файла реализации и теста.

---

### Task 2: Браузерная, визуальная и итоговая проверка

**Files:**
- Inspect generated screenshots: `artifacts/restaurant-3d-initial.png`
- Inspect generated screenshots: `artifacts/restaurant-3d-mobile.png`
- Inspect generated screenshots: `artifacts/restaurant-progression-mobile.png`
- Inspect generated screenshots: `artifacts/restaurant-guest-seated.png`
- Inspect generated screenshots: `artifacts/restaurant-ai-delivered.png`
- Inspect generated screenshots: `artifacts/restaurant-editor.png`
- Inspect generated screenshots: `artifacts/restaurant-shop-furniture.png`
- Verify without edits: `src/render3d/RestaurantWorld.ts`
- Verify without edits: `src/simulation/tick.ts`

**Interfaces:**
- Consumes: изменённый `createRestaurantEnvironment()` из Task 1 и существующие Playwright webServer configuration.
- Produces: подтверждение отсутствия дорожного фона и сохранения игровых сценариев без изменения интерфейсов или сохранений.

- [ ] **Step 1: Run all browser scenarios**

Run: `npm run test:e2e`

Expected: 7 tests PASS. Сценарии подтверждают появление и посадку гостя, работу повара и официанта, редактирование мебели, меню, магазин, прогресс, расширение и сохранение после перезагрузки. Playwright останавливает свой временный server после прогона.

- [ ] **Step 2: Check screenshot sizes before opening them**

Run в Git Bash:

```bash
powershell.exe -NoProfile -Command 'Get-Item artifacts/restaurant-3d-initial.png,artifacts/restaurant-3d-mobile.png,artifacts/restaurant-progression-mobile.png,artifacts/restaurant-guest-seated.png,artifacts/restaurant-ai-delivered.png,artifacts/restaurant-editor.png,artifacts/restaurant-shop-furniture.png | Select-Object Name,Length'
```

Expected: все файлы существуют. Перед `ReadMediaFile` каждый файл должен быть не больше 3 MB; более крупный файл сначала уменьшить во временную копию в workspace, не перезаписывая оригинал.

- [ ] **Step 3: Inspect desktop, mobile and expansion visuals**

Открыть перечисленные снимки через `ReadMediaFile` после проверки размеров.

Expected:

- асфальт, пунктир, зебра, тротуар, бордюры и придорожные фонари отсутствуют;
- на их месте виден однотонный газон, деревья, кусты и скамейка сохранены;
- стены, дверь, плита, стойка, столы, стулья, гости и персонал остаются на прежних игровых позициях;
- после расширения дорожные объекты не появляются повторно;
- мобильный экран 390×844 сохраняет доступные кнопки и читаемый ресторан;
- магазин, прогресс и редактор не перекрываются дорожным фоном.

Если снимок выявляет оставшийся дорожный объект, вернуться к поиску его источника и не добавлять декоративную маскировку.

- [ ] **Step 4: Verify final diff and temporary server cleanup**

Run:

```bash
git status --short --branch
git diff --check
git show --stat --oneline HEAD
powershell.exe -NoProfile -Command 'if (Get-NetTCPConnection -LocalPort 7100 -LocalAddress 127.0.0.1 -State Listen -ErrorAction SilentlyContinue) { Write-Output "Temporary test server is still listening"; exit 1 } else { Write-Output "No temporary test server on 127.0.0.1:7100" }'
```

Expected: `git diff --check` без ошибок; последний кодовый коммит содержит только `src/render3d/environment.ts` и `tests/environment3d.test.ts`; временного сервера на `127.0.0.1:7100` нет. Существующие unrelated untracked-файлы остаются неучтёнными. Отдельный ранее запущенный предпросмотр исходного проекта на `::1` не останавливать.

- [ ] **Step 5: Report the verified result**

В ответе явно перечислить найденные и удалённые элементы, нейтральный фон `0x70a84f`, неизменённые связи с симуляцией и `localStorage`, результаты 82 unit tests, 7 browser tests, сборки и визуальной проверки. Дать ссылку предпросмотра для `C:\KimiProject\Мини игра`; не запускать постоянный фоновый сервер из сессии.
