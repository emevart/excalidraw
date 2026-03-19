# CLAUDE.md

> SdamExDraw — интерактивная доска для решения задач на sdamex.com. Публикуется как `@emevart/excalidraw` в GitHub Packages. Репо: `emevart/sdamexdraw`.

## Project Structure

Монорепо на Yarn workspaces:

- **`packages/excalidraw/`** — основная React-библиотека, публикуется как `@emevart/excalidraw`
- **`packages/common/`**, **`packages/element/`**, **`packages/math/`**, **`packages/utils/`** — внутренние пакеты (бандлятся в excalidraw, не публикуются отдельно)
- **`excalidraw-app/`** — демо-приложение excalidraw.com (не используется)
- **`e2e/`** — Playwright визуальные тесты

## Fork Customizations

Создано на основе excalidraw (upstream tag: `v0.18.0`). Форк расходится с upstream, в upstream не контрибьютим.

- **Compact styles panel** -- forced for all non-phone devices (`deriveStylesPanelMode` in `packages/common/src/editorInterface.ts`)
- **Russian keyboard ЙЦУКЕН** -- hotkeys work on Russian layout via `getLatinKey()` + Proxy in `App.tsx` (`packages/common/src/keys.ts`, `packages/excalidraw/components/App.tsx`, `packages/excalidraw/components/shapes.tsx`)
- **Preferences in hamburger menu** -- grid toggle, grid snap toggle, and other settings (`packages/excalidraw/components/LayerUI.tsx`)
- **Render crash protection** -- try-catch wrapper in `_renderInteractiveScene` (`packages/excalidraw/renderer/interactiveScene.ts`)
- **Selection/Lasso ToolPopover** -- toggle in compact mode, deduplicated with `renderedSelectionPopover` ref (`packages/excalidraw/components/Actions.tsx`)
- **TS 5.7 fixes** -- ArrayBuffer/BufferSource type assertions across multiple files
- **Wireframe (3D preset) UX** -- click-through vertex drag on first click, `move` cursor on vertex hover, wider edge grab zone (10px), block double-click group entry for wireframes, vertex priority over resize handles (`packages/excalidraw/components/App.tsx`)
- **Draggable cone apex** -- shared vertex ID `"APEX"` on cone lateral lines (`packages/excalidraw/shapePresets/solidFactory.ts`)
- **Two-finger double-tap undo** -- two consecutive two-finger taps on touchscreen triggers undo, tracks fingers by `touch.identifier` for reliable detection when fingers lift separately (`packages/excalidraw/components/App.tsx`)
- **Mobile toolbar presets** -- all 14 shape presets (7 2D + 7 3D) added to mobile SHAPE_TOOLS, line as default linear tool, highlighter in freedraw dropdown (`packages/excalidraw/components/MobileToolBar.tsx`)
- **Mobile dropdown positioning** -- extra tools dropdown opens upward (`side="top"`) to stay within canvas bounds (`packages/excalidraw/components/MobileToolBar.tsx`, `packages/excalidraw/components/dropdownMenu/DropdownMenuContent.tsx`)
- **Canvas background color picks** -- TopPicks visible in compact mode for canvas background (`packages/excalidraw/components/ColorPicker/ColorPicker.tsx`)
- **Linear editor safety** -- "Edit line" action requires `selectedLinearElement` in state, prevents crash on non-linear elements (`packages/excalidraw/actions/actionLinearEditor.tsx`, `packages/excalidraw/components/Actions.tsx`)
- **Confirm dialog compact** -- confirm dialog never goes fullscreen in compact/phone mode (`packages/excalidraw/components/ConfirmDialog.scss`)
- **Triangular prism edges** -- right lateral and top-left edges rendered solid (not dashed) (`packages/excalidraw/shapePresets/solidFactory.ts`)
- **Mobile 2D shape bounding box** -- `hasBoundingBox()` returns true for polygon presets on mobile; transform handle hit-test enabled for polygon presets (`packages/element/src/transformHandles.ts`, `packages/excalidraw/components/App.tsx`)
- **Stroke width slider** -- discrete range slider with squiggle preview replacing 3 radio buttons; pencil 0.5-8/step 0.5, highlighter 8-40/step 2 (`packages/excalidraw/components/StrokeWidthRange.tsx`, `packages/excalidraw/actions/actionProperties.tsx`)
- **Highlighter tool** -- freedraw preset mode with popup toggle (pencil/marker), yellow default color, three independent settings sets (pencil/highlighter/shape), mobile toolbar support (`packages/excalidraw/components/App.tsx`, `packages/excalidraw/components/Actions.tsx`, `packages/excalidraw/components/MobileToolBar.tsx`)
- **Custom tooltips** -- replaced native `title=` with `<Tooltip>` component (400ms delay, 11px font), hover effects on all buttons, Apple Pencil hover support (`packages/excalidraw/components/Tooltip.tsx`, `packages/excalidraw/components/ToolButton.tsx`, etc.)
- **Grid snap toggle** -- separate from grid visibility, in hamburger preferences, default off (`packages/excalidraw/appState.ts`, `packages/excalidraw/components/App.tsx`, `packages/excalidraw/actions/actionToggleGridSnap.tsx`)
- **LaserPointer freedraw rendering** -- replaced perfect-freehand with `@excalidraw/laser-pointer` for freedraw outline generation; 75° corner detection eliminates spike artifacts (`packages/element/src/shape.ts`)
- **i18n Russian complete** -- all keys translated + 13 quality fixes (crowfoot→вороньи лапки, typos, awkward translations) (`packages/excalidraw/locales/ru-RU.json`)
- **Zoom controls alignment** -- uses `--editor-container-padding` like toolbar (`packages/excalidraw/css/styles.scss`)
- **Hold-to-straighten** -- Procreate-style: holding freedraw pointer still 500ms straightens to line (low deviation) or smooths curve (moving average, radius=3). Stillness timer in pointerMove, animation via rAF, `wasStraightened` flag skips final point append on pointerUp (`packages/excalidraw/components/App.tsx`, `packages/excalidraw/straighten.ts`, `packages/common/src/constants.ts`)
- **Image URL drop** -- `handleAppOnDrop` handles `text/uri-list` drops: fetch URL via `ImageURLToFile` → `insertImages()`. Enables drag from external sources (`packages/excalidraw/components/App.tsx`)
- **Minimap** -- toggleable canvas minimap left of zoom controls in Footer. Renders actual element shapes (freedraw paths, lines, ellipses, diamonds, rectangles). Click/drag to navigate. Hidden on phone formFactor and zen mode (`packages/excalidraw/components/Minimap.tsx`, `packages/excalidraw/components/Minimap.scss`, `packages/excalidraw/components/footer/Footer.tsx`)
- **ExcalidrawImperativeAPI undo/redo** -- `history.undo()` and `history.redo()` methods exposed via API for programmatic calls from external toolbars (`packages/excalidraw/components/App.tsx`, `packages/excalidraw/types.ts`)

