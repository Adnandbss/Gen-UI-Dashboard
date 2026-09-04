import { notFound } from "next/navigation";

import { ChatShell } from "@/components/chat/ChatShell";
import { isChatId } from "@/lib/chat-id";
import { loadChat } from "@/lib/chat-store";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isChatId(id)) notFound();

  const messages = await loadChat(id);
  return <ChatShell key={id} id={id} initialMessages={messages} />;
}
