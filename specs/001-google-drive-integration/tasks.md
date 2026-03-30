---
description: "Task list for Google Drive Save and Load"
---

# Tasks: Google Drive Save and Load

**Input**: Design documents from `specs/001-google-drive-integration/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Test tasks are included (T022–T023) covering the new `googleDrive.ts` module.
No tests are requested for UI wiring tasks (menu items, toasts) — covered by existing app tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and
testing of each story.

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in every task description

## Path Conventions

All paths are relative to the monorepo root (`/Users/kenny/Code/codelink/excalidraw/`):
- `excalidraw-app/data/` — Drive module
- `excalidraw-app/components/` — UI components
- `excalidraw-app/tests/` — App-level tests
- `excalidraw-app/app-jotai.ts` — Jotai atoms
- `index.html` — HTML entrypoint (in `excalidraw-app/index.html`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the environment config, script loading, module skeleton, and state atoms
that all user stories depend on.

- [ ] T001 [P] Add `VITE_GOOGLE_CLIENT_ID=` and `VITE_GOOGLE_API_KEY=` placeholder entries to `.env.example` with inline comments explaining where to obtain each value from Google Cloud Console
- [ ] T002 [P] Add Google Identity Services script tag `<script src="https://accounts.google.com/gsi/client" async defer></script>` to `excalidraw-app/index.html` in the `<head>` section
- [ ] T003 [P] Create `excalidraw-app/data/googleDrive.ts` with exported function stubs: `authorize(): Promise<{ email: string }>`, `saveToDrive(content: string, currentFileId?: string, fileName?: string): Promise<{ fileId: string; fileName: string }>`, `openFromDrive(): Promise<{ fileId: string; fileName: string; content: string } | null>`, `disconnect(): void`, `isConnected(): boolean` — all stubs throw `new Error("not implemented")` for now
- [ ] T004 [P] Add `googleDriveSessionAtom` and `googleDriveFileAtom` to `excalidraw-app/app-jotai.ts` using Jotai `atom()`: `googleDriveSessionAtom = atom<{ email: string } | null>(null)` and `googleDriveFileAtom = atom<{ fileId: string; fileName: string; lastSaved: Date } | null>(null)`

**Checkpoint**: Module skeleton exists, types compile, atoms importable. Run `yarn test:typecheck` — must pass before Phase 2.

---

## Phase 2: User Story 1 — Save to Google Drive (Priority: P1) 🎯 MVP

**Goal**: User can save their diagram to Google Drive via the main menu. First save prompts for
auth; subsequent saves in the same session update the file silently.

**Independent Test**:
1. Open excalidraw.com locally (`yarn start`)
2. Draw a rectangle
3. Open main menu → click "Save to Drive"
4. Complete Google auth in the popup
5. Verify: toast "Saved to Drive: Untitled.excalidraw" appears
6. Check Google Drive: `.excalidraw` file exists with the rectangle
7. Draw another shape → "Save to Drive" again → **no popup**, file updates
8. Follow quickstart.md manual verification checklist (US1 section)

### Implementation for User Story 1

- [ ] T005 [US1] Implement `authorize()` in `excalidraw-app/data/googleDrive.ts`: initialize GIS token client with `google.accounts.oauth2.initTokenClient({ client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID, scope: 'https://www.googleapis.com/auth/drive.file', callback })`, call `requestAccessToken({ prompt: '' })` for silent refresh and `requestAccessToken()` for first-time consent; store returned `access_token` and `expires_in` in module-level variables; decode account email from the token response or prompt; resolve with `{ email }`; reject with a typed `GoogleDriveAuthError` on user denial
- [ ] T006 [US1] Implement new-file creation path in `saveToDrive()` in `excalidraw-app/data/googleDrive.ts`: when `currentFileId` is undefined, call `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` with multipart body containing JSON metadata `{ name, mimeType: 'application/octet-stream' }` and file content; attach `Authorization: Bearer <token>` header; return `{ fileId, fileName }` from response
- [ ] T007 [US1] Implement existing-file update path in `saveToDrive()` in `excalidraw-app/data/googleDrive.ts`: when `currentFileId` is provided, call `PATCH https://www.googleapis.com/upload/drive/v3/files/{fileId}?uploadType=media` with raw content body; attach `Authorization: Bearer <token>` header; return `{ fileId, fileName }`
- [ ] T008 [US1] Add 401 retry logic in `excalidraw-app/data/googleDrive.ts`: if a Drive API call returns HTTP 401, call `authorize()` silently to refresh the token and retry the failed request exactly once; if the retry also fails, surface the error to the caller
- [ ] T009 [US1] Add 404 recovery logic in `excalidraw-app/data/googleDrive.ts`: if `saveToDrive()` receives HTTP 404 (stale fileId), clear the stored fileId from localStorage (`excalidraw-drive-file-id`), fall through to the new-file creation path, and set a `wasRecovered: true` flag on the return value so the caller can show the appropriate toast
- [ ] T010 [P] [US1] Add "Save to Drive" `<MainMenu.Item>` to `excalidraw-app/components/AppMainMenu.tsx`: import `useAtom` from `jotai` and read `googleDriveFileAtom`; label shows "Save to Drive" when no file is associated, or "Save to Drive · Last saved X ago" when `googleDriveFileAtom` is set; `onSelect` handler calls `authorize()` then `saveToDrive(serializeAsJSON(...), fileAtom?.fileId)` using the current editor elements and appState obtained via `excalidrawAPI`; place the new item after `<MainMenu.DefaultItems.SaveToActiveFile />`
- [ ] T011 [US1] Wire save outcome in `excalidraw-app/components/AppMainMenu.tsx`: on successful save, update `googleDriveFileAtom` with `{ fileId, fileName, lastSaved: new Date() }` and store `fileId`, `fileName`, `lastSaved.toISOString()` to localStorage keys `excalidraw-drive-file-id`, `excalidraw-drive-file-name`, `excalidraw-drive-last-saved`; call `excalidrawAPI.setToast({ message: wasRecovered ? 'Drive file was deleted externally. Saved as new file: <fileName>' : 'Saved to Drive: <fileName>' })`; on error call `excalidrawAPI.setToast({ message: 'Failed to save to Drive: <error message>', closable: true })`
- [ ] T012 [P] [US1] Add offline guard at the top of the "Save to Drive" `onSelect` handler in `excalidraw-app/components/AppMainMenu.tsx`: if `!navigator.onLine`, call `excalidrawAPI.setToast({ message: 'Offline — Drive is unavailable', closable: true })` and return early without calling `authorize()` or `saveToDrive()`

