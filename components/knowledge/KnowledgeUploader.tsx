"use client";

import {
  Check,
  CircleAlert,
  FileSpreadsheet,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

import type { KnowledgeSummary } from "@/lib/knowledge/types";
import { MAX_FILE_BYTES } from "@/lib/knowledge/types";
import { cn } from "@/lib/utils";

type PendingItem = {
  id: string;
  filename: string;
  kind: KnowledgeSummary["kind"];
  status: "pending" | "error";
  error?: string;
};

function sourceIcon(kind: KnowledgeSummary["kind"]) {
  return kind === "text" ? FileText : FileSpreadsheet;
}

function rowLabel(source: KnowledgeSummary) {
  if (source.kind === "text") return "Text only — not for charts";
  return source.truncated
    ? `${source.rowCount} rows (capped)`
    : `${source.rowCount} rows`;
}

export function KnowledgeUploader({
  chatId,
  sources,
  onUploaded,
}: {
  chatId?: string;
  sources: KnowledgeSummary[];
  onUploaded?: () => void;
}) {
  const [pending, setPending] = useState<PendingItem[]>([]);

  useEffect(() => {
    setPending([]);
  }, [chatId]);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!chatId) return;

      for (const file of files) {
        const pendingId = `pending_${file.name}_${file.lastModified}_${file.size}`;
        setPending((current) => [
          {
            id: pendingId,
            filename: file.name,
            kind: file.name.toLowerCase().endsWith(".pdf") ? "text" : "table",
            status: "pending",
          },
          ...current,
        ]);

        const body = new FormData();
        body.set("file", file);
        body.set("chatId", chatId);

        try {
          const res = await fetch("/api/knowledge", { method: "POST", body });
          const data = (await res.json()) as { error?: string };
          if (!res.ok) {
            throw new Error(data.error ?? "Upload failed.");
          }
          setPending((current) =>
            current.filter((item) => item.id !== pendingId),
          );
          onUploaded?.();
        } catch (error) {
          setPending((current) =>
            current.map((item) =>
              item.id === pendingId
                ? {
                    ...item,
                    status: "error",
                    error:
                      error instanceof Error
                        ? error.message
                        : "Upload failed.",
                  }
                : item,
            ),
          );
        }
      }
    },
    [chatId, onUploaded],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      onDropRejected: (rejections) => {
        setPending((current) => [
          ...rejections.map((rejection) => {
            const tooBig = rejection.errors.some(
              (err) => err.code === "file-too-large",
            );
            return {
              id: `pending_${rejection.file.name}_${rejection.file.lastModified}_${rejection.file.size}`,
              filename: rejection.file.name,
              kind: rejection.file.name.toLowerCase().endsWith(".pdf")
                ? ("text" as const)
                : ("table" as const),
              status: "error" as const,
              error: tooBig
                ? "File is over 5 MB."
                : "Use a CSV, Excel, or PDF file.",
            };
          }),
          ...current,
        ]);
      },
      disabled: !chatId,
      maxSize: MAX_FILE_BYTES,
      multiple: true,
      accept: {
        "text/csv": [".csv"],
        "application/vnd.ms-excel": [".xls"],
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
          ".xlsx",
        ],
        "application/pdf": [".pdf"],
      },
    });

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground px-3 text-xs font-medium tracking-wide uppercase">
        Knowledge
      </p>
      <div
        {...getRootProps({
          "aria-label": "Upload CSV, Excel, or PDF to this chat",
        })}
        className={cn(
          "mx-1 cursor-pointer rounded-lg border border-dashed px-3 py-3 text-center transition-colors",
          isDragActive && "border-[var(--brand)] bg-[var(--brand)]/8",
          isDragReject && "border-destructive bg-destructive/8",
          !chatId && "cursor-not-allowed opacity-60",
        )}
      >
        <input {...getInputProps()} />
        <Upload className="text-muted-foreground mx-auto mb-1.5 size-4" aria-hidden />
        <p className="text-xs leading-snug font-medium">
          {isDragActive ? "Drop to attach" : "Drop CSV, Excel, or PDF"}
        </p>
        <p className="text-muted-foreground mt-0.5 text-[11px]">
          5 MB max. Tables replace Acme for this chat.
        </p>
      </div>

      {pending.length > 0 || sources.length > 0 ? (
        <ul className="space-y-0.5 px-1">
          {pending.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2 rounded-lg px-2 py-1.5"
            >
              {item.status === "pending" ? (
                <Loader2
                  className="text-muted-foreground mt-0.5 size-3.5 shrink-0 animate-spin"
                  aria-hidden
                />
              ) : (
                <CircleAlert
                  className="text-destructive mt-0.5 size-3.5 shrink-0"
                  aria-hidden
                />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">
                  {item.filename}
                </span>
                <span
                  className={cn(
                    "block text-[11px] leading-snug",
                    item.status === "error"
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {item.status === "pending"
                    ? "Uploading…"
                    : (item.error ?? "Could not read that file.")}
                </span>
              </span>
            </li>
          ))}
          {sources.map((source) => {
            const Icon = sourceIcon(source.kind);
            return (
              <li
                key={source.id}
                className="flex items-start gap-2 rounded-lg px-2 py-1.5"
              >
                <span className="relative mt-0.5 shrink-0">
                  <Icon className="text-muted-foreground size-3.5" aria-hidden />
                  <Check
                    className="absolute -right-1 -bottom-1 size-2.5 text-[var(--brand)]"
                    aria-hidden
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">
                    {source.filename}
                  </span>
                  <span className="text-muted-foreground block text-[11px] leading-snug">
                    {rowLabel(source)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
