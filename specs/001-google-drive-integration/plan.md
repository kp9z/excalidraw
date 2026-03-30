# Implementation Plan: Google Drive Save and Load

**Branch**: `001-google-drive-integration` | **Date**: 2026-03-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-google-drive-integration/spec.md`

---

## Summary

Enable excalidraw.com users to save and load their diagrams to/from their personal Google Drive,
accessed exclusively via the main menu. No changes to the core `@excalidraw/excalidraw` library.
Auth via Google Identity Services (GIS) token model; Drive access via the REST API v3 with
`drive.file` scope (minimum permission). The canvas remains fully functional offline; Drive
operations are always opt-in.

---

## Technical Context

**Language/Version**: TypeScript 5.x + React 19 (existing monorepo stack)
**Primary Dependencies**: Google Identity Services (GIS, loaded via script tag), Google Drive REST API v3 (via fetch), Google Picker API (loaded on demand via gapi)
**Storage**: localStorage (Drive file ID + timestamps), in-memory (OAuth access token)
**Testing**: Vitest + jsdom + @testing-library/react (existing monorepo test setup)
**Target Platform**: Web browser (excalidraw.com) — `excalidraw-app/` only
**Project Type**: Web application feature (no new library, no backend)
**Performance Goals**: Save < 5s for diagrams with ≤500 elements; first-time auth < 90s total
**Constraints**: Offline-capable core (Drive ops degrade gracefully); no new toolbar chrome; drive.file scope only (no broad Drive access); `@excalidraw/excalidraw` library must stay unchanged
**Scale/Scope**: All excalidraw.com users; ~3 new source files, ~2 modified files

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Speed of Thought to Canvas | ⚠️ JUSTIFIED EXCEPTION | Google auth popup adds friction, but only on first use via an opt-in menu action. Canvas drawing is never blocked. Auth token persists in-memory for the tab session; subsequent saves need no re-auth. Mitigated by: feature is entirely opt-in, accessed only from the main menu, never shown to users who don't invoke it. |
| II. Offline-First | ✅ PASS | Core drawing works fully offline. Drive menu items are disabled (with tooltip) when offline. localStorage auto-save continues unaffected by Drive. |
| III. Hand-Drawn Aesthetic | ✅ PASS | No rendering changes. |
| IV. Minimal UI Surface | ✅ PASS | Two menu items added to main menu only (FR-008 / SC-006 resolved). No toolbar buttons, no persistent chrome, no new panels. |
| V. No Ownership of User Data | ✅ PASS | Files live in the user's own Google Drive. `drive.file` scope means the app can only touch files it created or the user explicitly opened. Excalidraw neither stores nor proxies the data. |

**Post-Phase 1 re-check**: Contracts confirm no new persistent cloud state on Excalidraw servers.
PASS — no additional violations introduced by the design.

---

## Acceptance Criteria

### AC-1: First-Time Save

- User draws at least one element on the canvas
- User opens main menu → clicks "Save to Drive"
- A Google consent popup appears (or is skipped if previously consented)
- After auth completes, a success toast appears: "Saved to Drive: <filename>"
- A `.excalidraw` file exists in the user's Google Drive with the correct content
- The menu item now reads "Save to Drive · Last saved just now"

### AC-2: Subsequent Save (same session)

- User modifies the canvas after AC-1
- User opens main menu → clicks "Save to Drive"
- **No auth popup appears**
- A success toast appears immediately
- The Drive file is updated (same file ID, no duplicate created)
- Last-saved timestamp updates

### AC-3: Load from Drive

- User opens main menu → clicks "Open from Drive"
- The Google Drive Picker appears, showing only `.excalidraw` files
- User selects a file
- A confirmation dialog warns: "This will replace your current canvas. Continue?"
- After confirming, the canvas is replaced with the loaded diagram
- All elements, properties, and embedded images are restored exactly

### AC-4: Offline Degradation

- With network disabled:
  - Canvas drawing works normally
  - "Save to Drive" and "Open from Drive" show an error toast: "Offline — Drive is unavailable"
  - localStorage auto-save continues unaffected

### AC-5: Drive Not Connected (cold start)

- On fresh page load with no Drive session:
  - Main menu shows "Save to Drive" and "Open from Drive" (enabled)
  - "Save to Drive" triggers auth flow on click
  - Core drawing tools are unaffected

### AC-6: Disconnect

- User opens main menu → clicks "Disconnect Drive"
- Drive access is revoked (GIS `google.accounts.oauth2.revoke()` called)
- Menu reverts to disconnected state
- Canvas content is unchanged
- localStorage Drive keys are cleared

### AC-7: File Deleted Externally

- User previously saved a file; someone deletes it from Drive externally
- User clicks "Save to Drive"
- App receives a 404 from Drive; transparently creates a new file
- User sees: "Drive file was deleted externally. Saved as new file: <filename>"

### AC-8: Core Library Unchanged

- `packages/excalidraw/`, `packages/element/`, `packages/math/`, `packages/common/`,
  `packages/utils/` — no files modified
- `yarn build:packages` succeeds with no changes to library output

---

## Project Structure

### Documentation (this feature)

```text
specs/001-google-drive-integration/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions + rationale
├── data-model.md        # Phase 1 — entities + state transitions
├── contracts/
│   └── google-drive-api.md  # Phase 1 — module + external API contracts
├── quickstart.md        # Phase 1 — local dev setup
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 — generated by /speckit.tasks
```

### Source Code

```text
excalidraw-app/
├── data/
│   └── googleDrive.ts           # NEW — GIS auth + Drive REST API module
├── components/
│   └── AppMainMenu.tsx          # MODIFIED — add Drive menu items
├── app-jotai.ts                 # MODIFIED — add googleDriveSessionAtom + googleDriveFileAtom
└── tests/
    └── googleDrive.test.ts      # NEW — unit tests for googleDrive.ts

