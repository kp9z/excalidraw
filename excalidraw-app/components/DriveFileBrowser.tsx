import React, { useEffect, useRef } from "react";

import { useAtom } from "../app-jotai";
import { driveBrowserStateAtom } from "../googleDriveState";

import { googleDriveIcon } from "./googleDriveIcon";

import type { DriveFileInfo } from "../data/googleDrive";

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
            files.map((f) => (
              <button
                key={f.fileId}
                type="button"
                onClick={() => close(f)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "10px 20px",
                  background: "none",
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
                  ((e.currentTarget as HTMLElement).style.background = "none")
                }
              >
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.fileName}
                </span>
                {"modifiedTime" in f && (
                  <span style={{ opacity: 0.5, fontSize: 12, flexShrink: 0 }}>
                    {formatDate((f as any).modifiedTime)}
                  </span>
                )}
              </button>
            ))
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
