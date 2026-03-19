# Two-Row Mobile Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate MobileShapeActions bar + toolbar with a single unified two-row toolbar where context-sensitive settings are always visible upon tool selection.

**Architecture:** The bottom of the mobile screen gets a single `Island` containing two rows: a tools row (fixed) and a settings row (context-sensitive, animated expand/collapse). MobileShapeActions is removed. Settings rendering reuses existing `renderAction()` calls from Actions.tsx. Dropdowns (ToolPopover, DropdownMenu) open above the unified block.

**Tech Stack:** React, Radix UI Popover/DropdownMenu, SCSS with CSS transitions, existing excalidraw action system.

**Spec:** `docs/superpowers/specs/2026-03-19-two-row-mobile-toolbar-design.md`

---

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `packages/excalidraw/components/MobileSettingsRow.tsx` | **Create** | Context-sensitive settings row component. Reads active tool + selected elements, renders appropriate action buttons inline. |
| `packages/excalidraw/components/MobileSettingsRow.scss` | **Create** | Styles for settings row: layout, expand/collapse animation, separator styling. |
| `packages/excalidraw/components/MobileToolBar.tsx` | **Modify** | Import and render `MobileSettingsRow` above the tools row inside the same Island. |
| `packages/excalidraw/components/MobileToolBar.scss` | **Modify** | Add two-row layout container styles, adjust overflow for dropdowns. |
| `packages/excalidraw/components/MobileMenu.tsx` | **Modify** | Remove `MobileShapeActions` import and rendering. Simplify `App-bottom-bar` to only contain the unified toolbar Island. |
| `packages/excalidraw/components/Actions.tsx` | **Modify** | Export `canChangeStrokeColor`, `canChangeBackgroundColor` (already exported), and the visibility guard logic (`shouldShowCombinedProperties`) for reuse. Keep `MobileShapeActions` temporarily until Task 4 removes it. |
| `packages/excalidraw/components/Actions.scss` | **Modify** | Remove `.mobile-shape-actions` styles and the `:has()` CSS rule from the dropdown overlap fix. |

---

### Task 1: Create MobileSettingsRow component

**Files:**

- Create: `packages/excalidraw/components/MobileSettingsRow.tsx`
- Create: `packages/excalidraw/components/MobileSettingsRow.scss`

This component renders context-sensitive action buttons for the active tool. It reuses the existing `renderAction()` pattern from MobileShapeActions, but rendered inline without the Island wrapper and undo/redo buttons.

- [ ] **Step 1: Create MobileSettingsRow.tsx**

