# Freedraw Polish & UX Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Четыре UX-улучшения: snap-to-first для полигонов, иконка миникарты, умное сглаживание freedraw с углами и замыканием, transform после спрямления.

**Architecture:** Task 2 — замена SVG. Task 1 — магнетизм в LinearElementEditor. Task 3 — переписать `computeStraightenResult` в `straighten.ts` (corner detection + closure). Task 4 — новый transform-mode в App.tsx поверх straighten flow.

**Tech Stack:** TypeScript, React, Canvas 2D rendering.

**Spec:** `docs/superpowers/specs/2026-03-20-freedraw-polish-design.md`

**Note:** Тесты в этом форке не в CI (38/104 падают). Вместо TDD — ручная проверка через dev server (`yarn start`).

**Note:** Нумерация задач в плане (1=иконка, 2=snap, 3=smoothing, 4=transform) отличается от спецификации (1=snap, 2=иконка, 3=smoothing, 4=transform) — порядок плана соответствует порядку реализации.

---

## File Map

| File | Action | Responsibility |
| --- | --- | --- |
| `packages/excalidraw/components/icons.tsx` | Modify :2744-2768 | Заменить MinimapIcon SVG |
| `packages/common/src/constants.ts` | Modify :546+ | Добавить новые константы |
| `packages/excalidraw/straighten.ts` | Rewrite | Corner detection, closure, smart smoothing |
| `packages/element/src/linearElementEditor.ts` | Modify :334-342 | Snap-to-first магнетизм |
| `packages/excalidraw/renderer/interactiveScene.ts` | Modify | Индикатор замыкания |
| `packages/excalidraw/components/App.tsx` | Modify :639-643, :9140-9191, :10882-10937, :11380-11426 | Transform mode, straighten integration |

---

## Task 1: Иконка миникарты

**Files:**

- Modify: `packages/excalidraw/components/icons.tsx:2744-2768`

- [ ] **Step 1: Заменить MinimapIcon**

В `icons.tsx`, заменить строки 2744-2768:

```tsx
export const MinimapIcon = createIcon(
  <>
    <path
      d="M4 4.5 L8 3 L12 4.5 L16 3 L16 16.5 L12 18 L8 16.5 L4 18 Z"
      strokeWidth="1.25"
      fill="none"
    />
    <line x1="8" y1="3" x2="8" y2="16.5" strokeWidth="1" />
    <line x1="12" y1="4.5" x2="12" y2="18" strokeWidth="1" />
  </>,
  modifiedTablerIconProps,
);
```

- [ ] **Step 2: Проверить визуально**

Run: `yarn start`, открыть доску, нажать кнопку миникарты в footer — иконка должна быть сложенной картой.

- [ ] **Step 3: Commit**

```bash
git add packages/excalidraw/components/icons.tsx
git commit -m "fix: replace minimap landscape icon with folded map"
```

---

## Task 2: Snap-to-first для замыкания полигона

**Files:**

- Modify: `packages/common/src/constants.ts:546+`
- Modify: `packages/element/src/linearElementEditor.ts:334-342`
- Modify: `packages/excalidraw/renderer/interactiveScene.ts`

- [ ] **Step 1: Добавить константу**

В `packages/common/src/constants.ts`, после строки 546 (`STRAIGHTEN_ANIMATION_DURATION`):

```ts
// Snap-to-first threshold for closing polygon from line tool
export const LINE_CLOSE_SNAP_THRESHOLD = 20; // scene-px (divided by zoomValue at usage site)
```

Автоматически реэкспортируется через `export * from "./constants"` в `packages/common/src/index.ts`.

- [ ] **Step 2: Добавить магнетизм в handlePointerMove**

В `packages/element/src/linearElementEditor.ts`, в методе `handlePointerMove` (строка 291+). Магнетизм вставить **только в `else` branch** (строки 333-342, обычный режим без shift), НЕ в `shouldRotateWithDiscreteAngle` branch. После `deltaX`/`deltaY` вычислены через `createPointAt`:

```ts
    } else {
      const newDraggingPointPosition = LinearElementEditor.createPointAt(
        element,
        elementsMap,
        scenePointerX - linearElementEditor.pointerOffset.x,
        scenePointerY - linearElementEditor.pointerOffset.y,
        event[KEYS.CTRL_OR_CMD] ? null : app.getEffectiveGridSize(),
      );
      deltaX = newDraggingPointPosition[0] - point[0];
      deltaY = newDraggingPointPosition[1] - point[1];

      // Snap-to-first: if trailing point is near first point, snap to close polygon
      if (element.points.length >= 3) {
        const newPointX = point[0] + deltaX;
        const newPointY = point[1] + deltaY;
        const firstPoint = element.points[0];
        const distToFirst = pointDistance(
          pointFrom(newPointX, newPointY),
          firstPoint,
        );
        const zoomValue = app.state.zoom.value;
        const threshold = LINE_CLOSE_SNAP_THRESHOLD / zoomValue;
        if (distToFirst < threshold && distToFirst > 0) {
          deltaX = firstPoint[0] - point[0];
          deltaY = firstPoint[1] - point[1];
        }
      }
    }
```

Импорт `LINE_CLOSE_SNAP_THRESHOLD` из `@excalidraw/common`. `pointDistance` и `pointFrom` уже импортированы (строки 3, 8).

- [ ] **Step 3: Визуальный индикатор замыкания**

В `packages/excalidraw/renderer/interactiveScene.ts`, в `_renderInteractiveSceneInner`, после блока рендеринга `editingLinearElement` handles (~строка 1699). Использовать уже существующую локальную переменную `editingLinearElement` и существующий `context.translate(appState.scrollX, appState.scrollY)` паттерн:

```ts
// Close indicator: show circle on first point when trailing point is snapped to it
if (editingLinearElement && editingLinearElement.points.length >= 3) {
  const firstPoint = editingLinearElement.points[0];
  const lastPoint =
    editingLinearElement.points[editingLinearElement.points.length - 1];
  const dist = pointDistance(firstPoint, lastPoint);
  if (dist < 1) {
    context.save();
    context.translate(appState.scrollX, appState.scrollY);
    const globalX = editingLinearElement.x + firstPoint[0];
    const globalY = editingLinearElement.y + firstPoint[1];
    context.beginPath();
    context.arc(globalX, globalY, 8 / appState.zoom.value, 0, Math.PI * 2);
    context.strokeStyle =
      appState.theme === "dark"
        ? "rgba(99, 102, 241, 0.7)"
        : "rgba(99, 102, 241, 0.6)";
    context.lineWidth = 2 / appState.zoom.value;
    context.stroke();
    context.restore();
  }
}
```

> **Примечание:** Radius и lineWidth делятся на zoom.value потому что `context.scale(zoom, zoom)` уже применён выше в функции. Координаты — в scene space после translate.

- [ ] **Step 4: Проверить визуально**

Run: `yarn start`. Выбрать Line tool, нарисовать 3+ точки без grid snap. Подвести курсор к первой точке — должен появиться индикатор (кружок), trailing point должен прыгнуть на первую точку. Кликнуть — полигон замыкается.

Проверить с grid snap ON — поведение не должно сломаться. Проверить при разных zoom-уровнях.

- [ ] **Step 5: Commit**

```bash
git add packages/common/src/constants.ts packages/element/src/linearElementEditor.ts packages/excalidraw/renderer/interactiveScene.ts
git commit -m "feat: snap-to-first magnetism for closing polygons without grid snap"
```

---

## Task 3: Умное сглаживание + замыкание freedraw

**Files:**

- Rewrite: `packages/excalidraw/straighten.ts`
- Modify: `packages/common/src/constants.ts`

### Step 1: Добавить константы

- [ ] В `packages/common/src/constants.ts`, после `STRAIGHTEN_ANIMATION_DURATION`:

