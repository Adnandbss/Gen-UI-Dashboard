import { randomBytes } from "node:crypto";
import * as XLSX from "xlsx";

import {
  MAX_FILE_BYTES,
  MAX_PDF_CHARS,
  MAX_STORE_ROWS,
  type KnowledgeCell,
  type KnowledgeKind,
  type KnowledgeRow,
} from "@/lib/knowledge/types";

export type ParsedKnowledge = {
  filename: string;
  kind: KnowledgeKind;
  columns: string[];
  rows: KnowledgeRow[];
  textContent: string | null;
  truncated: boolean;
};

function newSourceId() {
  return `ks_${randomBytes(8).toString("hex")}`;
}

function cellValue(value: unknown): KnowledgeCell {
  if (value == null) return null;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  const text = String(value).trim();
  return text === "" ? null : text;
}

function rowsFromSheet(sheet: XLSX.WorkSheet): {
  columns: string[];
  rows: KnowledgeRow[];
  truncated: boolean;
} {
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  });
  const truncated = json.length > MAX_STORE_ROWS;
  const sliced = json.slice(0, MAX_STORE_ROWS);
  const columns = [
    ...new Set(sliced.flatMap((row) => Object.keys(row))),
  ];
  const rows = sliced.map((row) => {
    const next: KnowledgeRow = {};
    for (const column of columns) {
      next[column] = cellValue(row[column]);
    }
    return next;
  });
  return { columns, rows, truncated };
}

export function parseSpreadsheet(
  buffer: Buffer,
  filename: string,
): ParsedKnowledge[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheets = workbook.SheetNames.length > 0 ? workbook.SheetNames : ["Sheet1"];
  return sheets.flatMap((name) => {
    const sheet = workbook.Sheets[name];
    if (!sheet) return [];
    const parsed = rowsFromSheet(sheet);
    if (parsed.columns.length === 0) return [];
    const label =
      sheets.length > 1 ? `${filename} / ${name}` : filename;
    return [
      {
        filename: label,
        kind: "table" as const,
        columns: parsed.columns,
        rows: parsed.rows,
        textContent: null,
        truncated: parsed.truncated,
      },
    ];
  });
}

export async function parsePdf(
  buffer: Buffer,
  filename: string,
): Promise<ParsedKnowledge> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const raw = (result.text ?? "").trim();
    const truncated = raw.length > MAX_PDF_CHARS;
    return {
      filename,
      kind: "text",
      columns: [],
      rows: [],
      textContent: raw.slice(0, MAX_PDF_CHARS),
      truncated,
    };
  } finally {
    await parser.destroy();
  }
}

export function assertFileSize(bytes: number) {
  if (bytes > MAX_FILE_BYTES) {
    throw new Error(`File is over ${MAX_FILE_BYTES / (1024 * 1024)} MB.`);
  }
}

export function classifyFilename(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return "spreadsheet" as const;
  }
  if (lower.endsWith(".pdf")) return "pdf" as const;
  return "unknown" as const;
}

export async function parseKnowledgeFile(
  buffer: Buffer,
  filename: string,
): Promise<ParsedKnowledge[]> {
  const kind = classifyFilename(filename);
  if (kind === "spreadsheet") {
    const sheets = parseSpreadsheet(buffer, filename);
    if (sheets.length === 0) {
      throw new Error("No table rows found in that file.");
    }
    return sheets;
  }
  if (kind === "pdf") {
    return [await parsePdf(buffer, filename)];
  }
  throw new Error("Use a CSV, Excel, or PDF file.");
}

export { newSourceId };
