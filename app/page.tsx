"use client";

import { useChat } from "@ai-sdk/react";
import { AlertTriangle, Menu, PanelLeftClose, Plus, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ChatMessage } from "@/ai/types";
import { Composer } from "@/components/chat/Composer";
import { EmptyState } from "@/components/chat/EmptyState";
import { Sidebar } from "@/components/chat/Sidebar";
import { Button } from "@/components/ui/button";
import { KpiCardsWidget } from "@/components/widgets/KpiCardsWidget";
import { RevenueChartWidget } from "@/components/widgets/RevenueChartWidget";
import { TransactionsGridWidget } from "@/components/widgets/TransactionsGridWidget";
import {
  KpiCardsSkeleton,
  RevenueChartSkeleton,
  TransactionsSkeleton,
} from "@/components/widgets/widget-skeletons";
import { cn } from "@/lib/utils";

type MessagePart = ChatMessage["parts"][number];

function ToolError({ message }: { message: string }) {
  return (
    <div className="text-destructive bg-destructive/8 border-destructive/25 flex items-start gap-2.5 rounded-xl border p-3.5 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/**
 * The heart of the app: a message part becomes either prose or a rendered
 * widget. Tool inputs are *never* shown as JSON — while the model is still
 * streaming a tool's arguments we show the matching skeleton, and the moment the
 * input is complete we swap in the real component.
 */
function renderPart(part: MessagePart, key: string) {
  switch (part.type) {
    case "text":
      return (
        <p key={key} className="text-[15px] leading-relaxed whitespace-pre-wrap">
          {part.text}
        </p>
      );

    case "tool-show_revenue_chart":
      switch (part.state) {
        case "input-streaming":
          return <RevenueChartSkeleton key={key} />;
        case "input-available":
        case "output-available":
          return (
            <div key={key} className="animate-rise">
              <RevenueChartWidget {...part.input} />
            </div>
          );
        case "output-error":
          return <ToolError key={key} message={part.errorText} />;
        default:
          return null;
      }

    case "tool-show_transactions_list":
      switch (part.state) {
        case "input-streaming":
          return <TransactionsSkeleton key={key} />;
        case "input-available":
        case "output-available":
          return (
            <div key={key} className="animate-rise">
              <TransactionsGridWidget {...part.input} />
            </div>
          );
        case "output-error":
          return <ToolError key={key} message={part.errorText} />;
        default:
          return null;
      }

    case "tool-show_kpi_metrics":
      switch (part.state) {
        case "input-streaming":
          return <KpiCardsSkeleton key={key} />;
        case "input-available":
        case "output-available":
          return (
            <div key={key} className="animate-rise">
              <KpiCardsWidget {...part.input} />
            </div>
          );
        case "output-error":
          return <ToolError key={key} message={part.errorText} />;
        default:
          return null;
      }

    default:
      return null;
  }
}

function ThinkingIndicator() {
  return (
    <div className="text-muted-foreground flex items-center gap-2 text-sm">
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

  const { messages, sendMessage, status, stop, setMessages, error } =
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

  // Follow the conversation as it grows. `smooth` on every token would fight the
  // user's own scrolling, so this only fires when the message list changes.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, status]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    sendMessage({ text: trimmed });
    setInput("");
  };

  const lastMessage = messages.at(-1);
  const showThinking =
    isStreaming &&
    (lastMessage?.role === "user" || lastMessage?.parts.length === 0);

  return (
    <div className="bg-background flex h-dvh overflow-hidden">
      <Sidebar className="hidden lg:flex" />

      {/* Mobile drawer */}
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
        >
          {messages.length === 0 ? (
            <EmptyState onSelect={submit} />
          ) : (
            <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
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
                      {message.parts.map((part, index) =>
                        renderPart(part, `${message.id}-${index}`),
                      )}
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
                <ToolError
                  message={`${error.message} — check that a provider key is set in .env.local, or remove it to use demo mode.`}
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