## Development Flow

### Making Changes

1. Edit code in `packages/*`
2. Run checks before committing:

```bash
yarn fix              # Auto-fix lint + formatting (must pass with 0 warnings)
yarn test:typecheck   # TypeScript type checking
```

3. Commit and push to `master`
4. CI (`ci.yml`) автоматически проверит typecheck + build

### Releasing a Version

1. Bump version in `packages/excalidraw/package.json`
2. Update `CHANGELOG.md` — добавить секцию для новой версии
3. Commit, push to `master`
4. Create and push tag:

```bash
git tag v0.26.64
git push --tags
```

5. CI (`publish.yml`) автоматически сбилдит и опубликует в GitHub Packages

> **Debug-версии** (e.g. `0.26.57-debug.1`) — для итераций. Финальная версия — чистый bumр без суффикса.

### Delivering to Production (SdamEx)

1. Wait for publish CI to complete
2. In `h:/billion-dollars/apps/frontend/`:

```bash
NPM_TOKEN=<token> npm install @emevart/excalidraw@<version>
```

3. Verify `package.json` AND `package-lock.json` both updated (`npm ci` requires sync)
4. Commit both files, push to `develop`
5. Create PR `develop` -> `main`, enable auto-merge
6. CI runs: lint, typecheck, build, tests
7. After merge, staging deploys automatically