**Checkpoint**: US1 independently testable. Run manual verification (quickstart.md US1 section). Run `yarn vitest run excalidraw-app/tests/googleDrive.test.ts` after T022.

---

## Phase 3: User Story 2 — Open from Google Drive (Priority: P2)

**Goal**: User can pick a `.excalidraw` file from their Google Drive and load it onto the canvas.

**Independent Test**:
1. Save a diagram via US1
2. Refresh the page (canvas resets)
3. Open main menu → "Open from Drive"
4. Picker appears showing only `.excalidraw` files
5. Select the file → confirm the "replace canvas" dialog
6. Verify all saved elements appear exactly on the canvas

### Implementation for User Story 2

- [ ] T013 [P] [US2] Implement Picker API loader in `excalidraw-app/data/googleDrive.ts`: add a `loadPickerApi(): Promise<void>` internal helper that calls `gapi.load('picker', resolve)` — load `https://apis.google.com/js/api.js` on demand via a dynamic `<script>` injection if not already loaded; cache the promise so multiple calls resolve immediately after first load
- [ ] T014 [US2] Implement `openFromDrive()` in `excalidraw-app/data/googleDrive.ts`: call `authorize()` to ensure a valid token, then call `loadPickerApi()`, then construct a `google.picker.PickerBuilder` with a `DocsView` filtered to MIME type `application/octet-stream` and query `*.excalidraw`; set `OAuthToken` and `DeveloperKey` from `import.meta.env.VITE_GOOGLE_API_KEY`; wrap the picker callback in a Promise that resolves with `{ fileId, fileName }` on `PICKED` action or resolves with `null` on `CANCEL`
- [ ] T015 [P] [US2] Implement file download in `excalidraw-app/data/googleDrive.ts`: add internal `downloadFile(fileId: string): Promise<string>` that calls `GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media` with bearer auth; returns the response text (raw JSON); apply 401 retry logic (same as T008); on 404 or 403 throw a descriptive error; call this from `openFromDrive()` after the picker resolves to return the full `{ fileId, fileName, content }` object
- [ ] T016 [P] [US2] Add "Open from Drive" `<MainMenu.Item>` to `excalidraw-app/components/AppMainMenu.tsx`: place it after the "Save to Drive" item; `onSelect` handler calls `openFromDrive()`; if result is null (user cancelled), do nothing; apply the same offline guard as T012
- [ ] T017 [US2] Add canvas-replace confirmation in `excalidraw-app/components/AppMainMenu.tsx` "Open from Drive" handler: before calling `openFromDrive()`, if the current canvas has any elements, call `window.confirm('Opening a file from Drive will replace your current canvas. Continue?')`; proceed only if the user confirms; if canvas is empty, skip the confirmation
- [ ] T018 [US2] Load the Drive file content onto the canvas in `excalidraw-app/components/AppMainMenu.tsx`: after `openFromDrive()` returns content, create a `Blob` from the content string with type `application/json`, then call `loadFromBlob(blob, appState, elements)` from `packages/excalidraw/data/json.ts`; use the returned `{ elements, appState, files }` to call `excalidrawAPI.updateScene({ elements, appState, files, captureUpdate: CaptureUpdateAction.IMMEDIATELY })`; update `googleDriveFileAtom` with the loaded file's ID and name; show success toast "Opened: <fileName>"; on error show `excalidrawAPI.setToast({ message: 'Failed to load from Drive: <error>', closable: true })` and leave canvas unchanged

