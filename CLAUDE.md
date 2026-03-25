# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

Excalidraw is a **monorepo** with a clear separation between the core library and the application:

- **`packages/excalidraw/`** - Main React component library published to npm as `@excalidraw/excalidraw`
- **`excalidraw-app/`** - Full-featured web application (excalidraw.com) that uses the library
- **`packages/common/`** - Shared utilities, constants, colors (`@excalidraw/common`)
- **`packages/element/`** - Element/shape manipulation logic (`@excalidraw/element`)
- **`packages/math/`** - 2D math library with branded types (`@excalidraw/math`)
- **`packages/utils/`** - Export utilities and image processing (`@excalidraw/utils`)
- **`examples/`** - Integration examples (NextJS, browser script)

## Development Commands

```bash
yarn start               # Start dev server
yarn test:typecheck      # TypeScript type checking
yarn test:app            # Run vitest tests once
yarn test:update         # Run all tests with snapshot updates (use before committing)
yarn fix                 # Auto-fix formatting and linting issues
yarn build:packages      # Build all packages
```

### Running a single test file

```bash
yarn vitest run packages/excalidraw/tests/App.test.tsx
```

## Architecture

### Package Dependencies

```
@excalidraw/excalidraw
  ├── @excalidraw/element
  │     ├── @excalidraw/math
  │     └── @excalidraw/common
  └── @excalidraw/common
```

In tests, packages are aliased directly to their `src/` directories (see `vitest.config.mts`), so no build step is needed when developing.

### State Management

Uses **Jotai** for atomic state management, scoped via `jotai-scope` to allow component isolation. The store is `EditorJotaiProvider` / `editorJotaiStore` in `packages/excalidraw/editor-jotai.ts`.

**AppState** (`packages/excalidraw/appState.ts`) holds global editor state: theme, zoom, viewport, active tool, selection, UI state, export settings.

### Element System (`@excalidraw/element`)

Core logic for all element types. Key files (all large — 50–85KB each):

- `binding.ts` — arrow/element binding
- `linearElementEditor.ts` — line/arrow editing
- `elbowArrow.ts` — elbow arrow routing
- `delta.ts` — collaborative delta operations

### Math System (`@excalidraw/math`)

Uses **branded types** for type safety — never use plain `{ x, y }` objects. Always import from `packages/math/src/types.ts`:

- `GlobalPoint`, `LocalPoint` — coordinate space-specific points
- `Vector`, `Radians`, `Degrees` — other geometry primitives

### Actions System

48+ action handlers in `packages/excalidraw/actions/` handle editor operations. Each action follows the `Action` interface.

### Rendering

Canvas-based rendering pipeline in `packages/excalidraw/renderer/`. Elements are rendered statically to canvas via Rough.js.

## Code Conventions

- Functional components with hooks only; no class components
- CSS modules for component styling
- PascalCase for components/types/interfaces, camelCase for functions, ALL_CAPS for constants
- Prefer immutable data (`const`, `readonly`)
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Prefer performant solutions; avoid unnecessary allocations in hot paths
