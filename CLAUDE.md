# CLAUDE.md

## Fork Info

This is a **fork of Excalidraw** maintained for **SdamEx** (by Emevart). It is used as an embedded whiteboard component in the SdamEx platform. Published as `@emevart/excalidraw` to GitHub Packages.

### Key customizations vs upstream Excalidraw

- **Stripped fallback MainMenu**: removed LoadScene, SaveToActiveFile, Export, SaveAsImage, Help, social links. Kept ClearCanvas, ToggleTheme, ChangeCanvasBackground.
- **No roughness/sloppiness picker**: the architect/artist/cartoonist style selector is removed from shape actions.
- **Default roughness = 0 (architect)**: smooth lines by default instead of sketchy.
- **Default roundness = "sharp"**: sharp corners by default instead of round.
- **No DefaultSidebar**: library/search sidebar is disabled (returns null).
- **No HelpButton in footer**.
- **Package**: `@emevart/excalidraw` v0.19.0, published to GitHub Packages.

## Project Structure

Excalidraw is a **monorepo** with a clear separation between the core library and the application:

- **`packages/excalidraw/`** - Main React component library published as `@emevart/excalidraw`
- **`excalidraw-app/`** - Full-featured web application (excalidraw.com) that uses the library
- **`packages/`** - Core packages: `@excalidraw/common`, `@excalidraw/element`, `@excalidraw/math`, `@excalidraw/utils`
- **`examples/`** - Integration examples (NextJS, browser script)

## Development Workflow

1. **Package Development**: Work in `packages/*` for editor features
2. **App Development**: Work in `excalidraw-app/` for app-specific features
3. **Testing**: Always run `yarn test:update` before committing
4. **Type Safety**: Use `yarn test:typecheck` to verify TypeScript

## Development Commands

```bash
yarn test:typecheck  # TypeScript type checking
yarn test:update     # Run all tests (with snapshot updates)
yarn fix             # Auto-fix formatting and linting issues
```

## Architecture Notes

### Package System

- Uses Yarn workspaces for monorepo management
- Internal packages use path aliases (see `vitest.config.mts`)
- Build system uses esbuild for packages, Vite for the app
- TypeScript throughout with strict configuration
