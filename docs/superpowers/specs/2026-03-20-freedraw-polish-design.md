# Freedraw Polish & UX Improvements

**Date:** 2026-03-20 **Status:** Approved

## Overview

Четыре улучшения UX для freedraw и связанных инструментов: замыкание полигонов из линий, иконка миникарты, умное сглаживание с детекцией углов, и перемещение после спрямления.

---

## Task 1: Snap-to-first для замыкания полигона без grid snap

### Проблема

`isPathALoop` в `packages/element/src/utils.ts:469` требует попасть в `LINE_CONFIRM_THRESHOLD = 8px / zoomValue` от первой точки. С grid snap (20px сетка) курсор автоматически прыгает к первой точке. Без grid snap (дефолт: `gridSnapEnabled: false`) пользователь должен вручную попасть в 8px — практически невозможно на тач-устройствах.

> **Scope:** Это для инструмента Line (multi-click), не для Freedraw (у freedraw своё замыкание в Task 3).

### Решение

Добавить магнетизм к первой точке при рисовании линии:

1. **Магнитный порог:** `LINE_CLOSE_SNAP_THRESHOLD = 20` (scene-px). Следовать zoom-масштабированию существующего `LINE_CONFIRM_THRESHOLD`: `threshold / zoomValue`. При 1x zoom = 20px, при 4x = 5px, при 0.5x = 40px.
2. **Визуальная подсказка:** Рисовать кружок-индикатор на первой точке, когда курсор входит в зону магнетизма.
3. **Реализация:**
   - В `LinearElementEditor.handlePointerMove` (`packages/element/src/linearElementEditor.ts:291-343`): после вычисления нового положения trailing point, получить элемент через `elementId`, проверить расстояние trailing point до `element.points[0]` (в local coords). Конвертация: `firstPointGlobal = { x: element.x + element.points[0][0], y: element.y + element.points[0][1] }`, `trailingPointGlobal = { x: element.x + trailingPoint[0], y: element.y + trailingPoint[1] }`. Если `distance < LINE_CLOSE_SNAP_THRESHOLD / zoomValue` и `element.points.length >= 3` — заменить trailing point координаты на `element.points[0]`.
   - **Состояние для рендерера:** Добавить `showCloseIndicator: boolean` в `appState` (или вычислять в `_renderInteractiveScene` по расстоянию trailing point до first point). Рисовать полупрозрачный кружок радиусом ~6px на global-координатах первой точки в `_renderInteractiveScene` (`packages/excalidraw/renderer/interactiveScene.ts`), рядом с существующим рендерингом линейных элементов.

### Файлы

- `packages/element/src/linearElementEditor.ts` — магнетизм в handlePointerMove
- `packages/common/src/constants.ts` — `LINE_CLOSE_SNAP_THRESHOLD = 20`
- `packages/excalidraw/renderer/interactiveScene.ts` — визуальный индикатор
- `packages/excalidraw/appState.ts` — (опционально) `showCloseIndicator` state

---

## Task 2: Иконка миникарты — сложенная карта

### Проблема

Текущий `MinimapIcon` (`packages/excalidraw/components/icons.tsx:2744-2768`) — рамка + солнце + горы (пейзаж/фото). Не читается как "карта".

### Решение

Заменить SVG на сложенную карту (Google Maps стиль, вариант D):

```svg
<path d="M4 4.5 L8 3 L12 4.5 L16 3 L16 16.5 L12 18 L8 16.5 L4 18 Z" strokeWidth="1.25"/>
<line x1="8" y1="3" x2="8" y2="16.5" strokeWidth="1"/>
<line x1="12" y1="4.5" x2="12" y2="18" strokeWidth="1"/>
```

Три панели с зигзаг-складками. Использует `modifiedTablerIconProps` (20x20 viewBox, stroke="currentColor", no fill). Явно задать `strokeWidth` на элементах для консистентности с существующими иконками.

### Файлы

- `packages/excalidraw/components/icons.tsx` — заменить содержимое `MinimapIcon` (строки 2744-2768)

---

## Task 3: Умное сглаживание + замыкание для freedraw

### Проблема

Текущий `computeStraightenResult` (`packages/excalidraw/straighten.ts:102-147`) имеет два режима: прямая линия (deviation < 0.1) и moving average сглаживание. Нет:

- Детекции углов — moving average размывает острые углы
- Замыкания фигуры — если start≈end, straightening пропускается (`lineLen < 1`)

