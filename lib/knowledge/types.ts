export type KnowledgeCell = string | number | boolean | null;

export type KnowledgeRow = Record<string, KnowledgeCell>;

export type KnowledgeKind = "table" | "text";

export type KnowledgeRecord = {
  id: string;
  chatId: string;
  filename: string;
  kind: KnowledgeKind;
  columns: string[];
  rows: KnowledgeRow[];
  textContent: string | null;
  truncated: boolean;
  createdAt: string;
};

export type KnowledgeSummary = {
  id: string;
  filename: string;
  kind: KnowledgeKind;
  columns: string[];
  rowCount: number;
  truncated: boolean;
  createdAt: string;
};

/** 5 MB Dropzone / API cap — keeps parse time and serverless memory in check. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Max rows stored per sheet. The sandbox still only paints 48.
 * Next iteration if uploads grow past this: object storage + pgvector, not a
 * bigger JSON blob in the LLM context.
 */
export const MAX_STORE_ROWS = 200;

export const MAX_PDF_CHARS = 20_000;