index.html                       # MODIFIED — add GIS script tag
```

**No changes to any file outside `excalidraw-app/`.**

---

## Implementation Phases

### Phase 1: Setup (Shared Infrastructure)

Establish Drive module, environment config, and script loading.

- [ ] T001 — Add `VITE_GOOGLE_CLIENT_ID` and `VITE_GOOGLE_API_KEY` to `.env.example`
- [ ] T002 — Add GIS script tag to `excalidraw-app/index.html`
- [ ] T003 — Create `excalidraw-app/data/googleDrive.ts` with module skeleton:
  `authorize()`, `saveToDrive()`, `openFromDrive()`, `disconnect()`, `isConnected()`
- [ ] T004 — Add `googleDriveSessionAtom` and `googleDriveFileAtom` to `excalidraw-app/app-jotai.ts`

### Phase 2: Save to Drive (US1 — P1)

- [ ] T005 — Implement `authorize()` in `googleDrive.ts` using GIS token model
- [ ] T006 — Implement `saveToDrive()`: create new file (multipart upload) when no fileId stored
- [ ] T007 — Implement `saveToDrive()`: patch existing file when fileId in localStorage
- [ ] T008 — Implement 401 retry: re-authorize and retry once on token expiry
- [ ] T009 — Implement 404 recovery: clear stale fileId and create new file
- [ ] T010 — Add "Save to Drive" `<MainMenu.Item>` to `AppMainMenu.tsx` with `onSelect` handler
- [ ] T011 — Wire success toast and last-saved timestamp update via `googleDriveFileAtom`
- [ ] T012 — Handle offline state: show error toast, skip Drive call

### Phase 3: Open from Drive (US2 — P2)

- [ ] T013 — Load Picker API on demand (`gapi.load('picker', ...)`) in `googleDrive.ts`
- [ ] T014 — Implement `openFromDrive()`: show Picker filtered to `.excalidraw` files
- [ ] T015 — Implement file download (`GET /drive/v3/files/{id}?alt=media`)
- [ ] T016 — Add "Open from Drive" `<MainMenu.Item>` to `AppMainMenu.tsx`
- [ ] T017 — Show canvas-replace confirmation dialog before loading
- [ ] T018 — Call `loadFromBlob()` with downloaded content to restore canvas

### Phase 4: Disconnect (US3 — P3)

- [ ] T019 — Implement `disconnect()`: call `google.accounts.oauth2.revoke()`, clear atoms + localStorage
- [ ] T020 — Add "Disconnect Drive" `<MainMenu.Item>` (visible only when connected)
- [ ] T021 — Clear Drive file association on "New drawing" (`ClearCanvas` action)

### Phase 5: Tests

- [ ] T022 — Unit tests for `googleDrive.ts`: authorize success/failure, save create, save update, 401 retry, 404 recovery, disconnect
- [ ] T023 — Unit tests for offline handling in save and open flows
- [ ] T024 — Run `yarn test:typecheck` and fix any type errors
- [ ] T025 — Run `yarn test:code` (ESLint) and fix any lint warnings

---

## Test Commands and Passing Output

### Run all tests (full suite)

```bash
yarn test:app
```

**Passing output**:
```
 RUN  v2.x.x

 ✓ excalidraw-app/tests/googleDrive.test.ts (12 tests) Xms
 ✓ packages/excalidraw/tests/App.test.tsx (N tests) Xms
 ... (all existing tests pass)

 Test Files  N passed (N)
 Tests       N passed (N)
 Duration    Xs