```ts
export const STRAIGHTEN_CLOSE_THRESHOLD = 30; // px — max gap for auto-close
export const STRAIGHTEN_CORNER_WINDOW = 6; // points each side for corner detection
export const STRAIGHTEN_CORNER_ANGLE = 35; // degrees — min angle to be a corner
```

Убедиться, что все три экспортируются из `packages/common/src/index.ts`.

- [ ] **Commit**

```bash
git add packages/common/src/constants.ts packages/common/src/index.ts
git commit -m "feat: add constants for smart smoothing and closure"
```

### Step 2: Реализовать стягивание (closure)

- [ ] В `packages/excalidraw/straighten.ts`, добавить функцию `contractToClose` после `smoothPoints`:

```ts
/**
 * Contract points to close a nearly-closed shape.
 * Ease-out falloff: start stays, end moves to start, middle shifts proportionally.
 * Preserves point count.
 */
const contractToClose = (points: readonly LocalPoint[]): LocalPoint[] => {
  const n = points.length;
  if (n < 2) {
    return [...points];
  }
  const last = n - 1;
  const gapX = points[last][0] - points[0][0];
  const gapY = points[last][1] - points[0][1];

  return points.map((p, i) => {
    const t = i / last;
    const pull = t * t; // ease-out
    return pointFrom<LocalPoint>(p[0] - pull * gapX, p[1] - pull * gapY);
  });
};
```

- [ ] **Commit**

```bash
git add packages/excalidraw/straighten.ts
git commit -m "feat: add contractToClose for freedraw shape closure"
```

### Step 3: Реализовать детекцию углов

- [ ] В `packages/excalidraw/straighten.ts`, добавить функцию `detectCorners`:

```ts
import {
  STRAIGHTEN_DEVIATION_THRESHOLD,
  STRAIGHTEN_CLOSE_THRESHOLD,
  STRAIGHTEN_CORNER_WINDOW,
  STRAIGHTEN_CORNER_ANGLE,
} from "@excalidraw/common";

/**
 * Detect corner points by measuring direction change over a window.
 * Returns array of indices where corners are detected.
 */
const detectCorners = (
  points: readonly LocalPoint[],
  isClosed: boolean,
): number[] => {
  const n = points.length;
  const W = STRAIGHTEN_CORNER_WINDOW;
  const angleThreshold = (STRAIGHTEN_CORNER_ANGLE * Math.PI) / 180;
  const angles: { idx: number; angle: number }[] = [];

  for (let i = 1; i < n - 1; i++) {
    // Points W steps before and after
    let beforeIdx: number;
    let afterIdx: number;

    if (isClosed) {
      beforeIdx = i - W < 0 ? (((i - W) % n) + n) % n : i - W;
      afterIdx = i + W >= n ? (i + W) % n : i + W;
    } else {
      beforeIdx = Math.max(0, i - W);
      afterIdx = Math.min(n - 1, i + W);
    }

    const bx = points[i][0] - points[beforeIdx][0];
    const by = points[i][1] - points[beforeIdx][1];
    const ax = points[afterIdx][0] - points[i][0];
    const ay = points[afterIdx][1] - points[i][1];

    const lenB = Math.sqrt(bx * bx + by * by);
    const lenA = Math.sqrt(ax * ax + ay * ay);

    if (lenB < 1 || lenA < 1) {
      continue;
    }

    const dot = (bx * ax + by * ay) / (lenB * lenA);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

    if (angle > angleThreshold) {
      angles.push({ idx: i, angle });
    }
  }

  // Non-maximum suppression: keep only the strongest corner in each window
  const corners: number[] = [];
  for (const candidate of angles) {
    const dominated = angles.some(
      (other) =>
        other !== candidate &&
        Math.abs(other.idx - candidate.idx) <= W &&
        other.angle > candidate.angle,
    );
    if (!dominated) {
      corners.push(candidate.idx);
    }
  }

  return corners.sort((a, b) => a - b);
};
```

- [ ] **Commit**

```bash
git add packages/excalidraw/straighten.ts
git commit -m "feat: add corner detection for smart smoothing"
```

