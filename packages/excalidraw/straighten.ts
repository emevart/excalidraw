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

export const computeTargetPositions = (
  originalPoints: readonly LocalPoint[],
  targetPoints: readonly LocalPoint[],
): LocalPoint[] => {
  if (originalPoints.length < 2 || targetPoints.length < 2) {
    return [...originalPoints];
  }

  // Use projection onto start→end line to get parameter t,
  // NOT arc length (arc length of a wobbly path > straight line → compression)
  const start = originalPoints[0];
  const end = originalPoints[originalPoints.length - 1];
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return [...originalPoints];
  }

  const targLen = pathLength(targetPoints);

  return originalPoints.map((p) => {
    const t = Math.max(
      0,
      Math.min(1, ((p[0] - start[0]) * dx + (p[1] - start[1]) * dy) / lenSq),
    );
    return pointAtLength(targetPoints, t * targLen);
  });
};

export const computeStraightenedPoints = (
  points: readonly LocalPoint[],
): LocalPoint[] | null => {
  if (points.length < 2) {
    return null;
  }
  const lineLen = pointDistance(points[0], points[points.length - 1]);
  if (lineLen < 1) {
    return null;
  } // closed scribble
  const deviation = maxDeviationFromLine(points);
  const ratio = deviation / lineLen;
  if (ratio < STRAIGHTEN_DEVIATION_THRESHOLD) {
    return [points[0], points[points.length - 1]];
  }
  const totalLen = pathLength(points);
  const epsilon = totalLen * 0.05;
  const simplified = rdpSimplify(points, epsilon);
  if (simplified.length > 10) {
    return rdpSimplify(points, totalLen * 0.08);
  }
  return simplified;
};
