# Testing Guide

This document explains the different ways tests are run in the Excalidraw monorepo.

## Test Framework

All tests use **[Vitest](https://vitest.dev/)** with a `jsdom` environment (browser-like DOM simulation). Tests run from the monorepo root — individual packages do not have their own test scripts.

Supporting libraries:
- `@testing-library/react` — component rendering and querying
- `vitest-canvas-mock` — mocks the Canvas API for rendering tests
- `fake-indexeddb` — mocks IndexedDB for storage tests
- `chai` — additional assertion utilities

## Test Commands

| Command | What it does |
|---|---|
| `yarn test` | Alias for `yarn test:app` |
| `yarn test:app` | Run all Vitest tests once |
| `yarn test:update` | Run all tests and update snapshots |
| `yarn test:coverage` | Run tests with V8 coverage report |
| `yarn test:coverage:watch` | Coverage in watch mode |
| `yarn test:ui` | Open the Vitest UI with coverage |
| `yarn test:typecheck` | TypeScript type checking (`tsc`) |
| `yarn test:code` | ESLint (zero warnings allowed) |
| `yarn test:other` | Prettier format check |
| `yarn test:all` | typecheck + lint + format + app tests |
| `yarn fix` | Auto-fix lint and formatting issues |

### Running a single test file

```bash
yarn vitest run packages/excalidraw/tests/App.test.tsx
```

### Updating snapshots

Snapshot tests capture complex state as serialized output. When intentional changes break snapshots, regenerate them with:

```bash
yarn test:update
```

Always run this before committing changes that affect snapshot output.

## Test Types

### Unit Tests

Pure function testing for math, element logic, and utility libraries. Located in the `tests/` directory of each package.

- `packages/math/tests/` — geometric math functions (points, vectors, curves)
- `packages/element/tests/` — element manipulation and transformation logic
- `packages/common/tests/` — shared utility functions
- `packages/utils/tests/` — export and image processing utilities

### Integration / Component Tests

The majority of tests live in `packages/excalidraw/tests/` and test the full editor component in a simulated DOM. These cover:

- Tool interactions (drawing, selection, resizing, rotating)
- Keyboard shortcuts
- Undo/redo history
- Bindings, grouping, alignment
- Data import/export (JSON, SVG, clipboard)
- Rendering output

App-level integration tests (collaboration, menus) live in `excalidraw-app/tests/`.

### Snapshot Tests

Used throughout the codebase for complex state comparisons. A custom serializer normalizes floating-point numbers to 5 decimal places to avoid noise from floating-point imprecision.

## Test File Locations

```
packages/excalidraw/tests/         Main editor tests
packages/element/tests/            Element logic tests
packages/common/tests/             Common utility tests
packages/math/tests/               Math library tests
packages/utils/tests/              Export/utils tests
excalidraw-app/tests/              App-level integration tests
packages/excalidraw/actions/       Some action-specific test files
packages/excalidraw/components/    Some component-specific test files
```

## Test Helpers

### `test-utils.ts`

`packages/excalidraw/tests/test-utils.ts` is the main entry point for test utilities. It re-exports everything from `@testing-library/react` plus:

- `renderApp()` — renders the full `<Excalidraw />` component, resets pointer state, waits for canvas to mount
- `assertSelectedElements()` — asserts which elements are currently selected
- `assertElements()` — deep assertion helper for element state with color-coded diffs
- `checkpointHistory()` — asserts undo/redo stack state
- `mockBoundingClientRect()` — mocks DOM layout measurements
- `withExcalidrawDimensions()` — runs a test with a custom editor size

### `helpers/ui.ts`

High-level UI interaction helpers simulating user input:

- **`Pointer`** — mouse/touch pointer events (click, drag, move, double-click)
- **`Keyboard`** — keyboard events (key press, modifier keys, shortcuts)
- **`UI`** — high-level editor interactions (tool selection, element creation, resize, rotate, crop, group/ungroup)

### `helpers/api.ts`

Programmatic test state control:

- `API.setElements()` — set the elements array directly
- `API.setAppState()` — set application state directly
- `API.setSelectedElements()` — select elements by reference
- `API.updateScene()` — update scene (wrapped in `act()`)
- Element creation factories for each element type

### `helpers/mocks.ts`

Commonly needed mocks:

- `mockThrottleRAF()` — removes async timing from throttled RAF calls
- `mockMermaidToExcalidraw()` — mocks Mermaid diagram conversion
- `mockHTMLImageElement()` — mocks the `Image` constructor

### `tests/fixtures/`

Pre-built element and diagram definitions for reuse across tests.

## Configuration

**`vitest.config.mts`** — root Vitest config:
- All `@excalidraw/*` package imports resolve directly to their `src/` directories (no build needed during development)
- `setupFiles: ["./setupTests.ts"]` — global test environment setup
- `globals: true` — `describe`, `it`, `expect` are available without imports
- Coverage thresholds: 60% lines/statements, 63% functions, 70% branches

**`setupTests.ts`** — global setup run before every test file:
- Loads `vitest-canvas-mock` for Canvas API mocking
- Polyfills `matchMedia`, `FontFace`, `setPointerCapture`
- Sets up `fake-indexeddb` for IndexedDB
- Mocks font loading to use local file system fonts

## CI

Three GitHub Actions workflows run on every PR:

| Workflow | Trigger | Runs |
|---|---|---|
| `lint.yml` | Pull request | TypeScript, ESLint, Prettier |
| `test-coverage-pr.yml` | Pull request | Vitest with coverage; posts report to PR |
| `test.yml` | Push to master | `yarn test:app` |