```

### Run only the new Drive tests

```bash
yarn vitest run excalidraw-app/tests/googleDrive.test.ts
```

**Passing output**:
```
 RUN  v2.x.x

 ✓ excalidraw-app/tests/googleDrive.test.ts (12 tests) Xms
   ✓ authorize — resolves with email on success
   ✓ authorize — throws GoogleDriveAuthError on denial
   ✓ saveToDrive — creates new file when no fileId stored
   ✓ saveToDrive — patches existing file when fileId in localStorage
   ✓ saveToDrive — retries once on 401, then succeeds
   ✓ saveToDrive — creates new file and toasts warning on 404
   ✓ saveToDrive — rejects with offline error when navigator.onLine is false
   ✓ openFromDrive — returns null when user cancels Picker
   ✓ openFromDrive — returns fileId, fileName, content on selection
   ✓ openFromDrive — rejects with offline error when offline
   ✓ disconnect — clears atoms and localStorage Drive keys
   ✓ isConnected — returns false after disconnect

 Test Files  1 passed (1)
 Tests       12 passed (12)
```

### TypeScript type check

```bash
yarn test:typecheck
```

**Passing output**:
```
$ tsc -b
(no output — exit code 0)
```

If there are errors, they appear as:
```
excalidraw-app/data/googleDrive.ts(42,5): error TS2345: ...
```
All must be resolved before merge.

### Lint check

```bash
yarn test:code
```

**Passing output**:
```
$ eslint --max-warnings=0 ...
(no output — exit code 0)
```

Zero warnings allowed. Any warning is a blocker.

### Snapshot update (if AppMainMenu snapshots exist)

```bash
yarn test:update
```

Run this after adding Drive menu items to regenerate any snapshot tests that capture the
`AppMainMenu` component output. **Passing output** ends with:
```
 Snapshots   N updated
 Tests       N passed (N)
```

### Verify library packages unchanged

```bash
yarn build:packages
```

**Passing output**:
```
$ yarn workspaces foreach --topological run build
...
Done in Xs.
```
No errors. Diff of `packages/*/dist/` should show no changes from main branch.

---

## Complexity Tracking

> Constitution Check violations that required justification:

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Principle I: Auth adds friction | Drive requires Google OAuth2 — there is no frictionless path to a third-party storage provider | Without auth, the user cannot be identified to their Drive; local-file export already exists as the zero-friction alternative |