### Step 4: Реализовать cyclic smoothing

- [ ] Добавить вариант `smoothPoints` с cyclic wrap для замкнутых фигур:

```ts
/**
 * Smooth points with cyclic wrapping (for closed shapes).
 * Points near start/end average across the seam.
 * Preserves point count. Does NOT preserve endpoints separately.
 */
const smoothPointsCyclic = (
  points: readonly LocalPoint[],
  radius: number = 3,
): LocalPoint[] => {
  const n = points.length;
  if (n <= 2) {
    return [...points];
  }

  // For closed shapes, last point == first point after contraction.
  // Smooth all interior points with wrap-around.
  const result: LocalPoint[] = new Array(n);

  for (let i = 0; i < n; i++) {
    let sumX = 0;
    let sumY = 0;
    let totalWeight = 0;
    for (let offset = -radius; offset <= radius; offset++) {
      const j = (((i + offset) % n) + n) % n;
      const w = 1 / (1 + Math.abs(offset));
      sumX += points[j][0] * w;
      sumY += points[j][1] * w;
      totalWeight += w;
    }
    result[i] = pointFrom<LocalPoint>(sumX / totalWeight, sumY / totalWeight);
  }

  // Re-close: ensure last point equals first
  result[n - 1] = result[0];
  return result;
};
```

- [ ] **Commit**

```bash
git add packages/excalidraw/straighten.ts
git commit -m "feat: add cyclic smoothing for closed freedraw shapes"
```

### Step 5: Реализовать segment-wise smoothing

- [ ] Добавить функцию `smoothBySegments`:

```ts
/**
 * Smooth points segment-by-segment, preserving corner points.
 * For closed shapes with no corners near the seam, uses cyclic smoothing.
 */
const smoothBySegments = (
  points: readonly LocalPoint[],
  corners: number[],
  isClosed: boolean,
  radius: number = 3,
): LocalPoint[] => {
  // No corners found: smooth everything
  if (corners.length === 0) {
    return isClosed
      ? smoothPointsCyclic(points, radius)
      : smoothPoints(points, radius);
  }

  const result: LocalPoint[] = [...points];

  // Build segments: [0, corner0], [corner0, corner1], ..., [cornerN, end]
  const boundaries = [0, ...corners, points.length - 1];

  for (let s = 0; s < boundaries.length - 1; s++) {
    const segStart = boundaries[s];
    const segEnd = boundaries[s + 1];
    const segLen = segEnd - segStart + 1;

    if (segLen <= 2) {
      continue; // nothing to smooth in a 2-point segment
    }

    const segment = points.slice(segStart, segEnd + 1);
    const smoothed = smoothPoints(segment, radius);

    // Write back, preserving corner endpoints
    for (let i = 1; i < smoothed.length - 1; i++) {
      result[segStart + i] = smoothed[i];
    }
  }

  // For closed shapes: smooth across seam if no corner near 0 or n-1
  if (
    isClosed &&
    corners[0] > radius &&
    corners[corners.length - 1] < points.length - 1 - radius
  ) {
    // Smooth the seam region using cyclic averaging
    const seamRadius = radius;
    const n = points.length;
    for (let offset = -seamRadius; offset <= seamRadius; offset++) {
      const i = ((offset % n) + n) % n;
      if (corners.includes(i)) {
        continue;
      }
      let sumX = 0;
      let sumY = 0;
      let totalWeight = 0;
      for (let j = -radius; j <= radius; j++) {
        const idx = (((i + j) % n) + n) % n;
        const w = 1 / (1 + Math.abs(j));
        sumX += result[idx][0] * w;
        sumY += result[idx][1] * w;
        totalWeight += w;
      }
      result[i] = pointFrom<LocalPoint>(sumX / totalWeight, sumY / totalWeight);
    }
    result[n - 1] = result[0]; // re-close
  }

  return result;
};
```

- [ ] **Commit**

```bash
git add packages/excalidraw/straighten.ts
git commit -m "feat: add segment-wise smoothing preserving corners"
```

