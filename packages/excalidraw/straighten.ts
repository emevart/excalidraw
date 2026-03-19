import { pointFrom, pointDistance } from "@excalidraw/math";

import { STRAIGHTEN_DEVIATION_THRESHOLD } from "@excalidraw/common";

import type { LocalPoint } from "@excalidraw/math";

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

export const pathLength = (points: readonly LocalPoint[]): number => {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += pointDistance(points[i - 1], points[i]);
  }
  return len;
};

/**
 * Smooth points using a weighted moving average.
 * Preserves start and end points exactly.
 * Output has same length as input — no rendering artifacts.
 */
const smoothPoints = (
  points: readonly LocalPoint[],
  radius: number = 3,
): LocalPoint[] => {
  const n = points.length;
  if (n <= 2) {
    return [...points];
  }

  const result: LocalPoint[] = new Array(n);
  // Preserve endpoints exactly
  result[0] = points[0];
  result[n - 1] = points[n - 1];

  for (let i = 1; i < n - 1; i++) {
    const lo = Math.max(0, i - radius);
    const hi = Math.min(n - 1, i + radius);
    let sumX = 0;
    let sumY = 0;
    let totalWeight = 0;
    for (let j = lo; j <= hi; j++) {
      // Gaussian-like weight: closer points have more influence
      const dist = Math.abs(j - i);
      const w = 1 / (1 + dist);
      sumX += points[j][0] * w;
      sumY += points[j][1] * w;
      totalWeight += w;
    }
    result[i] = pointFrom<LocalPoint>(sumX / totalWeight, sumY / totalWeight);
  }

  return result;
};

export type StraightenResult = {
  /** Same length as original points — used for per-point animation */
  animationTargets: LocalPoint[];
  /** Final points to set on the element (may be fewer) */
  finalPoints: LocalPoint[];
};

/**
 * Compute straightening targets for a freedraw stroke.
 *
 * Low deviation from start→end: straighten to a perfect line.
 * High deviation: smooth the curve (moving average) preserving shape and length.
 *
 * Returns null if the stroke should not be straightened.
 */
export const computeStraightenResult = (
  points: readonly LocalPoint[],
): StraightenResult | null => {
  if (points.length < 2) {
    return null;
  }

  const start = points[0];
  const end = points[points.length - 1];
  const lineLen = pointDistance(start, end);

  if (lineLen < 1) {
    return null; // closed scribble
  }

  const deviation = maxDeviationFromLine(points);
  const ratio = deviation / lineLen;

  if (ratio < STRAIGHTEN_DEVIATION_THRESHOLD) {
    // Straight line: project each point onto start→end
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const lenSq = dx * dx + dy * dy;

    const animationTargets = points.map((p) => {
      const t = Math.max(
        0,
        Math.min(1, ((p[0] - start[0]) * dx + (p[1] - start[1]) * dy) / lenSq),
      );
      return pointFrom<LocalPoint>(start[0] + dx * t, start[1] + dy * t);
    });

    return {
      animationTargets,
      finalPoints: animationTargets,
    };
  }

  // High deviation: smooth curve (preserves shape + length)
  const smoothed = smoothPoints(points);

  return {
    animationTargets: smoothed,
    finalPoints: smoothed,
  };
};