**Checkpoint**: US1 + US2 independently testable. Manual round-trip: save → refresh → open from Drive → verify elements match.

---

## Phase 4: User Story 3 — Manage Drive Connection (Priority: P3)

**Goal**: User can disconnect their Google account; subsequent saves re-prompt for auth.

**Independent Test**:
1. Connect Drive (via US1)
2. Open main menu → "Disconnect Drive"
3. Verify menu shows no connected account
4. Canvas content unchanged
5. Click "Save to Drive" → auth popup reappears

### Implementation for User Story 3

- [ ] T019 [US3] Implement `disconnect()` in `excalidraw-app/data/googleDrive.ts`: call `google.accounts.oauth2.revoke(accessToken, () => {})` if a token exists; clear module-level `accessToken` and `expiresAt` variables; remove localStorage keys `excalidraw-drive-file-id`, `excalidraw-drive-file-name`, `excalidraw-drive-last-saved`
- [ ] T020 [US3] Add "Disconnect Drive" `<MainMenu.Item>` to `excalidraw-app/components/AppMainMenu.tsx`: render this item only when `googleDriveSessionAtom` is non-null (user is connected); place after "Save to Drive"; `onSelect` calls `disconnect()`, then sets `googleDriveSessionAtom` to `null` and `googleDriveFileAtom` to `null`; shows toast "Disconnected from Google Drive"
- [ ] T021 [P] [US3] Clear Drive file association when user starts a new drawing in `excalidraw-app/App.tsx`: find the `onClearCanvas` / `ClearCanvas` action handler; after the canvas is cleared, remove localStorage keys `excalidraw-drive-file-id`, `excalidraw-drive-file-name`, `excalidraw-drive-last-saved` and set `googleDriveFileAtom` to `null` (Drive session/auth remains active, only the file link is cleared)

**Checkpoint**: All three user stories independently testable. Run full manual checklist in quickstart.md.

---

## Phase 5: Tests & Quality Gates

**Purpose**: Verify correct behavior of the Drive module and ensure no regressions.

- [ ] T022 [P] Write unit tests in `excalidraw-app/tests/googleDrive.test.ts` for the `googleDrive.ts` module — mock `google.accounts.oauth2`, `fetch`, and `localStorage`; include these 10 cases: (1) `authorize` resolves with email on success, (2) `authorize` throws `GoogleDriveAuthError` on denial, (3) `saveToDrive` POSTs multipart when no fileId stored, (4) `saveToDrive` PATCHes existing file when fileId in localStorage, (5) `saveToDrive` retries once on 401 then succeeds, (6) `saveToDrive` creates new file and returns `wasRecovered: true` on 404, (7) `saveToDrive` rejects immediately when `navigator.onLine` is false, (8) `openFromDrive` resolves null when Picker fires CANCEL, (9) `openFromDrive` resolves `{ fileId, fileName, content }` on PICKED, (10) `isConnected` returns false after `disconnect()`
- [ ] T023 [P] Write 2 additional offline tests in `excalidraw-app/tests/googleDrive.test.ts`: (11) `openFromDrive` rejects with offline error when `navigator.onLine` is false, (12) `disconnect` clears module token variables and all three localStorage Drive keys
- [ ] T024 [P] Run `yarn test:typecheck` — fix all TypeScript errors in `excalidraw-app/data/googleDrive.ts`, `excalidraw-app/components/AppMainMenu.tsx`, and `excalidraw-app/app-jotai.ts` until `tsc -b` exits with code 0 and no output
- [ ] T025 [P] Run `yarn test:code` — fix all ESLint warnings in new and modified files until `eslint --max-warnings=0` exits with code 0 and no output

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T026 [P] Run `yarn test:update` to regenerate any Vitest snapshot tests that capture `AppMainMenu` component output (the new Drive menu items will change snapshot hashes); confirm all snapshots are intentional before committing
- [ ] T027 [P] Run `yarn build:packages` and confirm zero errors and no diff in `packages/*/dist/` — verifies AC-8 (core library unchanged)
- [ ] T028 Run `yarn test:app` (full suite) — all existing tests plus the 12 new Drive tests must pass; zero failures, no coverage threshold regressions (lines ≥60%, functions ≥63%, branches ≥70%)
- [ ] T029 [P] Restore Drive file association on page load in `excalidraw-app/App.tsx`: on app mount, read `excalidraw-drive-file-id`, `excalidraw-drive-file-name`, `excalidraw-drive-last-saved` from localStorage; if present, set `googleDriveFileAtom` so the menu shows "Save to Drive · Last saved X ago" immediately (auth token still needs to be obtained on first Drive action)
- [ ] T030 Update `specs/001-google-drive-integration/quickstart.md` if any setup steps changed during implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T001–T004 all [P]
- **US1 (Phase 2)**: Depends on Phase 1 complete — T005 must finish before T006/T007; T006/T007 before T008/T009; T010 and T012 are [P] alongside T005–T009 (different file)
- **US2 (Phase 3)**: Depends on Phase 1 complete; T013 [P] can start alongside US1 work; T014 depends on T013; T015 [P] alongside T014; T016 [P] alongside T013–T015; T017 depends on T016; T018 depends on T015 + T017
- **US3 (Phase 4)**: Depends on Phase 1 complete; T019 is independent of US1/US2 implementation (different function); T020 depends on T019; T021 [P] (different file)
- **Tests (Phase 5)**: T022/T023 can start when T005–T009 + T019 are done; T024/T025 [P] after any new code written
- **Polish (Phase 6)**: Depends on Phase 5 passing; T026 after T010+T016+T020; T027 anytime; T028 last gate

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 1 — no dependency on US2 or US3
- **US2 (P2)**: Can start after Phase 1 — T013 (Picker API) is independent; integrates with US1 only for the `authorize()` call (already implemented)
- **US3 (P3)**: Can start after Phase 1 — `disconnect()` is independent of US1/US2 logic