### Step 6: Переписать computeStraightenResult

- [ ] Заменить `computeStraightenResult` (строки 102-147):

```ts
export const computeStraightenResult = (
  points: readonly LocalPoint[],
): StraightenResult | null => {
  if (points.length < 2) {
    return null;
  }

  const start = points[0];
  const end = points[points.length - 1];
  const gapDist = pointDistance(start, end);
  const totalLen = pathLength(points);

  // Step 1: Closure detection — contract if gap is small
  let isClosed = false;
  let workingPoints: LocalPoint[];

  if (
    gapDist < STRAIGHTEN_CLOSE_THRESHOLD &&
    totalLen > STRAIGHTEN_CLOSE_THRESHOLD * 3
  ) {
    workingPoints = contractToClose(points);
    isClosed = true;
  } else {
    workingPoints = [...points] as LocalPoint[];
  }

  // Step 2: Straight line check (skip for closed shapes)
  if (!isClosed) {
    const lineLen = pointDistance(
      workingPoints[0],
      workingPoints[workingPoints.length - 1],
    );
    if (lineLen < 1) {
      return null; // degenerate
    }
    const deviation = maxDeviationFromLine(workingPoints);
    if (deviation / lineLen < STRAIGHTEN_DEVIATION_THRESHOLD) {
      // Straight line: project each point onto start→end
      const s = workingPoints[0];
      const e = workingPoints[workingPoints.length - 1];
      const dx = e[0] - s[0];
      const dy = e[1] - s[1];
      const lenSq = dx * dx + dy * dy;

      const animationTargets = workingPoints.map((p) => {
        const t = Math.max(
          0,
          Math.min(1, ((p[0] - s[0]) * dx + (p[1] - s[1]) * dy) / lenSq),
        );
        return pointFrom<LocalPoint>(s[0] + dx * t, s[1] + dy * t);
      });

      return { animationTargets, finalPoints: animationTargets };
    }
  }

  // Step 3: Smart smoothing with corner detection
  const corners = detectCorners(workingPoints, isClosed);
  const smoothed = smoothBySegments(workingPoints, corners, isClosed);

  return { animationTargets: smoothed, finalPoints: smoothed };
};
```

- [ ] **Step 7: Проверить**

Run: `yarn start`. Протестировать:

1. Нарисовать прямую линию от руки, удержать → спрямляется (как раньше)
2. Нарисовать плавную кривую, удержать → сглаживается (как раньше)
3. Нарисовать треугольник от руки, удержать → углы сохраняются, рёбра выпрямляются
4. Нарисовать почти замкнутый круг (gap < 30px), удержать → замыкается и сглаживается
5. Нарисовать почти замкнутый треугольник, удержать → замыкается, углы сохраняются

- [ ] **Step 8: Commit**

```bash
git add packages/excalidraw/straighten.ts packages/common/src/constants.ts
git commit -m "feat: smart smoothing with corner detection and auto-closure"
```

---

## Task 4: Transform после спрямления (Procreate-стиль)

**Files:**

- Modify: `packages/excalidraw/components/App.tsx:639-643, :9175-9187, :10882-10884, :11380-11397`

### Step 1: Добавить module-level переменные

- [ ] В `App.tsx`, после строки 643 (`let wasStraightened = false;`):

```ts
let isStraightenTransforming = false;
let transformAnchor: { x: number; y: number } | null = null;
let transformInitialAngle = 0;
let transformInitialDist = 0;
let transformInitialPoints: readonly LocalPoint[] | null = null;
let transformEntryPos: { x: number; y: number } | null = null;
```

Импортировать `LocalPoint` из `@excalidraw/math` (проверить, уже есть ли).

- [ ] **Commit**

```bash
git add packages/excalidraw/components/App.tsx
git commit -m "feat: add transform-after-straighten state variables"
```

### Step 2: Вход в transform mode из animateStraighten

- [ ] В `App.tsx`, в `animateStraighten` (строки 9175-9187), заменить блок завершения анимации:

Заменить ВЕСЬ блок `} else {` completion (строки 9175-9187). Было:

```ts
      } else {
        const finalPressures = finalPoints.map(() =>
          element.simulatePressure ? 0.5 : 1,
        );
        this.scene.mutateElement(element, {
          points: finalPoints,
          pressures: finalPressures,
        });
        this.setState({ newElement: element });
        straightenAnimationId = null;
        isStraightening = false;
        wasStraightened = true;
      }
```

Стало:

```ts
      } else {
        // KEEP: set final points and pressures (critical for rendering)
        const finalPressures = finalPoints.map(() =>
          element.simulatePressure ? 0.5 : 1,
        );
        this.scene.mutateElement(element, {
          points: finalPoints,
          pressures: finalPressures,
        });
        this.setState({ newElement: element });
        straightenAnimationId = null;
        isStraightening = false;

        // Enter transform mode (Procreate-style drag/rotate/scale)
        const pts = finalPoints;
        const isClosed =
          pts.length > 2 &&
          pointDistance(pts[0], pts[pts.length - 1]) < 1;

        // Anchor: centroid for closed shapes, first point for open
        let anchorLocalX: number;
        let anchorLocalY: number;
        if (isClosed) {
          let sx = 0, sy = 0;
          for (const p of pts) { sx += p[0]; sy += p[1]; }
          anchorLocalX = sx / pts.length;
          anchorLocalY = sy / pts.length;
        } else {
          anchorLocalX = pts[0][0];
          anchorLocalY = pts[0][1];
        }
        transformAnchor = {
          x: element.x + anchorLocalX,
          y: element.y + anchorLocalY,
        };
        transformInitialPoints = [...finalPoints];

        // Compute initial angle/dist from anchor to current pointer.
        // Use last point of element as proxy for cursor position
        // (pointer is stationary — stillness triggered the straighten).
        // Small offset (<5px) absorbed by dead zone in pointerMove.
        const lastPt = pts[pts.length - 1];
        const cursorX = element.x + lastPt[0];
        const cursorY = element.y + lastPt[1];
        transformInitialAngle = Math.atan2(
          cursorY - transformAnchor.y,
          cursorX - transformAnchor.x,
        );
        transformInitialDist = Math.max(
          1,
          pointDistance(
            pointFrom(cursorX, cursorY),
            pointFrom(transformAnchor.x, transformAnchor.y),
          ),
        );
        transformEntryPos = { x: cursorX, y: cursorY };
        isStraightenTransforming = true;
      }
```

> **Примечание:** `pointDistance` и `pointFrom` уже импортированы в App.tsx (строки 274+). `LocalPoint` тоже (строка 274).

- [ ] **Commit**

```bash
git add packages/excalidraw/components/App.tsx
git commit -m "feat: enter transform mode after straighten animation completes"
```

### Step 3: Обработка transform в pointerMove

- [ ] В `App.tsx`, в pointerMove секции freedraw (строка 10882-10884), перед текущим guard `if (isStraightening) return`:

```ts
        if (newElement.type === "freedraw") {
          // Transform mode: rotate/scale after straightening
          if (isStraightenTransforming && transformAnchor && transformInitialPoints) {
            const cursorX = pointerCoords.x;
            const cursorY = pointerCoords.y;

            // Dead zone: ignore tiny movements on touch
            if (transformEntryPos) {
              const entryDist = Math.sqrt(
                (cursorX - transformEntryPos.x) ** 2 +
                (cursorY - transformEntryPos.y) ** 2,
              );
              if (entryDist < 5) {
                return;
              }
            }

            const currentAngle = Math.atan2(
              cursorY - transformAnchor.y,
              cursorX - transformAnchor.x,
            );
            const currentDist = Math.max(
              1,
              Math.sqrt(
                (cursorX - transformAnchor.x) ** 2 +
                (cursorY - transformAnchor.y) ** 2,
              ),
            );

            const deltaAngle = currentAngle - transformInitialAngle;
            const scale = Math.max(0.1, Math.min(10, currentDist / transformInitialDist));
            const cos = Math.cos(deltaAngle);
            const sin = Math.sin(deltaAngle);

            // Anchor in local coords
            const anchorLocalX = transformAnchor.x - newElement.x;
            const anchorLocalY = transformAnchor.y - newElement.y;

            const newPoints = transformInitialPoints.map((p) => {
              const dx = p[0] - anchorLocalX;
              const dy = p[1] - anchorLocalY;
              return pointFrom<LocalPoint>(
                anchorLocalX + (dx * cos - dy * sin) * scale,
                anchorLocalY + (dx * sin + dy * cos) * scale,
              );
            });

            this.scene.mutateElement(newElement, { points: newPoints });
            this.setState({ newElement });
            return;
          }

          if (isStraightening) {
            return;
          }
          // ... rest of existing freedraw pointerMove code
```