```tsx
import clsx from "clsx";

import {
  hasBackground,
  isTransparent,
  hasStrokeWidth,
  hasStrokeStyle,
  canChangeRoundness,
  toolIsArrow,
  isTextElement,
} from "@excalidraw/element";

import { getTargetElements } from "../scene";

import { canChangeStrokeColor, canChangeBackgroundColor } from "./Actions";
import { useExcalidrawContainer } from "./App";

import "./MobileSettingsRow.scss";

import type { ActionManager } from "../actions/manager";
import type { AppClassProperties, AppState, UIAppState } from "../types";
import type {
  NonDeletedElementsMap,
  NonDeletedSceneElementsMap,
  ExcalidrawElement,
} from "@excalidraw/element/types";

// Tools that have no settings — settings row should collapse
const NO_SETTINGS_TOOLS = new Set([
  "selection",
  "eraser",
  "hand",
  "laser",
  "lasso",
]);

export const MobileSettingsRow = ({
  appState,
  elementsMap,
  renderAction,
  app,
  setAppState,
}: {
  appState: UIAppState;
  elementsMap: NonDeletedElementsMap | NonDeletedSceneElementsMap;
  renderAction: ActionManager["renderAction"];
  app: AppClassProperties;
  setAppState: React.Component<any, AppState>["setState"];
}) => {
  const targetElements = getTargetElements(elementsMap, appState);
  const { container } = useExcalidrawContainer();

  const hasSettings =
    targetElements.length > 0 ||
    !NO_SETTINGS_TOOLS.has(appState.activeTool.type);

  return (
    <div
      className={clsx("mobile-settings-row", {
        "mobile-settings-row--collapsed": !hasSettings,
      })}
    >
      {hasSettings && (
        <div className="mobile-settings-row__content">
          {canChangeStrokeColor(appState, targetElements) && (
            <div className="mobile-settings-row__item">
              {renderAction("changeStrokeColor")}
            </div>
          )}
          {canChangeBackgroundColor(appState, targetElements) && (
            <div className="mobile-settings-row__item">
              {renderAction("changeBackgroundColor")}
            </div>
          )}
          {(hasStrokeWidth(appState.activeTool.type) ||
            targetElements.some((el) => hasStrokeWidth(el.type))) && (
            <div className="mobile-settings-row__item">
              {renderAction("changeStrokeWidth")}
            </div>
          )}
          {(hasStrokeStyle(appState.activeTool.type) ||
            targetElements.some((el) => hasStrokeStyle(el.type))) && (
            <div className="mobile-settings-row__item">
              {renderAction("changeStrokeStyle")}
            </div>
          )}
          {(canChangeRoundness(appState.activeTool.type) ||
            targetElements.some((el) => canChangeRoundness(el.type))) && (
            <div className="mobile-settings-row__item">
              {renderAction("changeRoundness")}
            </div>
          )}
          {(toolIsArrow(appState.activeTool.type) ||
            targetElements.some((el) => toolIsArrow(el.type))) && (
            <div className="mobile-settings-row__item">
              {renderAction("changeArrowType")}
            </div>
          )}
          {(appState.activeTool.type === "text" ||
            targetElements.some(isTextElement)) && (
            <div className="mobile-settings-row__item">
              {renderAction("changeFontFamily")}
            </div>
          )}
          <div className="mobile-settings-row__item">
            {renderAction("changeOpacity")}
          </div>
        </div>
      )}
    </div>
  );
};
```

Note: The exact imports for `hasStrokeWidth`, `hasStrokeStyle`, `canChangeRoundness` need to be verified — they are currently imported in `Actions.tsx` from `@excalidraw/element`. Check that they are exported from that package's index. If not, import from the specific submodule (e.g., `@excalidraw/element/src/typeChecks`).

- [ ] **Step 2: Create MobileSettingsRow.scss**

```scss
.excalidraw {
  .mobile-settings-row {
    overflow: hidden;
    transition: max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s
        ease-out, padding 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    max-height: 40px;
    opacity: 1;
    padding: 4px 8px;
    border-bottom: 1px solid var(--default-border-color);
  }

  .mobile-settings-row--collapsed {
    max-height: 0;
    opacity: 0;
    padding: 0 8px;
    border-bottom-color: transparent;
  }

  .mobile-settings-row__content {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .mobile-settings-row__item {
    flex-shrink: 0;
    pointer-events: all;
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd packages/excalidraw && npx tsc --noEmit 2>&1 | head -20`

Fix any import issues. The key risk is `hasStrokeWidth`, `hasStrokeStyle`, `canChangeRoundness` exports — verify they are accessible from `@excalidraw/element`.

- [ ] **Step 4: Commit**

```bash
git add packages/excalidraw/components/MobileSettingsRow.tsx packages/excalidraw/components/MobileSettingsRow.scss
git commit -m "feat(mobile): add MobileSettingsRow component for two-row toolbar"
```

---

### Task 2: Integrate MobileSettingsRow into MobileToolBar

**Files:**

- Modify: `packages/excalidraw/components/MobileToolBar.tsx`
- Modify: `packages/excalidraw/components/MobileToolBar.scss`

The MobileToolBar currently returns a flat `<div className="mobile-toolbar">` with tool buttons. We need to wrap it in a two-row structure: settings row on top, tools row on bottom.

- [ ] **Step 1: Add props for settings rendering**

`MobileToolBar` needs access to `elementsMap`, `renderAction`, and `setAppState` to pass to `MobileSettingsRow`. Check the current props interface at MobileToolBar.tsx line ~195-230 and add missing props.

The component currently receives `app` (AppClassProperties) — from which we can get `app.scene.getNonDeletedElementsMap()` and `app.state`. But `renderAction` must come from the parent. Add it as a prop.

