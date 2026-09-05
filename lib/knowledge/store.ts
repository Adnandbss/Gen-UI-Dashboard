import { desc, eq } from "drizzle-orm";

import { chats, knowledgeSources } from "@/db/schema";
import { getDb, hasDatabase } from "@/lib/db";
import { newSourceId, type ParsedKnowledge } from "@/lib/knowledge/parse";
import type {
  KnowledgeRecord,
  KnowledgeSummary,
} from "@/lib/knowledge/types";

const memory = new Map<string, KnowledgeRecord[]>();

function toSummary(record: KnowledgeRecord): KnowledgeSummary {
  return {
    id: record.id,
    filename: record.filename,
    kind: record.kind,
    columns: record.columns,
    rowCount: record.rows.length,
    truncated: record.truncated,
    createdAt: record.createdAt,
  };
}

async function ensureChat(chatId: string) {
  if (!hasDatabase()) return;
  const now = new Date();
  await getDb()
    .insert(chats)
    .values({
      id: chatId,
      title: "New chat",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
}

function fromRow(row: typeof knowledgeSources.$inferSelect): KnowledgeRecord {
  return {
    id: row.id,
    chatId: row.chatId,
    filename: row.filename,
    kind: row.kind === "text" ? "text" : "table",
    columns: row.columns ?? [],
    rows: row.rows ?? [],
    textContent: row.textContent,
    truncated: row.truncated,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listKnowledge(chatId: string): Promise<KnowledgeSummary[]> {
  if (!hasDatabase()) {
    return (memory.get(chatId) ?? []).map(toSummary);
  }
  const rows = await getDb()
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.chatId, chatId))
    .orderBy(desc(knowledgeSources.createdAt));
  return rows.map((row) => toSummary(fromRow(row)));
}

export async function getKnowledgeSource(
  chatId: string,
  sourceId: string,
): Promise<KnowledgeRecord | null> {
  if (!hasDatabase()) {
    return (memory.get(chatId) ?? []).find((row) => row.id === sourceId) ?? null;
  }
  const rows = await getDb()
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.id, sourceId))
    .limit(1);
  const row = rows[0];
  if (!row || row.chatId !== chatId) return null;
  return fromRow(row);
}

export async function insertParsedSources(
  chatId: string,
  parsed: ParsedKnowledge[],
): Promise<KnowledgeSummary[]> {
  const now = new Date().toISOString();
  const records: KnowledgeRecord[] = parsed.map((item) => ({
    id: newSourceId(),
    chatId,
    filename: item.filename,
    kind: item.kind,
    columns: item.columns,
    rows: item.rows,
    textContent: item.textContent,
    truncated: item.truncated,
    createdAt: now,
  }));

  if (!hasDatabase()) {
    const existing = memory.get(chatId) ?? [];
    memory.set(chatId, [...records, ...existing]);
    return records.map(toSummary);
  }

  await ensureChat(chatId);
  await getDb()
    .insert(knowledgeSources)
    .values(
      records.map((record) => ({
        id: record.id,
        chatId: record.chatId,
        filename: record.filename,
        kind: record.kind,
        columns: record.columns,
        rows: record.rows,
        textContent: record.textContent,
        truncated: record.truncated,
      })),
    );

  return records.map(toSummary);
}