- [ ] **Commit**

```bash
git add packages/excalidraw/components/App.tsx
git commit -m "feat: handle rotate/scale in pointerMove during transform mode"
```

### Step 4: Завершение transform в pointerUp

- [ ] В `App.tsx`, в pointerUp секции freedraw (строки 11380-11397). Добавить новый блок ПЕРЕД существующим `if (wasStraightened)`:

```ts
      if (newElement?.type === "freedraw") {
        if (straightenTimerId !== null) {
          clearTimeout(straightenTimerId);
          straightenTimerId = null;
        }
        if (straightenAnimationId !== null) {
          cancelAnimationFrame(straightenAnimationId);
          straightenAnimationId = null;
          isStraightening = false;
          // Animation cancelled before completion — don't enter transform
        }

        // Transform mode: finalize on pointer up
        if (isStraightenTransforming) {
          isStraightenTransforming = false;
          transformAnchor = null;
          transformInitialPoints = null;
          transformEntryPos = null;
          this.actionManager.executeAction(actionFinalize);
          return;
        }

        if (wasStraightened) {
          wasStraightened = false;
          this.actionManager.executeAction(actionFinalize);
          return;
        }
        // ... rest of existing pointerUp code
```

> **Примечание:** `wasStraightened` больше не устанавливается в `animateStraighten` (заменён на `isStraightenTransforming`). Блок `if (wasStraightened)` можно оставить как fallback safety или удалить. Рекомендуется оставить — не повредит.

- [ ] **Step 5: Проверить**

Run: `yarn start`. Тестировать:

1. Нарисовать линию от руки, удержать → спрямляется → не отпуская, двигать палец → линия вращается/масштабируется вокруг начальной точки
2. Нарисовать замкнутый треугольник, удержать → замыкается и сглаживается → двигать → вращается вокруг центроида
3. Отпустить сразу после спрямления (без движения) → финализируется нормально (dead zone 5px)
4. Отпустить ДО завершения анимации → финализируется с текущими точками, transform mode не активируется

- [ ] **Step 6: Commit**

```bash
git add packages/excalidraw/components/App.tsx
git commit -m "feat: transform after straightening — Procreate-style rotate/scale"
```

---

## Task 5: Финальная проверка и typecheck

- [ ] **Step 1: yarn fix**

```bash
yarn fix
```

Должен пройти с 0 warnings.

- [ ] **Step 2: yarn test:typecheck**

```bash
yarn test:typecheck
```

Должен пройти без ошибок.

- [ ] **Step 3: Финальный commit (если были исправления)**

```bash
git add -A
git commit -m "chore: fix lint and typecheck issues"
```

---

## Порядок и зависимости

```
Task 1 (иконка) ──────────────────── нет зависимостей
Task 2 (snap-to-first) ───────────── нет зависимостей
Task 3 (умное сглаживание) ────────── нет зависимостей
Task 4 (transform после straighten) ─ зависит от Task 3
Task 5 (typecheck) ────────────────── после всех
```

Tasks 1, 2, 3 можно выполнять параллельно. Task 4 — после Task 3.
