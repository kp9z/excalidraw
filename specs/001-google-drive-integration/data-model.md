# Data Model: Google Drive Save and Load

**Feature**: 001-google-drive-integration
**Date**: 2026-03-30

---

## Entities

### GoogleDriveSession

Represents the user's active Google Drive authorization within the current browser tab.

| Field         | Type     | Description                                               |
|---------------|----------|-----------------------------------------------------------|
| `accessToken` | `string` | OAuth2 bearer token from GIS (in-memory only, not stored) |
| `expiresAt`   | `number` | Unix timestamp (ms) when the token expires                |
| `email`       | `string` | Google account email (for display only)                   |

**Persistence**: In-memory module variable in `googleDrive.ts`. Cleared on tab close.
**Lifecycle**: Created on first Drive action; silently refreshed on expiry.

---

### GoogleDriveFile

Represents the Drive file currently associated with the open canvas.

| Field        | Type     | Description                                              |
|--------------|----------|----------------------------------------------------------|
| `fileId`     | `string` | Google Drive file identifier                             |
| `fileName`   | `string` | Display name of the file in Drive (e.g. `My Diagram.excalidraw`) |
| `lastSaved`  | `Date`   | Timestamp of the most recent successful save             |

**Persistence**: `fileId` and `lastSaved` stored in `localStorage` under keys:
- `excalidraw-drive-file-id`
- `excalidraw-drive-last-saved` (ISO string)
- `excalidraw-drive-file-name`

**Lifecycle**: Set on first successful "Save to Drive". Cleared when user disconnects Drive
or clears the canvas ("New drawing").

---

### DiagramSnapshot

The serialized canvas state that is written to / read from Drive. Uses the existing
Excalidraw JSON format — no new format introduced.

```typescript
// Existing type — defined in packages/excalidraw/data/json.ts
interface ExcalidrawSerializedData {
  type: "excalidraw";
  version: number;
  source: string;
  elements: ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;  // embedded binary assets (base64)
}
```

**Produced by**: `serializeAsJSON(elements, appState, files, "local")`
**Consumed by**: `loadFromBlob(blob, localAppState, localElements)`

---

## State Transitions

### Drive Connection State Machine

```
[Disconnected]
    │
    ▼  User clicks "Save to Drive" or "Open from Drive"
[Authorizing]  ──── auth fails ────►  [Disconnected] + error toast
    │
    ▼  GIS returns access token
[Connected]
    ├── User clicks "Save to Drive"     ──►  [Saving]   ──► [Connected] + last-saved updated
    ├── User clicks "Open from Drive"   ──►  [Picking]  ──► [Connected] + canvas replaced
    ├── User clicks "Disconnect Drive"  ──►  [Disconnected]
    └── Token expires (>1h)             ──►  [Authorizing] (silent refresh)
```

### File Association State Machine

```
[No File Associated]
    │
    ▼  User saves for the first time (Upload → Drive returns fileId)
[File Associated: fileId + fileName stored in localStorage]
    ├── Subsequent save     ──►  [File Associated] (PATCH existing file)
    ├── "Open from Drive"   ──►  [File Associated] (new fileId from picker)
    └── "New drawing" / disconnect  ──►  [No File Associated]
```

---

## localStorage Keys

| Key                          | Value Type | Description                        |
|------------------------------|------------|------------------------------------|
| `excalidraw-drive-file-id`   | `string`   | Active Drive file ID               |
| `excalidraw-drive-file-name` | `string`   | Active Drive file display name     |
| `excalidraw-drive-last-saved`| ISO string | Last successful save timestamp     |

These keys are independent of the existing Excalidraw localStorage keys:
- `excalidraw` (elements)
- `excalidraw-state` (AppState)

---

## Jotai Atoms (excalidraw-app/app-jotai.ts)

```typescript
// null = not connected
export const googleDriveSessionAtom = atom<{ email: string } | null>(null);

// null = no Drive file associated with current canvas
export const googleDriveFileAtom = atom<{
  fileId: string;
  fileName: string;
  lastSaved: Date;
} | null>(null);
```

These atoms drive:
- Menu item labels ("Save to Drive" / "Connected as foo@gmail.com")
- Enabled/disabled state of Drive actions
- "Last saved" timestamp display in menu
