# Google Drive Integration — Session Report

**Branch:** `feat/google-drive`
**Date:** 2026-03-25

---

## What Was Built

Added Google Drive save/load integration to `excalidraw-app/`. All changes are additive — local storage continues to work as before. Drive is an additional save target when the user explicitly connects it.

### New Files

| File | Purpose |
|------|---------|
| `excalidraw-app/data/googleDrive.ts` | Core Drive API module: OAuth token management, Drive REST calls (create, update, read, list) |
| `excalidraw-app/googleDriveState.ts` | Jotai atoms: `activeDriveFileAtom`, `isDriveSavingAtom`, `driveBrowserStateAtom` |
| `excalidraw-app/hooks/useGoogleDrive.ts` | React hook: `saveNewFileToDrive`, `openFileFromDrive`, `driveSaveDebounced` |
| `excalidraw-app/components/DriveFileBrowser.tsx` | Modal dialog listing Drive `.excalidraw` files — promise-based pattern via `driveBrowserStateAtom` |
| `excalidraw-app/components/googleDriveIcon.tsx` | Inline SVG of the Google Drive triangle logo |

### Modified Files

| File | Change |
|------|--------|
| `excalidraw-app/App.tsx` | `initGoogleAuth()` on load, `?gdrive=<fileId>` URL param handling in `initializeScene`, `driveSaveDebounced` in `onChange`, `<DriveFileBrowser />` mounted, props wired to menus |
| `excalidraw-app/components/AppMainMenu.tsx` | Added "Save to Google Drive" and "Open from Google Drive" menu items at top |
| `excalidraw-app/components/AppWelcomeScreen.tsx` | Added "Open from Google Drive" as 2nd item in welcome screen center menu |
| `excalidraw-app/app_constants.ts` | Added `GDRIVE_AUTOSAVE_DEBOUNCE_MS = 2000` |
| `excalidraw-app/index.html` | Added GIS script tag (`accounts.google.com/gsi/client`) |
| `excalidraw-app/global.d.ts` | Added TypeScript types for Google Identity Services (`google.accounts.oauth2`) |
| `excalidraw-app/.env.development` | Added `VITE_APP_GOOGLE_CLIENT_ID` placeholder |

---

## Errors Encountered

### 1. TypeScript: `Cannot find namespace 'google'`
**File:** `googleDrive.ts`
**Cause:** `global.d.ts` had top-level imports making it a module, so `declare namespace google` was not global.
**Fix:** Wrapped in `declare global { namespace google { ... } }`.

### 2. TypeScript: `Property 'google' does not exist on type 'Window'`
**Cause:** GIS loads async via CDN so `window.google` isn't always present at runtime.
**Fix:** Added `hasGIS()` helper using `(window as any).google?.accounts?.oauth2?.initTokenClient`.

### 3. TypeScript: `'string | null' not assignable to 'string | PromiseLike<string>'`
**File:** `googleDrive.ts` — `getAccessToken` promise resolver
**Fix:** Resolved with `response.access_token` directly (never null at that point).

### 4. TypeScript: Implicit `any` on GIS callback params
**Fix:** Explicitly typed `response: google.accounts.oauth2.TokenResponse` and `error: { type: string }`.

### 5. ESLint: Import ordering errors
**Files:** `AppMainMenu.tsx`, `DriveFileBrowser.tsx`, `useGoogleDrive.ts`
**Cause:** `googleDriveIcon` imports placed in wrong order group; ESLint `import/order` rule enforced as error.
**Fix:** Ran `yarn fix` — auto-fixed all ordering issues.

### 6. ESLint: `tokenClient` assigned but never used
**File:** `googleDrive.ts`
**Cause:** Module-level `tokenClient` variable was written to but never read.
**Fix:** Removed the variable entirely; `getAccessToken` creates the GIS token client inline per-request.

### 7. ESLint: `useAtomValue` imported but never used
**File:** `useGoogleDrive.ts`
**Fix:** Removed the unused import.

### 8. `listDriveFiles` returning empty results despite file existing in Drive
**Cause:** The list query filtered by `mimeType='application/vnd.excalidraw+json'` but Google Drive stored the file with a different MIME type (overriding the custom one from the upload metadata).
**Fix:** Changed query filter from MIME type to name: `name contains '.excalidraw' and trashed=false`.

### 9. OAuth `access_denied` — "App has not completed Google verification"
**Cause:** OAuth consent screen was set to "External" + "Testing" mode with no test users added.
**Fix:** User added their Google account (`kenny.trinh@codelink.io`) to the Test Users list in GCP → OAuth consent screen.

---

## GCP Setup Required

1. Create OAuth 2.0 client (type: Web Application) in GCP → APIs & Services → Credentials
2. Add `http://localhost:3001` to Authorized JavaScript Origins
3. Enable Google Drive API
4. Set `VITE_APP_GOOGLE_CLIENT_ID` in `.env.development.local`
5. Add your Google account as a test user in OAuth consent screen (while app is in Testing mode)

---

## Verified Working (via Playwright + manual)

- Welcome screen shows "Open from Google Drive" button with Drive icon
- Hamburger menu shows "Save to Google Drive" and "Open from Google Drive" at top
- Clicking "Save to Google Drive" triggers OAuth popup → authenticates → creates `.excalidraw` file in Drive → URL updates to `?gdrive=<fileId>`
- File appears in Google Drive (`Untitled-2026-03-24-1448.excalidraw`)
- "Open from Google Drive" lists saved files after MIME type filter fix

---

## Architecture Notes

- **No changes to `packages/excalidraw/`** — all code in `excalidraw-app/`
- OAuth token is in-memory only, never persisted
- Uses `drive.file` scope — app can only access files it created, not all Drive files
- Auto-save: 2000ms debounce via `onChange`, guarded by `activeDriveFile !== null`
- File browser uses promise-based modal pattern: `driveBrowserStateAtom` holds a `resolve` function that is called when the user picks a file or cancels