In `MobileToolBar.tsx`, update the props type to include:

```tsx
renderAction: ActionManager["renderAction"];
```

- [ ] **Step 2: Restructure MobileToolBar render**

Wrap the existing tool buttons in a `<div className="mobile-toolbar__tools-row">` and add `MobileSettingsRow` above it:

```tsx
return (
  <div className="mobile-toolbar" ref={...}>
    <MobileSettingsRow
      appState={app.state}
      elementsMap={app.scene.getNonDeletedElementsMap()}
      renderAction={renderAction}
      app={app}
      setAppState={setAppState}
    />
    <div className="mobile-toolbar__tools-row">
      {/* all existing tool buttons stay here unchanged */}
    </div>
  </div>
);
```

Move all the existing tool button JSX (HandButton, ToolPopovers, ToolButtons, DropdownMenu) inside `mobile-toolbar__tools-row`.

- [ ] **Step 3: Update MobileToolBar.scss for two-row layout**

```scss
.excalidraw {
  .mobile-toolbar {
    display: flex;
    flex-direction: column; /* changed from implicit row */
    border-radius: var(--space-factor);
    overflow: visible; /* allow dropdowns to escape */
  }

  .mobile-toolbar__tools-row {
    display: flex;
    align-items: center;
    padding: 0px;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    justify-content: space-between;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  /* Move existing .mobile-toolbar .ToolIcon rules to target tools-row */
  .mobile-toolbar__tools-row .ToolIcon {
    /* ... keep existing ToolIcon styles ... */
  }
}
```

- [ ] **Step 4: Pass renderAction from MobileMenu → MobileToolBar**

In `MobileMenu.tsx`, the `renderToolbar()` function (defined around line 96-120) creates `<MobileToolBar>`. Add `renderAction={actionManager.renderAction}` prop.

Check `MobileMenu.tsx` line ~96:

```tsx
const renderToolbar = () => (
  <MobileToolBar
    activeTool={appState.activeTool}
    // ... existing props ...
    renderAction={actionManager.renderAction} // ADD THIS
    setAppState={setAppState} // ADD THIS if not already passed
  />
);
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd H:/excalidraw && yarn test:typecheck` (via yarn wrapper)

- [ ] **Step 6: Commit**

```bash
git add packages/excalidraw/components/MobileToolBar.tsx packages/excalidraw/components/MobileToolBar.scss
git commit -m "feat(mobile): integrate settings row into two-row toolbar layout"
```

---

### Task 3: Remove MobileShapeActions from MobileMenu

**Files:**

- Modify: `packages/excalidraw/components/MobileMenu.tsx`
- Modify: `packages/excalidraw/components/Actions.scss`

Now that MobileToolBar has its own settings row, remove the separate MobileShapeActions from MobileMenu.

- [ ] **Step 1: Remove MobileShapeActions from MobileMenu.tsx**

In `MobileMenu.tsx`:

- Remove `MobileShapeActions` from import (line 10)
- Remove `<MobileShapeActions ... />` rendering (lines 139-145)
- The `App-bottom-bar` should now only contain the `Island.App-toolbar`:

```tsx
<div
  className="App-bottom-bar"
  style={{ marginBottom: SCROLLBAR_WIDTH + SCROLLBAR_MARGIN }}
>
  <Island className="App-toolbar">
    {!appState.viewModeEnabled &&
      appState.openDialog?.name !== "elementLinkSelector" &&
      renderToolbar()}
    {/* scrollBackToContent button stays */}
  </Island>
</div>
```

- [ ] **Step 2: Clean up Actions.scss**

Remove the `.mobile-shape-actions` block (lines 190-202) and the `:has()` CSS rule we added for the dropdown overlap fix:

```scss
// REMOVE ALL OF THIS:
.mobile-shape-actions { ... }
.App-bottom-bar:has(.App-toolbar [data-state="open"]) > .mobile-shape-actions { ... }
```

