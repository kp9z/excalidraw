export type DriveFileInfo = { fileId: string; fileName: string };

// ---------------------------------------------------------------------------
// OAuth token state (module-level, never persisted)
// ---------------------------------------------------------------------------
let accessToken: string | null = null;
let tokenExpiresAt = 0;
let pendingTokenRequest: Promise<string> | null = null;

const hasGIS = (): boolean =>
  typeof window !== "undefined" &&
  typeof (window as any).google?.accounts?.oauth2?.initTokenClient ===
    "function";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

export const initGoogleAuth = (): void => {
  // GIS library warm-up — no-op if not available yet; getAccessToken creates
  // the token client lazily on first call.
  if (!hasGIS()) {
  }
};

export const isAuthenticated = (): boolean =>
  !!accessToken && Date.now() < tokenExpiresAt - 60_000;

export const getAccessToken = (): Promise<string> => {
  if (isAuthenticated()) {
    return Promise.resolve(accessToken!);
  }

  // Reuse in-flight request
  if (pendingTokenRequest) {
    return pendingTokenRequest;
  }

  pendingTokenRequest = new Promise<string>((resolve, reject) => {
    if (!hasGIS()) {
      reject(new Error("Google Identity Services not loaded"));
      return;
    }

    const wasPreviouslyAuthenticated = isAuthenticated();
    const newClient = google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_APP_GOOGLE_CLIENT_ID as string,
      scope: DRIVE_SCOPE,
      callback: (response: google.accounts.oauth2.TokenResponse) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        accessToken = response.access_token;
        tokenExpiresAt = Date.now() + response.expires_in * 1000;
        resolve(response.access_token);
      },
      error_callback: (error: { type: string }) => {
        reject(new Error(error.type));
      },
    });
    // Use prompt: '' for silent refresh when user has already granted access
    newClient.requestAccessToken({
      prompt: wasPreviouslyAuthenticated ? "" : undefined,
    });
  }).finally(() => {
    pendingTokenRequest = null;
  });

  return pendingTokenRequest;
};

// ---------------------------------------------------------------------------
// Drive REST API helpers
// ---------------------------------------------------------------------------

const driveHeaders = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
});

const checkResponse = async (res: Response): Promise<Response> => {
  if (res.status === 401) {
    // Token expired — clear and let caller retry
    accessToken = null;
    tokenExpiresAt = 0;
  }
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`Drive API error ${res.status}: ${body}`);
  }
  return res;
};

// ---------------------------------------------------------------------------
// Scene file operations
// ---------------------------------------------------------------------------

export const saveSceneToDrive = async (
  json: string,
  fileInfo: DriveFileInfo | null,
  fileName: string,
): Promise<DriveFileInfo> => {
  const token = await getAccessToken();

  if (fileInfo) {
    // Update existing file content
    const res = await fetch(
      `${DRIVE_UPLOAD_API}/files/${fileInfo.fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          ...driveHeaders(token),
          "Content-Type": "application/json",
        },
        body: json,
      },
    );
    await checkResponse(res);
    return fileInfo;
  }

  // Create new file with metadata
  const metadata = {
    name: fileName.endsWith(".excalidraw")
      ? fileName
      : `${fileName}.excalidraw`,
    mimeType: "application/vnd.excalidraw+json",
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  form.append("file", new Blob([json], { type: "application/json" }));

  const res = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart`, {
    method: "POST",
    headers: driveHeaders(token),
    body: form,
  });
  await checkResponse(res);
  const data = await res.json();
  return { fileId: data.id, fileName: metadata.name };
};

export const loadSceneFromDrive = async (fileId: string): Promise<string> => {
  const token = await getAccessToken();
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: driveHeaders(token),
  });
  await checkResponse(res);
  return res.text();
};

export const listDriveFiles = async (): Promise<DriveFileInfo[]> => {
  const token = await getAccessToken();
  const q = encodeURIComponent(
    "name contains '.excalidraw' and trashed=false",
  );
  const fields = encodeURIComponent("files(id,name,modifiedTime)");
  const res = await fetch(
    `${DRIVE_API}/files?q=${q}&fields=${fields}&orderBy=modifiedTime+desc`,
    { headers: driveHeaders(token) },
  );
  await checkResponse(res);
  const data = await res.json();
  return (data.files ?? []).map(
    (f: { id: string; name: string; modifiedTime: string }) => ({
      fileId: f.id,
      fileName: f.name,
      modifiedTime: f.modifiedTime,
    }),
  );
};
