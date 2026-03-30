# Contract: Google Drive API Interactions

**Feature**: 001-google-drive-integration
**Date**: 2026-03-30

This document defines the interface contract between the feature module
(`excalidraw-app/data/googleDrive.ts`) and external Google APIs.

---

## Module Public API

The `googleDrive.ts` module exports the following functions consumed by
`AppMainMenu.tsx` and `App.tsx`:

```typescript
/**
 * Request a Google Drive access token from the user.
 * On first call, shows the Google consent popup.
 * On subsequent calls within the same session, silently refreshes if needed.
 * Throws GoogleDriveAuthError if the user denies or dismisses.
 */
export async function authorize(): Promise<{ email: string }>;

/**
 * Save the serialized diagram content to Google Drive.
 * - If no Drive file is currently associated (no stored fileId), creates a new file.
 * - If a fileId exists in localStorage, patches the existing file.
 * Returns the file ID and file name of the saved file.
 */
export async function saveToDrive(
  content: string,           // Output of serializeAsJSON()
  currentFileId?: string,    // From localStorage, if any
  fileName?: string,         // Default: "Untitled.excalidraw"
): Promise<{ fileId: string; fileName: string }>;

/**
 * Show the Google Drive Picker and return the selected file's content.
 * The picker filters to files with MIME type application/octet-stream
 * and name ending in ".excalidraw".
 * Returns null if the user cancels without selecting.
 */
export async function openFromDrive(): Promise<{
  fileId: string;
  fileName: string;
  content: string;           // Raw file content (JSON string)
} | null>;

/**
 * Revoke the stored access token and clear all Drive state.
 * Does not modify the canvas.
 */
export function disconnect(): void;

/**
 * Returns true if an unexpired access token is currently held in memory.
 */
export function isConnected(): boolean;
```

---

## External API: Google Identity Services (GIS)

**Endpoint**: `https://accounts.google.com/gsi/client` (loaded via script tag)

**Flow**: Token Model (implicit grant for browser SPAs)

```
App calls: google.accounts.oauth2.initTokenClient({
  client_id: GCP_CLIENT_ID,
  scope: "https://www.googleapis.com/auth/drive.file",
  callback: (response) => { /* handle access token */ },
})

App calls: tokenClient.requestAccessToken({ prompt: '' })
  → browser shows Google consent popup (first time)
  → callback receives: { access_token, expires_in, token_type }
```

**Error conditions**:
- User closes popup → `error: "access_denied"`
- Token client not initialized → `ReferenceError`
- GIS script fails to load → catch and surface "Google services unavailable" error

---

## External API: Google Drive REST API v3

**Base URL**: `https://www.googleapis.com/`

**Auth header**: `Authorization: Bearer <access_token>` on all requests.

### Create New File

```
POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart

Content-Type: multipart/related; boundary=<boundary>

--<boundary>
Content-Type: application/json; charset=UTF-8

{
  "name": "Untitled.excalidraw",
  "mimeType": "application/octet-stream"
}
--<boundary>
Content-Type: application/octet-stream

<serialized JSON content>
--<boundary>--

Response 200:
{
  "id": "<fileId>",
  "name": "Untitled.excalidraw",
  "kind": "drive#file"
}

Error responses:
  401 Unauthorized → token expired → re-authorize and retry once
  403 Forbidden (storage quota) → surface "Drive storage full" error to user
  5xx → surface "Drive unavailable, try again" error
```

### Update Existing File

```
PATCH https://www.googleapis.com/upload/drive/v3/files/{fileId}?uploadType=media

Content-Type: application/octet-stream

<serialized JSON content>

Response 200:
{
  "id": "<fileId>",
  "name": "<filename>",
  "modifiedTime": "<ISO timestamp>"
}

Error responses:
  401 → re-authorize and retry once
  404 Not Found → fileId stale (file deleted from Drive externally)
        → clear stored fileId, create new file, inform user
  403 → surface permission error
```

### Download File Content

```
GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media

Response 200: raw file content (application/octet-stream)
              → parse as UTF-8 JSON string

Error responses:
  401 → re-authorize and retry once
  404 → surface "File not found or no longer accessible"
  403 → surface "Permission denied"
```

---

## External API: Google Picker API

**Script**: `https://apis.google.com/js/api.js` (loaded on demand)

```javascript
gapi.load('picker', () => {
  const picker = new google.picker.PickerBuilder()
    .addView(
      new google.picker.DocsView()
        .setMimeTypes("application/octet-stream")
        .setQuery("*.excalidraw")
    )
    .setOAuthToken(accessToken)
    .setDeveloperKey(GOOGLE_API_KEY)
    .setCallback((data) => {
      if (data.action === google.picker.Action.PICKED) {
        const fileId = data.docs[0].id;
        const fileName = data.docs[0].name;
        // → call drive files.get to download content
      }
      if (data.action === google.picker.Action.CANCEL) {
        // → user dismissed, no-op
      }
    })
    .build();
  picker.setVisible(true);
});
```

---

## Configuration Constants

These must be provided as environment variables (injected at build time via Vite):

| Variable                   | Description                                    |
|----------------------------|------------------------------------------------|
| `VITE_GOOGLE_CLIENT_ID`    | GCP OAuth2 client ID (web application type)    |
| `VITE_GOOGLE_API_KEY`      | GCP API key (for Picker API)                   |

**Not secrets**: Client ID and API Key for browser OAuth flows are intentionally public-facing.
They must be restricted in GCP console to specific origins (excalidraw.com, localhost:3000).
