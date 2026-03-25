# Excalidraw Design Language

This product looks like a whiteboard photo, not a software product. Every design decision defends that impression.

---

## The Core Aesthetic

**Imperfection is the feature.**

Shapes are rendered via [Rough.js](https://roughjs.com/) — a library that introduces controlled randomness into lines and fills. No two instances of the same shape look identical. This mimics the natural variation of a human hand and is non-negotiable. Any shape, line, or fill that looks "too clean" is a regression.

The aesthetic communicates a single thing before any content is read: *this is a draft, not a deliverable.* That signal lowers the psychological barrier to contribute, edit, and discard.

---

## Typography

Three font families, each with a clear role:

| Font | Role | Tone |
|---|---|---|
| **Excalifont** (replaces Virgil) | Default handwriting | Informal, sketchy, human |
| **Cascadia** | Code / monospace | Technical, structured |
| **Helvetica** | Normal / sans-serif | Neutral, readable |

**Rules:**
- Excalifont is the identity font. It must remain the default.
- Font choices are intentionally limited. Adding more options adds decision fatigue without adding value to a sketch.
- Text should never look typeset. If it does, switch to Helvetica and ask why.

---

## Color

Excalidraw's color palette is deliberately small and muted — not a full design system palette.

**Principles:**
- Colors communicate grouping and hierarchy, not brand or polish
- Stroke and fill are independent — a shape can have color without fill, or fill without a visible stroke
- Transparency (alpha) is supported via hex; this allows layering without adding new UI controls
- Dark mode inverts the canvas background, not the element colors — elements stay true to what the user set

**What colors are NOT for:**
- Brand expression
- Emotional tone
- Decorative use

---

## Shape Rendering

Shapes are rendered with configurable roughness. The defaults are tuned to feel hand-drawn without being cartoonish.

- Lines have slight wobble
- Fill patterns use hatching, not flat fills — this preserves the hand-drawn texture inside shapes
- Arrows have natural curve and overshoot, not mechanical precision
- Corner roundness is slight by default — not sharp, not pill-shaped

**The rule:** if a shape could pass for a vector illustration, it has been over-smoothed.

---

## UI Chrome

The toolbar and panels are minimal by design. They recede so the canvas can be primary.

**Principles:**
- The canvas is the product. The UI is overhead.
- Controls appear contextually — the properties panel only shows what is relevant to the selected element
- No persistent sidebars that consume canvas real estate by default
- Keyboard shortcuts are the power-user path; the toolbar is for discoverability only
- New UI surface requires strong justification. Every panel, modal, and button is a cost.

**What the UI should never do:**
- Compete with the canvas visually
- Require clicks to reach primary drawing actions
- Surface storage, account, or file management in the canvas chrome (those belong in menus)

---

## Interaction Model

- **Infinite canvas** — no pages, no artboards, no boundaries
- **No save button** — state is persisted to localStorage automatically; the user should never think about saving
- **Direct manipulation** — click to select, drag to move, double-click to edit text; no mode switching required for basic operations
- **Escape as universal exit** — any mode, modal, or selection state should be cancellable with Escape

---

## Light / Dark Mode

Both modes are first-class. The canvas background flips (white / dark gray). Element colors stay as set. The UI chrome adapts. Neither mode should feel like an afterthought.

---

## What This Design Language Rejects

- **Gradients** — they signal polish, not sketching
- **Shadows and depth effects** — same reason
- **Animations beyond functional feedback** — canvas tools animate only when the animation communicates state (e.g., laser pointer)
- **Dense toolbars** — if every feature needs a button, there are too many features
- **Modals that block the canvas** — prefer inline or contextual controls
