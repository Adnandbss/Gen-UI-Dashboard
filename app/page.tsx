"use client";

import { useChat } from "@ai-sdk/react";
import { Menu, PanelLeftClose, Plus, RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ChatMessage } from "@/ai/types";
import { Composer } from "@/components/chat/Composer";
import { EmptyState } from "@/components/chat/EmptyState";
import { FollowUps } from "@/components/chat/FollowUps";
import { MessageParts, ToolError } from "@/components/chat/MessageParts";
import { Sidebar } from "@/components/chat/Sidebar";
import { Button } from "@/components/ui/button";
import { followUpsFor, lastUserText } from "@/lib/prompts";
import { cn } from "@/lib/utils";

function ThinkingIndicator() {
  return (
    <div className="text-muted-foreground flex items-center gap-2 text-sm" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full"
          style={{ animationDelay: `${i * 140}ms` }}
        />
      ))}
      <span className="ml-1">Analysing…</span>
    </div>
  );
}

export default function Page() {
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [activeNav, setActiveNav] = useState("Overview");
  const stickToBottom = useRef(true);

  const { messages, sendMessage, status, stop, setMessages, error, regenerate } =
    useChat<ChatMessage>();

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    fetch("/api/chat")
      .then((res) => res.json())
      .then((data: { demoMode?: boolean }) => setDemoMode(Boolean(data.demoMode)))
      .catch(() => setDemoMode(false));
  }, []);

  useEffect(() => {
    if (!stickToBottom.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  useEffect(() => {
    if (!sidebarOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  const submit = useCallback(
    (text: string, navLabel?: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;
      if (navLabel) setActiveNav(navLabel);
      stickToBottom.current = true;
      sendMessage({ text: trimmed });
      setInput("");
      setSidebarOpen(false);
    },
    [isStreaming, sendMessage],
  );

  const lastMessage = messages.at(-1);
  const showThinking =
    isStreaming &&
    (lastMessage?.role === "user" || lastMessage?.parts.length === 0);
  const showFollowUps =
    !isStreaming && lastMessage?.role === "assistant" && !error;

  return (
    <div className="bg-background flex h-dvh overflow-hidden">
      <a
        href="#composer"
        className="bg-background sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-md focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to message input
      </a>

      <Sidebar
        className="hidden lg:flex"
        activeLabel={activeNav}
        onSelect={submit}
      />

      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          sidebarOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          role="presentation"
          onClick={() => setSidebarOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity",
            sidebarOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <Sidebar
          className={cn(
            "bg-card absolute inset-y-0 left-0 transition-transform duration-300",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
          activeLabel={activeNav}
          onSelect={submit}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
          className={cn(
            "absolute top-3.5 left-[17rem] text-white transition-opacity",
            sidebarOpen ? "opacity-100" : "opacity-0",
          )}
        >
          <PanelLeftClose className="size-5" />
        </Button>
      </div>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            aria-expanded={sidebarOpen}
          >
            <Menu className="size-5" />
          </Button>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold tracking-tight">
              Generative Dashboard
            </h2>
            <p className="text-muted-foreground truncate text-xs">
              Widgets are assembled per question — nothing is pre-rendered
            </p>
          </div>

          {demoMode && (
            <span
              title="No provider key configured — responses come from a scripted model."
              className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-flex"
            >
              <Sparkles className="size-3 text-[var(--brand)]" />
              Demo mode
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              stop();
              setMessages([]);
              setInput("");
              setActiveNav("Overview");
            }}
            disabled={messages.length === 0}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">New chat</span>
          </Button>
        </header>

        <div
          ref={scrollRef}
          className="scrollbar-subtle flex-1 overflow-y-auto scroll-smooth"
          onScroll={(event) => {
            const el = event.currentTarget;
            const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
            stickToBottom.current = remaining < 80;
          }}
        >
          {messages.length === 0 ? (
            <EmptyState onSelect={submit} demoMode={demoMode} />
          ) : (
            <div
              className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6"
              aria-live="polite"
              aria-relevant="additions"
            >
              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="bg-secondary text-secondary-foreground max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
                      {message.parts
                        .filter((part) => part.type === "text")
                        .map((part) => part.text)
                        .join("")}
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex gap-3">
                    <span
                      aria-hidden
                      className="bg-[var(--brand)]/12 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg"
                    >
                      <Sparkles className="size-3.5 text-[var(--brand)]" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-4">
                      <MessageParts parts={message.parts} messageId={message.id} />
                    </div>
                  </div>
                ),
              )}

              {showThinking && (
                <div className="flex gap-3">
                  <span
                    aria-hidden
                    className="bg-[var(--brand)]/12 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg"
                  >
                    <Sparkles className="size-3.5 text-[var(--brand)]" />
                  </span>
                  <ThinkingIndicator />
                </div>
              )}

              {error && (
                <div className="space-y-3">
                  <ToolError
                    message={
                      demoMode
                        ? error.message
                        : `${error.message} Check the provider key in .env.local, or remove it to fall back to demo mode.`
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => regenerate()}
                  >
                    <RotateCcw className="size-3.5" />
                    Retry
                  </Button>
                </div>
              )}

              {showFollowUps && (
                <FollowUps
                  chips={followUpsFor(lastUserText(messages))}
                  onSelect={submit}
                />
              )}

              <div ref={bottomRef} className="h-px" />
            </div>
          )}
        </div>

        <Composer
          value={input}
          onChange={setInput}
          onSubmit={() => submit(input)}
          onStop={stop}
          isStreaming={isStreaming}
        />
      </main>
    </div>
  );
}
