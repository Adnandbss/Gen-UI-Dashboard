import { desc, eq } from "drizzle-orm";

import type { ChatMessage } from "@/ai/types";
import { chatMessages, chats } from "@/db/schema";
import { getDb, hasDatabase } from "@/lib/db";

type StoredChat = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
};

const memory = new Map<string, StoredChat>();

function titleFromMessages(messages: ChatMessage[]) {
  for (const message of messages) {
    if (message.role !== "user") continue;
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    return text.length <= 60 ? text : `${text.slice(0, 57)}…`;
  }
  return "New chat";
}

export async function loadChat(id: string): Promise<ChatMessage[]> {
  if (!hasDatabase()) {
    return memory.get(id)?.messages ?? [];
  }

  const rows = await getDb()
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.chatId, id))
    .limit(1);

  const payload = rows[0]?.messages;
  return Array.isArray(payload) ? (payload as ChatMessage[]) : [];
}

export async function saveChat(id: string, messages: ChatMessage[]) {
  const title = titleFromMessages(messages);
  const now = new Date();

  if (!hasDatabase()) {
    const existing = memory.get(id);
    memory.set(id, {
      id,
      title,
      messages,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    return;
  }

  const db = getDb();
  await db
    .insert(chats)
    .values({ id, title, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: chats.id,
      set: { title, updatedAt: now },
    });

  await db
    .insert(chatMessages)
    .values({ chatId: id, messages, updatedAt: now })
    .onConflictDoUpdate({
      target: chatMessages.chatId,
      set: { messages, updatedAt: now },
    });
}

export async function listChats(limit = 12): Promise<
  { id: string; title: string; updatedAt: string }[]
> {
  if (!hasDatabase()) {
    return [...memory.values()]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit)
      .map((chat) => ({
        id: chat.id,
        title: chat.title,
        updatedAt: chat.updatedAt.toISOString(),
      }));
  }

  const rows = await getDb()
    .select({
      id: chats.id,
      title: chats.title,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .orderBy(desc(chats.updatedAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
  }));
}
