"use client";

import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  Clock3,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

import { STARTER_PROMPTS } from "@/lib/prompts";

const ICONS: Record<string, LucideIcon> = {
  "Full dashboard": LayoutDashboard,
  "Revenue trend": ChartNoAxesCombined,
  "Recent activity": ArrowLeftRight,
  "Pending items": Clock3,
};

export function EmptyState({
  onSelect,
  demoMode,
  knowledgeMode,
}: {
  onSelect: (prompt: string) => void;
  demoMode?: boolean;
  knowledgeMode?: boolean;
}) {
  return (
    <div className="animate-rise mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center sm:py-24">
      <span className="bg-[var(--brand)]/12 mb-5 flex size-12 items-center justify-center rounded-2xl">
        <ChartNoAxesCombined className="size-6 text-[var(--brand)]" />
      </span>

      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        What would you like to see?
      </h1>
      <p className="text-muted-foreground mt-2.5 max-w-md text-sm leading-relaxed">
        {knowledgeMode
          ? "This chat will chart the tables you uploaded — not the Acme warehouse."
          : "Ask a question and the answer arrives as a live interface — charts, ledgers and scorecards assembled on the fly. Nothing here is a static page."}
      </p>
      {demoMode && (
        <p className="text-muted-foreground mt-2 text-xs">
          {knowledgeMode
            ? "Demo mode can attach files but cannot generate charts from them until a model key is set."
            : "Running in demo mode with the seeded warehouse — no API key required."}
        </p>
      )}

      <div className="mt-8 grid w-full gap-2.5 sm:grid-cols-2">
        {STARTER_PROMPTS.map(({ label, prompt }) => {
          const Icon = ICONS[label] ?? LayoutDashboard;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelect(prompt)}
              className="group bg-card hover:border-[var(--brand)]/40 hover:bg-accent/40 flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all"
            >
              <span className="bg-secondary text-muted-foreground group-hover:text-[var(--brand)] flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{label}</span>
                <span className="text-muted-foreground block text-xs leading-snug">
                  {prompt}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
