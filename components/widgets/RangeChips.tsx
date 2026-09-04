"use client";

import { cn } from "@/lib/utils";

const RANGES = [3, 6, 12] as const;

export function RangeChips({
  activeMonths,
  onSelect,
  disabled,
}: {
  activeMonths?: number;
  onSelect: (months: 3 | 6 | 12) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Period">
      {RANGES.map((months) => {
        const active = activeMonths === months;
        return (
          <button
            key={months}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onSelect(months)}
            className={cn(
              "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground border-transparent"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            {months}m
          </button>
        );
      })}
    </div>
  );
}
