# Excalidraw Learning Plan

A staged guide to understanding how this codebase fits together. Each stage builds on the previous — work through them in order.

---

## Stage 0 — Repo Orientation: How It's Assembled

**Goal:** Know what lives where before reading any code.

### Structure

```
excalidraw/
├── packages/
│   ├── math/         → @excalidraw/math      — 2D geometry, branded types
│   ├── common/       → @excalidraw/common    — constants, colors, shared utilities
│   ├── element/      → @excalidraw/element   — element types, creation, rendering logic
│   ├── excalidraw/   → @excalidraw/excalidraw — main React library (the npm package)
│   └── utils/        → @excalidraw/utils     — export/image utilities
├── excalidraw-app/   → production web app (excalidraw.com)
└── examples/         → integration examples (Next.js, browser script)
```

### Package Dependency Graph

```
excalidraw-app
  └── @excalidraw/excalidraw
        ├── @excalidraw/element
        │     ├── @excalidraw/math
        │     └── @excalidraw/common
        └── @excalidraw/common
```

`math` and `common` are the leaves — no internal deps. Everything else builds on them.

### Dev Commands

```bash
yarn start              # Dev server (localhost:5173)
yarn test:app           # Run all tests once
yarn test:update        # Run tests + update snapshots
yarn test:typecheck     # TypeScript check only
yarn fix                # Auto-format + lint
yarn build:packages     # Build all packages for publishing

# Run a single test file:
yarn vitest run packages/excalidraw/tests/App.test.tsx
```

### Key Config Files

| File | Purpose |
|------|---------|
| `package.json` | Yarn workspaces definition, root scripts |
| `vitest.config.mts` | Test setup — packages aliased to `src/` so no build step needed in dev |
| `tsconfig.json` | Root TypeScript config |

---

## Stage 1 — Foundation: Types & Math

**Goal:** Understand the primitives used everywhere before reading any logic.

### Files to Read

1. **`packages/math/src/types.ts`** — Look for how `GlobalPoint`, `LocalPoint`, `Vector`, `Radians` are defined as branded types, and what geometric shapes exist (`LineSegment`, `Curve`, `Ellipse`, etc.)

2. **`packages/element/src/types.ts`** — Look for `_ExcalidrawElementBase` (the base shape every element inherits) and the union type `ExcalidrawElement`. Note the properties: position, size, styling, versioning.

3. **`packages/common/src/constants.ts`** — Skim for `TOOL_TYPE`, `ARROW_TYPE`, `THEME`, `ROUNDNESS`. These string constants are used everywhere as discriminants.

### Key Concept: Branded Types

Plain `{x, y}` objects are banned. Instead, coordinates use branded types:

```typescript
// GlobalPoint and LocalPoint are both [number, number] tuples at runtime,
// but TypeScript treats them as different types — you can't mix them up.
type GlobalPoint = [x: number, y: number] & { readonly _brand: "globalPoint" }
type LocalPoint  = [x: number, y: number] & { readonly _brand: "localPoint" }
```

`GlobalPoint` = world/canvas space. `LocalPoint` = local to a transformed element.

Always import geometry from `@excalidraw/math` — never construct raw `[x, y]` tuples.

---

## Stage 2 — Element Lifecycle: How Shapes Exist

**Goal:** Understand how an element is created, updated, and what data it carries.

### Files to Read

1. **`packages/element/src/newElement.ts`** — Look for `newElement()`, `newRectangleElement()`, etc. These are the factories — see what defaults they set.

2. **`packages/element/src/mutateElement.ts`** — Look for `mutateElement()`. Elements are treated as immutable snapshots; this function is the controlled way to apply changes (it also bumps the version).

3. **`packages/element/src/bounds.ts`** — Look for `getElementBounds()` and `getCommonBounds()`. Understand that bounds are computed, not stored.

