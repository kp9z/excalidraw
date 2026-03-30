# Quickstart: Developing Google Drive Integration Locally

**Feature**: 001-google-drive-integration
**Date**: 2026-03-30

---

## Prerequisites

1. Node.js 18+ and Yarn installed
2. A Google Cloud Platform project with:
   - Google Drive API enabled
   - Google Picker API enabled
   - OAuth2 credentials (Web application type) with `http://localhost:3000` in authorized origins
   - An API key with HTTP referrer restriction to `localhost:3000`

---

## Environment Setup

```bash
# 1. Copy env template
cp .env.example .env

# 2. Fill in your credentials
# VITE_GOOGLE_CLIENT_ID=<your-oauth-client-id>.apps.googleusercontent.com
# VITE_GOOGLE_API_KEY=<your-api-key>
```

---

## Running the Dev Server

```bash
yarn start
```

Open `http://localhost:3000`. The app hot-reloads on file changes.

---

## Manual Verification Checklist

After implementing, verify these flows manually:

### Save to Drive (US1)

- [ ] Draw a shape on the canvas
- [ ] Open the main menu (hamburger icon)
- [ ] Click "Save to Drive"
- [ ] A Google popup appears — sign in and consent
- [ ] Toast: "Saved to Drive: Untitled.excalidraw" appears
- [ ] Check Google Drive — file exists with correct name
- [ ] Menu item now shows "Save to Drive · Last saved just now"
- [ ] Modify canvas → click "Save to Drive" again
- [ ] **No popup this time** — save completes immediately
- [ ] In Google Drive, the file is updated (same file, not a new one)

### Open from Drive (US2)

- [ ] Refresh the page (canvas resets to blank)
- [ ] Open the main menu
- [ ] Click "Open from Drive"
- [ ] The Google Drive Picker appears
- [ ] Only `.excalidraw` files are visible
- [ ] Select the file saved above
- [ ] Confirmation dialog warns about canvas replacement
- [ ] After confirming, canvas loads with the saved elements

### Offline Behavior (AC-4)

- [ ] Open DevTools → Network tab → set to "Offline"
- [ ] Try "Save to Drive" → error toast: "Offline — Drive is unavailable"
- [ ] Drawing on canvas still works normally
- [ ] localStorage auto-save still works (refresh → canvas restored from local)

### Disconnect (US3)

- [ ] With Drive connected, open main menu
- [ ] Click "Disconnect Drive"
- [ ] Menu shows no connected account
- [ ] Canvas content unchanged
- [ ] Click "Save to Drive" → auth popup reappears

---

## Running Tests

```bash
# Unit tests for the Drive module only
yarn vitest run excalidraw-app/tests/googleDrive.test.ts

# Full test suite (must pass before PR)
yarn test:app

# TypeScript check
yarn test:typecheck

# Lint (zero warnings)
yarn test:code

# Regenerate snapshots after menu changes
yarn test:update
```

---

## Troubleshooting

**Popup is blocked by the browser**: Chrome may block popups triggered programmatically.
Ensure the `requestAccessToken()` call is invoked directly from a user click event (not
inside a setTimeout or async chain that loses the user gesture).

**"This app isn't verified" warning**: Expected in development. Click "Advanced" → "Go to
[app] (unsafe)" to proceed. This warning disappears once the OAuth consent screen is verified
by Google (for production).

**Picker doesn't show `.excalidraw` files**: The Picker filters by MIME type
(`application/octet-stream`). Files must have been created by this app or be of that MIME type.
For testing, ensure test files were saved via the "Save to Drive" action in this app.

**401 on Drive API call**: The access token may have expired. The module should automatically
retry after re-authorizing; if not, check that the `authorize()` function is called before
the retry in `saveToDrive()`.