The `transition: visibility 0s, opacity 0.15s ease-out;` we added to `.mobile-shape-actions` is also removed since the class no longer exists.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd H:/excalidraw && yarn test:typecheck`

- [ ] **Step 4: Run lint**

Run: `cd H:/excalidraw && yarn fix`

Ensure 0 warnings. Fix any unused imports (e.g., `MobileShapeActions` if no longer imported anywhere).

- [ ] **Step 5: Commit**

```bash
git add packages/excalidraw/components/MobileMenu.tsx packages/excalidraw/components/Actions.scss
git commit -m "refactor(mobile): remove MobileShapeActions, use two-row toolbar"
```

---

### Task 4: Adjust dropdown positioning for new toolbar height

**Files:**

- Modify: `packages/excalidraw/components/ToolPopover.tsx` (possibly)
- Modify: `packages/excalidraw/components/ToolPopover.scss`

The toolbar is now taller (two rows). Dropdowns that open upward need their `sideOffset` verified to not overlap or gap incorrectly.

- [ ] **Step 1: Check ToolPopover sideOffset**

In `ToolPopover.tsx` line 57: `const SIDE_OFFSET = 32 / 2 + 10;` (= 26px). This was calculated for a single-row toolbar. The tools row height hasn't changed, so the offset should still be correct — the popover anchors to the trigger button, not the toolbar container.

Verify visually by running the dev server. If the dropdown opens too close to or overlapping the settings row, increase `SIDE_OFFSET`.

- [ ] **Step 2: Ensure overflow: visible on .mobile-toolbar**

In `MobileToolBar.scss`, the `.mobile-toolbar` had `overflow-x: auto` which clips dropdowns. We changed it to `overflow: visible` in Task 2. But `.mobile-toolbar__tools-row` needs `overflow-x: auto` for horizontal scrolling of tools.

Verify that dropdowns from tools-row can escape the container. If not, the ToolPopover content may need a portal (like PropertiesPopover). But since we raised z-index in the overlap fix and removed MobileShapeActions, this should work.

- [ ] **Step 3: Verify extra tools dropdown (⧉)**

The extra tools `DropdownMenu.Content` has `side="top"` at MobileToolBar.tsx line 562. Verify it opens above the full two-row toolbar, not between the rows.

If it renders between rows, add `sideOffset` to account for the settings row height, or ensure `overflow: visible` propagates correctly.

- [ ] **Step 4: Commit if changes needed**

```bash
git add packages/excalidraw/components/ToolPopover.tsx packages/excalidraw/components/ToolPopover.scss packages/excalidraw/components/MobileToolBar.scss
git commit -m "fix(mobile): adjust dropdown positioning for two-row toolbar"
```

---

### Task 5: Build, verify, and publish debug version

**Files:** None new — verification only.

- [ ] **Step 1: Run full checks**

```bash
cd H:/excalidraw
yarn fix                    # lint + format (0 warnings)
yarn test:typecheck         # TypeScript
```

(Use yarn wrapper: `/c/Users/1/.corepack/v1/yarn/1.22.22/bin/yarn.js`)

- [ ] **Step 2: Build ESM package**

```bash
cd packages/excalidraw
yarn build:esm
```

- [ ] **Step 3: Bump version and publish**

In `packages/excalidraw/package.json`, set version to next debug tag (check current version first — may be `0.26.56-debug.2` or similar).

```bash
cd packages/excalidraw
npm publish --tag debug
```

- [ ] **Step 4: Install in billion-dollars**

```bash
cd h:/billion-dollars/apps/frontend
npm install @emevart/excalidraw@<version>
```

Verify `package.json` and `package-lock.json` both updated.

- [ ] **Step 5: Test on mobile device**

Open sdamex.com on phone or DevTools phone emulation:

- Select pencil → settings row expands with color/width/opacity buttons
- Select rectangle → settings row shows color/fill/width/style buttons
- Select hand → settings row collapses smoothly
- Open shape presets dropdown → appears above full toolbar, no overlap
- Open extra tools (⧉) → dropdown above toolbar
- Tap canvas → dropdowns close, settings stay visible
- Change color via settings row → applies to next drawn element

- [ ] **Step 6: Commit final state**

```bash
git add -A
git commit -m "chore: bump version for two-row mobile toolbar debug build"
```
