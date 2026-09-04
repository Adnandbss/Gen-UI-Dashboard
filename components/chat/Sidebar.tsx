"use client";

import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  FileText,
  LayoutDashboard,
  Settings,
  Sparkles,
  Wallet,
} from "lucide-react";

import { NAV_PROMPTS, SIDEBAR_RECENTS } from "@/lib/prompts";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Revenue", icon: ChartNoAxesCombined },
  { label: "Transactions", icon: ArrowLeftRight },
  { label: "Accounts", icon: Wallet },
  { label: "Reports", icon: FileText },
  { label: "Settings", icon: Settings },
] as const;

export function Sidebar({
  className,
  activeLabel = "Overview",
  onSelect,
}: {
  className?: string;
  activeLabel?: string;
  onSelect?: (prompt: string, label?: string) => void;
}) {
  return (
    <aside
      className={cn(
        "bg-card/40 flex h-full w-64 shrink-0 flex-col border-r",
        className,
      )}
    >
      <div className="flex h-16 items-center gap-2.5 border-b px-5">
        <span className="bg-[var(--brand)]/12 flex size-8 items-center justify-center rounded-lg">
          <Sparkles className="size-4 text-[var(--brand)]" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Ledger</p>
          <p className="text-muted-foreground text-xs">Acme Capital</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Workspace">
        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ label, icon: Icon }) => {
            const active = label === activeLabel;
            const prompt = NAV_PROMPTS[label];
            return (
              <button
                key={label}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => prompt && onSelect?.(prompt, label)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </div>

        <div>
          <p className="text-muted-foreground px-3 pb-2 text-xs font-medium tracking-wide uppercase">
            Recent
          </p>
          <div className="space-y-0.5">
            {SIDEBAR_RECENTS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onSelect?.(item.prompt, "Overview")}
                className="text-muted-foreground hover:bg-accent/60 hover:text-foreground block w-full truncate rounded-lg px-3 py-1.5 text-left text-sm transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="flex items-center gap-3 border-t px-4 py-3">
        <span className="bg-secondary text-secondary-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold">
          AD
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-medium">Adnan</p>
          <p className="text-muted-foreground truncate text-xs">
            Finance workspace
          </p>
        </div>
      </div>
    </aside>
  );
}
