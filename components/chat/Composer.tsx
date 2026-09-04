"use client";

import { ArrowUp, Square } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_HEIGHT = 168;

export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  isStreaming,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isStreaming: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grow with the content up to a ceiling, then scroll internally.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !isStreaming;

  return (
    <div className="bg-background/80 border-t backdrop-blur-md">
      <div className="mx-auto w-full max-w-3xl px-4 py-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canSend) onSubmit();
          }}
          className={cn(
            "bg-card focus-within:border-ring/60 focus-within:ring-ring/20 flex items-end gap-2 rounded-xl border p-2 shadow-sm transition-all focus-within:ring-4",
          )}
        >
          <label htmlFor="composer" className="sr-only">
            Ask about your financials
          </label>
          <textarea
            id="composer"
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (canSend) onSubmit();
              }
            }}
            placeholder="Ask anything about your financials…"
            className="scrollbar-subtle placeholder:text-muted-foreground max-h-42 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
          />

          {isStreaming ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={onStop}
              aria-label="Stop generating"
            >
              <Square className="size-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!canSend}
              aria-label="Send message"
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </form>

        <p className="text-muted-foreground mt-2 text-center text-xs">
          Every answer is rendered as live UI — no static dashboards, no markdown
          tables.
        </p>
      </div>
    </div>
  );
}
