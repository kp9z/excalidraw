import { useCallback, useRef } from "react";

import { debounce } from "@excalidraw/common";
import { CaptureUpdateAction } from "@excalidraw/excalidraw";
import { loadFromBlob } from "@excalidraw/excalidraw/data/blob";
import { serializeAsJSON } from "@excalidraw/excalidraw/data/json";

import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/element/types";

import { useAtom, appJotaiStore } from "../app-jotai";
import { GDRIVE_AUTOSAVE_DEBOUNCE_MS } from "../app_constants";
import {
  getAccessToken,
  listDriveFiles,
  loadSceneFromDrive,
  saveSceneToDrive,
} from "../data/googleDrive";
import {
  activeDriveFileAtom,
  driveBrowserStateAtom,
  isDriveSavingAtom,
} from "../googleDriveState";

export const useGoogleDrive = (
  excalidrawAPI: ExcalidrawImperativeAPI | null,
) => {
  const [activeDriveFile, setActiveDriveFile] = useAtom(activeDriveFileAtom);
  const [isDriveSaving, setIsDriveSaving] = useAtom(isDriveSavingAtom);

  // ---------------------------------------------------------------------------
  // Open file browser (sets the driveBrowserStateAtom to show the modal)
  // ---------------------------------------------------------------------------
  const openDriveBrowser = useCallback(
    () =>
      new Promise<import("../data/googleDrive").DriveFileInfo | null>(
        (resolve) => {
          appJotaiStore.set(driveBrowserStateAtom, {
            resolve,
            files: [],
            isLoading: true,
          });
          // Fetch files and update state
          listDriveFiles()
            .then((files) => {
              appJotaiStore.set(driveBrowserStateAtom, (prev) =>
                prev ? { ...prev, files, isLoading: false } : prev,
              );
            })
            .catch(() => {
              appJotaiStore.set(driveBrowserStateAtom, (prev) =>
                prev ? { ...prev, files: [], isLoading: false } : prev,
              );
            });
        },
      ),
    [],
  );

  // ---------------------------------------------------------------------------
  // Save (first save — creates new Drive file)
  // ---------------------------------------------------------------------------
  const saveNewFileToDrive = useCallback(async () => {
    if (!excalidrawAPI) {
      return;
    }
    try {
      await getAccessToken();
    } catch (e: any) {
      excalidrawAPI.setToast({
        message: `Google Drive: ${e.message || "Authentication failed"}`,
        closable: true,
        duration: 5000,
      });
      return;
    }

    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    const files = excalidrawAPI.getFiles();
    const name = excalidrawAPI.getName() || "Untitled";

    const json = serializeAsJSON(elements, appState, files, "local");

    try {
      setIsDriveSaving(true);
      const fileInfo = await saveSceneToDrive(json, activeDriveFile, name);
      setActiveDriveFile(fileInfo);
      window.history.replaceState(
        {},
        document.title,
        `?gdrive=${fileInfo.fileId}`,
      );
      excalidrawAPI.setToast({ message: "Saved to Google Drive ✓" });
    } catch (e: any) {
      excalidrawAPI.setToast({
        message: `Drive save failed: ${e.message}`,
        closable: true,
        duration: 5000,
      });
    } finally {
      setIsDriveSaving(false);
    }
  }, [excalidrawAPI, activeDriveFile, setActiveDriveFile, setIsDriveSaving]);

  // ---------------------------------------------------------------------------
  // Open from Drive (shows browser modal, then loads selected file)
  // ---------------------------------------------------------------------------
  const openFileFromDrive = useCallback(async () => {
    if (!excalidrawAPI) {
      return;
    }
    try {
      await getAccessToken();
    } catch (e: any) {
      excalidrawAPI.setToast({
        message: `Google Drive: ${e.message || "Authentication failed"}`,
        closable: true,
        duration: 5000,
      });
      return;
    }

    const fileInfo = await openDriveBrowser();
    if (!fileInfo) {
      return;
    }

    try {
      const json = await loadSceneFromDrive(fileInfo.fileId);
      const data = await loadFromBlob(new Blob([json]), null, null);
      excalidrawAPI.updateScene({
        elements: data.elements ?? [],
        appState: {
          ...data.appState,
          isLoading: false,
        },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      if (data.files) {
        excalidrawAPI.addFiles(Object.values(data.files));
      }
      setActiveDriveFile(fileInfo);
      window.history.replaceState(
        {},
        document.title,
        `?gdrive=${fileInfo.fileId}`,
      );
    } catch (e: any) {
      excalidrawAPI.setToast({
        message: `Drive open failed: ${e.message}`,
        closable: true,
        duration: 5000,
      });
    }
  }, [excalidrawAPI, openDriveBrowser, setActiveDriveFile]);

  // ---------------------------------------------------------------------------
  // Debounced auto-save (called from onChange)
  // ---------------------------------------------------------------------------
  const driveSaveRef = useRef(
    debounce(
      async (
        elements: readonly OrderedExcalidrawElement[],
        appState: AppState,
        files: BinaryFiles,
      ) => {
        const fileInfo = appJotaiStore.get(activeDriveFileAtom);
        if (!fileInfo) {
          return;
        }
        const saving = appJotaiStore.get(isDriveSavingAtom);
        if (saving) {
          return;
        }
        const json = serializeAsJSON(elements, appState, files, "local");
        try {
          appJotaiStore.set(isDriveSavingAtom, true);
          await saveSceneToDrive(json, fileInfo, fileInfo.fileName);
        } catch (e) {
          console.warn("[Drive auto-save] failed:", e);
        } finally {
          appJotaiStore.set(isDriveSavingAtom, false);
        }
      },
      GDRIVE_AUTOSAVE_DEBOUNCE_MS,
    ),
  );

  const driveSaveDebounced = useCallback(
    (
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      driveSaveRef.current(elements, appState, files);
    },
    [],
  );

  return {
    activeDriveFile,
    isDriveSaving,
    saveNewFileToDrive,
    openFileFromDrive,
    driveSaveDebounced,
  };
};