### Решение: Умное сглаживание

Заменить бинарный straight/smooth на новый flow:

### Порядок обработки в `computeStraightenResult`:

```
1. Если points.length < 2 → return null
2. Вычислить gapDist = distance(start, end), pathLen = pathLength(points)
3. Если gapDist < STRAIGHTEN_CLOSE_THRESHOLD И pathLen > STRAIGHTEN_CLOSE_THRESHOLD * 3:
   → Стянуть (ease-out), пометить isClosed = true
4. Пересчитать lineLen и deviation на (возможно стянутых) точках
5. Если НЕ isClosed И deviation / lineLen < 0.1:
   → Прямая линия (как сейчас)
6. Иначе → детекция углов → сглаживание сегментов
```

> **Важно:** Шаг 5 пропускается для замкнутых фигур — замкнутая фигура по определению не прямая линия. Это исключает деление на near-zero `lineLen` после стягивания.

#### Замыкание (стягивание)

- **Порог:** `STRAIGHTEN_CLOSE_THRESHOLD = 30` (фиксированный, scene-px).
- **Условие:** `gapDist < STRAIGHTEN_CLOSE_THRESHOLD` И `pathLen > STRAIGHTEN_CLOSE_THRESHOLD * 3`.
- **Метод:** Ease-out falloff `pull(t) = t²`:
  ```
  gap = end - start
  for i in 0..N:
    t = i / N
    point[i] -= t² * gap
  ```
  Start не двигается (pull(0)=0), end перемещается в start (pull(1)=1).

#### Детекция углов

- **Метод:** Для каждой точки `i`, вычислить два вектора направления:
  - `dirBefore` = направление от `point[i-W]` к `point[i]` (вектор нормализован)
  - `dirAfter` = направление от `point[i]` к `point[i+W]` (вектор нормализован)
  - Угол между ними: `angle = acos(dot(dirBefore, dirAfter))`
  - Если `angle > STRAIGHTEN_CORNER_ANGLE` (35° = ~0.61 rad) — точка `i` помечается как corner.
- **Окно:** `W = STRAIGHTEN_CORNER_WINDOW = 6` точек.
- **Границы:** Для `i < W` использовать `dirBefore` от `point[0]` к `point[i]`. Для `i > N-W` использовать `dirAfter` от `point[i]` к `point[N]`.
- **Замкнутые фигуры:** После стягивания `start == end`. Для точек у стыка (i < W или i > N-W) — wrap around: `dirBefore` для `i=2` использует `point[N-4]` → `point[2]`, и т.д. Это предотвращает шов.
- **Non-maximum suppression:** Если несколько соседних точек помечены как corner — оставить только точку с максимальным углом в окне ±W.

#### Сглаживание сегментов

- Разбить путь на сегменты между corner-точками.
- Для замкнутых фигур: corner-точка у стыка (если есть) разделяет wrap-around сегмент.
- Применить `smoothPoints(segment, radius=3)` к каждому сегменту. Corner-точки остаются на месте (start/end сегмента сохраняются в `smoothPoints`).
- Если замкнутая фигура и нет corners у стыка — использовать cyclic smoothing для последнего+первого сегмента: при вычислении moving average для точек у стыка, окно оборачивается через конец массива.
- Собрать сегменты обратно в единый массив. Количество точек = исходное.

### Константы

- `STRAIGHTEN_CLOSE_THRESHOLD = 30` — порог замыкания (px)
- `STRAIGHTEN_CORNER_WINDOW = 6` — размер окна детекции углов (точек в каждую сторону)
- `STRAIGHTEN_CORNER_ANGLE = 35` — порог угла (градусы)

### Файлы

- `packages/excalidraw/straighten.ts` — основная логика
- `packages/common/src/constants.ts` — новые константы

---

## Task 4: Перемещение после спрямления (Procreate-стиль)

### Проблема

После hold-to-straighten анимации `wasStraightened = true`, pointerUp сразу вызывает `actionFinalize`. Нет возможности подвинуть/повернуть результат без отпускания.

### Решение

После завершения анимации спрямления, если палец всё ещё нажат — войти в режим transform:

1. **Вход в режим:** По окончании `animateStraighten` (строка 9175-9187), вместо `wasStraightened = true` — установить `isStraightenTransforming = true` и запомнить:

   - `transformAnchor` = первая точка элемента в глобальных координатах: `{ x: element.x + element.points[0][0], y: element.y + element.points[0][1] }`
   - Для замкнутых фигур (Task 3 closure) — использовать **центроид** элемента вместо первой точки: `{ x: element.x + avg(points.map(p => p[0])), y: element.y + avg(points.map(p => p[1])) }`
   - `transformInitialAngle` = `atan2(cursorY - anchor.y, cursorX - anchor.x)`
   - `transformInitialDist` = расстояние от anchor к cursor
   - `transformInitialPoints` = копия straightened points

2. **Обработка в pointerMove:** Если `isStraightenTransforming`:

   - **Dead zone:** Если расстояние cursor от позиции при входе в transform < 5px — игнорировать (предотвращает jitter на тач-устройствах).
   - Вычислить `currentAngle` = `atan2(cursorY - anchor.y, cursorX - anchor.x)`
   - Вычислить `currentDist` = расстояние от anchor к cursor
   - `deltaAngle = currentAngle - transformInitialAngle`
   - `scale = currentDist / transformInitialDist` (clamp к `[0.1, 10]` для безопасности)
   - Применить поворот на `deltaAngle` и масштаб `scale` к `transformInitialPoints` вокруг `transformAnchor` (в local coords: вычесть anchor, повернуть, масштабировать, прибавить anchor)
   - `mutateElement` с новыми points

3. **Завершение в pointerUp:** Если `isStraightenTransforming`:

   - `isStraightenTransforming = false`
   - `actionFinalize`
   - Не добавлять финальную точку (как с `wasStraightened`)

4. **Race condition: pointerUp до завершения анимации:**
   - Текущий код (строки 11381-11389) отменяет анимацию при pointerUp. Добавить: если `straightenAnimationId` отменяется — НЕ устанавливать `isStraightenTransforming`. Просто финализировать с текущими (частично анимированными) точками, как сейчас.
   - `isStraightenTransforming` устанавливается ТОЛЬКО в completion callback анимации.

### Модульные переменные (App.tsx, рядом со строкой 639):

```ts
let isStraightenTransforming = false;
let transformAnchor: { x: number; y: number } | null = null;
let transformInitialAngle = 0;
let transformInitialDist = 0;
let transformInitialPoints: readonly LocalPoint[] | null = null;
let transformEntryPos: { x: number; y: number } | null = null; // for dead zone
```

### Файлы

- `packages/excalidraw/components/App.tsx` — `animateStraighten`, pointerMove (freedraw section), pointerUp (freedraw section)

---

## Порядок реализации

1. **Task 2 (иконка)** — самая простая, одна замена SVG
2. **Task 1 (snap-to-first)** — средняя сложность, изолированная фича
3. **Task 3 (умное сглаживание)** — основная работа, новый алгоритм в straighten.ts
4. **Task 4 (transform после спрямления)** — зависит от task 3 (работает поверх нового straighten flow)

## Ограничения и риски

- **Point count preservation:** Все трансформации (сглаживание, замыкание, стягивание) должны сохранять количество точек. LaserPointer рендерер рисует по-другому при изменении count (CLAUDE.md gotcha).
- **Smoothing radius sensitivity:** radius=3 для moving average — проверенное значение (CLAUDE.md: "reduce smoothing radius 8→3 to minimize curve compression"). Не менять.
- **Corner detection tuning:** Порог 35° и окно 6 — начальные значения. Потребуется подстройка после тестирования на реальном рисовании.
- **Undo:** Все задачи завершаются через `actionFinalize`, который создаёт undo-snapshot. Дополнительная интеграция с undo не нужна.

## Manual Test Scenarios

1. **T1:** Нарисовать линию (line tool) 4+ точки без grid snap. Подвести курсор к первой точке — должен появиться индикатор, trailing point должен снаппиться. Кликнуть — полигон замыкается.
2. **T2:** Включить миникарту — иконка должна быть сложенной картой.
3. **T3 (углы):** Нарисовать от руки треугольник, удержать — должен стать треугольником с чёткими углами и прямыми рёбрами. Нарисовать круг — должен стать плавной кривой.
4. **T3 (замыкание):** Нарисовать от руки почти замкнутую фигуру (gap < 30px), удержать — должна замкнуться.
5. **T4:** Нарисовать линию, удержать (спрямится), не отпуская — подвинуть палец. Линия должна вращаться/масштабироваться вокруг начальной точки.
