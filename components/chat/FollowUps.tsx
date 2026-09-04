"use client";

import type { PromptChip } from "@/lib/prompts";

export function FollowUps({
  chips,
  onSelect,
  disabled,
}: {
  chips: PromptChip[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(chip.prompt)}
          className="text-muted-foreground hover:border-[var(--brand)]/40 hover:text-foreground disabled:opacity-50 rounded-full border px-3 py-1.5 text-xs transition-colors"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
