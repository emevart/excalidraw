# Drag & Drop Image from Card to Board — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to drag images from problem cards onto the inline excalidraw whiteboard.

**Architecture:** Two-sided change: (1) make `<img>` elements in billion-dollars draggable with `text/uri-list` in dataTransfer, (2) add a new code path in excalidraw's `handleAppOnDrop` that detects `text/uri-list`, fetches the URL via existing `ImageURLToFile`, and inserts via existing `insertImages()`.

**Tech Stack:** HTML5 Drag & Drop API, existing `ImageURLToFile` (fetch → blob → File), existing `insertImages()` flow.

**Spec:** `docs/superpowers/specs/2026-03-18-board-features-design.md` § 3

---

### Task 1: Make problem card images draggable (billion-dollars)

**Files:**

- Modify: `h:\billion-dollars\apps\frontend\features\problems\components\shared\components\ProblemImages.tsx`

- [ ] **Step 1: Add draggable + onDragStart to image elements**

In `ProblemImages.tsx`, find the `<Image>` (Next.js) or `<img>` elements that render `content_images` / `solution_images`. Add:

```tsx
draggable="true"
onDragStart={(e) => {
  e.dataTransfer.setData("text/uri-list", image.url);
  e.dataTransfer.setData("text/plain", image.url);
  e.dataTransfer.effectAllowed = "copy";
}}
```

- [ ] **Step 2: Verify drag works in browser**

Open a problem card with images, try dragging an image. Browser should show a drag preview. No drop target yet — image should snap back on release.

- [ ] **Step 3: Commit**

```bash
cd h:/billion-dollars
git add apps/frontend/features/problems/components/shared/components/ProblemImages.tsx
git commit -m "feat: make problem card images draggable for whiteboard drop"
```

---

### Task 2: Handle image URL drops in excalidraw (excalidraw)

**Files:**

- Modify: `H:\excalidraw\packages\excalidraw\components\App.tsx` — `handleAppOnDrop` (line ~12477)

**Context:** `handleAppOnDrop` handles drops in order: scene files → image files → library items → other files → text/embeddable. The new code path goes **before** the text/embeddable handler (line ~12579), so image URLs are caught before embeddable validation rejects them.

The existing `ImageURLToFile` function (`packages/excalidraw/data/blob.ts:369`) already does `fetch(url) → blob → File` with MIME validation. The existing `insertImages` method (`App.tsx:12415`) handles placement.

- [ ] **Step 1: Add import for ImageURLToFile**

Check if `ImageURLToFile` is already imported in App.tsx. If not, add:

```typescript
import { ImageURLToFile } from "../data/blob";
```

- [ ] **Step 2: Add image URL drop handler in handleAppOnDrop**

Insert this block **before** the `MIME_TYPES.text` embeddable handler (line ~12579), **after** the other files handler (line ~12577):

```typescript
// Handle image URL drops (e.g., dragged from problem card)
const uriList = event.dataTransfer.getData("text/uri-list");
if (uriList) {
  // text/uri-list format: lines starting with # are comments
  const imageUrl = uriList
    .split("\n")
    .find((line) => !line.startsWith("#"))
    ?.trim();

  if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
    try {
      const file = await ImageURLToFile(imageUrl);
      if (file) {
        await this.insertImages([file], sceneX, sceneY);
        return;
      }
    } catch {
      // Not a valid image URL — fall through to embeddable handler
    }
  }
}
```

Key design decisions:

- Uses `text/uri-list` (set by our drag source), not `text/plain` — avoids catching arbitrary text drops
- `ImageURLToFile` validates MIME type internally — only supported image formats pass
- On failure, silently falls through to existing embeddable handler (no user-facing error)
- `sceneX`/`sceneY` are already computed at top of `handleAppOnDrop` from the drop event coordinates

- [ ] **Step 3: Run typecheck**

```bash
cd H:/excalidraw && yarn test:typecheck
```

Expected: PASS

- [ ] **Step 4: Manual test — drag image from card to inline whiteboard**

1. Start billion-dollars dev server
2. Open a problem with images and inline whiteboard
3. Drag an image from the problem card onto the whiteboard
4. Image should appear on the canvas at drop position

- [ ] **Step 5: Commit**

```bash
cd H:/excalidraw
git add packages/excalidraw/components/App.tsx
git commit -m "feat: handle image URL drops on canvas from external drag sources"
```

---

### Task 3: Publish and install

- [ ] **Step 1: Bump version, update CHANGELOG, tag, publish**

Follow the standard release flow from CLAUDE.md.

- [ ] **Step 2: Install in billion-dollars**

```bash
cd h:/billion-dollars/apps/frontend
NPM_TOKEN=<token> npm install @emevart/excalidraw@<new-version>
```

Commit both `package.json` and `package-lock.json`.

- [ ] **Step 3: End-to-end verification**

Test the full flow: drag image from problem card → drops onto inline whiteboard → image element created.