### Checklist (copy-paste for PRs)

```
- [ ] yarn fix (0 warnings)
- [ ] yarn test:typecheck
- [ ] Version bumped in package.json
- [ ] CHANGELOG.md updated
- [ ] Tag pushed (v*) — CI publishes automatically
- [ ] Installed in billion-dollars (package.json + package-lock.json)
- [ ] Dev server tested locally
```

## CI / Branch Protection

- **`ci.yml`** — typecheck + build on push to master
- **`publish.yml`** — automated npm publish on `v*` tags (typecheck + build + publish)
- **Branch protection on master** — force push и удаление ветки запрещены
- PRs для `gh pr create` — всегда `--repo emevart/sdamexdraw` (НЕ upstream)

## Architecture Notes

### Package System

- Uses Yarn workspaces for monorepo management
- Internal packages use path aliases (see `vitest.config.mts`)
- Build system uses esbuild for packages, Vite for the app
- TypeScript throughout with strict configuration
- `@excalidraw/common`, `@excalidraw/element`, `@excalidraw/math` are bundled via alias in `scripts/buildPackage.js`

### Key Interfaces

- `StylesPanelMode`: `"compact" | "full" | "mobile"` -- controls properties panel rendering
- `EditorInterface.formFactor`: `"phone" | "tablet" | "desktop"` -- detected from editor dimensions
- `deriveStylesPanelMode()` -- maps formFactor to panel mode (phone -> mobile, rest -> compact)
- `toolSettings`: three independent sets (pencil/highlighter/shape) for strokeWidth, opacity, strokeColor
- `activeSettingsKey`: tracks which settings set is active, switched in `setActiveTool`

### Gotchas

- **TS 5.7 ArrayBuffer breaking change** -- `Uint8Array.buffer` returns `ArrayBufferLike`, not `ArrayBuffer`. Use `as ArrayBuffer` / `as BufferSource` / `as BlobPart` assertions where needed.
- **`npm ci` requires lock file sync** -- always commit both `package.json` and `package-lock.json` in the consumer project, otherwise CI fails.
- **max-warnings=0** -- ESLint is configured to fail on any warning. Clean up unused imports before committing.
- **Dev server must be stopped** before `yarn add` / `npm install` on Windows -- otherwise EPERM on locked `.node` files.
- **React Strict Mode** -- double-render can cause forEach/map crashes in scene renderers; try-catch wrapper protects against this.
- **LaserPointer size = radius** -- unlike perfect-freehand where size = diameter. When configuring `sizeMapping`, ensure `size * sizeMapping() >= 1.1` for proper start cap generation.
- **Touch identifier tracking** -- always use `touch.identifier` to match fingers across touchstart/touchend events. Array index matching fails when fingers lift separately.
- **Polygon preset HACK guards** -- two guards in App.tsx disable transform handles for linear elements on mobile. Polygon presets (`element.polygon === true`) must be excluded from these guards.
- **Tests** -- 38 из 104 test files падают из-за кастомизаций форка. Тесты не включены в CI. `NODE_OPTIONS="--max-old-space-size=8192"` нужен для запуска на Windows.
- **Freedraw point count sensitivity** -- LaserPointer renderer draws visually different (shorter/thinner) strokes when point count changes. Never reduce freedraw point count (RDP 200→5 or straight 200→2 causes visible shrinking). Keep same count, change positions only.
- **CI publish E403** -- `publish.yml` has `packages: write` but GitHub org/repo settings may block `GITHUB_TOKEN` write_package. Current workaround: local `npm publish` with token from `~/.npmrc`.
