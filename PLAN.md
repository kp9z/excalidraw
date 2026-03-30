# Google Drive Save and Load — Implementation Plan

> Full spec and design artifacts: [`specs/001-google-drive-integration/`](specs/001-google-drive-integration/)
> Branch: `001-google-drive-integration`

---

## What We're Building

Users can save their Excalidraw diagram to their personal Google Drive and load it back — all
from the main menu, with no changes to the core library.

**Scope**: `excalidraw-app/` only. The `@excalidraw/excalidraw` library is untouched.

**Decisions locked**:
- Auth: Google Identity Services (GIS) token model — one popup per tab session
- Conflict strategy: local always wins (last-write); last-saved timestamp shown in menu
- UI: main menu only — no new toolbar buttons or canvas chrome

---

## Acceptance Criteria

### AC-1 — First-time save
1. User draws a shape
2. User opens main menu → "Save to Drive"
3. Google consent popup appears → user authorizes
4. Toast: "Saved to Drive: Untitled.excalidraw"
5. A `.excalidraw` file exists in the user's Google Drive

### AC-2 — Subsequent save (same session)
1. User modifies canvas after AC-1
2. User opens main menu → "Save to Drive"
3. **No popup** — saves immediately
4. Same Drive file updated (no duplicate)
5. Menu timestamp updates

### AC-3 — Load from Drive
1. User opens main menu → "Open from Drive"
2. Google Drive Picker appears, showing only `.excalidraw` files
3. User picks a file
4. Warning: "This will replace your current canvas. Continue?"
5. After confirming: canvas loads with all saved elements and properties

### AC-4 — Offline
1. Network disabled
2. "Save to Drive" → error toast: "Offline — Drive is unavailable"
3. Canvas drawing continues normally; localStorage auto-save unaffected

### AC-5 — File deleted externally
1. User's Drive file is deleted by another session
2. User clicks "Save to Drive" → 404 from Drive
3. App creates a new file silently
4. Toast: "Drive file was deleted externally. Saved as new file: <filename>"

### AC-6 — Disconnect
1. User opens main menu → "Disconnect Drive"
2. Drive access revoked, menu reverts to disconnected state
3. Canvas content unchanged, localStorage Drive keys cleared

### AC-7 — Core library unchanged
1. `packages/*/` — no files modified
2. `yarn build:packages` succeeds with no diff

---

## Files to Create / Modify

| File | Action | Purpose |
|------|--------|---------|
| `excalidraw-app/data/googleDrive.ts` | **CREATE** | GIS auth + Drive REST API module |
| `excalidraw-app/tests/googleDrive.test.ts` | **CREATE** | Unit tests |
| `excalidraw-app/components/AppMainMenu.tsx` | **MODIFY** | Add Drive menu items |
| `excalidraw-app/app-jotai.ts` | **MODIFY** | Add Drive state atoms |
| `index.html` | **MODIFY** | Add GIS script tag |
| `.env.example` | **MODIFY** | Add `VITE_GOOGLE_CLIENT_ID` + `VITE_GOOGLE_API_KEY` |

---

## Implementation Phases

### Phase 1 — Setup (T001–T004)
- Add env vars + GIS script tag
- Create `googleDrive.ts` module skeleton
- Add Jotai atoms for session and file state

### Phase 2 — Save to Drive / US1 (T005–T012)
- Implement `authorize()` via GIS
- Implement `saveToDrive()`: create new file, update existing file
- 401 retry + 404 recovery logic
- Add "Save to Drive" menu item with toast + timestamp

### Phase 3 — Open from Drive / US2 (T013–T018)
- Load Picker API on demand
- Implement `openFromDrive()` with Picker
- Download file content + canvas-replace confirmation
- Call `loadFromBlob()` to restore canvas

### Phase 4 — Disconnect / US3 (T019–T021)
- Implement `disconnect()` + revoke
- Add "Disconnect Drive" menu item
- Clear Drive state on "New drawing"

### Phase 5 — Tests (T022–T025)
- Unit tests for all module paths (12 test cases)
- TypeScript + lint checks

---

## Test Commands and Passing Output

### New Drive unit tests only

```bash
yarn vitest run excalidraw-app/tests/googleDrive.test.ts
```

**Passing output**:
```
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

### Full test suite (required before merge)

```bash
yarn test:app
```

**Passing output**: all existing tests pass + 12 new Drive tests pass. No regressions.

### TypeScript check (required before merge)

```bash
yarn test:typecheck
```

**Passing output**: no output, exit code 0.

### Lint (required before merge — zero warnings)

```bash
yarn test:code
```

**Passing output**: no output, exit code 0.

### Regenerate snapshots (if AppMainMenu snapshot tests exist)

```bash
yarn test:update
```

**Passing output**:
```
 Snapshots   N updated
 Tests       N passed (N)
```

### Verify library packages unchanged

```bash
yarn build:packages
```

**Passing output**: completes without errors. No changes to `packages/*/dist/`.

---

## Constitution Compliance Summary

| Principle | Status | Mitigation |
|-----------|--------|------------|
| I. Speed of Thought | ⚠️ Justified exception | Auth is opt-in, one popup per session, canvas never blocked |
| II. Offline-First | ✅ Pass | Drive ops degrade gracefully; core drawing unaffected |
| III. Hand-Drawn Aesthetic | ✅ Pass | No rendering changes |
| IV. Minimal UI Surface | ✅ Pass | Main menu only; no toolbar or chrome additions |
| V. No User Data Ownership | ✅ Pass | Files in user's own Drive; `drive.file` scope only |

---

## Further Reading

- [Spec](specs/001-google-drive-integration/spec.md)
- [Research decisions](specs/001-google-drive-integration/research.md)
- [Data model](specs/001-google-drive-integration/data-model.md)
- [API contracts](specs/001-google-drive-integration/contracts/google-drive-api.md)
- [Local dev quickstart](specs/001-google-drive-integration/quickstart.md)