### Within Each User Story

- T005 → T006/T007 → T008/T009 (sequential chain for `saveToDrive()` implementation)
- T013 → T014 → T015 → T018 (sequential chain for `openFromDrive()`)
- T010 + T012 [P] alongside US1 implementation (different file: `AppMainMenu.tsx` vs `googleDrive.ts`)
- T019 → T020 (sequential); T021 [P]

### Parallel Opportunities

```bash
# Phase 1 — all four tasks in parallel
Task: "T001 Add env vars to .env.example"
Task: "T002 Add GIS script tag to index.html"
Task: "T003 Create googleDrive.ts skeleton"
Task: "T004 Add Jotai atoms to app-jotai.ts"

# US1 — drive module and menu item in parallel
Task: "T005 Implement authorize()"        # → T006 → T007 → T008 → T009
Task: "T010 Add Save to Drive menu item"  # independent (AppMainMenu.tsx)
Task: "T012 Add offline guard"            # independent (AppMainMenu.tsx)

# US2 — Picker loader and menu item in parallel
Task: "T013 Implement loadPickerApi()"    # → T014 → T015
Task: "T016 Add Open from Drive menu item"

# Tests — all [P] once implementation done
Task: "T022 Write 10 core unit tests"
Task: "T023 Write 2 offline unit tests"
Task: "T024 Fix TypeScript errors"
Task: "T025 Fix lint warnings"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 (Setup) — ~30 min
2. Complete Phase 2 (US1) — T005–T012
3. **STOP and VALIDATE**: Run manual US1 verification (quickstart.md)
4. Run `yarn vitest run excalidraw-app/tests/googleDrive.test.ts` (partial — T005–T009 covered)
5. Demo: user can save to Drive from the main menu

### Incremental Delivery

1. Phase 1 → Phase 2 (US1) → manual test → ship MVP
2. Phase 3 (US2) → test round-trip save+load → add to release
3. Phase 4 (US3) → test disconnect → complete feature
4. Phase 5 (Tests) + Phase 6 (Polish) → PR-ready

### Parallel Team Strategy

With two developers:

- **Dev A**: T003 (googleDrive.ts) → T005 → T006 → T007 → T008 → T009 → T013 → T014 → T015 → T019
- **Dev B**: T001 + T002 + T004 (setup) → T010 + T011 + T012 (US1 menu) → T016 + T017 + T018 (US2 menu) → T020 + T021 (US3 menu)
- **Both**: Phase 5 tests after implementation complete

---

## Notes

- `[P]` tasks touch different files — safe to run in parallel with no merge conflicts
- `[Story]` label maps each task to a specific user story for traceability to spec.md
- All Drive API calls live exclusively in `excalidraw-app/data/googleDrive.ts` — `AppMainMenu.tsx` only imports the public module functions
- Never import from `packages/excalidraw/` internals in `googleDrive.ts` — only use the public API (`serializeAsJSON`, `loadFromBlob` are accessed via the editor API or imported from published package paths)
- Commit after each phase checkpoint
- Run `yarn test:typecheck` after every new file created
- Run `yarn test:update` before final commit if any component snapshots changed
