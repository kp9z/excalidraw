# Research: Google Drive Save and Load

**Feature**: 001-google-drive-integration
**Date**: 2026-03-30
**Status**: Complete — all unknowns resolved

---

## Decision 1: OAuth2 Library

**Decision**: Use **Google Identity Services (GIS)** — loaded from `accounts.google.com/gsi/client`
via a `<script>` tag in `index.html`.

**Rationale**: GIS is Google's current recommended auth library for browser SPAs. It replaced the
deprecated `gapi.auth2` in 2022. It supports the **Token Model** (implicit grant), which delivers
an access token directly to the browser without a backend redirect — ideal for a client-only app
like excalidraw.com.

**Alternatives considered**:
- `gapi.auth2` — deprecated, not recommended for new projects
- Firebase Auth with Google provider — already in the codebase (Firebase 11.3.1), but Firebase
  Auth is scoped to Firebase services; would add coupling and complexity for Drive-only access
- OAuth2 PKCE flow with a backend — requires a server-side component; violates offline-first
  and adds infrastructure we don't own

---

## Decision 2: Drive API Access

**Decision**: Call the **Google Drive REST API v3** directly via the browser's native `fetch()`.
No Google API client library (gapi.client) needed.

**Rationale**: Drive v3 is a standard REST API. Using `fetch()` keeps the bundle lean and avoids
loading the full `gapi.client` library. The access token from GIS is attached as an
`Authorization: Bearer <token>` header on each request.

**Key endpoints used**:
- `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` — create new file
- `PATCH https://www.googleapis.com/upload/drive/v3/files/{fileId}?uploadType=media` — update file
- `GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media` — download file content
- Google Picker API (`https://apis.google.com/js/api.js` + Picker) — file selection UI

**Alternatives considered**:
- `gapi.client.drive` — adds ~50KB gapi bundle for no meaningful benefit over fetch()
- `@googleapis/drive` npm package — Node.js-focused, not designed for browsers

---

## Decision 3: OAuth2 Scope

**Decision**: Request scope `https://www.googleapis.com/auth/drive.file` only.

**Rationale**: This scope limits access to files that were **created by this app or explicitly
opened by the user through this app's file picker**. It cannot read the user's entire Drive.
This is the minimum necessary permission and satisfies Constitution Principle V (No Ownership
of User Data) — the app acts as an agent for the user, not a data owner.

**What this means in practice**:
- Files saved via "Save to Drive" are accessible only to this app (and the user via Drive UI)
- Files opened via the Drive Picker become accessible to this app
- This app cannot enumerate or read any other Drive files

**Alternatives considered**:
- `drive.appdata` — hidden app folder, not visible to user in Drive; rejected because users
  should be able to see and manage their diagram files in Drive directly
- `drive` or `drive.readonly` — full Drive access; rejected as excessive

---

## Decision 4: Access Token Storage

**Decision**: Store the GIS access token in **memory only** (a module-level variable in
`googleDrive.ts`). Do NOT persist to localStorage or sessionStorage.

**Rationale**: Access tokens are short-lived (1 hour). Storing in memory:
- Avoids XSS exposure from localStorage/sessionStorage reads
- Forces re-authentication when the tab is closed (expected UX for oauth flows in SPAs)
- GIS supports silent token refresh via `requestAccessToken()` with `prompt: ''` if the user
  has previously consented — effectively a transparent re-auth

**What this means**: Users authorize once per browser tab session. Closing the tab clears the
token; opening a new tab triggers a quick (usually silent) re-auth popup on next Drive action.

---

## Decision 5: Drive File ID Persistence

**Decision**: Store the active Drive file ID in **localStorage** under key
`excalidraw-drive-file-id`, and last-saved timestamp under `excalidraw-drive-last-saved`.

**Rationale**: This lets the app know which Drive file to update on subsequent saves without
asking the user. localStorage survives page refresh. This is analogous to how the existing
`fileHandle` in AppState tracks the local filesystem file.

**Security consideration**: File IDs are not sensitive (they're opaque identifiers, not access
tokens). localStorage is appropriate.

---

## Decision 6: Binary File Handling

**Decision**: Embed binary files (images) inline in the `.excalidraw` JSON using the existing
`serializeAsJSON()` serialization, same as "Save to disk."

**Rationale**: Excalidraw's existing JSON format already handles embedded binary file data
(`files` field). Using the same format means load/save is identical to existing disk-based
operations — no new serialization logic needed. Drive file size limit is 5TB; embedded images
are not a concern for typical diagrams.

**Out of scope for v1**: Separate binary blob uploads to Drive (would add complexity without
meaningful benefit given typical diagram sizes).

---

## Decision 7: File Picker UI

**Decision**: Use the **Google Picker API** for "Open from Drive" file selection.

**Rationale**: The Picker is Google's official browser-side file chooser for Drive. It provides:
- Native Google Drive UI that users recognize
- Filtering by MIME type (to show only `.excalidraw` files)
- No need to build a custom file browser

**Loading**: The Picker API is loaded on-demand (only when "Open from Drive" is clicked) via
`gapi.load('picker', ...)` — not at page startup. This avoids any load-time cost for users
who don't use Drive.

---

## Decision 8: Error Handling Strategy

**Decision**: All Drive operations wrap in try/catch and surface errors via Excalidraw's
existing toast notification system (`setToast()` on the editor API).

**Rationale**: Consistent with how existing save/load actions handle errors (see
`actionSaveToActiveFile` in `packages/excalidraw/actions/actionExport.tsx`). No new error
UI component needed.

**Token expiry**: If a 401 is received mid-operation, silently re-request the token and retry
the operation once before surfacing an error to the user.

---

## Decision 9: Menu Integration Pattern

**Decision**: Add Drive items to `excalidraw-app/components/AppMainMenu.tsx` using
`<MainMenu.Item>` with `onSelect` handlers. Do NOT add new action registrations to the
core library.

**Rationale**: Drive is an `excalidraw-app/`-only feature (FR-008). Menu items with inline
handlers is the correct pattern for app-level features — see existing pattern for the
"Excalidraw+" and "Sign in / Sign up" items in `AppMainMenu.tsx`. Core library stays clean.

---

## Decision 10: New Jotai Atoms

**Decision**: Add two atoms to `excalidraw-app/app-jotai.ts`:
- `googleDriveSessionAtom` — `{ email: string } | null` (null = not connected)
- `googleDriveFileAtom` — `{ fileId: string; fileName: string; lastSaved: Date } | null`

**Rationale**: These drive the menu item labels ("Connected as foo@gmail.com", "Last saved 2m ago")
and the enabled/disabled state of Drive actions, consistent with how the existing Jotai atoms
manage Excalidraw+ and collab state.
