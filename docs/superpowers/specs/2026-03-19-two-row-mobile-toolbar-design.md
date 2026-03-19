# Two-Row Mobile Toolbar

**Date:** 2026-03-19
**Status:** Approved

## Problem

On mobile, configuring a tool before drawing requires too many steps: tap tool → tap canvas → MobileShapeActions appears → open settings popup → configure → draw. The settings panel (MobileShapeActions) is a separate bar above the toolbar, connected only loosely to the tool selection. Dropdowns from the toolbar are overlapped by MobileShapeActions (separate bug, partially fixed with CSS `:has()` rule).

## Solution

Replace the two separate bars (MobileShapeActions + toolbar) with a single unified two-row toolbar block at the bottom of the screen.

### Structure

```
┌─────────────────────────────────────────────┐
│  ● ● ●  │ ━━━○━━━ │ ——— │ - - -  │  100%   │  ← Settings row (contextual)
├─────────────────────────────────────────────┤
│  ☝  ↗  ✎▾  ◇  □▾  —▾  A  ⧉              │  ← Tools row (fixed)
└─────────────────────────────────────────────┘
```

- **Bottom row (tools):** Hand, Selection, Pencil▾, Eraser, Shapes▾, Line▾, Text, Extra tools (⧉)
- **Top row (settings):** Context-sensitive controls for the active tool. Expands/collapses with animation.

### Interaction Model

- **Tap tool** = select tool + open dropdown (if tool has variants like pencil/marker, shape presets, line/arrow). Tap canvas closes dropdown.
- **Carets (▾)** on tools that have dropdown variants (pencil, shapes, line).
- **Settings row** appears immediately when a tool with settings is selected. No extra taps needed.
- **Tools without settings** (hand, eraser, selection with nothing selected): settings row collapses with animation.
- **Extra tools (⧉):** dropdown list opens upward. No settings row — selected tools from this menu (laser, frame, image, embed) have no inline settings.

### Context-Sensitive Settings Per Tool

| Tool | Settings shown |
|------|---------------|
| Pencil | stroke color, stroke width, opacity |
| Highlighter | stroke color, stroke width, opacity |
| Rectangle/Shape | stroke color, fill color, stroke width, stroke style |
| Line/Arrow | stroke color, stroke width, stroke style |
| Text | color, font size |
| Hand | _(none — row collapses)_ |
| Eraser | _(none — row collapses)_ |
| Selection (no element) | _(none — row collapses)_ |
| Selection (element selected) | settings matching element type |

### Animation

- Settings row expand/collapse: `max-height` transition, `cubic-bezier(0.4, 0, 0.2, 1)`, ~250ms
- Dropdown popups: scale + translate animation, ~200ms
- Content crossfade when switching between tools with different settings

### Dropdowns

Dropdowns (shape presets, line variants, pencil/marker toggle) pop up ABOVE the unified toolbar, same as current ToolPopover behavior but now above the full two-row block. Since MobileShapeActions no longer exists as a separate element, there is no z-index overlap issue.

### What This Replaces

- **`MobileShapeActions` component** — fully replaced. All its functionality (color pickers, stroke settings, arrow properties, text properties, extra actions) moves into the settings row.
- **`PropertiesPopover` on mobile** — no longer needed for basic settings. Color/width/style are inline. Advanced settings (if any) could still use popovers from the settings row.
- **The CSS `:has()` hide fix** from the dropdown overlap bug — no longer needed since there's no separate MobileShapeActions to overlap.

### What Stays

- **Top bar** (hamburger menu + undo/redo) — unchanged
- **ToolPopover** mechanism — reused for dropdowns, just repositioned
- **Three independent toolSettings sets** (pencil/highlighter/shape) — still used, settings row reads from the active set
- **Desktop/tablet layout** — unchanged, this only affects phone formFactor

## Files to Modify

| File | Change |
|------|--------|
| `packages/excalidraw/components/MobileMenu.tsx` | Replace MobileShapeActions + Island.App-toolbar with new UnifiedMobileToolbar |
| `packages/excalidraw/components/MobileToolBar.tsx` | Major refactor — add settings row, contextual settings rendering, expand/collapse logic |
| `packages/excalidraw/components/MobileToolBar.scss` | New styles for two-row layout, animations, settings row |
| `packages/excalidraw/components/Actions.tsx` | Extract settings rendering logic from MobileShapeActions into reusable pieces |
| `packages/excalidraw/components/Actions.scss` | Remove `.mobile-shape-actions` styles (and the `:has()` rule from the overlap fix) |
| `packages/excalidraw/components/ToolPopover.tsx` | Possibly adjust sideOffset for new toolbar height |

## Testing

- On mobile (or DevTools phone emulation):
  - Select pencil → settings row expands with color, width, opacity
  - Select rectangle → settings row changes to color, fill, width, style
  - Select hand → settings row collapses
  - Switch pencil → rectangle → pencil: settings row content changes with crossfade
  - Open shape presets dropdown → appears above toolbar, no overlap
  - Tap canvas → dropdown closes, settings stay visible
  - Change color/width in settings row → applies immediately to next drawn element
  - Verify desktop/tablet layout is unaffected
