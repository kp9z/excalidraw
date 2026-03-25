import { atom } from "./app-jotai";

import type { DriveFileInfo } from "./data/googleDrive";

// The currently "active" Drive file — set after open or first save
export const activeDriveFileAtom = atom<DriveFileInfo | null>(null);

// Whether a Drive save is in-flight
export const isDriveSavingAtom = atom<boolean>(false);

// Resolver for the file browser modal (set when browser is open, null when closed)
export const driveBrowserStateAtom = atom<{
  resolve: (fileInfo: DriveFileInfo | null) => void;
  files: DriveFileInfo[];
  isLoading: boolean;
} | null>(null);