4. **`packages/element/src/shape.ts`** — Look for `getElementShape()`. This derives the geometry used for hit-testing and rendering from an element's data.

### Key Concept: Immutable Updates

```typescript
// WRONG — direct mutation bypasses versioning
element.x = 100

// RIGHT — use mutateElement; it bumps version + triggers re-render
mutateElement(element, { x: 100 })

// Or create a new element from an existing one:
const updated = newElementWith(element, { x: 100 })
```

### How They Connect

Elements (Stage 2) are built from the type primitives (Stage 1). `GlobalPoint` coordinates live on elements; `bounds.ts` converts element `{x, y, width, height, angle}` into `GlobalPoint` corners.

---

## Stage 3 — App State: The Global Brain

**Goal:** Know what AppState is, what lives in it, and how it's managed.

### Files to Read

1. **`packages/excalidraw/appState.ts`** — Look for `getDefaultAppState()`. This is the full shape of the editor's global state: active tool, zoom, viewport offset, theme, selection, UI toggles, export settings. ~200 properties.

2. **`packages/excalidraw/editor-jotai.ts`** — Look for `EditorJotaiProvider` and `editorJotaiStore`. This is how Jotai is scoped to allow multiple Excalidraw instances to coexist on a page.

### Key Concept: AppState vs Elements

| AppState | Elements array |
|----------|---------------|
| Editor UI state (tool, zoom, theme) | The actual shapes on the canvas |
| Ephemeral / session state | Persisted to file |
| One object, re-created on update | Array of immutable snapshots |

Both are updated together as a pair. An `ActionResult` can return changes to either or both.

### How They Connect

AppState (Stage 3) is separate from elements (Stage 2). Together they form the complete snapshot of editor state — you'll see them always passed together: `(elements, appState)`.

---

## Stage 4 — Actions: How User Interactions Become Changes

**Goal:** Understand the action dispatch loop.

### Files to Read

1. **`packages/excalidraw/actions/types.ts`** — Look for the `Action` interface (especially `perform`) and `ActionResult`. Every user operation goes through this contract.

2. **`packages/excalidraw/actions/actionDeleteSelected.ts`** — A small, readable example. Trace from `perform()` to the returned `ActionResult`.

3. **`packages/excalidraw/actions/manager.tsx`** — Look for `executeAction()`. This is the hub that receives an action and applies the result to state.

### Key Concept: The Action Loop

```
User gesture (keypress, click)
  → App.tsx calls actionManager.executeAction(action, data)
  → action.perform(elements, appState, data, app)
  → returns ActionResult { elements?, appState?, captureUpdate }
  → manager applies result → state update → re-render
```

`captureUpdate` controls whether the change goes into undo history.

### How They Connect

Actions (Stage 4) operate on elements (Stage 2) and AppState (Stage 3). They're the layer that bridges user intent to data changes.

---

## Stage 5 — Rendering: How State Becomes Pixels

**Goal:** Understand the two-canvas model and the render pipeline.

### Files to Read

1. **`packages/excalidraw/renderer/staticScene.ts`** — Renders the "finished" canvas — all elements at rest. Look for `renderStaticScene()`.

2. **`packages/excalidraw/renderer/interactiveScene.ts`** — Renders the interaction layer on top: selection handles, snap lines, ghost previews. Look for `renderInteractiveScene()`.

3. **`packages/element/src/renderElement.ts`** — Look for `renderElement()`. Each element type has its own rendering path here, using Rough.js for the sketchy style.

### Key Concept: Two Canvases

```
┌─────────────────────────────┐
│  Interactive Canvas (top)   │  ← handles, snap lines, selection box
│  StaticCanvas (bottom)      │  ← all elements, re-rendered less often
└─────────────────────────────┘
```

Separating them lets the interactive layer update frequently (every pointer move) without re-rendering all elements.

**Rough.js** is the library that gives shapes their hand-drawn look. Each element gets a `RoughSVG`/`RoughCanvas` object and a seed for deterministic randomness.

