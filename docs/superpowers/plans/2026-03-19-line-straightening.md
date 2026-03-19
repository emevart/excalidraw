# Line Straightening (Hold-to-Straighten) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When drawing a freedraw line, holding the pointer still for 500ms triggers automatic straightening — either to a perfect line (low deviation) or to a smoothed curve (high deviation), with animated transition.

**Architecture:** Stillness detection via setTimeout in the freedraw pointerMove handler. On trigger, compute target points (RDP simplification or 2-point line), then animate each point from original to target position using rAF. New utility file for straightening math. Constants in common package.

**Tech Stack:** Ramer-Douglas-Peucker algorithm, requestAnimationFrame, existing `mutateElement` for point updates.

**Spec:** `docs/superpowers/specs/2026-03-18-board-features-design.md` § 2

---

### Task 1: Add straightening constants

**Files:**

- Modify: `H:\excalidraw\packages\common\src\constants.ts` (end of file, ~line 538)

- [ ] **Step 1: Add constants**

```typescript
// Line straightening (hold-to-straighten)
export const STRAIGHTEN_HOLD_TIME = 500; // ms of stillness to trigger
export const STRAIGHTEN_MOVE_THRESHOLD = 3; // px — movement below this is "still"
export const STRAIGHTEN_MOVE_THRESHOLD_TOUCH = 5; // px — wider for touch (finger jitter)
export const STRAIGHTEN_MIN_LENGTH = 20; // px — don't straighten very short strokes
export const STRAIGHTEN_DEVIATION_THRESHOLD = 0.1; // ratio — below this → straight line
export const STRAIGHTEN_ANIMATION_DURATION = 250; // ms
```

- [ ] **Step 2: Commit**

```bash
git add packages/common/src/constants.ts
git commit -m "feat: add line straightening constants"
```

---

### Task 2: Create straightening math utilities

**Files:**

- Create: `H:\excalidraw\packages\excalidraw\straighten.ts`

- [ ] **Step 1: Implement RDP algorithm and straightening logic**

