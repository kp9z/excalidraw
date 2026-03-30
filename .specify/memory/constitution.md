<!--
SYNC IMPACT REPORT
==================
Version change: [TEMPLATE] → 1.0.0 (initial ratification)
Modified principles: N/A (first population from template)
Added sections:
  - Core Principles (5 principles)
  - Design Language Standards
  - Development Workflow
  - Governance
Removed sections: N/A
Templates reviewed:
  - .specify/templates/plan-template.md ✅ — Constitution Check gate aligns with principles
  - .specify/templates/spec-template.md ✅ — No constitution-specific constraints; offline-first
    and friction-removal principles apply at spec-writing time
  - .specify/templates/tasks-template.md ✅ — Task structure and TDD guidance consistent
  - No commands/*.md files found; skipped
Follow-up TODOs:
  - TODO(RATIFICATION_DATE): Exact repo inception date unknown; defaulted to 2026-03-30
    (first constitution adoption). Update if a more accurate founding date is discovered.
-->

# Excalidraw Constitution

## Core Principles

### I. Speed of Thought to Canvas (NON-NEGOTIABLE)

The interval between "I have an idea" and "I can show you" MUST be as close to zero as possible.

- Features MUST be usable immediately — no account creation, no setup, no onboarding required
  before the first shape can be drawn.
- Any feature that adds a decision the user must make before drawing is a regression.
- Authentication, network calls, third-party dependencies in the core, or new mandatory UI
  surfaces carry a strong default rejection. If needed, justify explicitly or move to a plugin,
  fork, or Excalidraw+.
- The tiebreaker for any ambiguous feature decision: *would this exist on a physical whiteboard?*
  If not, the burden of proof falls on the proposer.

### II. Offline-First

Excalidraw MUST work fully offline. Network availability is never a precondition for core
drawing functionality.

- State persistence MUST use localStorage or equivalent local storage by default.
- A feature is not "done" until it works with zero network connectivity.
- Any feature that degrades or becomes unavailable offline MUST be gated behind a clear,
  optional online-only affordance — never silently broken.

### III. Hand-Drawn Aesthetic Is the Product

The Rough.js rendering aesthetic is non-negotiable. It is not a stylistic preference — it is the
core product signal: *this is a draft, not a deliverable.*

- Shapes rendered via Rough.js MUST retain controlled randomness. Any output that looks
  "too clean" or could pass for a vector illustration is a regression.
- The default font (Excalifont) MUST remain the identity font.
- Gradients, shadows, depth effects, and decorative animations are prohibited.
- Color palette additions require explicit justification; the palette MUST remain small and muted.
- Dark mode is first-class: canvas background inverts, element colors do not.

### IV. Minimal UI Surface

The canvas is the product. The UI is overhead.

- New UI surfaces (panels, modals, persistent sidebars, toolbar buttons) require strong
  justification. Every control is a cost in canvas real estate and cognitive load.
- Controls MUST appear contextually — properties panels show only what is relevant to the
  selected element.
- Keyboard shortcuts are the power-user path; the toolbar exists for discoverability only.
- Modals MUST NOT block the canvas for primary drawing operations; prefer inline or contextual
  controls.
- Storage, account, and file management controls MUST NOT appear in the canvas chrome.

### V. No Ownership of User Data

Excalidraw does not manage user files and does not want to.

- The core MUST NOT include a proprietary persistence layer, sync service, or file system.
- Where work lives is the user's responsibility by design.
- Export formats (`.excalidraw` JSON, SVG, PNG) MUST remain open and self-contained.

## Design Language Standards

These rules enforce the hand-drawn aesthetic across all visual output:

- **Shape rendering**: Lines MUST have slight wobble; fills MUST use hatching patterns, not flat
  fills; arrows MUST have natural curve and overshoot; corner roundness is slight by default.
- **Typography**: Three fonts only — Excalifont (default/handwriting), Cascadia (monospace/code),
  Helvetica (neutral/sans-serif). Adding fonts requires explicit justification.
- **Color**: Stroke and fill are independent. Transparency via hex alpha is supported. Colors
  communicate grouping and hierarchy — never brand expression or decoration.
- **Interaction**: Infinite canvas (no pages/artboards/boundaries). No save button — localStorage
  auto-persist. Direct manipulation for all basic operations. Escape MUST cancel any mode, modal,
  or selection state.

## Development Workflow

### Definition of Done

A feature is complete when ALL of the following hold:

1. Works fully offline.
2. A first-time user can discover and use it without documentation.
3. It does not add a decision the user must make before drawing.
4. Removing it would leave a gap; adding it doesn't leave a scar.

### Testing Standards

- All tests use **Vitest** with jsdom environment.
- Coverage thresholds: 60% lines/statements, 63% functions, 70% branches — MUST NOT regress.
- Snapshot tests MUST be regenerated (`yarn test:update`) before committing changes that affect
  snapshot output.
- TypeScript type checking (`yarn test:typecheck`) and ESLint (zero warnings, `yarn test:code`)
  MUST pass on every PR.
- Three CI workflows run on every PR: lint, test-coverage, and app tests. All MUST be green.

### Code Conventions

- Functional components and hooks only; no class components.
- CSS modules for component styling.
- Branded types from `@excalidraw/math` (`GlobalPoint`, `LocalPoint`, `Vector`, `Radians`,
  `Degrees`) MUST be used — never plain `{ x, y }` objects in math-sensitive code.
- `const` and `readonly` by default; avoid unnecessary allocations in hot paths.

## Governance

This constitution supersedes all other development practices for the Excalidraw project.

**Amendment procedure**:
1. Propose the amendment with explicit rationale referencing a concrete product decision.
2. Increment the version according to semantic versioning:
   - MAJOR: Principle removal, redefinition, or backward-incompatible governance change.
   - MINOR: New principle or section added; material expansion of existing guidance.
   - PATCH: Clarifications, wording, typo fixes, non-semantic refinements.
3. Update `LAST_AMENDED_DATE` to the date of amendment.
4. Run the consistency propagation checklist (templates, docs) and record results in the Sync
   Impact Report comment at the top of this file.

**Compliance**: All PRs and design reviews MUST verify alignment with Core Principles I–V before
merge. Violations require explicit justification in the Complexity Tracking section of the
feature plan.

**Runtime guidance**: See `CLAUDE.md` for agent-specific development guidance,
`docs/CONSTITUTION.md` for product philosophy, `docs/DESIGN.md` for visual design language,
and `docs/TESTING.md` for testing conventions.

**Version**: 1.0.0 | **Ratified**: 2026-03-30 | **Last Amended**: 2026-03-30