### How They Connect

Rendering (Stage 5) reads elements (Stage 2) and AppState (Stage 3) as inputs — it's purely a read-only consumer. Actions (Stage 4) produce state changes that trigger renders.

---

## Stage 6 — The App Component: Putting It All Together

**Goal:** Trace a full user interaction from pointer event to canvas redraw.

### Files to Read

1. **`packages/excalidraw/components/App.tsx`** — 407 KB, do NOT read top-to-bottom. Instead:
   - Search for `onPointerDown` — trace how a mouse click starts element creation
   - Search for `executeAction` — find where actions are dispatched
   - Look at `componentDidUpdate` / effects to see when rendering is triggered

2. **`excalidraw-app/App.tsx`** — Shows how a real application consumes `<Excalidraw />`. Look for how `initialData`, `onChange`, and `onCollabButtonClick` are wired.

### Full Flow: Drawing a Rectangle

```
1. User clicks "Rectangle" tool → action sets appState.activeTool
2. User presses mouse down → onPointerDown fires
3. App.tsx creates a pending element via newRectangleElement()
4. User drags → onPointerMove updates element dimensions via mutateElement()
5. User releases → element committed to elements array
6. State update triggers renderStaticScene() → element appears on canvas
```

### How They Connect

`App.tsx` is the orchestrator that wires everything together: pointer events → actions → state updates → renderer. It's large because it handles every interaction, but the actual logic is in the layers below it.

---

## Stage 7 — Advanced Subsystems

Work through these once the fundamentals are solid.

### Arrow Binding (`packages/element/src/binding.ts` — 84 KB)

How arrows attach to shapes: hit-testing for bind targets, updating arrow endpoints when shapes move, gap/snap calculations.

Start with: search for `bindOrUnbindLinearElement()` — the entry point when an arrow is dropped near a shape.

### Linear Element Editor (`packages/element/src/linearElementEditor.ts` — 73 KB)

How arrow/line points are edited: adding midpoints, dragging handles, Bezier control points.

Start with: search for `LinearElementEditor.movePoints()`.

### Elbow Arrow Routing (`packages/element/src/elbowArrow.ts` — 65 KB)

The algorithm that routes elbow (orthogonal) arrows around shapes automatically. This is the most complex single algorithm in the codebase.

Start with: search for `routeElbowArrow()`.

### Collaborative Deltas (`packages/element/src/delta.ts` — 65 KB)

How concurrent edits are reconciled: delta operations that can be applied, reversed, and composed. Used for undo/redo and multiplayer sync.

Start with: the `Delta` class and `ElementsDelta.calculate()`.

---

## Quick Reference: Critical Files

| File | What it is |
|------|-----------|
| `packages/math/src/types.ts` | Branded coordinate types |
| `packages/common/src/constants.ts` | TOOL_TYPE, ARROW_TYPE, THEME, etc. |
| `packages/element/src/types.ts` | ExcalidrawElement union + base type |
| `packages/element/src/newElement.ts` | Element factory functions |
| `packages/element/src/mutateElement.ts` | Safe element mutation |
| `packages/element/src/renderElement.ts` | Per-element canvas rendering |
| `packages/excalidraw/appState.ts` | AppState shape + defaults |
| `packages/excalidraw/editor-jotai.ts` | Jotai store setup |
| `packages/excalidraw/actions/types.ts` | Action + ActionResult interfaces |
| `packages/excalidraw/actions/manager.tsx` | Action execution hub |
| `packages/excalidraw/renderer/staticScene.ts` | Static canvas renderer |
| `packages/excalidraw/renderer/interactiveScene.ts` | Interactive layer renderer |
| `packages/excalidraw/components/App.tsx` | Main orchestrator (skim, don't read) |
| `excalidraw-app/App.tsx` | How the library is used in production |
| `vitest.config.mts` | Test config, package aliases |
