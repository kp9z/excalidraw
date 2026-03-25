import React, { useEffect, useRef } from "react";

import { useAtom, useAtomValue } from "../app-jotai";
import { activeDriveFileAtom, driveBrowserStateAtom } from "../googleDriveState";

import { googleDriveIcon } from "./googleDriveIcon";

import type { DriveFileInfo } from "../data/googleDrive";

const fileIcon = (
  <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, opacity: 0.45 }}>
    <path d="M2 0C0.9 0 0 0.9 0 2v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V5l-5-5H2zm0 1h6v4h4v9H2V2zm7 0 3 3h-3V1z" fill="currentColor"/>
  </svg>
);

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
};

export const DriveFileBrowser: React.FC = () => {
  const [state, setState] = useAtom(driveBrowserStateAtom);
  const activeDriveFile = useAtomValue(activeDriveFileAtom);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state) {
    return null;
  }

  const close = (fileInfo: DriveFileInfo | null) => {
    state.resolve(fileInfo);
    setState(null);
  };

  const { files, isLoading } = state;

  return (
    <div
      ref={overlayRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === overlayRef.current) {
          close(null);
        }
      }}
    >
      <div
        style={{
          background: "var(--color-surface-primary, #fff)",
          color: "var(--color-text-primary, #1e1e1e)",
          borderRadius: 8,
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          width: "min(520px, 90vw)",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-border, #e0e0e0)",
          }}
        >
          {googleDriveIcon}
          <span style={{ fontWeight: 600, fontSize: 16 }}>
            Open from Google Drive
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={() => close(null)}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              lineHeight: 1,
              color: "inherit",
              opacity: 0.6,
            }}
          >
            ×
          </button>
        </div>

        {/* File list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
          {isLoading ? (
            <div style={{ padding: "32px", textAlign: "center", opacity: 0.5 }}>
              Loading…
            </div>
          ) : files.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", opacity: 0.5 }}>
              No .excalidraw files found in your Drive.
            </div>
          ) : (
            files.map((f) => {
              const isActive = activeDriveFile?.fileId === f.fileId;
              const displayName = f.fileName.replace(/\.excalidraw$/, "");
              return (
                <button
                  key={f.fileId}
                  type="button"
                  onClick={() => close(f)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "10px 20px",
                    background: isActive
                      ? "var(--color-surface-secondary, #f4f4f4)"
                      : "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "inherit",
                    fontSize: 14,
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "var(--color-surface-secondary, #f4f4f4)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = isActive
                      ? "var(--color-surface-secondary, #f4f4f4)"
                      : "none")
                  }
                >
                  {fileIcon}
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontWeight: isActive ? 600 : undefined,
                    }}
                  >
                    {displayName}
                  </span>
                  {isActive && (
                    <span style={{ fontSize: 11, opacity: 0.5, flexShrink: 0, marginRight: 4 }}>
                      current
                    </span>
                  )}
                  {"modifiedTime" in f && (
                    <span style={{ opacity: 0.5, fontSize: 12, flexShrink: 0 }}>
                      {formatDate((f as any).modifiedTime)}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--color-border, #e0e0e0)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={() => close(null)}
            style={{
              padding: "6px 16px",
              borderRadius: 4,
              border: "1px solid var(--color-border, #ccc)",
              background: "none",
              cursor: "pointer",
              color: "inherit",
              fontSize: 14,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
