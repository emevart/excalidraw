# Session Log: Board Features — 2026-03-19

## Versions published

| Version | Changes |
|---------|---------|
| v0.26.58 | `history.undo()`/`redo()` exposed in ExcalidrawImperativeAPI |
| v0.26.59 | Hold-to-straighten, drag & drop image URL, minimap |
| v0.26.60 | Fix: straighten state reset, minimap layout (left of zoom), accurate minimap rendering |
| v0.26.61 | Fix: straighten compression — projection instead of arc length |
| v0.26.62 | Fix: moving average smoothing instead of RDP for curves |
| v0.26.63 | Fix: straight line keeps all projected points (not 2) |
| v0.26.64 | Fix: smoothing radius 8→3 to minimize curve corner cutting |

## Features delivered

### 1. Undo/redo mobile fix
- **Problem:** Consumer app dispatched synthetic `KeyboardEvent` via `dispatchEvent()` which React's `onKeyDown` doesn't pick up, especially on mobile (focus loss)
- **Solution:** Added `history.undo()`/`history.redo()` to `ExcalidrawImperativeAPI`, consumer calls directly
- **Files:** `App.tsx`, `types.ts` (excalidraw); `excalidraw-adapter.ts` (billion-dollars)

### 2. Hold-to-straighten (Procreate-style)
- **Trigger:** < 3px movement for 500ms while pointer down
- **Low deviation:** projects all points onto start→end line (keeps same count)
- **High deviation:** moving average smoothing (radius=3, preserves shape)
- **Animation:** rAF interpolation with ease-out cubic, 250ms
- **Key insight:** Never reduce freedraw point count — renderer draws different strokes. 6 iterations to get right.
- **Files:** `straighten.ts` (new), `App.tsx`, `constants.ts`

### 3. Drag & drop image from card
- **Source:** `draggable="true"` + `onDragStart` on parent `<div>` in ProblemImages.tsx, `pointer-events-none` on overlay
- **Receiver:** `text/uri-list` handler in `handleAppOnDrop` → `ImageURLToFile` → `insertImages()`
- **Scope:** Inline mode only (desktop, card + board on same page)
- **Files:** `App.tsx` (excalidraw); `ProblemImages.tsx` (billion-dollars)

### 4. Minimap
- **Toggle:** Button left of zoom controls in Footer
- **Rendering:** Canvas 2D, actual element shapes (freedraw paths, lines, ellipses, diamonds, text blocks)
- **Interaction:** Click to center viewport, drag to pan
- **Hidden:** Phone formFactor (Footer not rendered), zen mode (inherits transition)
- **Files:** `Minimap.tsx`, `Minimap.scss` (new), `Footer.tsx`, `icons.tsx`, `types.ts`, `appState.ts`, locales

## Bugs found and fixed during implementation

| Bug | Root cause | Fix |
|-----|-----------|-----|
| Straighten blocks subsequent strokes | `isStraightening` not reset on animation completion | Added reset + `wasStraightened` flag |
| End point shifts after straightening | pointerUp appends extra point at lift position | Skip final point when `wasStraightened` |
| Line compresses (arc length) | Arc length of wobbly path > straight line | Dot-product projection onto start→end |
| Curve shrinks (RDP) | RDP 200→5 points, renderer draws different stroke | Moving average smoothing (same point count) |
| Straight line shrinks | 2 final points rendered differently by LaserPointer | Keep all projected points (same count) |
| Curve still slightly shrinks | Moving average cuts corners on bends | Reduced radius 8→3 |
| Minimap below zoom | `Stack.Col` stacks vertically | Changed to `Stack.Row` inside Section |
| Minimap shows rectangles | Used `el.x/y/width/height` bounding boxes | Render actual shapes per element type |
| Drag blocked by overlay | `absolute inset-0` overlay intercepts drag events | `draggable` on parent, `pointer-events-none` on overlay |
| CI publish E403 | GitHub org/repo restricts `GITHUB_TOKEN` write_package | Local `npm publish` workaround |

## Decisions made

- **RDP abandoned for curves** — reduces point count, fundamentally incompatible with freedraw renderer
- **Moving average over Bézier** — simpler, works with existing point format, renderer handles smoothing
- **URL fetch over blob drag** — browser cache makes fetch instant, no CORS complexity
- **Minimap hidden on phone** — Footer not rendered on phone, automatic
- **All points preserved** — both straight line and curve cases keep original point count

## Consumer (billion-dollars) changes

- `excalidraw-adapter.ts` — `undo()`/`redo()` via API instead of synthetic KeyboardEvent
- `ProblemImages.tsx` — `draggable` on parent div, `pointer-events-none` on zoom overlay
- `package.json` + `package-lock.json` — `@emevart/excalidraw` → 0.26.64
- PR #293 (→develop, merged), PR #294 (develop→main)