```typescript
import { pointFrom, pointDistance } from "@excalidraw/math";
import type { LocalPoint } from "@excalidraw/math";
import { STRAIGHTEN_DEVIATION_THRESHOLD } from "@excalidraw/common";

/**
 * Perpendicular distance from point to line segment (start→end).
 */
const perpendicularDistance = (
  point: LocalPoint,
  lineStart: LocalPoint,
  lineEnd: LocalPoint,
): number => {
  const [px, py] = point;
  const [sx, sy] = lineStart;
  const [ex, ey] = lineEnd;

  const dx = ex - sx;
  const dy = ey - sy;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return pointDistance(point, lineStart);
  }

  return Math.abs(dy * px - dx * py + ex * sy - ey * sx) / Math.sqrt(lenSq);
};

/**
 * Ramer-Douglas-Peucker simplification.
 * Returns indices of points to keep.
 */
const rdpIndices = (
  points: readonly LocalPoint[],
  epsilon: number,
  start: number,
  end: number,
  result: number[],
): void => {
  let maxDist = 0;
  let maxIdx = start;

  for (let i = start + 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[start], points[end]);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    rdpIndices(points, epsilon, start, maxIdx, result);
    result.push(maxIdx);
    rdpIndices(points, epsilon, maxIdx, end, result);
  }
};

/**
 * Simplify a polyline using Ramer-Douglas-Peucker.
 */
export const rdpSimplify = (
  points: readonly LocalPoint[],
  epsilon: number,
): LocalPoint[] => {
  if (points.length <= 2) {
    return [...points];
  }

  const indices: number[] = [0];
  rdpIndices(points, epsilon, 0, points.length - 1, indices);
  indices.push(points.length - 1);
  indices.sort((a, b) => a - b);

  return indices.map((i) => points[i]);
};

/**
 * Compute max deviation of all points from the straight line
 * connecting the first and last point.
 */
export const maxDeviationFromLine = (points: readonly LocalPoint[]): number => {
  if (points.length <= 2) {
    return 0;
  }

  const start = points[0];
  const end = points[points.length - 1];
  let max = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > max) {
      max = d;
    }
  }

  return max;
};

/**
 * Compute the total arc length of a polyline.
 */
export const pathLength = (points: readonly LocalPoint[]): number => {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += pointDistance(points[i - 1], points[i]);
  }
  return len;
};

/**
 * Find position at a given arc-length distance along a polyline.
 */
const pointAtLength = (
  points: readonly LocalPoint[],
  targetLen: number,
): LocalPoint => {
  let accumulated = 0;

  for (let i = 1; i < points.length; i++) {
    const segLen = pointDistance(points[i - 1], points[i]);
    if (accumulated + segLen >= targetLen) {
      const t = segLen === 0 ? 0 : (targetLen - accumulated) / segLen;
      return pointFrom<LocalPoint>(
        points[i - 1][0] + (points[i][0] - points[i - 1][0]) * t,
        points[i - 1][1] + (points[i][1] - points[i - 1][1]) * t,
      );
    }
    accumulated += segLen;
  }

  return points[points.length - 1];
};

/**
 * For each original point, compute its target position on the
 * target path (by proportional arc length). Used for animation.
 */
export const computeTargetPositions = (
  originalPoints: readonly LocalPoint[],
  targetPoints: readonly LocalPoint[],
): LocalPoint[] => {
  const origLen = pathLength(originalPoints);
  const targLen = pathLength(targetPoints);

  if (origLen === 0) {
    return [...originalPoints];
  }

  const result: LocalPoint[] = [];
  let accumulated = 0;

  for (let i = 0; i < originalPoints.length; i++) {
    if (i > 0) {
      accumulated += pointDistance(originalPoints[i - 1], originalPoints[i]);
    }
    const t = accumulated / origLen;
    result.push(pointAtLength(targetPoints, t * targLen));
  }

  return result;
};

/**
 * Determine straightened target points for a freedraw stroke.
 * Returns null if the stroke should not be straightened (too short).
 */
export const computeStraightenedPoints = (
  points: readonly LocalPoint[],
): LocalPoint[] | null => {
  if (points.length < 2) {
    return null;
  }

  const lineLen = pointDistance(points[0], points[points.length - 1]);

  if (lineLen < 1) {
    // Start ≈ end (closed scribble) — don't straighten
    return null;
  }

  const deviation = maxDeviationFromLine(points);
  const ratio = deviation / lineLen;

  if (ratio < STRAIGHTEN_DEVIATION_THRESHOLD) {
    // Low deviation → straight line
    return [points[0], points[points.length - 1]];
  }

  // High deviation → RDP simplification
  // Choose epsilon to get roughly 5-8 points
  const totalLen = pathLength(points);
  const epsilon = totalLen * 0.05;
  const simplified = rdpSimplify(points, epsilon);

  // If RDP didn't simplify enough, try larger epsilon
  if (simplified.length > 10) {
    return rdpSimplify(points, totalLen * 0.08);
  }

  return simplified;
};
```

- [ ] **Step 2: Run typecheck**

```bash
yarn test:typecheck
```

- [ ] **Step 3: Commit**

```bash
git add packages/excalidraw/straighten.ts
git commit -m "feat: add RDP simplification and straightening utilities"
```

---

### Task 3: Integrate stillness detection and animation into App.tsx

**Files:**

- Modify: `H:\excalidraw\packages\excalidraw\components\App.tsx`

**Context:**

- Freedraw pointerMove: lines ~10648-10677
- Freedraw pointerUp: lines ~11119-11147
- Module-level state pattern: already used for `toolSettings`, `isHighlighterMode`, etc.

- [ ] **Step 1: Add module-level state and imports**

Near the top of App.tsx (around the other module-level variables like `toolSettings`), add:

```typescript
import {
  STRAIGHTEN_HOLD_TIME,
  STRAIGHTEN_MOVE_THRESHOLD,
  STRAIGHTEN_MOVE_THRESHOLD_TOUCH,
  STRAIGHTEN_MIN_LENGTH,
  STRAIGHTEN_ANIMATION_DURATION,
} from "@excalidraw/common";
import {
  computeStraightenedPoints,
  computeTargetPositions,
  pathLength,
} from "../straighten";

// Straighten state (module-level, same pattern as toolSettings)
let straightenTimerId: ReturnType<typeof setTimeout> | null = null;
let straightenAnimationId: number | null = null;
let isStraightening = false;
```

- [ ] **Step 2: Add stillness detection in freedraw pointerMove**

In the freedraw branch of `onPointerMoveFromPointerDownHandler` (around line 10677, **after** the point is appended and `setState` called), add:

```typescript
// Straighten detection: reset timer on each move
if (straightenTimerId !== null) {
  clearTimeout(straightenTimerId);
  straightenTimerId = null;
}
if (straightenAnimationId !== null) {
  cancelAnimationFrame(straightenAnimationId);
  straightenAnimationId = null;
  isStraightening = false;
}

const threshold = this.device.editor.isMobile
  ? STRAIGHTEN_MOVE_THRESHOLD_TOUCH
  : STRAIGHTEN_MOVE_THRESHOLD;

straightenTimerId = window.setTimeout(() => {
  straightenTimerId = null;
  const el = this.state.newElement;
  if (
    el &&
    el.type === "freedraw" &&
    pathLength(el.points) >= STRAIGHTEN_MIN_LENGTH
  ) {
    this.animateStraighten(el as ExcalidrawFreeDrawElement);
  }
}, STRAIGHTEN_HOLD_TIME);
```

Note: the `STRAIGHTEN_MOVE_THRESHOLD` check is implicitly handled by the existing deduplication (line 10653-10655): if the pointer hasn't moved enough to generate a new distinct point, the timer won't be reset. For additional precision, compare pointer coords to the last significant move position — but the spec's timeout-reset-on-move approach is simpler and sufficient.

- [ ] **Step 3: Clear timer on pointerUp**

In the freedraw branch of `onPointerUpFromPointerDownHandler` (around line 11119), add at the top of the freedraw block:

```typescript
if (straightenTimerId !== null) {
  clearTimeout(straightenTimerId);
  straightenTimerId = null;
}
if (straightenAnimationId !== null) {
  cancelAnimationFrame(straightenAnimationId);
  straightenAnimationId = null;
  isStraightening = false;
}
```

- [ ] **Step 4: Add animateStraighten method to App class**

Add as a private method on the App class:

```typescript
private animateStraighten(element: ExcalidrawFreeDrawElement) {
  const targetPoints = computeStraightenedPoints(element.points);
  if (!targetPoints) {
    return;
  }

  isStraightening = true;
  const originalPoints = [...element.points];
  const targets = computeTargetPositions(originalPoints, targetPoints);
  const startTime = performance.now();

  const animate = (now: number) => {
    // Abort if element is no longer the active drawing
    if (this.state.newElement !== element) {
      isStraightening = false;
      straightenAnimationId = null;
      return;
    }

    const elapsed = now - startTime;
    const t = Math.min(elapsed / STRAIGHTEN_ANIMATION_DURATION, 1);
    // ease-out cubic
    const eased = 1 - Math.pow(1 - t, 3);

    const interpolated = originalPoints.map((orig, i) =>
      pointFrom<LocalPoint>(
        orig[0] + (targets[i][0] - orig[0]) * eased,
        orig[1] + (targets[i][1] - orig[1]) * eased,
      ),
    );

    this.scene.mutateElement(element, { points: interpolated });
    this.setState({ newElement: element });

    if (t < 1) {
      straightenAnimationId = requestAnimationFrame(animate);
    } else {
      // Final: set exact target points and matching pressures
      const targetPressures = targetPoints.map(() =>
        element.simulatePressure ? 0.5 : 1,
      );
      this.scene.mutateElement(element, {
        points: targetPoints,
        pressures: targetPressures,
      });
      this.setState({ newElement: element });
      straightenAnimationId = null;
      // isStraightening stays true — pointerUp will finalize
    }
  };

  straightenAnimationId = requestAnimationFrame(animate);
}
```

- [ ] **Step 5: Block point appending during animation**

In the freedraw pointerMove handler (around line 10648), add a guard at the top of the freedraw block:

```typescript
if (isStraightening) {
  return;
}
```

This prevents new points from being appended while the straighten animation is running. If the user moves again, the animation is already cancelled by Step 2's `cancelAnimationFrame` call.

- [ ] **Step 6: Run typecheck**

```bash
yarn test:typecheck
```

- [ ] **Step 7: Manual test**

1. Start dev server (`yarn start`)
2. Select freedraw tool, draw a roughly straight line, hold still at the end for 500ms
3. Line should animate to a straight line (if deviation was low)
4. Draw a curve, hold still — should animate to a simplified smooth curve
5. Draw a very short stroke, hold — should NOT straighten
6. Draw, hold, then move before animation completes — animation should cancel, drawing resumes

- [ ] **Step 8: Commit**

```bash
git add packages/excalidraw/components/App.tsx
git commit -m "feat: hold-to-straighten for freedraw lines (Procreate-style)"
```
