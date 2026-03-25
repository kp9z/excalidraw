# Excalidraw Product Constitution

This product is designed to be the fastest path from a thought in your head to a diagram someone else can understand.

---

## Who It's For

A developer, designer, or technical thinker who needs to externalize an idea right now — in a meeting, mid-PR, or at 2am — without setting anything up, learning anything, or asking permission from a tool.

They are not making final deliverables. They are thinking out loud, visually.

---

## What It Optimizes For

**Speed of thought to canvas.**

Not beauty. Not persistence. Not feature completeness.
The moment between "I have an idea" and "I can show you" should be as close to zero as possible.

---

## What It Deliberately Sacrifices

- **Polish** — the hand-drawn aesthetic is a feature, not a limitation. It signals "this is a draft." Pixel-perfect output is someone else's job.
- **Storage ownership** — Excalidraw does not manage your files. It does not want to. Where your work lives is your problem, by design.
- **Feature breadth** — this is not Miro, not Figma, not Notion. Every feature request that makes it more like those is a request to become something worse at what this is.
- **Onboarding** — if a new user needs to create an account before drawing their first shape, the product has already failed.

---

## How Decisions Get Made

**When in doubt, remove friction.**

If a proposed feature requires auth, a network call, a new UI surface, or a third-party dependency in the core — the default answer is no. It may belong in a plugin, a fork, or Excalidraw+. It does not belong here.

The tiebreaker: *would this exist on a physical whiteboard?* If not, justify the exception explicitly.

---

## What "Done" Looks Like

A feature is done when:
- It works fully offline
- A first-time user can discover and use it without documentation
- It does not add a decision the user has to make before drawing
- Removing it would leave a gap; adding it doesn't leave a scar
